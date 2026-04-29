export class EstimatedLevel {
  private constructor(
    private readonly competencyId: string,
    private readonly score: number,
  ) {}

  static from(competencyId: string, score: number): EstimatedLevel {
    if (score < 0 || score > 1) throw new Error(`Invalid score: ${score}`);
    return new EstimatedLevel(competencyId, score);
  }

  isMastered(): boolean {
    return this.score >= 0.75;
  }

  isInsufficient(): boolean {
    return this.score < 0.5;
  }

  needsRemediation(): boolean {
    return this.score < 0.5;
  }

  canAccelerate(): boolean {
    return this.score >= 0.9;
  }

  value(): number {
    return this.score;
  }

  getCompetencyId(): string {
    return this.competencyId;
  }
}
