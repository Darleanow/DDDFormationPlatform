import { LearningPath } from '../entities/learning-path.entity';
import { Activity } from '../entities/activity.entity';
import { EstimatedLevel } from '../value-objects/estimated-level.vo';
import { CoverageConstraint } from '../value-objects/coverage-constraint.vo';
import { RemediationService } from './remediation.service';
import { AccelerationService } from './acceleration.service';
import { ConstraintSolverService } from './constraint-solver.service';
import { AssessmentAcl, AssessmentResultPayload } from '../../infrastructure/acl/assessment-acl';

describe('Adaptive domain services', () => {
  describe('RemediationService', () => {
    it('inserts remediation before the next planned activity when score is insufficient', () => {
      const path = LearningPath.create({
        id: 'path-1',
        learnerId: 'learner-1',
        tenantId: 'tenant-1',
        constraint: CoverageConstraint.from({
          mandatoryCompetenceIds: ['algorithmique-recursive'],
          weeklyHours: 10,
        }),
      });

      path.addActivity(new Activity('activity-1', 'content-1', 'LESSON', ['algorithmique-recursive'], 2, 1));
      path.addActivity(new Activity('activity-2', 'content-2', 'EXERCISE', ['algorithmique-recursive'], 2, 2));

      const service = new RemediationService();
      const level = EstimatedLevel.from('algorithmique-recursive', 0.4);

      const result = service.applyIfNeeded(path, level, {
        contentId: 'remediation-1',
        estimatedHours: 1,
      });

      expect(result).toBe(true);
      const activities = path.getActivities();
      expect(activities[0].type).toBe('REMEDIATION');
      expect(activities[0].competenceIds).toEqual(['algorithmique-recursive']);
      expect(activities[1].id).toBe('activity-1');
      expect(activities[2].id).toBe('activity-2');
    });

    it('does not insert remediation when score is 0.75 or higher', () => {
      const path = LearningPath.create({
        id: 'path-2',
        learnerId: 'learner-2',
        tenantId: 'tenant-2',
        constraint: CoverageConstraint.from({
          mandatoryCompetenceIds: ['c1'],
          weeklyHours: 10,
        }),
      });

      path.addActivity(new Activity('activity-2', 'content-2', 'EXERCISE', ['c1'], 2, 1));
      const service = new RemediationService();
      const level = EstimatedLevel.from('c1', 0.75);

      const result = service.applyIfNeeded(path, level, {
        contentId: 'remediation-2',
        estimatedHours: 1,
      });

      expect(result).toBe(false);
      expect(path.getActivities().some(activity => activity.type === 'REMEDIATION')).toBe(false);
    });
  });

  describe('AccelerationService', () => {
    it('skips same-competence pending activities and recommends the next available module', () => {
      const path = LearningPath.create({
        id: 'path-3',
        learnerId: 'learner-3',
        tenantId: 'tenant-3',
        constraint: CoverageConstraint.from({
          mandatoryCompetenceIds: ['algorithmique-recursive'],
          weeklyHours: 10,
        }),
      });

      path.addActivity(new Activity('activity-3', 'content-3', 'LESSON', ['algorithmique-recursive'], 1, 1));
      path.addActivity(new Activity('activity-4', 'content-4', 'EXERCISE', ['algorithmique-recursive'], 1, 2));
      path.addActivity(new Activity('activity-5', 'content-5', 'LESSON', ['programmation-fonctionnelle'], 2, 3));

      const service = new AccelerationService();
      const level = EstimatedLevel.from('algorithmique-recursive', 0.92);

      const result = service.applyIfEligible(path, level);

      expect(result).toBe(true);
      const skippedActivities = path.getActivities().filter(
        activity => activity.getStatus().toString() === 'SKIPPED',
      );
      expect(skippedActivities.map(a => a.id)).toEqual(['activity-3', 'activity-4']);
      const nextPending = path.getNextPendingActivity();
      expect(nextPending?.id).toBe('activity-5');
    });
  });

  describe('ConstraintSolverService', () => {
    it('returns feasible false when available hours are insufficient to cover mandatory competencies before deadline', () => {
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const path = LearningPath.create({
        id: 'path-4',
        learnerId: 'learner-4',
        tenantId: 'tenant-4',
        constraint: CoverageConstraint.from({
          mandatoryCompetenceIds: ['algorithmique-recursive'],
          weeklyHours: 2,
          deadlineAt: deadline,
        }),
      });

      path.addActivity(new Activity('activity-5', 'content-5', 'LESSON', ['algorithmique-recursive'], 10, 1));
      const service = new ConstraintSolverService();

      const result = service.solve(path);

      expect(result.feasible).toBe(false);
      if (!result.feasible) {
        expect(result.uncoveredCompetences).toContain('algorithmique-recursive');
        expect(result.alertMessage).toContain('Skill uncovered');
      }
    });

    it('prioritizes mandatory uncovered competencies when feasibility fails', () => {
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const path = LearningPath.create({
        id: 'path-5',
        learnerId: 'learner-5',
        tenantId: 'tenant-5',
        constraint: CoverageConstraint.from({
          mandatoryCompetenceIds: ['algorithmique-recursive'],
          weeklyHours: 2,
          deadlineAt: deadline,
        }),
      });

      path.addActivity(new Activity('activity-6', 'content-6', 'LESSON', ['programmation-fonctionnelle'], 2, 1));
      path.addActivity(new Activity('activity-7', 'content-7', 'EXERCISE', ['algorithmique-recursive'], 2, 2));
      const service = new ConstraintSolverService();

      service.prioritizeMandatory(path);
      const orderedIds = path.getActivities().map(activity => activity.id);
      expect(orderedIds[0]).toBe('activity-7');
      expect(orderedIds[1]).toBe('activity-6');
    });
  });

  describe('AssessmentAcl', () => {
    it('adjusts the raw score by difficulty and clamps it between 0 and 1', () => {
      const acl = new AssessmentAcl();
      const payload = new AssessmentResultPayload(
        'learner-5',
        'c1',
        0.6,
        0.7,
        'remediation-3',
        1,
      );

      const level = acl.translateResult(payload);

      expect(level.value()).toBeCloseTo(0.51, 2);
    });

    it('clamps adjusted scores outside range to 0 and 1', () => {
      const acl = new AssessmentAcl();
      const underflow = new AssessmentResultPayload(
        'learner-6',
        'c1',
        -0.4,
        0.2,
        'remediation-4',
        1,
      );
      const overflow = new AssessmentResultPayload(
        'learner-7',
        'c1',
        1.4,
        1,
        'remediation-5',
        1,
      );

      expect(acl.translateResult(underflow).value()).toBe(0);
      expect(acl.translateResult(overflow).value()).toBe(1);
    });
  });
});
