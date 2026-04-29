import { LearningPath } from '../entities/learning-path.entity';
import { EstimatedLevel } from '../value-objects/estimated-level.vo';

export class AccelerationService {
  /**
   * Skip redundant content when the learner has passed three consecutive assessments
   * with a score strictly above 90% (spec Adaptive Engine).
   */
  applyIfEligible(path: LearningPath, level: EstimatedLevel): boolean {
    if (!path.shouldAccelerateAfterConsecutiveHighScores()) return false;

    const competencyId = level.getCompetencyId();

    path.skipActivitiesForCompetences([competencyId]);
    let nSurrogate = path.skipLessonAndExerciseReferencingCompetency(competencyId, 24);
    if (nSurrogate === 0) {
      path.skipFirstPendingLessonOrExerciseBlocks(4);
    }

    path.resetAccelerationStreak();
    return true;
  }
}
