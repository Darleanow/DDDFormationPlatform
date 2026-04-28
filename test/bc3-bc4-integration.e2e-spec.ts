import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AdaptiveModule } from '../src/modules/adaptive/adaptive.module';
import { AssessmentModule } from '../src/modules/assessment/assessment.module';
import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
} from '../src/modules/assessment/domain/repositories/assessment-repository';
import { Assessment } from '../src/modules/assessment/domain/aggregates/assessment/assessment';
import { AssessmentItem } from '../src/modules/assessment/domain/aggregates/assessment/assessment-item';
import { ProcessAssessmentAttemptUseCase } from '../src/modules/assessment/application/use-cases/process-assessment-attempt.use-case';
import { LearningPathRepository } from '../src/modules/adaptive/domain/repositories/learning-path.repository';

describe('Integration between BC3 (Adaptive) and BC4 (Assessment)', () => {
  let moduleRef: TestingModule;
  let assessmentRepository: AssessmentRepository;
  let processAttempt: ProcessAssessmentAttemptUseCase;
  let learningPathRepository: LearningPathRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), AdaptiveModule, AssessmentModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    assessmentRepository = moduleRef.get<AssessmentRepository>(
      ASSESSMENT_REPOSITORY,
    );
    processAttempt = moduleRef.get(ProcessAssessmentAttemptUseCase);
    learningPathRepository = moduleRef.get(LearningPathRepository);
  });

  it('updates the adaptive estimated level when assessment publishes results', async () => {
    const learnerId = 'learner-bob';
    const competenceId = 'structures-donnees';
    const assessmentId = 'assessment-bc4-1';
    const attemptId = 'attempt-bc4-1';

    const items = [
      new AssessmentItem('item-1', competenceId, 0.2, 1),
      new AssessmentItem('item-2', competenceId, 0.8, 1),
    ];
    const assessment = new Assessment(assessmentId, competenceId, items);
    await assessmentRepository.save(assessment);

    const result = await processAttempt.execute({
      assessmentId,
      attemptId,
      learnerId,
      questionCount: 2,
      durationSeconds: 30,
      itemResults: [
        { itemId: 'item-1', isCorrect: true },
        { itemId: 'item-2', isCorrect: true },
      ],
    });

    await new Promise((resolve) => setImmediate(resolve));

    const path = await learningPathRepository.findByLearnerId(learnerId);
    expect(path).not.toBeNull();

    const updatedLevel = path?.getLevelFor(competenceId);
    expect(updatedLevel).toBeDefined();
    expect(updatedLevel?.value()).toBeCloseTo(result.estimatedLevel, 4);
  });
});
