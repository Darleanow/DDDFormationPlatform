import { Assessment } from '../../../domain/aggregates/assessment/assessment';
import { AssessmentRepository } from '../../../domain/repositories/assessment-repository';

export class InMemoryAssessmentRepository implements AssessmentRepository {
  private readonly store = new Map<string, Assessment>();

  async findById(id: string): Promise<Assessment | null> {
    return this.store.get(id) ?? null;
  }

  async save(assessment: Assessment): Promise<void> {
    this.store.set(assessment.getId(), assessment);
  }
}
