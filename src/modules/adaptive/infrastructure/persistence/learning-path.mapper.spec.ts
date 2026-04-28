import { LearningPath } from '../../domain/entities/learning-path.entity';
import { Activity } from '../../domain/entities/activity.entity';
import { CoverageConstraint } from '../../domain/value-objects/coverage-constraint.vo';
import { EstimatedLevel } from '../../domain/value-objects/estimated-level.vo';
import { LearningPathMapper } from './learning-path.mapper';
import { LearningPathOrmEntity } from './learning-path.orm-entity';

describe('LearningPathMapper', () => {
  it('round-trips a learning path with estimated levels and activities', () => {
    const path = LearningPath.create({
      id: 'path-1',
      learnerId: 'learner-1',
      tenantId: 'tenant-1',
      constraint: CoverageConstraint.from({
        mandatoryCompetenceIds: ['c1'],
        weeklyHours: 5,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    });

    path.addActivity(new Activity('activity-1', 'content-1', 'LESSON', ['c1'], 2, 1));
    path.updateLevel(EstimatedLevel.from('c1', 0.6));

    const ormEntity = LearningPathMapper.toOrm(path);
    expect(ormEntity.mandatoryCompetenceIds).toEqual(['c1']);
    expect(ormEntity.estimatedLevels).toEqual([{ competenceId: 'c1', score: 0.6 }]);
    expect(ormEntity.activities).toHaveLength(1);

    const restored = LearningPathMapper.toDomain(ormEntity as LearningPathOrmEntity);
    expect(restored.id).toBe(path.id);
    expect(restored.getActivities()).toHaveLength(1);
    expect(restored.getLevelFor('c1')?.value()).toBe(0.6);
  });
});
