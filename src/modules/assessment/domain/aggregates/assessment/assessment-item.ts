export class AssessmentItem {
  constructor(
    private readonly id: string,
    private readonly skillId: string,
    private readonly difficulty: number,
  ) {
    if (!Number.isFinite(difficulty) || difficulty < 0) {
      throw new Error('Difficulty must be a non-negative number');
    }
  }

  getId(): string {
    return this.id;
  }

  getSkillId(): string {
    return this.skillId;
  }

  getDifficulty(): number {
    return this.difficulty;
  }
}
