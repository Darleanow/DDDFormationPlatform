import { CompetenceId } from '../../../../shared/competence-id';

/**
 * Value Object représentant la validation (ou l'échec) d'une compétence pour un apprenant donné.
 * En DD, un Value Object est immuable.
 */
export class ValidationCompetence {
  constructor(
    public readonly competenceId: CompetenceId,
    public readonly estValidee: boolean,
  ) {}

  /**
   * Compare deux Value Objects sur la base de leurs attributs (et non leur référence en mémoire).
   */
  equals(other: ValidationCompetence): boolean {
    if (!other) {
      return false;
    }
    return (
      this.competenceId === other.competenceId &&
      this.estValidee === other.estValidee
    );
  }
}
