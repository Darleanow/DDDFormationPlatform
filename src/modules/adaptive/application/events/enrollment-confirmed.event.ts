export class EnrollmentConfirmedEvent {
  constructor(
    public readonly learnerId: string,
    public readonly programId: string,
    public readonly tenantId: string,
    /** Opaque ID forwarded from BC1 — BC3 stores it, BC5 interprets it */
    public readonly targetCertificationId: string,
    public readonly constraints: {
      weeklyHours: number;
      deadline?: Date;
      mandatoryCompetencyIds: string[];
    },
    public readonly catalogActivities: Array<{
      contentId: string;
      competencyIds: string[];
      estimatedHours: number;
      type: 'LESSON' | 'EXERCISE' | 'ASSESSMENT';
    }>,
  ) {}
}
