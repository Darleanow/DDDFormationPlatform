import { ActivityStatus, ActivityStatusValue } from '../value-objects/activity-status.vo';

export type ActivityType = 'LESSON' | 'EXERCISE' | 'ASSESSMENT' | 'REMEDIATION';

export class Activity {
  private status: ActivityStatus;

  constructor(
    public readonly id: string,
    public readonly contentId: string,       // ID in BC2
    public readonly type: ActivityType,
    public readonly competenceIds: string[],
    public readonly estimatedHours: number,
    public readonly order: number,
    status?: ActivityStatus,
  ) {
    this.status = status ?? ActivityStatus.pending();
  }

  complete(): void {
    this.status = ActivityStatus.completed();
  }

  skip(): void {
    this.status = ActivityStatus.skipped();
  }

  markRemediation(): void {
    this.status = ActivityStatus.remediation();
  }

  isPending(): boolean {
    return this.status.is(ActivityStatusValue.PENDING);
  }

  isCompleted(): boolean {
    return this.status.is(ActivityStatusValue.COMPLETED);
  }

  getStatus(): ActivityStatus {
    return this.status;
  }
}
