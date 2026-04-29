import { LearningPath } from '../entities/learning-path.entity';
import { Activity } from '../entities/activity.entity';
import { EstimatedLevel } from '../value-objects/estimated-level.vo';
import { CoverageConstraint } from '../value-objects/coverage-constraint.vo';
import { LearningPathCompletedEvent } from '../events/learning-path-completed.event';

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildPath(mandatoryIds: string[] = ['c1', 'c2']): LearningPath {
  return LearningPath.create({
    id: 'path-test',
    learnerId: 'learner-test',
    tenantId: 'tenant-test',
    targetCertificationId: 'cert-test-001',
    constraint: CoverageConstraint.from({ mandatoryCompetencyIds: mandatoryIds, weeklyHours: 10 }),
  });
}

function addAndCompleteActivity(
  path: LearningPath,
  id: string,
  competencyIds: string[],
  order: number,
): Activity {
  const activity = new Activity(id, `content-${id}`, 'ASSESSMENT', competencyIds, 1, order);
  path.addActivity(activity);
  activity.complete();
  return activity;
}

// ── checkCompletionStatus() ───────────────────────────────────────────────────

describe('LearningPath – checkCompletionStatus()', () => {
  it('returns false when the path has no activities', () => {
    const path = buildPath();
    expect(path.checkCompletionStatus()).toBe(false);
  });

  it('returns false when at least one activity is still PENDING', () => {
    const path = buildPath(['c1']);
    path.addActivity(new Activity('a1', 'content-a1', 'ASSESSMENT', ['c1'], 1, 0));
    path.updateLevel(EstimatedLevel.from('c1', 0.8));
    expect(path.checkCompletionStatus()).toBe(false);
  });

  it('returns false when no pending activities remain but a mandatory competence is not evaluated', () => {
    const path = buildPath(['c1', 'c2']);
    addAndCompleteActivity(path, 'a1', ['c1'], 0);
    path.updateLevel(EstimatedLevel.from('c1', 0.8));
    // c2 has no EstimatedLevel recorded
    expect(path.checkCompletionStatus()).toBe(false);
  });

  it('returns true when no pending activities remain and all mandatory competences are evaluated', () => {
    const path = buildPath(['c1', 'c2']);
    addAndCompleteActivity(path, 'a1', ['c1'], 0);
    addAndCompleteActivity(path, 'a2', ['c2'], 1);
    path.updateLevel(EstimatedLevel.from('c1', 0.8));
    path.updateLevel(EstimatedLevel.from('c2', 0.7));
    path.pullDomainEvents(); // flush addActivity events
    expect(path.checkCompletionStatus()).toBe(true);
  });

  it('returns true even when a mandatory competence score is insufficient (< 0.5)', () => {
    // Completion is about activity exhaustion + evaluation presence, not passing threshold.
    // BC5 handles the "pass/fail" decision.
    const path = buildPath(['c1']);
    addAndCompleteActivity(path, 'a1', ['c1'], 0);
    path.updateLevel(EstimatedLevel.from('c1', 0.3)); // failing score
    path.pullDomainEvents();
    expect(path.checkCompletionStatus()).toBe(true);
  });
});

// ── markCurrentActivityCompleted() ───────────────────────────────────────────

describe('LearningPath – markNextPendingIfContentIdMatches()', () => {
  it('completes only when contentId matches next pending activity', () => {
    const path = buildPath(['c1']);
    const a1 = new Activity('a1', 'lesson-a1', 'LESSON', ['c1'], 2, 0);
    const a2 = new Activity('a2', 'specific-assessment-id', 'ASSESSMENT', ['c1'], 1, 1);
    path.addActivity(a2);
    path.addActivity(a1);

    expect(path.markNextPendingIfContentIdMatches('wrong-id')).toBeUndefined();
    expect(a1.isPending()).toBe(true);

    expect(path.markNextPendingIfContentIdMatches('lesson-a1')).toBeDefined();
    expect(a1.isCompleted()).toBe(true);
    expect(a2.isPending()).toBe(true);
  });

  it('does not complete matching id when earlier activity is still pending', () => {
    const path = buildPath(['c1']);
    const lesson = new Activity('l1', 'l004', 'LESSON', ['c1'], 1, 0);
    const assess = new Activity('ev1', 'assessment:competence:c1', 'ASSESSMENT', ['c1'], 1, 1);
    path.addActivity(lesson);
    path.addActivity(assess);

    expect(
      path.markNextPendingIfContentIdMatches('assessment:competence:c1'),
    ).toBeUndefined();
    expect(lesson.isPending()).toBe(true);
    expect(assess.isPending()).toBe(true);
  });
});

