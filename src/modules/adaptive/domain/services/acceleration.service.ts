import { LearningPath } from '../entities/learning-path.entity';
import { EstimatedLevel } from '../value-objects/estimated-level.vo';

export class AccelerationService {
  /**
   * Skip activities where skills are mastered already
   */
  applyIfEligible(path: LearningPath, level: EstimatedLevel): boolean {
    if (!level.canAccelerate()) return false;

    path.skipActivitiesForCompetences([level.getCompetenceId()]);
    return true;
  }
}
