import { Activity } from './activity.entity';
import { EstimatedLevel } from '../value-objects/estimated-level.vo';
import { CoverageConstraint } from '../value-objects/coverage-constraint.vo';
import { RemediationTriggeredEvent } from '../events/remediation-triggered.event';
import { PathUpdatedEvent } from '../events/path-updated.event';

export class LearningPath {
  private activities: Activity[] = [];
  private levels: Map<string, EstimatedLevel> = new Map();
  private domainEvents: object[] = [];

  private constructor(
    public readonly id: string,
    public readonly learnerId: string,
    public readonly tenantId: string,
    private constraint: CoverageConstraint,
  ) {}

  static create(props: {
    id: string;
    learnerId: string;
    tenantId: string;
    constraint: CoverageConstraint;
  }): LearningPath {
    return new LearningPath(
      props.id,
      props.learnerId,
      props.tenantId,
      props.constraint,
    );
  }

  // Sequencing

  addActivity(activity: Activity): void {
    this.activities.push(activity);
    this.domainEvents.push(new PathUpdatedEvent(this.id, this.learnerId));
  }

  insertRemediationAfter(targetOrder: number, remediation: Activity): void {
    // Moves activities after targetOrder
    this.activities
      .filter(a => a.order > targetOrder)
      .forEach(a => (a as any).order += 1);

    this.activities.push(remediation);
    this.activities.sort((a, b) => a.order - b.order);

    this.domainEvents.push(
      new RemediationTriggeredEvent(this.id, this.learnerId, remediation.competenceIds),
    );
  }

  skipActivitiesForCompetences(competenceIds: string[]): void {
    this.activities
      .filter(a =>
        a.isPending() &&
        a.competenceIds.every(c => competenceIds.includes(c)),
      )
      .forEach(a => a.skip());

    this.domainEvents.push(new PathUpdatedEvent(this.id, this.learnerId));
  }

  // Estimated level

  updateLevel(level: EstimatedLevel): void {
    this.levels.set(level.getCompetenceId(), level);
  }

  getLevelFor(competenceId: string): EstimatedLevel | undefined {
    return this.levels.get(competenceId);
  }

  // Constraints

  isCoverageFeasible(): boolean {
    const pendingHours = this.activities
      .filter(a => a.isPending())
      .reduce((sum, a) => sum + a.estimatedHours, 0);
    return this.constraint.isFeasible(pendingHours);
  }

  getMandatoryUncoveredCompetences(): string[] {
    const covered = new Set(
      this.activities
        .filter(a => a.isCompleted())
        .flatMap(a => a.competenceIds),
    );
    return this.constraint
      .getMandatoryCompetenceIds()
      .filter(c => !covered.has(c));
  }

  // Accessors

  getNextPendingActivity(): Activity | undefined {
    return this.activities
      .filter(a => a.isPending())
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
    activities?: Activity[];
    levels?: EstimatedLevel[];
  }): LearningPath {
    const path = new LearningPath(
      props.id,
      props.learnerId,
      props.tenantId,
      props.constraint,
    );

    path.activities = [...(props.activities ?? [])];
    path.levels = new Map((props.levels ?? []).map(level => [level.getCompetenceId(), level]));
    path.domainEvents = [];
    return path;
  }
}
