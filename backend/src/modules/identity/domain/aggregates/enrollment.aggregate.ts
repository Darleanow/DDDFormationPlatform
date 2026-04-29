export interface EnrollmentProps {
  id: string;
  learnerId: string;
  tenantId: string;
  programId: string;
  weeklyAvailabilityHours: number;
  deadline: Date;
  enrolledAt: Date;
}

export class Enrollment {
  private constructor(
    public readonly id: string,
    public readonly learnerId: string,
    public readonly tenantId: string,
    public readonly programId: string,
    public readonly weeklyAvailabilityHours: number,
    public readonly deadline: Date,
    public readonly enrolledAt: Date,
  ) {}

  static create(props: Omit<EnrollmentProps, 'enrolledAt'>): Enrollment {
    if (props.weeklyAvailabilityHours <= 0) {
      throw new Error('Weekly availability must be positive');
    }
    if (props.deadline <= new Date()) {
      throw new Error('Deadline must be in the future');
    }
    return new Enrollment(
      props.id,
      props.learnerId,
      props.tenantId,
      props.programId,
      props.weeklyAvailabilityHours,
      props.deadline,
      new Date(),
    );
  }

  static reconstitute(props: EnrollmentProps): Enrollment {
    return new Enrollment(
      props.id,
      props.learnerId,
      props.tenantId,
      props.programId,
      props.weeklyAvailabilityHours,
      props.deadline,
      props.enrolledAt,
    );
  }

  belongsToTenant(tenantId: string): boolean {
    return this.tenantId === tenantId;
  }
}
