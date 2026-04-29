import { Activity } from './activity.entity';
import { EstimatedLevel } from '../value-objects/estimated-level.vo';
import { CoverageConstraint } from '../value-objects/coverage-constraint.vo';
import { RemediationTriggeredEvent } from '../events/remediation-triggered.event';
import { PathUpdatedEvent } from '../events/path-updated.event';
import { LearningPathCompletedEvent } from '../events/learning-path-completed.event';

export class LearningPath {
  /** Count of consecutive assessment activities completed with score strictly above 90% (0.9). */
  private assessmentSuccessStreakAbove90 = 0;

  private activities: Activity[] = [];
  private levels: Map<string, EstimatedLevel> = new Map();
  private domainEvents: object[] = [];

  private constructor(
    public readonly id: string,
    public readonly learnerId: string,
    public readonly tenantId: string,
    private constraint: CoverageConstraint,
    /** Opaque reference — BC3 stores it, BC5 interprets it */
    public readonly targetCertificationId: string,
  ) {}

  static create(props: {
    id: string;
    learnerId: string;
    tenantId: string;
    constraint: CoverageConstraint;
    targetCertificationId?: string;
  }): LearningPath {
    return new LearningPath(
      props.id,
      props.learnerId,
      props.tenantId,
      props.constraint,
      props.targetCertificationId ?? '',
    );
  }

  // ── Sequencing ─────────────────────────────────────────────────────────────

  addActivity(activity: Activity): void {
    this.activities.push(activity);
    this.domainEvents.push(new PathUpdatedEvent(this.id, this.learnerId));
  }

  insertRemediationAfter(targetOrder: number, remediation: Activity): void {
    this.activities
      .filter((a) => a.order > targetOrder)
      .forEach((a) => ((a as any).order += 1));

    this.activities.push(remediation);
    this.activities.sort((a, b) => a.order - b.order);

    this.domainEvents.push(
      new RemediationTriggeredEvent(
        this.id,
        this.learnerId,
        remediation.competencyIds,
      ),
    );
  }

  skipActivitiesForCompetences(competencyIds: string[]): void {
    this.activities
      .filter(
        (a) =>
          a.isPending() &&
          a.competencyIds.every((c) => competencyIds.includes(c)),
      )
      .forEach((a) => a.skip());

    this.domainEvents.push(new PathUpdatedEvent(this.id, this.learnerId));
  }

  /**
   * Marks the lowest-order pending activity as COMPLETED.
   * Used by HTTP adapters (lessons/exercises manually marked done) — must stay in global order.
   */
  markCurrentActivityCompleted(): void {
    const current = this.activities
      .filter(a => a.isPending())
      .sort((a, b) => a.order - b.order)[0];

    if (current) {
      current.complete();
      this.domainEvents.push(new PathUpdatedEvent(this.id, this.learnerId));
    }
  }

  /**
   * Completes the next pending activity only when its `contentId` matches (strict sequence + correct resource).
   * Used when BC4 publishes an assessment score: advances the path iff the learner was due that assessment activity.
   */
  markNextPendingIfContentIdMatches(contentId: string): Activity | undefined {
    const next = this.getNextPendingActivity();
    if (!next || next.contentId !== contentId) {
      return undefined;
    }
    next.complete();
    this.domainEvents.push(new PathUpdatedEvent(this.id, this.learnerId));
    return next;
  }

  // ── Estimated level ────────────────────────────────────────────────────────

  updateLevel(level: EstimatedLevel): void {
    this.levels.set(level.getCompetencyId(), level);
  }

  /**
   * Call after completing the current pending activity when the result is tied to an assessment.
   * Spec: acceleration after three consecutive evaluations with score &gt; 90%.
   */
  recordAssessmentActivityOutcome(
    completedActivity: Activity | undefined,
    level: EstimatedLevel,
  ): void {
    if (!completedActivity || completedActivity.type !== 'ASSESSMENT') {
      this.assessmentSuccessStreakAbove90 = 0;
      return;
    }
    if (level.value() > 0.9) {
      this.assessmentSuccessStreakAbove90 += 1;
    } else {
      this.assessmentSuccessStreakAbove90 = 0;
    }
  }

