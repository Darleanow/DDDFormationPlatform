import { ProcessAssessmentAttemptUseCase } from './process-assessment-attempt.use-case';
import { InterpretAssessmentResultUseCase } from './interpret-assessment-result.use-case';
import { BehavioralAnomalyDetector } from '../../domain/services/behavioral-anomaly-detector';
import {
  AssessmentAttemptStatus,
  ManualReviewStatus,
} from '../../domain/aggregates/assessment/assessment-attempt';
import { InMemoryAssessmentAttemptRepository } from '../../infrastructure/persistence/in-memory/in-memory-assessment-attempt.repository';
import { InMemoryAssessmentRepository } from '../../infrastructure/persistence/in-memory/in-memory-assessment.repository';
import { AssessmentItem } from '../../domain/aggregates/assessment/assessment-item';
import { Assessment } from '../../domain/aggregates/assessment/assessment';
import { AdaptiveEngineGateway } from '../ports/adaptive-engine.gateway';
import { AssessmentResultInterpreter } from '../../domain/services/assessment-result-interpreter';

class FakeAdaptiveEngineGateway implements AdaptiveEngineGateway {
  submitted = false;

  async submitScore(): Promise<void> {
    this.submitted = true;
  }
}

describe('ProcessAssessmentAttemptUseCase', () => {
  it('marks attempts as suspect and blocks score transmission', async () => {
    const assessmentRepository = new InMemoryAssessmentRepository();
    const attemptRepository = new InMemoryAssessmentAttemptRepository();
    const adaptiveGateway = new FakeAdaptiveEngineGateway();
    const anomalyDetector = new BehavioralAnomalyDetector({
      minQuestionCount: 20,
      maxDurationSeconds: 45,
      signal: 'FAST_RESPONSE',
      confidence: 1,
    });

    const items = [
      new AssessmentItem('item-1', 'skill-1', 0.5, 1),
      new AssessmentItem('item-2', 'skill-1', 0.6, 1),
    ];
    const assessment = new Assessment('assessment-1', items);
    await assessmentRepository.save(assessment);

    const interpreter = new AssessmentResultInterpreter();
    const interpretResult = new InterpretAssessmentResultUseCase(
      assessmentRepository,
      interpreter,
    );
    const useCase = new ProcessAssessmentAttemptUseCase(
      interpretResult,
      attemptRepository,
      adaptiveGateway,
      anomalyDetector,
    );

    const result = await useCase.execute({
      assessmentId: 'assessment-1',
      attemptId: 'attempt-1',
      questionCount: 20,
      durationSeconds: 40,
      itemResults: [
        { itemId: 'item-1', isCorrect: true },
        { itemId: 'item-2', isCorrect: true },
      ],
    });

    expect(result.status).toBe(AssessmentAttemptStatus.SUSPECT);
    expect(result.manualReviewStatus).toBe(ManualReviewStatus.PENDING);
    expect(result.requiresManualValidation).toBe(true);
    expect(adaptiveGateway.submitted).toBe(false);
  });

  it('submits score when no anomaly is detected', async () => {
    const assessmentRepository = new InMemoryAssessmentRepository();
    const attemptRepository = new InMemoryAssessmentAttemptRepository();
    const adaptiveGateway = new FakeAdaptiveEngineGateway();
    const anomalyDetector = new BehavioralAnomalyDetector({
      minQuestionCount: 20,
      maxDurationSeconds: 45,
      signal: 'FAST_RESPONSE',
      confidence: 1,
    });

    const items = [
      new AssessmentItem('item-1', 'skill-1', 0.5, 1),
      new AssessmentItem('item-2', 'skill-1', 0.6, 1),
    ];
    const assessment = new Assessment('assessment-2', items);
    await assessmentRepository.save(assessment);

    const interpreter = new AssessmentResultInterpreter();
    const interpretResult = new InterpretAssessmentResultUseCase(
      assessmentRepository,
      interpreter,
    );
    const useCase = new ProcessAssessmentAttemptUseCase(
      interpretResult,
      attemptRepository,
      adaptiveGateway,
      anomalyDetector,
    );

    const result = await useCase.execute({
      assessmentId: 'assessment-2',
      attemptId: 'attempt-2',
      questionCount: 20,
      durationSeconds: 60,
      itemResults: [
        { itemId: 'item-1', isCorrect: true },
        { itemId: 'item-2', isCorrect: false },
      ],
    });

    expect(result.status).toBe(AssessmentAttemptStatus.COMPLETED);
    expect(result.manualReviewStatus).toBe(ManualReviewStatus.NOT_REQUIRED);
    expect(result.requiresManualValidation).toBe(false);
    expect(adaptiveGateway.submitted).toBe(true);
  });
});
