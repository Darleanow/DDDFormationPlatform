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
    constraint: CoverageConstraint.from({ mandatoryCompetenceIds: mandatoryIds, weeklyHours: 10 }),
  });
}

function addAndCompleteActivity(
  path: LearningPath,
  id: string,
  competenceIds: string[],
  order: number,
): Activity {
  const activity = new Activity(id, `content-${id}`, 'ASSESSMENT', competenceIds, 1, order);
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

describe('LearningPath – markCurrentActivityCompleted()', () => {
  it('marks the lowest-order pending activity as COMPLETED', () => {
    const path = buildPath(['c1']);
    const a1 = new Activity('a1', 'content-a1', 'LESSON', ['c1'], 2, 0);
    const a2 = new Activity('a2', 'content-a2', 'ASSESSMENT', ['c1'], 1, 1);
    path.addActivity(a1);
    path.addActivity(a2);

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
    expect(event.competences).toHaveLength(2);
    expect(event.competences.map(c => c.competenceId)).toEqual(
      expect.arrayContaining(['c1', 'c2']),
    );
  });

  it('flags competences with score < 0.5 as isCriticalFailure = true', () => {
    const path = buildPath(['c1', 'c2']);
    addAndCompleteActivity(path, 'a1', ['c1'], 0);
    addAndCompleteActivity(path, 'a2', ['c2'], 1);
    path.updateLevel(EstimatedLevel.from('c1', 0.8));  // passes
    path.updateLevel(EstimatedLevel.from('c2', 0.45)); // insufficient → critical failure
    path.pullDomainEvents();

    path.completePath();

    const [event] = path.pullDomainEvents() as LearningPathCompletedEvent[];
    const c1 = event.competences.find(c => c.competenceId === 'c1')!;
    const c2 = event.competences.find(c => c.competenceId === 'c2')!;
    expect(c1.isCriticalFailure).toBe(false);
    expect(c2.isCriticalFailure).toBe(true);
  });

  it('isCriticalFailure is false when score is exactly 0.5', () => {
    const path = buildPath(['c1']);
    addAndCompleteActivity(path, 'a1', ['c1'], 0);
    path.updateLevel(EstimatedLevel.from('c1', 0.5)); // boundary — not insufficient
    path.pullDomainEvents();

    path.completePath();

    const [event] = path.pullDomainEvents() as LearningPathCompletedEvent[];
    expect(event.competences[0].isCriticalFailure).toBe(false);
  });
});
