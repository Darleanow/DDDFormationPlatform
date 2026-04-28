export class EnrollLearnerDto {
  learnerId: string;
  tenantId: string;
  programId: string;
  weeklyAvailabilityHours: number;
  deadline: Date;
}

export class CreateLearnerDto {
  tenantId: string;
  email: string;
  lastName: string;
  firstName: string;
}