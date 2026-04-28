import { Module } from '@nestjs/common';

import { SubmitAssessmentUseCase } from './application/use-cases/submit-assessment.use-case';
import {
	ASSESSMENT_REPOSITORY,
	AssessmentRepository,
} from './domain/repositories/assessment-repository';
import { InMemoryAssessmentRepository } from './infrastructure/persistence/in-memory/in-memory-assessment.repository';
import { AssessmentController } from './presentation/controllers/assessment.controller';

@Module({
	controllers: [AssessmentController],
	providers: [
		{
			provide: ASSESSMENT_REPOSITORY,
			useClass: InMemoryAssessmentRepository,
		},
		{
			provide: SubmitAssessmentUseCase,
			useFactory: (repo: AssessmentRepository) =>
				new SubmitAssessmentUseCase(repo),
			inject: [ASSESSMENT_REPOSITORY],
		},
	],
})
export class AssessmentModule {}
