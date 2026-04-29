import { ConstraintSolverService } from './constraint-solver.service';
import { LearningPath } from '../entities/learning-path.entity';
import { CoverageConstraint } from '../value-objects/coverage-constraint.vo';
import { Activity } from '../entities/activity.entity';

describe('ConstraintSolverService', () => {
  let solver: ConstraintSolverService;

  beforeEach(() => {
    solver = new ConstraintSolverService();
  });

  describe('solve', () => {
    it('returns feasible if no uncovered competencies are required', () => {
      const path = LearningPath.create({
        id: 'path-123',
        learnerId: 'learner-1',
        tenantId: 'tenant-1',
        constraint: CoverageConstraint.from({
          mandatoryCompetencyIds: [],
          weeklyHours: 10,
        }),
      });
      // All mandatory covered = yes because there are none.

      const result = solver.solve(path);
      expect(result.scheduleFeasible).toBe(true);
    });

    it('returns scheduleFeasible true when mandatory competencies are still uncovered but no deadline / enough capacity', () => {
      const path = LearningPath.create({
        id: 'path-456',
        learnerId: 'learner-1',
        tenantId: 'tenant-1',
        constraint: CoverageConstraint.from({
          mandatoryCompetencyIds: ['c-a', 'c-b'],
          weeklyHours: 10,
        }),
      });
      const pending = new Activity(
        'act-u',
        'lesson-u',
        'LESSON',
        ['c-a'],
        1,
        0,
      );
      path.addActivity(pending);

      const result = solver.solve(path);
      expect(result.uncoveredMandatoryCompetences).toContain('c-a');
      expect(result.uncoveredMandatoryCompetences).toContain('c-b');
      expect(result.scheduleFeasible).toBe(true);
    });

    it('returns infeasible if there are uncovered mandatory competencies and not enough time', () => {
      // Mocking isCoverageFeasible to false
      const path = LearningPath.create({
        id: 'path-123',
        learnerId: 'learner-1',
        tenantId: 'tenant-1',
        constraint: CoverageConstraint.from({
          mandatoryCompetencyIds: ['c1', 'c2'],
          weeklyHours: 1, // Only 1 hr / week 
        }),
      });

      // Let's add activities that take way more time
      const act1 = new Activity('act-1', 'content-1', 'LESSON', ['c1'], 2, 1);
      const act2 = new Activity('act-2', 'content-2', 'LESSON', ['c2'], 2, 2);
      path.addActivity(act1);
      path.addActivity(act2);

      // Force mock path.isCoverageFeasible 
      jest.spyOn(path, 'isCoverageFeasible').mockReturnValue(false);

      const result = solver.solve(path);
      expect(result.scheduleFeasible).toBe(false);
      expect(result.uncoveredMandatoryCompetences).toEqual(['c1', 'c2']);
    });
  });

  describe('prioritizeMandatory', () => {
    it('does not reorder if there are no mandatory uncovered competencies', () => {
      const path = LearningPath.create({
        id: 'path-ordered',
        learnerId: 'learner-1',
        tenantId: 'tenant-1',
        constraint: CoverageConstraint.from({
          mandatoryCompetencyIds: [],
          weeklyHours: 10,
        }),
      });
      
      const act1 = new Activity('act-1', 'content-1', 'LESSON', ['c1'], 1, 1);
      const act2 = new Activity('act-2', 'content-2', 'LESSON', ['c2'], 1, 2);
      path.addActivity(act1);
      path.addActivity(act2);
      
      solver.prioritizeMandatory(path);
      
      expect(path.getActivities()[0].id).toBe('act-1');
      expect(path.getActivities()[1].id).toBe('act-2');
    });

    it('prioritizes activities with mandatory uncovered competencies over non-mandatory ones', () => {
      const path = LearningPath.create({
        id: 'path-ordered',
        learnerId: 'learner-1',
        tenantId: 'tenant-1',
        constraint: CoverageConstraint.from({
          mandatoryCompetencyIds: ['c2'], // c2 is mandatory uncovered
          weeklyHours: 10,
        }),
      });
      
      const act1 = new Activity('act-1', 'content-1', 'LESSON', ['c1'], 1, 1);
      const act2 = new Activity('act-2', 'content-2', 'LESSON', ['c2'], 1, 2);
      path.addActivity(act1);
      path.addActivity(act2);

      // We expect act2 to be prioritized ahead of act1
      solver.prioritizeMandatory(path);
      
      const activities = path.getActivities();
      expect(activities[0].id).toBe('act-2');
      expect(activities[1].id).toBe('act-1');
      // Orders should be updated too
      expect(activities[0].order).toBe(0);
      expect(activities[1].order).toBe(1);
    });

    it('keeps completed activities at their places when prioritizing', () => {
      const path = LearningPath.create({
        id: 'path-ordered',
        learnerId: 'learner-1',
        tenantId: 'tenant-1',
        constraint: CoverageConstraint.from({
          mandatoryCompetencyIds: ['c3'], 
          weeklyHours: 10,
        }),
      });
      
      const act1 = new Activity('act-1', 'content-1', 'LESSON', ['c1'], 1, 1);
      path.addActivity(act1);
      path.markCurrentActivityCompleted(); // act1 becomes COMPLETED

      const act2 = new Activity('act-2', 'content-2', 'LESSON', ['c2'], 1, 2);
      const act3 = new Activity('act-3', 'content-3', 'LESSON', ['c3'], 1, 3);
      path.addActivity(act2);
      path.addActivity(act3);

      // Expected: act1 (completed), act3 (mandatory), act2 (non-mandatory)
      solver.prioritizeMandatory(path);
      
      const activities = path.getActivities();
      expect(activities[0].id).toBe('act-1');
      expect(activities[0].status.value).toBe('COMPLETED');
      expect(activities[1].id).toBe('act-3');
      expect(activities[2].id).toBe('act-2');
    });
  });
});
