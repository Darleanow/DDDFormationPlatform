import { Body, Controller, Param, Post } from '@nestjs/common';

import { SubmitAssessmentUseCase } from '../../application/use-cases/submit-assessment.use-case';
import { SubmitAssessmentDto } from '../dto/submit-assessment.dto';

@Controller('assessments')
export class AssessmentController {
  constructor(private readonly submitAssessment: SubmitAssessmentUseCase) {}

  @Post(':assessmentId/submit')
  async submit(
    @Param('assessmentId') assessmentId: string,
    @Body() body: SubmitAssessmentDto,
  ) {
    return this.submitAssessment.execute({
      assessmentId,
      score: body.score,
    });
  }
}
