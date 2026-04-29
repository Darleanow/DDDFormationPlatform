export class CertificationAttempt {
  constructor(
    public readonly learnerId: string,
    public readonly certificationId: string,
    public readonly nbTentativesEffectuees: number,
  ) {}

  incrementer(): CertificationAttempt {
    return new CertificationAttempt(
      this.learnerId,
      this.certificationId,
      this.nbTentativesEffectuees + 1,
    );
  }
}
