import { VerifierEligibiliteEtDelivrerCommand } from './verifier-eligibilite-et-delivrer.command';
import { EligibilityCheckService } from '../../domain/services/eligibility-check.service';
import { CertificateIssuanceService } from '../../domain/services/certificate-issuance.service';
import type { ICertificationRepository } from '../../domain/repositories/certification.repository.interface';
import type { IDelivranceRepository } from '../../domain/repositories/delivrance.repository.interface';
import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CertificationDelivreeEvent } from '../../domain/events/certification-delivree.event';

/**
 * Application Service / Command Handler :
 * Orchestre un cas d'utilisation entier ("Vérifier et Délivrer").
 * C'est le point d'entrée de notre logique métier après la réception d'une requête HTTP ou d'un évènement Kafka/RabbitMQ.
 */
@Injectable()
export class VerifierEligibiliteEtDelivrerHandler {
  constructor(
    @Inject('ICertificationRepository')
    private readonly certificationRepo: ICertificationRepository,
    @Inject('IDelivranceRepository')
    private readonly delivranceRepo: IDelivranceRepository,
    private readonly eligibilityCheckService: EligibilityCheckService,
    private readonly issuanceService: CertificateIssuanceService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: VerifierEligibiliteEtDelivrerCommand): Promise<void> {
    // 1. Récupération de l'Aggregate Root (Certification avec ses Règles) depuis la Base de Données
    const certification = await this.certificationRepo.findById(
      command.certificationId,
    );

    if (!certification) {
      throw new Error(
        `Certification "${command.certificationId}" introuvable.`,
      );
    }

    // 2. Évaluation de l'éligibilité de l'Apprenant
    // Si l'apprenant échoue, le service émettra une exception ("Score insuffisant", etc.) qui remontera jusqu'au Controller
    this.eligibilityCheckService.estEligible(
      certification,
      command.scoreGlobal,
      command.validations,
    );

    // 3. Acte de délivrance (Modélisation)
    const result = this.issuanceService.delivrer(
      certification,
      command.learnerId,
    );

    // 4. Persistence du nouveau certificat (Adaptateur de base de données)
    await this.delivranceRepo.save(result.delivrance);

    // 5. Publication de l'événement aux autres bounded contexts
    await this.eventEmitter.emitAsync(
      CertificationDelivreeEvent.EVENT_NAME,
      result.event,
    );
  }
}
