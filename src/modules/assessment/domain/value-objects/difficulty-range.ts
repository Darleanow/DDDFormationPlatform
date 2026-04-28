export class DifficultyRange {
  constructor(
    private readonly min: number,
    private readonly max: number,
  ) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error('Difficulty range values must be numbers');
    }
    if (min < 0 || max > 1 || min > max) {
      throw new Error('Difficulty range must be between 0 and 1 with min <= max');
    }
  }

  getMin(): number {
    return this.min;
  }

  getMax(): number {
    return this.max;
  }

  contains(value: number): boolean {
    return value >= this.min && value <= this.max;
  }
}
