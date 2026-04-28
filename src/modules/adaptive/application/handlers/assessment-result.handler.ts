import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
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

  @OnEvent('assessment.result')
  async handle(payload: AssessmentResultPayload): Promise<void> {
    const path = await this.repo.findByLearnerId(payload.learnerId);
    if (!path) return;

    // 1. Mark the assessed activity as done (aggregate method preserves encapsulation)
    path.markCurrentActivityCompleted();

    // 2. ACL: translate BC4 payload → BC3's EstimatedLevel
    const level = this.acl.translateResult(payload);
    path.updateLevel(level);

    if (path.checkCompletionStatus()) {
      // ── Path is complete: aggregate scores and emit domain event ───────────
      path.completePath();
    } else {
      // ── Normal adaptive flow: remédiation / accélération / contraintes ─────

      let remediated = false;

      // Demander l'avis du domaine sur le besoin
      if (level.needsRemediation()) {
        const remediationContent = await this.catalogGateway.findRemediationContent(level.getCompetenceId());
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
        this.eventEmitter.emit('adaptive.coverage.alert', {
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
      this.eventEmitter.emit(domainEvent.constructor.name, domainEvent);
    }
  }
}
