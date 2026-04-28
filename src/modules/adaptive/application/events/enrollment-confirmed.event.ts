export class EnrollmentConfirmedEvent {
  constructor(
    public readonly learnerId: string,
    public readonly programId: string,
    public readonly tenantId: string,
    public readonly constraints: {
      weeklyHours: number;
      deadline?: Date;
      mandatoryCompetenceIds: string[];
    },
    public readonly catalogActivities: Array<{
      contentId: string;
      competenceIds: string[];
      estimatedHours: number;
      type: 'LESSON' | 'EXERCISE' | 'ASSESSMENT';
    }>,
  ) {}
}
