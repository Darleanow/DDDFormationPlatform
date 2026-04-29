import { LearningPath } from '../entities/learning-path.entity';
import { EstimatedLevel } from '../value-objects/estimated-level.vo';

export class AccelerationService {
  /**
   * Skip redundant content when the learner has passed three consecutive assessments
   * with a score strictly above 90% (spec Adaptive Engine).
   */
  applyIfEligible(path: LearningPath, level: EstimatedLevel): boolean {
    if (!path.shouldAccelerateAfterConsecutiveHighScores()) return false;

    path.skipActivitiesForCompetences([level.getCompetencyId()]);
    path.resetAccelerationStreak();
    return true;
  }
}
