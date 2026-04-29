export class CertificativeAssessmentScoredEvent {
  constructor(
    public readonly attemptId: string,
    public readonly assessmentId: string,
    public readonly learnerId: string,
    public readonly targetCertificationId: string,
    public readonly globalScore: number,
    // Per competence
    public readonly competences: Array<{
      competencyId: string;
      score: number;
    }>,
    public readonly isSuspect: boolean,
  ) {}
}
