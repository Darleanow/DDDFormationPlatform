import { InterpretAssessmentResultUseCase } from './interpret-assessment-result.use-case';
import { AssessmentResultInterpreter } from '../../domain/services/assessment-result-interpreter';
import { InMemoryAssessmentRepository } from '../../infrastructure/persistence/in-memory/in-memory-assessment.repository';
import { Assessment } from '../../domain/aggregates/assessment/assessment';
import { AssessmentItem } from '../../domain/aggregates/assessment/assessment-item';

describe('InterpretAssessmentResultUseCase', () => {
  it('interprets results using difficulty and consistency signals', async () => {
    const assessmentRepository = new InMemoryAssessmentRepository();
    const interpreter = new AssessmentResultInterpreter();
    const useCase = new InterpretAssessmentResultUseCase(
      assessmentRepository,
      interpreter,
    );

    const items = [
      new AssessmentItem('item-1', 'skill-1', 0.2, 1),
      new AssessmentItem('item-2', 'skill-1', 0.8, 1),
    ];
    const assessment = new Assessment('assessment-1', items);
    await assessmentRepository.save(assessment);

    const result = await useCase.execute({
      assessmentId: 'assessment-1',
      itemResults: [
        { itemId: 'item-1', isCorrect: true },
        { itemId: 'item-2', isCorrect: true },
      ],
    });

    expect(result.interpretation.score.value).toBe(2);
    expect(result.interpretation.averageDifficulty).toBeCloseTo(0.5, 4);
    expect(result.interpretation.answerConsistency).toBe(1);
    expect(result.interpretation.interpretedScore).toBeCloseTo(0.75, 4);
  });
});
