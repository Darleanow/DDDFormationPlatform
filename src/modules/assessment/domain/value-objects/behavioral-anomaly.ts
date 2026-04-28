export class BehavioralAnomaly {
  private readonly signal: string;
  private readonly confidence: number;

  constructor(signal: string, confidence: number) {
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    this.signal = signal;
    this.confidence = confidence;
  }

  getSignal(): string {
    return this.signal;
  }

  getConfidence(): number {
    return this.confidence;
  }
}
