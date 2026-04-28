import { Module } from '@nestjs/common';
import { SequencingService } from './domain/services/sequencing.service';
import { RemediationService } from './domain/services/remediation.service';
import { AccelerationService } from './domain/services/acceleration.service';
import { ConstraintSolverService } from './domain/services/constraint-solver.service';
import { EnrollmentConfirmedHandler } from './application/handlers/enrollment-confirmed.handler';
import { AssessmentResultHandler } from './application/handlers/assessment-result.handler';
import { AssessmentAcl } from './infrastructure/acl/assessment-acl';
import { LearningPathRepository } from './domain/repositories/learning-path.repository';
import { LearningPathInMemoryRepository } from './infrastructure/persistence/learning-path.in-memory.repository';
import { AdaptiveController } from './infrastructure/controller/adaptive.controller';

@Module({
  imports: [],
  providers: [
    // Domain services — plain classes, no @Injectable needed, NestJS resolves via useClass
    { provide: SequencingService,      useClass: SequencingService },
    { provide: RemediationService,     useClass: RemediationService },
    { provide: AccelerationService,    useClass: AccelerationService },
    { provide: ConstraintSolverService, useClass: ConstraintSolverService },

    // Application handlers
    EnrollmentConfirmedHandler,
    AssessmentResultHandler,

    // Infrastructure — ACL (BC4 → BC3)
    AssessmentAcl,

    // Repository — In-Memory (mock mode, swap with TypeORM when DB is ready)
    {
      provide: LearningPathRepository,
      useClass: LearningPathInMemoryRepository,
    },
  ],
  controllers: [AdaptiveController],
  exports: [],
})
export class AdaptiveModule {}

