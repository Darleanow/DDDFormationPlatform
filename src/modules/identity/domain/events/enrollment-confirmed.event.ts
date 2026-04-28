/**
 * Event published after a confirmed enrollment.
 * Consumed by BC3 (Adaptive Engine) to initialize the learning path.
 */
export class EnrollmentConfirmedEvent {
  static readonly EVENT_NAME = 'enrollment.confirmed';

  constructor(
    public readonly learnerId: string,
    public readonly tenantId: string,
    public readonly programId: string,
    public readonly weeklyAvailabilityHours: number,
    public readonly deadline: Date,
    public readonly enrolledAt: Date,
  ) {}
}
