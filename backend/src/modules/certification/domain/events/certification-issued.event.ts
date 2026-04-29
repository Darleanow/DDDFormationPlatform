import { BC_INPROCESS_EVENT } from '../../../../shared/bc-integration/in-process-events';

/**
 * Domain event emitted when a certificate has effectively been issued.
 * Other bounded contexts subscribe (e.g. Identity public learner profile).
 *
 * Glossaire métier FR : Délivrance — align this event's meaning with Ubiquitous Language docs.
 */
export class CertificationIssuedEvent {
  static readonly EVENT_NAME = BC_INPROCESS_EVENT.CERTIFICATION_ISSUED;

  constructor(
    public readonly issuanceId: string,
    public readonly certificationId: string,
    public readonly learnerId: string,
    public readonly issuedAt: Date,
  ) {}
}
