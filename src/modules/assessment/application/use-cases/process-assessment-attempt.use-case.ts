import {
  AssessmentAttempt,
  AssessmentAttemptStatus,
} from '../../domain/aggregates/assessment/assessment-attempt';
import { AssessmentAttemptRepository } from '../../domain/repositories/assessment-attempt-repository';
import { BehavioralAnomalyDetector } from '../../domain/services/behavioral-anomaly-detector';
import { AssessmentItemResult } from '../../domain/services/score-calculator';
import { AdaptiveEngineGateway } from '../ports/adaptive-engine.gateway';
import { CalculateScoreUseCase } from './calculate-score.use-case';

export interface ProcessAssessmentAttemptInput {
  assessmentId: string;
  attemptId: string;
  questionCount: number;
  durationSeconds: number;
  itemResults: AssessmentItemResult[];
  tenantId?: string;
}

export interface ProcessAssessmentAttemptResult {
  assessmentId: string;
  attemptId: string;
  score: number;
  status: AssessmentAttemptStatus;
  requiresManualValidation: boolean;
  behavioralAnomaly?: {
    signal: string;
    confidence: number;
  };
}

export class ProcessAssessmentAttemptUseCase {
  constructor(
    private readonly calculateScore: CalculateScoreUseCase,
    private readonly attempts: AssessmentAttemptRepository,
    private readonly adaptiveEngine: AdaptiveEngineGateway,
    private readonly anomalyDetector: BehavioralAnomalyDetector,
  ) {}

  async execute(
    input: ProcessAssessmentAttemptInput,
  ): Promise<ProcessAssessmentAttemptResult> {
    const scoreResult = await this.calculateScore.execute({
      assessmentId: input.assessmentId,
      itemResults: input.itemResults,
    });

    const attempt = new AssessmentAttempt(
      input.attemptId,
      scoreResult.assessmentId,
      input.questionCount,
      input.durationSeconds,
    );

    attempt.attachScore(scoreResult.score);

    const anomaly = this.anomalyDetector.detect(attempt);
    if (anomaly) {
      attempt.markSuspect(anomaly);
    }

    await this.attempts.save(attempt);

    if (!anomaly) {
      await this.adaptiveEngine.submitScore({
        assessmentId: scoreResult.assessmentId,
        attemptId: attempt.getId(),
        score: scoreResult.score.value,
        tenantId: input.tenantId,
      });
    }

    return {
      assessmentId: scoreResult.assessmentId,
      attemptId: attempt.getId(),
      score: scoreResult.score.value,
      status: attempt.getStatus(),
      requiresManualValidation: Boolean(anomaly),
      behavioralAnomaly: anomaly
        ? {
            signal: anomaly.getSignal(),
            confidence: anomaly.getConfidence(),
          }
        : undefined,
    };
  }
}
