import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RemediationService } from '../../domain/services/remediation.service';
import { AccelerationService } from '../../domain/services/acceleration.service';
import { ConstraintSolverService } from '../../domain/services/constraint-solver.service';
import { LearningPathRepository } from '../../domain/repositories/learning-path.repository';
import {
  AssessmentAcl,
  AssessmentResultPayload,
} from '../../infrastructure/acl/assessment-acl';
import { Inject } from '@nestjs/common';
import {
  LEARNING_CATALOG_GATEWAY,
} from '../ports/learning-catalog.gateway';
import type { LearningCatalogGateway } from '../ports/learning-catalog.gateway';
import { LearningPathCompletedEvent } from '../../domain/events/learning-path-completed.event';
import { BC_INPROCESS_EVENT } from '../../../../shared/bc-integration/in-process-events';

export { AssessmentResultPayload };

@Injectable()
export class AssessmentResultHandler {
  constructor(
    private readonly acl: AssessmentAcl,
    private readonly remediation: RemediationService,
    private readonly acceleration: AccelerationService,
    private readonly solver: ConstraintSolverService,
    private readonly repo: LearningPathRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject(LEARNING_CATALOG_GATEWAY)
    private readonly catalogGateway: LearningCatalogGateway,
  ) {}

  async handle(payload: AssessmentResultPayload): Promise<void> {
    const path = await this.repo.findByLearnerId(payload.learnerId);
    if (!path) return;

    const completedActivity = path.getNextPendingActivity();

    // 1. Mark the assessed activity as done (aggregate method preserves encapsulation)
    path.markCurrentActivityCompleted();

    // 2. ACL: translate BC4 payload → BC3's EstimatedLevel
    const level = this.acl.translateResult(payload);
    path.updateLevel(level);

    path.recordAssessmentActivityOutcome(completedActivity, level);

    if (path.checkCompletionStatus()) {
      // ── Path is complete: aggregate scores and emit domain event ───────────
      path.completePath();
    } else {
      // ── Normal adaptive flow: remédiation / accélération / contraintes ─────

      let remediated = false;

      // Demander l'avis du domaine sur le besoin
      if (level.needsRemediation()) {
        const remediationContent = await this.catalogGateway.findRemediationContent(level.getCompetencyId());
        if (remediationContent) {
            remediated = this.remediation.applyIfNeeded(path, level, remediationContent);
        }
      }

      if (!remediated) {
        this.acceleration.applyIfEligible(path, level);
      }

      // Re-evaluate constraints after path mutation
      const result = this.solver.solve(path);
      if (!result.feasible) {
        this.solver.prioritizeMandatory(path);
        const failureResult = result as { feasible: false; alertMessage: string; uncoveredCompetences: string[] };
        await this.eventEmitter.emitAsync(BC_INPROCESS_EVENT.ADAPTIVE_COVERAGE_AT_RISK, {
          learnerId: payload.learnerId,
          pathId: path.id,
          alertMessage: failureResult.alertMessage,
          uncoveredCompetences: failureResult.uncoveredCompetences,
        });
      }
    }

    await this.repo.save(path);

    // Dispatch all domain events (PathUpdatedEvent, RemediationTriggeredEvent,
    // LearningPathCompletedEvent, ...) accumulated during this transaction
    for (const domainEvent of path.pullDomainEvents()) {
      if (domainEvent instanceof LearningPathCompletedEvent) {
        await this.eventEmitter.emitAsync(
          BC_INPROCESS_EVENT.LEARNING_PATH_COMPLETED_CLASSNAME,
          domainEvent,
        );
      } else {
        await this.eventEmitter.emitAsync(
          (domainEvent as { constructor: { name: string } }).constructor.name,
          domainEvent,
        );
      }
    }
  }
}
