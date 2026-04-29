import { AssessmentAttempt } from '../aggregates/assessment/assessment-attempt';

export const ASSESSMENT_ATTEMPT_REPOSITORY = Symbol(
  'ASSESSMENT_ATTEMPT_REPOSITORY',
);

export interface AssessmentAttemptRepository {
  findById(id: string): Promise<AssessmentAttempt | null>;
  save(attempt: AssessmentAttempt): Promise<void>;
}
