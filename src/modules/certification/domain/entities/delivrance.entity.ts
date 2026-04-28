/**
 * Entité représentant l'acte formel et irréversible de délivrance d'une certification.
 */
export class Delivrance {
  constructor(
    public readonly id: string,
    public readonly certificationId: string,
    public readonly learnerId: string,
    public readonly dateDelivrance: Date,
  ) {}
}
