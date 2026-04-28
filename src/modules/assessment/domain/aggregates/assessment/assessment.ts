import { AssessmentItem } from './assessment-item';

export type AssessmentType = 'FORMATIVE' | 'CERTIFICATIVE';

export class Assessment {
  constructor(
    private readonly id: string,
    private readonly items: AssessmentItem[],
    private readonly type: AssessmentType = 'FORMATIVE',
    private readonly targetCertificationId?: string,
  ) {}

  getId(): string {
    return this.id;
  }

  getItems(): AssessmentItem[] {
    return [...this.items];
  }

  getType(): AssessmentType {
    return this.type;
  }

  getTargetCertificationId(): string | undefined {
    return this.targetCertificationId;
  }
}
