import * as crypto from 'crypto';
import { Certification } from '../entities/certification.entity';
import { Issuance } from '../entities/issuance.entity';
import { CertificationIssuedEvent } from '../events/certification-issued.event';

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
   * @returns Issuance aggregate + CertificationIssuedEvent for downstream BCs.
   */
  issue(
    certification: Certification,
    learnerId: string,
  ): { issuance: Issuance; event: CertificationIssuedEvent } {
    const issuanceId = crypto.randomUUID();
    const issuedAt = new Date();

    const issuance = new Issuance(
      issuanceId,
      certification.id,
      learnerId,
      issuedAt,
    );

    const event = new CertificationIssuedEvent(
      issuanceId,
      certification.id,
      learnerId,
      issuedAt,
    );

    return { issuance, event };
  }
}
