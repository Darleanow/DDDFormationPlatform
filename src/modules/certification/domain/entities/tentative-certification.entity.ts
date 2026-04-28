export class TentativeCertification {
  constructor(
    public readonly learnerId: string,
    public readonly certificationId: string,
    public readonly nbTentativesEffectuees: number,
  ) {}

  incrementer(): TentativeCertification {
    return new TentativeCertification(
      this.learnerId,
      this.certificationId,
      this.nbTentativesEffectuees + 1,
    );
  }
}
