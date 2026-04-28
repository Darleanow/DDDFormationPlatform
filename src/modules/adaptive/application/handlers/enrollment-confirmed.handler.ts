import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { LearningPath } from '../../domain/entities/learning-path.entity';
import { CoverageConstraint } from '../../domain/value-objects/coverage-constraint.vo';
import { SequencingService } from '../../domain/services/sequencing.service';
import { ConstraintSolverService } from '../../domain/services/constraint-solver.service';
import { LearningPathRepository } from '../../domain/repositories/learning-path.repository';
import { EnrollmentConfirmedEvent } from '../events/enrollment-confirmed.event';

export { EnrollmentConfirmedEvent };

@Injectable()
export class EnrollmentConfirmedHandler {
  constructor(
    private readonly sequencing: SequencingService,
    private readonly solver: ConstraintSolverService,
    private readonly repo: LearningPathRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('enrollment.confirmed')
  async handle(event: EnrollmentConfirmedEvent): Promise<void> {
    const constraint = CoverageConstraint.from({
      mandatoryCompetenceIds: event.constraints.mandatoryCompetenceIds,
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
    if (!result.feasible) {
      this.solver.prioritizeMandatory(path);
      const failureResult = result;
      // Dispatch coverage alert — listeners (front, monitoring) can react
      this.eventEmitter.emit('adaptive.coverage.alert', {
        learnerId: event.learnerId,
        pathId: path.id,
        alertMessage: failureResult.alertMessage,
        uncoveredCompetences: failureResult.uncoveredCompetences,
      });
    }

    await this.repo.save(path);

    // Dispatch all domain events accumulated during path creation
    for (const domainEvent of path.pullDomainEvents()) {
      const eventName = domainEvent.constructor.name;
      this.eventEmitter.emit(eventName, domainEvent);
    }
  }
}
