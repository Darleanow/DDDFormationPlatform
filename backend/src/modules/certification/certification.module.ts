import { Module } from '@nestjs/common';
import { RuleEngineService } from './domain/services/rule-engine.service';
import { EligibilityCheckService } from './domain/services/eligibility-check.service';
import { CertificateIssuanceService } from './domain/services/certificate-issuance.service';
import { VerifyEligibilityAndIssueHandler } from './application/commands/verify-eligibility-and-issue.handler';
import { InMemoryCertificationRepository } from './infrastructure/repositories/in-memory-certification.repository';
import { InMemoryIssuanceRepository } from './infrastructure/repositories/in-memory-issuance.repository';
import { InMemoryAttemptRepository } from './infrastructure/repositories/in-memory-attempt.repository';
import { LearningPathCompletedListener } from './presentation/listeners/learning-path-completed.listener';
import { CertificativeAssessmentScoredListener } from './presentation/listeners/certificative-assessment-scored.listener';
import { CertificationController } from './presentation/controllers/certification.controller';

@Module({
  controllers: [CertificationController],
  providers: [
    // 1. Services du Domaine
    RuleEngineService,
    EligibilityCheckService,
    CertificateIssuanceService,

    // 2. Cas d'Usage (Application)
    VerifyEligibilityAndIssueHandler,

    // 3. Écouteurs d'Événements externes (Presentation)
    LearningPathCompletedListener,
    CertificativeAssessmentScoredListener,

    // 4. Mappage des Interfaces (Ports) vers les Implémentations (Adapters)
    {
      provide: 'ICertificationRepository',
      useClass: InMemoryCertificationRepository,
    },
    {
      provide: 'IIssuanceRepository',
      useClass: InMemoryIssuanceRepository,
    },
    {
      provide: 'ICertificationAttemptRepository',
      useClass: InMemoryAttemptRepository,
    },
  ],
  exports: ['ICertificationRepository'],
})
export class CertificationModule {}
