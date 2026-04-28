import { AssessmentRepository } from '../../domain/repositories/assessment-repository';
import {
  AssessmentItemResult,
  ScoreCalculator,
} from '../../domain/services/score-calculator';
import { Score } from '../../domain/value-objects/score';

export interface CalculateScoreInput {
  assessmentId: string;
  itemResults: AssessmentItemResult[];
}

export interface CalculateScoreResult {
  assessmentId: string;
  score: Score;
}

export class CalculateScoreUseCase {
  constructor(private readonly assessments: AssessmentRepository) {}

  async execute(input: CalculateScoreInput): Promise<CalculateScoreResult> {
    const assessment = await this.assessments.findById(input.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const score = ScoreCalculator.calculate(
      assessment.getItems(),
      input.itemResults,
    );

    return {
      assessmentId: assessment.getId(),
      score,
    };
  }
}
