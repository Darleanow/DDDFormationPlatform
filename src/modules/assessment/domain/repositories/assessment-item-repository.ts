import { AssessmentItem } from '../aggregates/assessment/assessment-item';

export const ASSESSMENT_ITEM_REPOSITORY = Symbol('ASSESSMENT_ITEM_REPOSITORY');

export interface AssessmentItemRepository {
  findByCompetencyId(competencyId: string): Promise<AssessmentItem[]>;
}
