export enum ActivityStatusValue {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  REMEDIATION = 'REMEDIATION',
}

export class ActivityStatus {
  private constructor(private readonly value: ActivityStatusValue) {}

  static pending() {
    return new ActivityStatus(ActivityStatusValue.PENDING);
  }
  static inProgress() {
    return new ActivityStatus(ActivityStatusValue.IN_PROGRESS);
  }
  static completed() {
    return new ActivityStatus(ActivityStatusValue.COMPLETED);
  }
  static skipped() {
    return new ActivityStatus(ActivityStatusValue.SKIPPED);
  }
  static remediation() {
    return new ActivityStatus(ActivityStatusValue.REMEDIATION);
  }

  static fromString(value: string): ActivityStatus {
    switch (value) {
      case ActivityStatusValue.PENDING:
        return ActivityStatus.pending();
      case ActivityStatusValue.IN_PROGRESS:
        return ActivityStatus.inProgress();
      case ActivityStatusValue.COMPLETED:
        return ActivityStatus.completed();
      case ActivityStatusValue.SKIPPED:
        return ActivityStatus.skipped();
      case ActivityStatusValue.REMEDIATION:
        return ActivityStatus.remediation();
      default:
        throw new Error(`Invalid activity status: ${value}`);
    }
  }

  is(v: ActivityStatusValue): boolean {
    return this.value === v;
  }
  toString(): string {
    return this.value;
  }
}