describe('LearningPath – markCurrentActivityCompleted()', () => {
  it('marks the lowest-order pending activity as COMPLETED', () => {
    const path = buildPath(['c1']);
    const a1 = new Activity('a1', 'content-a1', 'LESSON', ['c1'], 2, 0);
    const a2 = new Activity('a2', 'content-a2', 'ASSESSMENT', ['c1'], 1, 1);
    path.addActivity(a2);
    path.addActivity(a1); // order global: LESSON puis ASSESSMENT

    path.markCurrentActivityCompleted();

    expect(a1.isCompleted()).toBe(true);
    expect(a2.isPending()).toBe(true);
  });

  it('is a no-op when no activity is pending', () => {
    const path = buildPath(['c1']);
    // No activities at all — should not throw
    expect(() => path.markCurrentActivityCompleted()).not.toThrow();
  });
});

// ── completePath() ────────────────────────────────────────────────────────────

describe('LearningPath – completePath()', () => {
  it('throws when the path has pending activities', () => {
    const path = buildPath(['c1']);
    path.addActivity(new Activity('a1', 'content-a1', 'ASSESSMENT', ['c1'], 1, 0));
    path.updateLevel(EstimatedLevel.from('c1', 0.8));
    expect(() => path.completePath()).toThrow(/cannot be completed/);
  });

  it('throws when a mandatory competence has no recorded level', () => {
    const path = buildPath(['c1', 'c2']);
    addAndCompleteActivity(path, 'a1', ['c1'], 0);
    path.updateLevel(EstimatedLevel.from('c1', 0.8));
    // c2 not evaluated
    expect(() => path.completePath()).toThrow(/cannot be completed/);
  });

  it('emits exactly one LearningPathCompletedEvent', () => {
    const path = buildPath(['c1', 'c2']);
    addAndCompleteActivity(path, 'a1', ['c1'], 0);
    addAndCompleteActivity(path, 'a2', ['c2'], 1);
    path.updateLevel(EstimatedLevel.from('c1', 0.8));
    path.updateLevel(EstimatedLevel.from('c2', 0.6));
    path.pullDomainEvents(); // flush setup events

    path.completePath();

    const events = path.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(LearningPathCompletedEvent);
  });

  it('sets learningPathId, learnerId and targetCertificationId correctly', () => {
    const path = buildPath(['c1']);
    addAndCompleteActivity(path, 'a1', ['c1'], 0);
    path.updateLevel(EstimatedLevel.from('c1', 0.8));
    path.pullDomainEvents();

    path.completePath();

    const [event] = path.pullDomainEvents() as LearningPathCompletedEvent[];
    expect(event.learningPathId).toBe('path-test');
    expect(event.learnerId).toBe('learner-test');
    expect(event.targetCertificationId).toBe('cert-test-001');
  });

  it('calculates globalScore as the average of all competence scores', () => {
    const path = buildPath(['c1', 'c2']);
    addAndCompleteActivity(path, 'a1', ['c1'], 0);
    addAndCompleteActivity(path, 'a2', ['c2'], 1);
    path.updateLevel(EstimatedLevel.from('c1', 0.8));  // 80%
    path.updateLevel(EstimatedLevel.from('c2', 0.4));  // 40%
    path.pullDomainEvents();

    path.completePath();

    const [event] = path.pullDomainEvents() as LearningPathCompletedEvent[];
    expect(event.globalScore).toBeCloseTo(0.6, 5); // (0.8 + 0.4) / 2
  });

  it('includes all evaluated competences in the payload', () => {
    const path = buildPath(['c1', 'c2']);
    addAndCompleteActivity(path, 'a1', ['c1'], 0);
    addAndCompleteActivity(path, 'a2', ['c2'], 1);
    path.updateLevel(EstimatedLevel.from('c1', 0.8));
    path.updateLevel(EstimatedLevel.from('c2', 0.4));
    path.pullDomainEvents();

    path.completePath();

    const [event] = path.pullDomainEvents() as LearningPathCompletedEvent[];
    expect(event.competencyResults).toHaveLength(2);
    expect(event.competencyResults.map((c) => c.competencyId)).toEqual(
      expect.arrayContaining(['c1', 'c2']),
    );
  });

  it('carries raw scores for each competence (certification rules belong to BC5)', () => {
    const path = buildPath(['c1', 'c2']);
    addAndCompleteActivity(path, 'a1', ['c1'], 0);
    addAndCompleteActivity(path, 'a2', ['c2'], 1);
    path.updateLevel(EstimatedLevel.from('c1', 0.8));
    path.updateLevel(EstimatedLevel.from('c2', 0.45));
    path.pullDomainEvents();

    path.completePath();

    const [event] = path.pullDomainEvents() as LearningPathCompletedEvent[];
    const c1 = event.competencyResults.find((c) => c.competencyId === 'c1')!;
    const c2 = event.competencyResults.find((c) => c.competencyId === 'c2')!;
    expect(c1.score).toBe(0.8);
    expect(c2.score).toBe(0.45);
  });
});
