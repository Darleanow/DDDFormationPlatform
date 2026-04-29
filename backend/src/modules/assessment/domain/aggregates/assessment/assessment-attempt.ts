import { BehavioralAnomaly } from '../../value-objects/behavioral-anomaly';
import { Score } from '../../value-objects/score';

export enum AssessmentAttemptStatus {
  COMPLETED = 'COMPLETED',
  SUSPECT = 'SUSPECT',
}

export enum ManualReviewStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING = 'PENDING',
}

export class AssessmentAttempt {
  private status: AssessmentAttemptStatus;
  private manualReviewStatus: ManualReviewStatus;
  private score?: Score;
  private behavioralAnomaly?: BehavioralAnomaly;

  constructor(
    private readonly id: string,
    private readonly learnerId: string,
    private readonly assessmentId: string,
    private readonly questionCount: number,
    private readonly durationSeconds: number,
  ) {
    if (!Number.isFinite(questionCount) || questionCount < 0) {
      throw new Error('Question count must be a non-negative number');
    }
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      throw new Error('Duration must be a non-negative number');
    }

    // TODO: revisit manual review workflow states with domain experts.
    this.status = AssessmentAttemptStatus.COMPLETED;
    this.manualReviewStatus = ManualReviewStatus.NOT_REQUIRED;
  }

  getId(): string {
    return this.id;
  }

  getLearnerId(): string {
    return this.learnerId;
  }

  getAssessmentId(): string {
    return this.assessmentId;
  }

  getQuestionCount(): number {
    return this.questionCount;
  }

  getDurationSeconds(): number {
    return this.durationSeconds;
  }

  getStatus(): AssessmentAttemptStatus {
    return this.status;
  }

  getManualReviewStatus(): ManualReviewStatus {
    return this.manualReviewStatus;
  }

  requiresManualValidation(): boolean {
    return this.manualReviewStatus === ManualReviewStatus.PENDING;
  }

  getScore(): Score | undefined {
    return this.score;
  }

  getBehavioralAnomaly(): BehavioralAnomaly | undefined {
    return this.behavioralAnomaly;
  }

  attachScore(score: Score): void {
    this.score = score;
  }

  markSuspect(anomaly: BehavioralAnomaly): void {
    this.status = AssessmentAttemptStatus.SUSPECT;
    this.manualReviewStatus = ManualReviewStatus.PENDING;
    this.behavioralAnomaly = anomaly;
  }
}
