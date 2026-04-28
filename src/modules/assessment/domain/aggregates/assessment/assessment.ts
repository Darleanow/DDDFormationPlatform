import { AssessmentItem } from './assessment-item';

export class Assessment {
  constructor(
    private readonly id: string,
    private readonly items: AssessmentItem[],
  ) {}

  getId(): string {
    return this.id;
  }

  getItems(): AssessmentItem[] {
    return [...this.items];
  }
}
