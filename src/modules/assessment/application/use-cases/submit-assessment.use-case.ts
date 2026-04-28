import { AssessmentRepository } from '../../domain/repositories/assessment-repository';
import { Score } from '../../domain/value-objects/score';

export interface SubmitAssessmentInput {
  assessmentId: string;
  score: number;
}

export interface SubmitAssessmentResult {
  assessmentId: string;
  score: number;
}

export class SubmitAssessmentUseCase {
  constructor(private readonly assessments: AssessmentRepository) {}

  async execute(input: SubmitAssessmentInput): Promise<SubmitAssessmentResult> {
    const assessment = await this.assessments.findById(input.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const score = new Score(input.score);

    return {
      assessmentId: assessment.getId(),
      score: score.value,
    };
  }
}
