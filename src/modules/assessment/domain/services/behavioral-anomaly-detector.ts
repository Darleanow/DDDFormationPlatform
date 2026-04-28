import { AssessmentAttempt } from '../aggregates/assessment/assessment-attempt';
import { BehavioralAnomaly } from '../value-objects/behavioral-anomaly';

export interface BehavioralAnomalyThresholds {
  minQuestionCount: number;
  maxDurationSeconds: number;
  signal: string;
  confidence: number;
}

export class BehavioralAnomalyDetector {
  constructor(private readonly thresholds: BehavioralAnomalyThresholds) {
    if (
      !Number.isFinite(thresholds.minQuestionCount) ||
      thresholds.minQuestionCount <= 0
    ) {
      throw new Error('Min question count must be greater than zero');
    }
    if (
      !Number.isFinite(thresholds.maxDurationSeconds) ||
      thresholds.maxDurationSeconds <= 0
    ) {
      throw new Error('Max duration must be greater than zero');
    }
    if (
      !Number.isFinite(thresholds.confidence) ||
      thresholds.confidence < 0 ||
      thresholds.confidence > 1
    ) {
      throw new Error('Confidence must be between 0 and 1');
    }
  }

  detect(attempt: AssessmentAttempt): BehavioralAnomaly | null {
    if (
      attempt.getQuestionCount() >= this.thresholds.minQuestionCount &&
      attempt.getDurationSeconds() < this.thresholds.maxDurationSeconds
    ) {
      return new BehavioralAnomaly(
        this.thresholds.signal,
        this.thresholds.confidence,
      );
    }

    return null;
  }
}
