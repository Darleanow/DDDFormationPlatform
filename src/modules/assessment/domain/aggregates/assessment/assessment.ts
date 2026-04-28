import { AssessmentItem } from './assessment-item';

export class Assessment {
  constructor(
    private readonly id: string,
    private readonly competenceId: string,
    private readonly items: AssessmentItem[],
  ) {}

  getId(): string {
    return this.id;
  }

  getCompetenceId(): string {
    return this.competenceId;
  }

  getItems(): AssessmentItem[] {
    return [...this.items];
  }
}
