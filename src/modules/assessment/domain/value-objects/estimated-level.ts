export class EstimatedLevel {
  private readonly probability: number;

  constructor(probability: number) {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw new Error('Estimated level must be between 0 and 1');
    }

    this.probability = probability;
  }

  get value(): number {
    return this.probability;
  }
}
