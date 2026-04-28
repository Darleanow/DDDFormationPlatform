import { CompetencyId } from '../../../../shared/competency-id';

/** Per-competency pass/fail snapshot for certification eligibility (BC5). */
export class ValidationCompetence {
  constructor(
    public readonly competencyId: CompetencyId,
    public readonly isValidated: boolean,
  ) {}

  equals(other: ValidationCompetence): boolean {
    if (!other) {
      return false;
    }
    return (
      this.competencyId === other.competencyId &&
      this.isValidated === other.isValidated
    );
  }
}
