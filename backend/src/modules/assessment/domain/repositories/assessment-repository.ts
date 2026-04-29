import { Assessment } from '../aggregates/assessment/assessment';

export const ASSESSMENT_REPOSITORY = Symbol('ASSESSMENT_REPOSITORY');

export interface AssessmentRepository {
  findById(id: string): Promise<Assessment | null>;
  save(assessment: Assessment): Promise<void>;
}
