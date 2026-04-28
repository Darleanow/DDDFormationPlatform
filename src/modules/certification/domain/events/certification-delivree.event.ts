/**
 * Événement du domaine publié lorsqu'un certificat a été effectivement délivré.
 * En DDD, cet événement prévient les autres BC (ex: BC Identity pour enrichir le profil public de l'apprenant).
 */
export class CertificationDelivreeEvent {
  constructor(
    public readonly delivranceId: string,
    public readonly certificationId: string,
    public readonly learnerId: string,
    public readonly dateDelivrance: Date,
  ) {}
}
