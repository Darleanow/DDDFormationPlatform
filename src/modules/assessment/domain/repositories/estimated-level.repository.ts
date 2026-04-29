import { CompetencyId } from '../../../../shared/competency-id';
import { EstimatedLevel } from '../aggregates/estimated-level/estimated-level.aggregate';

export interface EstimatedLevelRepository {
  findByLearnerAndCompetency(learnerId: string, competencyId: CompetencyId): Promise<EstimatedLevel | null>;
  save(estimatedLevel: EstimatedLevel): Promise<void>;
}

export const ESTIMATED_LEVEL_REPOSITORY = Symbol('ESTIMATED_LEVEL_REPOSITORY');
