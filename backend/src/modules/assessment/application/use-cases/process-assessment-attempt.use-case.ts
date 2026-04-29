import {
  AssessmentAttempt,
  AssessmentAttemptStatus,
  ManualReviewStatus,
} from '../../domain/aggregates/assessment/assessment-attempt';
import { AssessmentAttemptRepository } from '../../domain/repositories/assessment-attempt-repository';
import { AssessmentRepository } from '../../domain/repositories/assessment-repository';
import { AnomalyDetectionService } from '../../domain/services/anomaly-detection.service';
import { AssessmentItemResult } from '../../domain/services/score-calculator';
import { AdaptiveEngineGateway } from '../ports/adaptive-engine.gateway';
import { InterpretAssessmentResultUseCase } from './interpret-assessment-result.use-case';
import { CertificativeAssessmentScoredEvent } from '../../domain/events/certificative-assessment-scored.event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstimatedLevelRepository } from '../../domain/repositories/estimated-level.repository';
import { EstimatedLevel } from '../../domain/aggregates/estimated-level/estimated-level.aggregate';
import { CompetencyId } from '../../../../shared/competency-id';

export interface ProcessAssessmentAttemptInput {
  learnerId: string;
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
    private readonly assessments: AssessmentRepository,
    private readonly adaptiveEngine: AdaptiveEngineGateway,
    private readonly anomalyDetectionService: AnomalyDetectionService,
    private readonly eventEmitter: EventEmitter2,
    private readonly estimatedLevelRepository: EstimatedLevelRepository,
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
      input.learnerId,
      interpretationResult.assessmentId,
      input.questionCount,
      input.durationSeconds,
    );

    attempt.attachScore(interpretationResult.interpretation.score);

    const anomaly = this.anomalyDetectionService.detect(attempt);
    if (anomaly) {
      attempt.markSuspect(anomaly);
    }

    await this.attempts.save(attempt);

    const assessment = await this.assessments.findById(input.assessmentId);

    if (assessment?.getType() === 'CERTIFICATIVE' && assessment.getTargetCertificationId()) {
      const isSuspect = !!anomaly;
      // In this system, we might only have one competence target, or many. We extract what we can.
      const targetCertId = assessment.getTargetCertificationId()!;
      // Publish event
      const event = new CertificativeAssessmentScoredEvent(
        attempt.getId(),
        input.assessmentId,
        input.learnerId,
        targetCertId,
        interpretationResult.interpretation.score.value, // globalscore
        [
          {
            competencyId: interpretationResult.competencyId,
            score: interpretationResult.interpretation.interpretedScore,
          },
        ],
        isSuspect,
      );
      this.eventEmitter.emit(event.constructor.name, event);
    } else {
      let estimatedLevelAgg = await this.estimatedLevelRepository.findByLearnerAndCompetency(
        attempt.getLearnerId(),
        interpretationResult.competencyId as CompetencyId,
      );

      if (!estimatedLevelAgg) {
        estimatedLevelAgg = new EstimatedLevel(
          attempt.getLearnerId(),
          interpretationResult.competencyId as CompetencyId,
          input.tenantId,
          0.0,
        );
      }

      estimatedLevelAgg.updateLevel(interpretationResult.interpretation.interpretedScore);
      await this.estimatedLevelRepository.save(estimatedLevelAgg);

      const streakSignalScore = Math.max(
        interpretationResult.interpretation.interpretedScore,
        interpretationResult.interpretation.normalizedItemScoreRatio,
      );

      await this.adaptiveEngine.submitScore({
        learnerId: attempt.getLearnerId(),
        competencyId: interpretationResult.competencyId,
        estimatedLevel: estimatedLevelAgg.currentLevelValue,
        streakSignalScore,
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
