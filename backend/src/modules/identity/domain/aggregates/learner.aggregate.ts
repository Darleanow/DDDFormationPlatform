export interface LearnerProps {
  id: string;
  tenantId: string;
  email: string;
  lastName: string;
  firstName: string;
}

export class Learner {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly email: string,
    public readonly lastName: string,
    public readonly firstName: string,
  ) {}

  static create(props: LearnerProps): Learner {
    if (!props.tenantId) throw new Error('A learner must belong to a tenant');
    if (!props.email) throw new Error('Email is required');
    return new Learner(props.id, props.tenantId, props.email, props.lastName, props.firstName);
  }

  static reconstitute(props: LearnerProps): Learner {
    return new Learner(props.id, props.tenantId, props.email, props.lastName, props.firstName);
  }

  belongsToTenant(tenantId: string): boolean {
    return this.tenantId === tenantId;
  }
}
