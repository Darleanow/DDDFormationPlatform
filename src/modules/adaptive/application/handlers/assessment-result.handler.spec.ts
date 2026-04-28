import { AssessmentResultHandler } from './assessment-result.handler';
import { AssessmentAcl, AssessmentResultPayload } from '../../infrastructure/acl/assessment-acl';
import { RemediationService } from '../../domain/services/remediation.service';
import { AccelerationService } from '../../domain/services/acceleration.service';
import { ConstraintSolverService } from '../../domain/services/constraint-solver.service';
import { LearningPathRepository } from '../../domain/repositories/learning-path.repository';
import { LearningPath } from '../../domain/entities/learning-path.entity';
import { Activity } from '../../domain/entities/activity.entity';
import { CoverageConstraint } from '../../domain/value-objects/coverage-constraint.vo';
import { EstimatedLevel } from '../../domain/value-objects/estimated-level.vo';
import { LearningPathCompletedEvent } from '../../domain/events/learning-path-completed.event';

// ── Mock factory ──────────────────────────────────────────────────────────────

function buildCompletingPath(): LearningPath {
  // One activity left, one mandatory competence not yet evaluated
  // → after markCurrentActivityCompleted + updateLevel, checkCompletionStatus() = true
  const activity = new Activity('a-last', 'content-final', 'ASSESSMENT', ['c1'], 1, 0);

  const path = LearningPath.reconstitute({
    id: 'path-completion-test',
    learnerId: 'learner-eve',
    tenantId: 'tenant-test',
    targetCertificationId: 'cert-completion-test',
    constraint: CoverageConstraint.from({
      mandatoryCompetenceIds: ['c1'],
      weeklyHours: 10,
    }),
    activities: [activity],
    levels: [],
  });

  return path;
}

