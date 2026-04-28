import { LearningPath } from '../../domain/entities/learning-path.entity';
import { Activity } from '../../domain/entities/activity.entity';
import { CoverageConstraint } from '../../domain/value-objects/coverage-constraint.vo';
import { ActivityOrmEntity } from './activity.orm-entity';
import { LearningPathOrmEntity } from './learning-path.orm-entity';
import { ActivityStatus } from '../../domain/value-objects/activity-status.vo';
import { EstimatedLevel } from '../../domain/value-objects/estimated-level.vo';

export class LearningPathMapper {
  static toDomain(entity: LearningPathOrmEntity): LearningPath {
    const constraint = CoverageConstraint.from({
      mandatoryCompetencyIds: entity.mandatoryCompetencyIds,
      weeklyHours: entity.weeklyHours,
      deadlineAt: entity.deadlineAt ?? undefined,
    });

    const levels = (entity.estimatedLevels ?? []).map((level) =>
      EstimatedLevel.from(level.competencyId, level.score),
    );

    const activities = (entity.activities ?? [])
      .map(
        (a) =>
          new Activity(
            a.id,
            a.contentId,
            a.type as any,
            a.competenceIds,
            a.estimatedHours,
            a.order,
            ActivityStatus.fromString(a.status),
          ),
      )
      .sort((a, b) => a.order - b.order);

    return LearningPath.reconstitute({
      id: entity.id,
      learnerId: entity.learnerId,
      tenantId: entity.tenantId,
      constraint,
      activities,
      levels,
    });
  }

  static toOrm(path: LearningPath): LearningPathOrmEntity {
    const entity = new LearningPathOrmEntity();
    entity.id = path.id;
    entity.learnerId = path.learnerId;
    entity.tenantId = path.tenantId;
    entity.weeklyHours = path.getConstraint().getWeeklyHours();
    entity.deadlineAt = path.getConstraint().getDeadline();
    entity.mandatoryCompetencyIds = path
      .getConstraint()
      .getMandatoryCompetencyIds();
    entity.activities = path.getActivities().map((activity) => {
      const activityEntity = new ActivityOrmEntity();
      activityEntity.id = activity.id;
      activityEntity.contentId = activity.contentId;
      activityEntity.type = activity.type;
      activityEntity.competenceIds = activity.competenceIds;
      activityEntity.estimatedHours = activity.estimatedHours;
      activityEntity.order = activity.order;
      activityEntity.status = activity.getStatus().toString();
      activityEntity.learningPath = entity;
      return activityEntity;
    });
    entity.estimatedLevels = path.getLevels().map((level) => ({
      competencyId: level.getCompetencyId(),
      score: level.value(),
    }));
    return entity;
  }
}
