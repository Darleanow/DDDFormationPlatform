export class AssessmentItem {
  constructor(
    private readonly id: string,
    private readonly competenceId: string,
    private readonly difficulty: number,
    private readonly weight: number,
  ) {
    if (!Number.isFinite(difficulty) || difficulty < 0) {
      throw new Error('Difficulty must be a non-negative number');
    }
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error('Weight must be a non-negative number');
    }
  }

  getId(): string {
    return this.id;
  }

  getCompetenceId(): string {
    return this.competenceId;
  }

  getDifficulty(): number {
    return this.difficulty;
  }

  getWeight(): number {
    return this.weight;
  }
}
