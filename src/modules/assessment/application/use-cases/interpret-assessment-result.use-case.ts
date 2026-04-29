import { AssessmentRepository } from '../../domain/repositories/assessment-repository';
import { AssessmentItemResult } from '../../domain/services/score-calculator';
import {
  AssessmentResultInterpretation,
  AssessmentResultInterpreter,
} from '../../domain/services/assessment-result-interpreter';

export interface InterpretAssessmentResultInput {
  assessmentId: string;
  itemResults: AssessmentItemResult[];
}

export interface InterpretAssessmentResultOutput {
  assessmentId: string;
  competencyId: string;
  interpretation: AssessmentResultInterpretation;
}

export class InterpretAssessmentResultUseCase {
  constructor(
    private readonly assessments: AssessmentRepository,
    private readonly interpreter: AssessmentResultInterpreter,
  ) {}

  async execute(
    input: InterpretAssessmentResultInput,
  ): Promise<InterpretAssessmentResultOutput> {
    const assessment = await this.assessments.findById(input.assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const items = assessment.getItems();
    const interpretation = this.interpreter.interpret(
      items,
      input.itemResults,
    );

    return {
      assessmentId: assessment.getId(),
      competencyId: items[0]?.getCompetencyId() || 'unknown-competency',
      interpretation,
    };
  }
}
