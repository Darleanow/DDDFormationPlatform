import { GenerateAssessmentUseCase } from './generate-assessment.use-case';
import { StaticEstimatedLevelDifficultyPolicy } from '../policies/estimated-level-difficulty.policy';
import { DifficultyRange } from '../../domain/value-objects/difficulty-range';
import { InMemoryAssessmentItemRepository } from '../../infrastructure/persistence/in-memory/in-memory-assessment-item.repository';
import { InMemoryAssessmentRepository } from '../../infrastructure/persistence/in-memory/in-memory-assessment.repository';
import { AssessmentItem } from '../../domain/aggregates/assessment/assessment-item';

describe('GenerateAssessmentUseCase', () => {
  it('selects items within the intermediate difficulty range', async () => {
    const items = [
      new AssessmentItem('item-1', 'competence-1', 0.2, 1),
      new AssessmentItem('item-2', 'competence-1', 0.5, 1),
      new AssessmentItem('item-3', 'competence-1', 0.7, 1),
      new AssessmentItem('item-4', 'competence-1', 0.95, 1),
    ];

    const itemRepository = new InMemoryAssessmentItemRepository({
      'competence-1': items,
    });
    const assessmentRepository = new InMemoryAssessmentRepository();
    const difficultyPolicy = new StaticEstimatedLevelDifficultyPolicy({
      intermediaire: new DifficultyRange(0.4, 0.7),
    });

    const useCase = new GenerateAssessmentUseCase(
      assessmentRepository,
      itemRepository,
      difficultyPolicy,
    );

    const result = await useCase.execute({
      assessmentId: 'assessment-1',
      competenceId: 'competence-1',
      estimatedLevel: 'intermediaire',
    });

    expect(result.items).toHaveLength(2);
    for (const item of result.items) {
      expect(item.difficulty).toBeGreaterThanOrEqual(0.4);
      expect(item.difficulty).toBeLessThanOrEqual(0.7);
      expect(item.difficulty).toBeLessThanOrEqual(0.9);
    }
  });
});
