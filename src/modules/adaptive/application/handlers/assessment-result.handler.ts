import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RemediationService } from '../../domain/services/remediation.service';
import { AccelerationService } from '../../domain/services/acceleration.service';
import { ConstraintSolverService } from '../../domain/services/constraint-solver.service';
import { LearningPathRepository } from '../../domain/repositories/learning-path.repository';
import { AssessmentAcl, AssessmentResultPayload } from '../../infrastructure/acl/assessment-acl';

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
  ) {}

  @OnEvent('assessment.result')
  async handle(payload: AssessmentResultPayload): Promise<void> {
    const path = await this.repo.findByLearnerId(payload.learnerId);
    if (!path) return;

    // ACL: translates BC4 Assessment payload into BC3's EstimatedLevel
    const level = this.acl.translateResult(payload);
    path.updateLevel(level);

    // Remédiation ou accélération — mutuellement exclusifs
    const remediated = this.remediation.applyIfNeeded(path, level, {
      contentId: payload.remediationContentId,
      estimatedHours: payload.remediationHours,
    });

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

    await this.repo.save(path);

    // Dispatch all domain events accumulated during path mutation
    for (const domainEvent of path.pullDomainEvents()) {
      const eventName = domainEvent.constructor.name;
      this.eventEmitter.emit(eventName, domainEvent);
    }
  }
}

