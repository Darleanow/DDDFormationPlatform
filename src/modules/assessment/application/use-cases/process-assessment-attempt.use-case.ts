import {
  AssessmentAttempt,
  AssessmentAttemptStatus,
  ManualReviewStatus,
} from '../../domain/aggregates/assessment/assessment-attempt';
import { AssessmentAttemptRepository } from '../../domain/repositories/assessment-attempt-repository';
import { BehavioralAnomalyDetector } from '../../domain/services/behavioral-anomaly-detector';
import { AssessmentItemResult } from '../../domain/services/score-calculator';
import { AdaptiveEngineGateway } from '../ports/adaptive-engine.gateway';
import { InterpretAssessmentResultUseCase } from './interpret-assessment-result.use-case';

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
  interpretedScore: number;
  averageDifficulty: number;
  answerConsistency: number;
  status: AssessmentAttemptStatus;
  manualReviewStatus: ManualReviewStatus;
  requiresManualValidation: boolean;
  behavioralAnomaly?: {
    signal: string;
    confidence: number;
  };
}

export class ProcessAssessmentAttemptUseCase {
  constructor(
    private readonly interpretResult: InterpretAssessmentResultUseCase,
    private readonly attempts: AssessmentAttemptRepository,
    private readonly adaptiveEngine: AdaptiveEngineGateway,
    private readonly anomalyDetector: BehavioralAnomalyDetector,
  ) {}

  async execute(
    input: ProcessAssessmentAttemptInput,
  ): Promise<ProcessAssessmentAttemptResult> {
    const interpretationResult = await this.interpretResult.execute({
      assessmentId: input.assessmentId,
      itemResults: input.itemResults,
    });

    const attempt = new AssessmentAttempt(
      input.attemptId,
      interpretationResult.assessmentId,
      input.questionCount,
      input.durationSeconds,
    );

    attempt.attachScore(interpretationResult.interpretation.score);

    const anomaly = this.anomalyDetector.detect(attempt);
    if (anomaly) {
      attempt.markSuspect(anomaly);
    }

    await this.attempts.save(attempt);

    if (!anomaly) {
      await this.adaptiveEngine.submitScore({
        assessmentId: interpretationResult.assessmentId,
        attemptId: attempt.getId(),
        score: interpretationResult.interpretation.score.value,
        tenantId: input.tenantId,
      });
    }

    return {
      assessmentId: interpretationResult.assessmentId,
      attemptId: attempt.getId(),
      score: interpretationResult.interpretation.score.value,
      interpretedScore: interpretationResult.interpretation.interpretedScore,
      averageDifficulty: interpretationResult.interpretation.averageDifficulty,
      answerConsistency: interpretationResult.interpretation.answerConsistency,
      status: attempt.getStatus(),
      manualReviewStatus: attempt.getManualReviewStatus(),
      requiresManualValidation: attempt.requiresManualValidation(),
      behavioralAnomaly: anomaly
        ? {
            signal: anomaly.getSignal(),
            confidence: anomaly.getConfidence(),
          }
        : undefined,
    };
  }
}
