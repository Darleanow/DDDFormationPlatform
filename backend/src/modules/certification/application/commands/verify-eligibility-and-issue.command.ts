import { ValidationCompetence } from '../../domain/value-objects/validation-competence.value-object';

export class VerifyEligibilityAndIssueCommand {
  constructor(
    public readonly learnerId: string,
    public readonly certificationId: string,
    public readonly scoreGlobal: number,
    public readonly validations: ValidationCompetence[],
  ) {}
}
