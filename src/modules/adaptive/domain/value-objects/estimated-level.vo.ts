export class EstimatedLevel {
  private constructor(
    private readonly competenceId: string,
    private readonly score: number, // 0.0 → 1.0
  ) {}

  static from(competenceId: string, score: number): EstimatedLevel {
    if (score < 0 || score > 1) throw new Error(`Invalid score: ${score}`);
    return new EstimatedLevel(competenceId, score);
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

  getCompetenceId(): string {
    return this.competenceId;
  }
}
