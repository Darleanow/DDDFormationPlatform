import { Activity } from './activity.entity';
import { EstimatedLevel } from '../value-objects/estimated-level.vo';
import { CoverageConstraint } from '../value-objects/coverage-constraint.vo';
import { RemediationTriggeredEvent } from '../events/remediation-triggered.event';
import { PathUpdatedEvent } from '../events/path-updated.event';
import { LearningPathCompletedEvent } from '../events/learning-path-completed.event';

export class LearningPath {
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
        remediation.competenceIds,
      ),
    );
  }

  skipActivitiesForCompetences(competenceIds: string[]): void {
    this.activities
      .filter(
        (a) =>
          a.isPending() &&
          a.competenceIds.every((c) => competenceIds.includes(c)),
      )
      .forEach((a) => a.skip());

    this.domainEvents.push(new PathUpdatedEvent(this.id, this.learnerId));
  }

  /**
   * Marks the lowest-order pending activity as COMPLETED.
   * Called by the application handler when an assessment result arrives,
   * signalling that the learner has finished the current activity.
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

  // ── Estimated level ────────────────────────────────────────────────────────

  updateLevel(level: EstimatedLevel): void {
    this.levels.set(level.getCompetenceId(), level);
  }

  getLevelFor(competenceId: string): EstimatedLevel | undefined {
    return this.levels.get(competenceId);
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
        .flatMap((a) => a.competenceIds),
    );
    return this.constraint
      .getMandatoryCompetenceIds()
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

    const mandatoryIds = this.constraint.getMandatoryCompetenceIds();
    const allMandatoryEvaluated = mandatoryIds.every(id => this.levels.has(id));

    return allMandatoryEvaluated;
  }

  /**
   * Completes the path and emits `LearningPathCompletedEvent`.
   * - Calculates globalScore as the average of all recorded competence levels.
   * - Flags competences with score < 0.5 as `isCriticalFailure`.
   *   BC5 applies its own "compétence critique" rules on top of this data.
   *
   * @throws if the path is not yet completable (guard against early calls).
   */
  completePath(): void {
    if (!this.checkCompletionStatus()) {
      throw new Error(
        `LearningPath ${this.id} cannot be completed: pending activities remain or mandatory competences are missing.`,
      );
    }

    const competences = [...this.levels.entries()].map(([competenceId, level]) => ({
      competenceId,
      score: level.value(),
      isCriticalFailure: level.isInsufficient(), // score < 0.5
    }));

    const globalScore =
      competences.length > 0
        ? competences.reduce((sum, c) => sum + c.score, 0) / competences.length
        : 0;

    this.domainEvents.push(
      new LearningPathCompletedEvent(
        this.id,
        this.learnerId,
        this.targetCertificationId,
        globalScore,
        competences,
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
      (props.levels ?? []).map((level) => [level.getCompetenceId(), level]),
    );
    path.domainEvents = [];
    return path;
  }
}