function buildNonCompletingPath(): LearningPath {
  // Two activities pending — path won't complete after one assessment
  const a1 = new Activity('a1', 'content-1', 'LESSON',    ['c1'], 2, 0);
  const a2 = new Activity('a2', 'content-2', 'ASSESSMENT', ['c1'], 1, 1);

  return LearningPath.reconstitute({
    id: 'path-ongoing',
    learnerId: 'learner-frank',
    tenantId: 'tenant-test',
    targetCertificationId: 'cert-ongoing',
    constraint: CoverageConstraint.from({
      mandatoryCompetenceIds: ['c1'],
      weeklyHours: 10,
    }),
    activities: [a1, a2],
    levels: [],
  });
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('AssessmentResultHandler', () => {
  let handler: AssessmentResultHandler;
  let acl: jest.Mocked<AssessmentAcl>;
  let remediation: jest.Mocked<RemediationService>;
  let acceleration: jest.Mocked<AccelerationService>;
  let solver: jest.Mocked<ConstraintSolverService>;
  let repo: jest.Mocked<LearningPathRepository>;
  let eventEmitter: { emit: jest.Mock };
  let catalogGateway: any;

  beforeEach(() => {
    acl         = { translateResult: jest.fn() } as any;
    remediation = { applyIfNeeded: jest.fn().mockReturnValue(false) } as any;
    acceleration = { applyIfEligible: jest.fn() } as any;
    solver      = { solve: jest.fn().mockReturnValue({ feasible: true }), prioritizeMandatory: jest.fn() } as any;
    repo        = { findByLearnerId: jest.fn(), save: jest.fn(), findById: jest.fn() } as any;
    eventEmitter = { emit: jest.fn() };
    catalogGateway = { findRemediationContent: jest.fn().mockResolvedValue({ contentId: 'rem-id', estimatedHours: 1 }) };

    handler = new AssessmentResultHandler(
      acl,
      remediation,
      acceleration,
      solver,
      repo,
      eventEmitter as any,
      catalogGateway,
    );
  });

  const basePayload = new AssessmentResultPayload(
    'learner-eve', 'c1', 0.9,
  );

  it('does nothing when no path is found for the learner', async () => {
    repo.findByLearnerId.mockResolvedValue(null);
    await handler.handle(basePayload);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('emits LearningPathCompletedEvent when the last assessment completes the path', async () => {
    const path = buildCompletingPath();
    repo.findByLearnerId.mockResolvedValue(path);

    // Score good enough that no remediation triggers, and path is completable
    acl.translateResult.mockReturnValue(EstimatedLevel.from('c1', 0.85));

    await handler.handle(basePayload);

    // The event should have been emitted
    const emittedNames = (eventEmitter.emit as jest.Mock).mock.calls.map(([name]) => name);
    expect(emittedNames).toContain('LearningPathCompletedEvent');

    // Retrieve the actual event object
    const completedCall = (eventEmitter.emit as jest.Mock).mock.calls.find(
      ([name]) => name === 'LearningPathCompletedEvent',
    );
    const emittedEvent: LearningPathCompletedEvent = completedCall![1];

    expect(emittedEvent).toBeInstanceOf(LearningPathCompletedEvent);
    expect(emittedEvent.learnerId).toBe('learner-eve');
    expect(emittedEvent.targetCertificationId).toBe('cert-completion-test');
    expect(emittedEvent.globalScore).toBeCloseTo(0.85, 5);
    expect(emittedEvent.competences[0].competenceId).toBe('c1');
    expect(emittedEvent.competences[0].isCriticalFailure).toBe(false);
  });

  it('sets isCriticalFailure = true in the event when score is insufficient', async () => {
    const path = buildCompletingPath();
    repo.findByLearnerId.mockResolvedValue(path);

    // Low score → insufficient
    acl.translateResult.mockReturnValue(EstimatedLevel.from('c1', 0.3));

    await handler.handle(basePayload);

    const completedCall = (eventEmitter.emit as jest.Mock).mock.calls.find(
      ([name]) => name === 'LearningPathCompletedEvent',
    );
    const emittedEvent: LearningPathCompletedEvent = completedCall![1];
    expect(emittedEvent.competences[0].isCriticalFailure).toBe(true);
  });

  it('does NOT emit LearningPathCompletedEvent when the path still has pending activities', async () => {
    const path = buildNonCompletingPath();
    repo.findByLearnerId.mockResolvedValue(path);
    acl.translateResult.mockReturnValue(EstimatedLevel.from('c1', 0.85));

    await handler.handle(basePayload);

    const emittedNames = (eventEmitter.emit as jest.Mock).mock.calls.map(([name]) => name);
    expect(emittedNames).not.toContain('LearningPathCompletedEvent');
  });

  it('skips remediation/acceleration when the path is complete', async () => {
    const path = buildCompletingPath();
    repo.findByLearnerId.mockResolvedValue(path);
    acl.translateResult.mockReturnValue(EstimatedLevel.from('c1', 0.85));

    await handler.handle(basePayload);

    expect(remediation.applyIfNeeded).not.toHaveBeenCalled();
    expect(acceleration.applyIfEligible).not.toHaveBeenCalled();
    expect(solver.solve).not.toHaveBeenCalled();
  });

  it('runs normal adaptive flow (remediation check) when path is not complete', async () => {
    const path = buildNonCompletingPath();
    repo.findByLearnerId.mockResolvedValue(path);
    acl.translateResult.mockReturnValue(EstimatedLevel.from('c1', 0.4)); // low score

    await handler.handle(basePayload);

    expect(catalogGateway.findRemediationContent).toHaveBeenCalledWith('c1');
    expect(remediation.applyIfNeeded).toHaveBeenCalled();
    expect(solver.solve).toHaveBeenCalled();
  });

  it('always persists the path regardless of completion status', async () => {
    const path = buildCompletingPath();
    repo.findByLearnerId.mockResolvedValue(path);
    acl.translateResult.mockReturnValue(EstimatedLevel.from('c1', 0.85));

    await handler.handle(basePayload);

    expect(repo.save).toHaveBeenCalledWith(path);
  });
});
