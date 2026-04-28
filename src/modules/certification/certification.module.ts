import { Module } from '@nestjs/common';
import { RuleEngineService } from './domain/services/rule-engine.service';
import { EligibilityCheckService } from './domain/services/eligibility-check.service';
import { CertificateIssuanceService } from './domain/services/certificate-issuance.service';
import { VerifierEligibiliteEtDelivrerHandler } from './application/commands/verifier-eligibilite-et-delivrer.handler';
import { InMemoryCertificationRepository } from './infrastructure/repositories/in-memory-certification.repository';
import { InMemoryDelivranceRepository } from './infrastructure/repositories/in-memory-delivrance.repository';
import { InMemoryTentativeCertificationRepository } from './infrastructure/repositories/in-memory-tentative.repository';
import { ParcoursTermineListener } from './presentation/listeners/parcours-termine.listener';
import { CertificativeAssessmentScoredListener } from './presentation/listeners/certificative-assessment-scored.listener';

@Module({
  providers: [
    // 1. Services du Domaine (Just standard classes now!)
    RuleEngineService,
    EligibilityCheckService,
    CertificateIssuanceService,

    // 2. Cas d'Usage (Application)
    VerifierEligibiliteEtDelivrerHandler,

    // 3. Écouteurs d'Événements externes (Presentation)
    ParcoursTermineListener,
    CertificativeAssessmentScoredListener,

    // 4. Mappage des Interfaces (Ports) vers les Implémentations (Adapters)
    {
      provide: 'ICertificationRepository',
      useClass: InMemoryCertificationRepository,
    },
    {
      provide: 'IDelivranceRepository',
      useClass: InMemoryDelivranceRepository,
    },
    {
      provide: 'ITentativeCertificationRepository',
      useClass: InMemoryTentativeCertificationRepository,
    },
  ],
})
export class CertificationModule {}
