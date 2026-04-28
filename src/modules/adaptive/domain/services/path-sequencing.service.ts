import { randomUUID } from 'crypto';
import { LearningPath } from '../entities/learning-path.entity';
import { Activity } from '../entities/activity.entity';

/** BC3 — Path sequencing: builds the initial ordered sequence from catalogue content. */
export class PathSequencingService {
  /**
   * Builds initial sequence from catalogue
   */
  buildInitialSequence(
    path: LearningPath,
    catalogActivities: Array<{
      contentId: string;
      competenceIds: string[];
      estimatedHours: number;
      type: 'LESSON' | 'EXERCISE' | 'ASSESSMENT';
    }>,
  ): void {
    catalogActivities.forEach((item, index) => {
      const activity = new Activity(
        randomUUID(),
        item.contentId,
        item.type,
        item.competenceIds,
        item.estimatedHours,
        index,
      );
      path.addActivity(activity);
    });
  }
}
