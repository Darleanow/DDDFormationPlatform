import { Assessment } from '../../domain/aggregates/assessment/assessment';
import { AssessmentItemRepository } from '../../domain/repositories/assessment-item-repository';
import { AssessmentRepository } from '../../domain/repositories/assessment-repository';
import { EstimatedLevelDifficultyPolicy } from '../policies/estimated-level-difficulty.policy';

export interface GenerateAssessmentInput {
  assessmentId: string;
  skillId: string;
  estimatedLevel: string;
  tenantId?: string;
}

export interface GeneratedAssessmentItem {
  id: string;
  difficulty: number;
  weight: number;
}

export interface GenerateAssessmentResult {
  assessmentId: string;
  items: GeneratedAssessmentItem[];
}

export class GenerateAssessmentUseCase {
  constructor(
    private readonly assessments: AssessmentRepository,
    private readonly items: AssessmentItemRepository,
    private readonly difficultyPolicy: EstimatedLevelDifficultyPolicy,
  ) {}

  async execute(
    input: GenerateAssessmentInput,
  ): Promise<GenerateAssessmentResult> {
    const availableItems = await this.items.findBySkillId(input.skillId);
    const difficultyRange = this.difficultyPolicy.getRangeFor(
      input.estimatedLevel,
    );

    const selectedItems = availableItems.filter((item) =>
      difficultyRange.contains(item.getDifficulty()),
    );

    if (selectedItems.length === 0) {
      throw new Error('No assessment items available for the estimated level');
    }

    const assessment = new Assessment(input.assessmentId, selectedItems);
    await this.assessments.save(assessment);

    return {
      assessmentId: assessment.getId(),
      items: selectedItems.map((item) => ({
        id: item.getId(),
        difficulty: item.getDifficulty(),
        weight: item.getWeight(),
      })),
    };
  }
}
