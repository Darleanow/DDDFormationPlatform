import { Body, Controller, Param, Post } from '@nestjs/common';

import { GenerateAssessmentUseCase } from '../../application/use-cases/generate-assessment.use-case';
import { ProcessAssessmentAttemptUseCase } from '../../application/use-cases/process-assessment-attempt.use-case';
import { SubmitAssessmentUseCase } from '../../application/use-cases/submit-assessment.use-case';
import { GenerateAssessmentDto } from '../dto/generate-assessment.dto';
import { ProcessAssessmentAttemptDto } from '../dto/process-assessment-attempt.dto';
import { SubmitAssessmentDto } from '../dto/submit-assessment.dto';

@Controller('assessments')
export class AssessmentController {
  constructor(
    private readonly submitAssessment: SubmitAssessmentUseCase,
    private readonly generateAssessment: GenerateAssessmentUseCase,
    private readonly processAttempt: ProcessAssessmentAttemptUseCase,
  ) {}

  @Post('generate')
  async generate(@Body() body: GenerateAssessmentDto) {
    return this.generateAssessment.execute({
      assessmentId: body.assessmentId,
      skillId: body.skillId,
      estimatedLevel: body.estimatedLevel,
      tenantId: body.tenantId,
    });
  }

  @Post(':assessmentId/attempts/:attemptId/process')
  async processAssessmentAttempt(
    @Param('assessmentId') assessmentId: string,
    @Param('attemptId') attemptId: string,
    @Body() body: ProcessAssessmentAttemptDto,
  ) {
    return this.processAttempt.execute({
      assessmentId,
      attemptId,
      questionCount: body.questionCount,
      durationSeconds: body.durationSeconds,
      itemResults: body.itemResults,
      tenantId: body.tenantId,
    });
  }

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
