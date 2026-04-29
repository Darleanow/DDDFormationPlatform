import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { LearningPath } from '../../domain/entities/learning-path.entity';
import { CoverageConstraint } from '../../domain/value-objects/coverage-constraint.vo';
import { PathSequencingService } from '../../domain/services/path-sequencing.service';
import { ConstraintSolverService } from '../../domain/services/constraint-solver.service';
import { LearningPathRepository } from '../../domain/repositories/learning-path.repository';
import { EnrollmentConfirmedEvent } from '../events/enrollment-confirmed.event';
import { BC_INPROCESS_EVENT } from '../../../../shared/bc-integration/in-process-events';

export { EnrollmentConfirmedEvent };

@Injectable()
export class EnrollmentConfirmedHandler {
  constructor(
    private readonly sequencing: PathSequencingService,
    private readonly solver: ConstraintSolverService,
    private readonly repo: LearningPathRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(event: EnrollmentConfirmedEvent): Promise<void> {
    const constraint = CoverageConstraint.from({
      mandatoryCompetencyIds: event.constraints.mandatoryCompetencyIds,
      weeklyHours: event.constraints.weeklyHours,
      deadlineAt: event.constraints.deadline,
    });

    const path = LearningPath.create({
      id: randomUUID(),
      learnerId: event.learnerId,
      tenantId: event.tenantId,
      constraint,
      targetCertificationId: event.targetCertificationId,
    });

    this.sequencing.buildInitialSequence(path, event.catalogActivities);

    const result = this.solver.solve(path);
    if (!result.scheduleFeasible) {
      this.solver.prioritizeMandatory(path);
    }

    await this.repo.save(path);

    // Après persistance — les listeners tiers ne peuvent pas bloquer l’enregistrement du parcours
    if (!result.scheduleFeasible) {
      const alertMessage = this.solver.scheduleRiskMessage(path);
      if (alertMessage) {
        await this.eventEmitter.emitAsync(BC_INPROCESS_EVENT.ADAPTIVE_COVERAGE_AT_RISK, {
          learnerId: event.learnerId,
          pathId: path.id,
          alertMessage,
          uncoveredCompetences: result.uncoveredMandatoryCompetences,
        });
      }
    }

    // Dispatch all domain events accumulated during path creation
    for (const domainEvent of path.pullDomainEvents()) {
      const eventName = domainEvent.constructor.name;
      await this.eventEmitter.emitAsync(eventName, domainEvent);
    }
  }
}
