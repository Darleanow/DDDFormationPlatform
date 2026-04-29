import { AssessmentItem } from '../../../domain/aggregates/assessment/assessment-item';
import { AssessmentItemRepository } from '../../../domain/repositories/assessment-item-repository';

export class InMemoryAssessmentItemRepository
  implements AssessmentItemRepository
{
  private readonly store = new Map<string, AssessmentItem[]>();

  constructor(initialData?: Record<string, AssessmentItem[]>) {
    if (initialData) {
      for (const [competencyId, items] of Object.entries(initialData)) {
        this.store.set(competencyId, [...items]);
      }
    }
  }

  async findByCompetencyId(competencyId: string): Promise<AssessmentItem[]> {
    return this.store.get(competencyId) ?? [];
  }

  seed(competencyId: string, items: AssessmentItem[]): void {
    this.store.set(competencyId, [...items]);
  }
}
