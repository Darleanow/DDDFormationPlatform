import { LearningPath } from '../entities/learning-path.entity';
import { CoverageConstraint } from '../value-objects/coverage-constraint.vo';
import { PathSequencingService } from './path-sequencing.service';

describe('PathSequencingService', () => {
  it('builds the initial sequence from catalog activities', () => {
    const path = LearningPath.create({
      id: 'path-1',
      learnerId: 'learner-1',
      tenantId: 'tenant-1',
      constraint: CoverageConstraint.from({
        mandatoryCompetencyIds: ['c1'],
        weeklyHours: 5,
      }),
    });

    const service = new PathSequencingService();

    service.buildInitialSequence(path, [
      {
        contentId: 'content-1',
        competencyIds: ['c1'],
        estimatedHours: 2,
        type: 'LESSON',
      },
      {
        contentId: 'content-2',
        competencyIds: ['c2'],
        estimatedHours: 1,
        type: 'EXERCISE',
      },
    ]);

    const activities = path.getActivities();

    expect(activities).toHaveLength(2);
    expect(activities[0].contentId).toBe('content-1');
    expect(activities[0].order).toBe(0);
    expect(activities[1].contentId).toBe('content-2');
    expect(activities[1].order).toBe(1);
  });
});
