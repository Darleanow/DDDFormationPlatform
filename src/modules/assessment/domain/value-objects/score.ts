export class Score {
  private readonly raw: number;

  constructor(raw: number) {
    if (!Number.isFinite(raw) || raw < 0) {
      throw new Error('Score must be a non-negative number');
    }

    this.raw = raw;
  }

  get value(): number {
    return this.raw;
  }
}
