import { AssessmentItem } from '../../../domain/aggregates/assessment/assessment-item';
import { AssessmentItemRepository } from '../../../domain/repositories/assessment-item-repository';

export class InMemoryAssessmentItemRepository
  implements AssessmentItemRepository
{
  private readonly store = new Map<string, AssessmentItem[]>();

  constructor(initialData?: Record<string, AssessmentItem[]>) {
    if (initialData) {
      for (const [skillId, items] of Object.entries(initialData)) {
        this.store.set(skillId, [...items]);
      }
    }
  }

  async findBySkillId(skillId: string): Promise<AssessmentItem[]> {
    return this.store.get(skillId) ?? [];
  }

  seed(skillId: string, items: AssessmentItem[]): void {
    this.store.set(skillId, [...items]);
  }
}
