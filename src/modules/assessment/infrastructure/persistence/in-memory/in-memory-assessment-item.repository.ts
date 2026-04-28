import { AssessmentItem } from '../../../domain/aggregates/assessment/assessment-item';
import { AssessmentItemRepository } from '../../../domain/repositories/assessment-item-repository';

export class InMemoryAssessmentItemRepository
  implements AssessmentItemRepository
{
  private readonly store = new Map<string, AssessmentItem[]>();

  constructor(initialData?: Record<string, AssessmentItem[]>) {
    if (initialData) {
      for (const [competenceId, items] of Object.entries(initialData)) {
        this.store.set(competenceId, [...items]);
      }
    }
  }

  async findByCompetenceId(competenceId: string): Promise<AssessmentItem[]> {
    return this.store.get(competenceId) ?? [];
  }

  seed(competenceId: string, items: AssessmentItem[]): void {
    this.store.set(competenceId, [...items]);
  }
}
