import { randomUUID } from 'crypto';
import { LearningPath } from '../entities/learning-path.entity';
import { Activity } from '../entities/activity.entity';
import { EstimatedLevel } from '../value-objects/estimated-level.vo';

export class RemediationService {
  /**
   * Evaluates if a remediation is necessary and adds it
   */
  applyIfNeeded(
    path: LearningPath,
    level: EstimatedLevel,
    remediationContent: {
      contentId: string;
      estimatedHours: number;
    },
  ): boolean {
    if (!level.needsRemediation()) return false;

    const currentActivity = path.getNextPendingActivity();
    if (!currentActivity) return false;

    const remediation = new Activity(
      randomUUID(),
      remediationContent.contentId,
      'REMEDIATION',
      [level.getCompetencyId()],
      remediationContent.estimatedHours,
      currentActivity.order, // Inserts before next activity
    );

    path.insertRemediationAfter(currentActivity.order - 1, remediation);
    return true;
  }
}
