import * as crypto from 'crypto';
import { Certification } from '../entities/certification.entity';
import { Issuance } from '../entities/issuance.entity';
import { CertificationDelivreeEvent } from '../events/certification-delivree.event';

/**
 * Domain Service : Responsable de la création matérielle et irréversible
 * de la Délivrance de Certification.
 */
export class CertificateIssuanceService {
  /**
   * Fabrique l'acte de délivrance et génère l'événement de domaine associé.
   * Cet appel indique que toutes les vérifications d'éligibilité sont déjà passées.
   *
   * @param certification La Certification obtenue
   * @param learnerId L'identifiant de l'apprenant
   * @returns Un couple combinant l'entité (Délivrance) et l'événement (CertificationDelivreeEvent).
   */
  delivrer(
    certification: Certification,
    learnerId: string,
  ): { issuance: Issuance; event: CertificationDelivreeEvent } {
    // L'acte de délivrance doit être finalisé avec un UUID et une date (timestamp exact)
    const newDelivranceId = crypto.randomUUID();
    const dateDelivrance = new Date();

    // 1 - Création de l'Entité de Base de Données / Domaine (La trace)
    const issuance = new Issuance(
      newDelivranceId,
      certification.id,
      learnerId,
      dateDelivrance,
    );

    // 2 - Préparation de l'événement à annoncer pour les autres modules / microservices
    const event = new CertificationDelivreeEvent(
      newDelivranceId,
      certification.id,
      learnerId,
      dateDelivrance,
    );

    return { issuance, event };
  }
}