  shouldAccelerateAfterConsecutiveHighScores(): boolean {
    return this.assessmentSuccessStreakAbove90 >= 3;
  }

  resetAccelerationStreak(): void {
    this.assessmentSuccessStreakAbove90 = 0;
  }

  getLevelFor(competencyId: string): EstimatedLevel | undefined {
    return this.levels.get(competencyId);
  }

  // ── Constraints ────────────────────────────────────────────────────────────

  isCoverageFeasible(): boolean {
    const pendingHours = this.activities
      .filter((a) => a.isPending())
      .reduce((sum, a) => sum + a.estimatedHours, 0);
    return this.constraint.isFeasible(pendingHours);
  }

  getMandatoryUncoveredCompetences(): string[] {
    const covered = new Set(
      this.activities
        .filter((a) => a.isCompleted())
        .flatMap((a) => a.competencyIds),
    );
    return this.constraint
      .getMandatoryCompetencyIds()
      .filter((c) => !covered.has(c));
  }

  // ── Completion ─────────────────────────────────────────────────────────────

  /**
   * Pure query — returns true when the path can be considered finished:
   * - At least one activity exists
   * - No activity is left in PENDING state
   * - Every mandatory competence has a recorded EstimatedLevel
   */
  checkCompletionStatus(): boolean {
    if (this.activities.length === 0) return false;

    const hasPending = this.activities.some(a => a.isPending());
    if (hasPending) return false;

    const mandatoryIds = this.constraint.getMandatoryCompetencyIds();
    const allMandatoryEvaluated = mandatoryIds.every(id => this.levels.has(id));

    return allMandatoryEvaluated;
  }

  /**
   * Completes the path and emits `LearningPathCompletedEvent`.
   * - Calculates globalScore as the average of all recorded competence levels.
   */
  completePath(): void {
    if (!this.checkCompletionStatus()) {
      throw new Error(
        `LearningPath ${this.id} cannot be completed: pending activities remain or mandatory competences are missing.`,
      );
    }

    const competencyResults = [...this.levels.entries()].map(([competencyId, level]) => ({
      competencyId,
      score: level.value(),
    }));

    const globalScore =
      competencyResults.length > 0
        ? competencyResults.reduce((sum, c) => sum + c.score, 0) /
          competencyResults.length
        : 0;

    this.domainEvents.push(
      new LearningPathCompletedEvent(
        this.id,
        this.learnerId,
        this.targetCertificationId,
        globalScore,
        competencyResults,
      ),
    );
  }

  // ── Accessors ──────────────────────────────────────────────────────────────

  getNextPendingActivity(): Activity | undefined {
    return this.activities
      .filter((a) => a.isPending())
      .sort((a, b) => a.order - b.order)[0];
  }

  getActivities(): Activity[] {
    return [...this.activities].sort((a, b) => a.order - b.order);
  }

  getLevels(): EstimatedLevel[] {
    return [...this.levels.values()];
  }

  reorderActivities(activities: Activity[]): void {
    this.activities = [...activities];
  }

  pullDomainEvents(): object[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }

  getConstraint(): CoverageConstraint {
    return this.constraint;
  }

  static reconstitute(props: {
    id: string;
    learnerId: string;
    tenantId: string;
    constraint: CoverageConstraint;
    targetCertificationId?: string;
    activities?: Activity[];
    levels?: EstimatedLevel[];
    assessmentSuccessStreakAbove90?: number;
  }): LearningPath {
    const path = new LearningPath(
      props.id,
      props.learnerId,
      props.tenantId,
      props.constraint,
      props.targetCertificationId ?? '',
    );

    path.activities = [...(props.activities ?? [])];
    path.levels = new Map(
      (props.levels ?? []).map((level) => [level.getCompetencyId(), level]),
    );
    path.domainEvents = [];
    path.assessmentSuccessStreakAbove90 = props.assessmentSuccessStreakAbove90 ?? 0;
    return path;
  }
}

