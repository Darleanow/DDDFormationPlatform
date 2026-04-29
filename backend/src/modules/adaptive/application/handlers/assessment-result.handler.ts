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
import { assessmentAggregateIdForCompetency } from '../../../../shared/bc-integration/assessment-ids';

import { Activity } from '../../domain/entities/activity.entity';
import type { LearningPath } from '../../domain/entities/learning-path.entity';

export { AssessmentResultPayload };

/** Score simulé lorsqu’une évaluation est cochée depuis l’UI sans passage BC4 — suffisant pour streak &gt; 90 % et pas de remédiation. */
export const MANUAL_ASSESSMENT_UI_SCORE = 0.96;

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

    const expectedContentId = assessmentAggregateIdForCompetency(payload.competencyId);
    let completedActivity = path.markNextPendingIfContentIdMatches(expectedContentId);
    if (!completedActivity) {
      completedActivity = path.completePendingAssessmentWithContentId(expectedContentId);
    }

    await this.applyAssessmentResultToPath(path, payload, completedActivity);
  }

  /**
   * Applique niveau, série d’accélération, remédiation, solveur — après qu’une ligne ASSESSMENT
   * soit passée en COMPLETED soit par BC4 ({@link handle}), soit par l’adaptateur HTTP
   * « terminer l’activité courante » ({@link MANUAL_ASSESSMENT_UI_SCORE} pour la démo bouton).
   */
  async applyAssessmentResultToPath(
    path: LearningPath,
    payload: AssessmentResultPayload,
    completedActivity: Activity | undefined,
  ): Promise<void> {
    const level = this.acl.translateResult(payload);
    path.updateLevel(level);

    path.recordAssessmentActivityOutcome(
      completedActivity,
      level,
      payload.streakSignalScore,
    );

    if (path.checkCompletionStatus()) {
      path.completePath();
    } else {
      let remediated = false;

      if (level.needsRemediation()) {
        const remediationContent = await this.catalogGateway.findRemediationContent(
          level.getCompetencyId(),
        );
        if (remediationContent) {
          remediated = this.remediation.applyIfNeeded(path, level, remediationContent);
        }
      }

      if (!remediated) {
        const accelerated = this.acceleration.applyIfEligible(path, level);
        if (accelerated) {
          this.solver.prioritizeMandatory(path);
        }
      }

      const result = this.solver.solve(path);
      if (!result.scheduleFeasible) {
        this.solver.prioritizeMandatory(path);
        const alertMessage = this.solver.scheduleRiskMessage(path);
        if (alertMessage) {
          await this.eventEmitter.emitAsync(BC_INPROCESS_EVENT.ADAPTIVE_COVERAGE_AT_RISK, {
            learnerId: payload.learnerId,
            pathId: path.id,
            alertMessage,
            uncoveredCompetences: result.uncoveredMandatoryCompetences,
          });
        }
      }
    }

    await this.repo.save(path);

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
