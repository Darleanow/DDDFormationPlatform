import { Module } from '@nestjs/common';
import { RuleEngineService } from './domain/services/rule-engine.service';
import { EligibilityCheckService } from './domain/services/eligibility-check.service';
import { CertificateIssuanceService } from './domain/services/certificate-issuance.service';
import { VerifierEligibiliteEtDelivrerHandler } from './application/commands/verifier-eligibilite-et-delivrer.handler';
import { InMemoryCertificationRepository } from './infrastructure/repositories/in-memory-certification.repository';
import { InMemoryDelivranceRepository } from './infrastructure/repositories/in-memory-delivrance.repository';
import { ParcoursTermineListener } from './presentation/listeners/parcours-termine.listener';

@Module({
  providers: [
    // 1. Services du Domaine
    RuleEngineService,
    EligibilityCheckService,
    CertificateIssuanceService,

    // 2. Cas d'Usage (Application)
    VerifierEligibiliteEtDelivrerHandler,

    // 3. Écouteurs d'Événements externes (Presentation)
    ParcoursTermineListener,

    // 4. Mappage des Interfaces (Ports) vers les Implémentations (Adapters)
    {
      provide: 'ICertificationRepository',
      useClass: InMemoryCertificationRepository,
    },
    {
      provide: 'IDelivranceRepository',
      useClass: InMemoryDelivranceRepository,
    },
  ],
})
export class CertificationModule {}
