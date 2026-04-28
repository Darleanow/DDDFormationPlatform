import { AssessmentAttempt } from '../../../domain/aggregates/assessment/assessment-attempt';
import { AssessmentAttemptRepository } from '../../../domain/repositories/assessment-attempt-repository';

export class InMemoryAssessmentAttemptRepository
  implements AssessmentAttemptRepository
{
  private readonly store = new Map<string, AssessmentAttempt>();

  async findById(id: string): Promise<AssessmentAttempt | null> {
    return this.store.get(id) ?? null;
  }

  async save(attempt: AssessmentAttempt): Promise<void> {
    this.store.set(attempt.getId(), attempt);
  }
}
