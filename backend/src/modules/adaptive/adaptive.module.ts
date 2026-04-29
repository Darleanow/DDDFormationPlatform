import { Module } from '@nestjs/common';
import { PathSequencingService } from './domain/services/path-sequencing.service';
import { RemediationService } from './domain/services/remediation.service';
import { AccelerationService } from './domain/services/acceleration.service';
import { ConstraintSolverService } from './domain/services/constraint-solver.service';
import { EnrollmentConfirmedHandler } from './application/handlers/enrollment-confirmed.handler';
import { AssessmentResultHandler } from './application/handlers/assessment-result.handler';
import { AssessmentAcl } from './infrastructure/acl/assessment-acl';
import { LearningPathRepository } from './domain/repositories/learning-path.repository';
import { LearningPathInMemoryRepository } from './infrastructure/persistence/learning-path.in-memory.repository';
import { AdaptiveController } from './infrastructure/controller/adaptive.controller';
import { ProgramModuleOverviewService } from './application/services/program-module-overview.service';
import { CatalogModule } from '../catalog/catalog.module';
import { CatalogQueryService } from '../catalog/application/catalog-query.service';
import { InternalLearningCatalogGateway } from './infrastructure/integration/internal-learning-catalog.gateway';
import { LEARNING_CATALOG_GATEWAY } from './application/ports/learning-catalog.gateway';
import { AssessmentToAdaptiveAdapter } from './infrastructure/integration/assessment-to-adaptive.adapter';
import { IdentityToAdaptiveAdapter } from './infrastructure/integration/identity-to-adaptive.adapter';

@Module({
  imports: [CatalogModule],
  providers: [
    // Domain services — plain classes, no @Injectable needed, NestJS resolves via useClass
    { provide: PathSequencingService, useClass: PathSequencingService },
    { provide: RemediationService, useClass: RemediationService },
    { provide: AccelerationService, useClass: AccelerationService },
    { provide: ConstraintSolverService, useClass: ConstraintSolverService },

    // Application handlers
    EnrollmentConfirmedHandler,
    AssessmentResultHandler,
    ProgramModuleOverviewService,

    // Infrastructure — ACL (BC4 → BC3)
    AssessmentAcl,

    // Repository — In-Memory (mock mode, swap with TypeORM when DB is ready)
    {
      provide: LearningPathRepository,
      useClass: LearningPathInMemoryRepository,
    },
    {
      provide: LEARNING_CATALOG_GATEWAY,
      useFactory: (catalogService: CatalogQueryService) => new InternalLearningCatalogGateway(catalogService),
      inject: [CatalogQueryService],
    },
    // Adapter: translate public enrollment event into internal Adaptive envelope
    IdentityToAdaptiveAdapter,
    AssessmentToAdaptiveAdapter,
  ],
  controllers: [AdaptiveController],
  exports: [],
})
export class AdaptiveModule {}
