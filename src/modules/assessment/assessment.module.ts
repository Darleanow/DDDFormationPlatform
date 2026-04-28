import { Module } from '@nestjs/common';

import {
	ADAPTIVE_ENGINE_GATEWAY,
	AdaptiveEngineGateway,
} from './application/ports/adaptive-engine.gateway';
import { CalculateScoreUseCase } from './application/use-cases/calculate-score.use-case';
import { GenerateAssessmentUseCase } from './application/use-cases/generate-assessment.use-case';
import { ProcessAssessmentAttemptUseCase } from './application/use-cases/process-assessment-attempt.use-case';
import { SubmitAssessmentUseCase } from './application/use-cases/submit-assessment.use-case';
import {
	ESTIMATED_LEVEL_DIFFICULTY_POLICY,
	EstimatedLevelDifficultyPolicy,
	StaticEstimatedLevelDifficultyPolicy,
} from './application/policies/estimated-level-difficulty.policy';
import { BehavioralAnomalyDetector } from './domain/services/behavioral-anomaly-detector';
import { DifficultyRange } from './domain/value-objects/difficulty-range';
import {
	ASSESSMENT_ATTEMPT_REPOSITORY,
	AssessmentAttemptRepository,
} from './domain/repositories/assessment-attempt-repository';
import {
	ASSESSMENT_ITEM_REPOSITORY,
	AssessmentItemRepository,
} from './domain/repositories/assessment-item-repository';
import {
	ASSESSMENT_REPOSITORY,
	AssessmentRepository,
} from './domain/repositories/assessment-repository';
import { NoopAdaptiveEngineGateway } from './infrastructure/integration/noop-adaptive-engine.gateway';
import { InMemoryAssessmentAttemptRepository } from './infrastructure/persistence/in-memory/in-memory-assessment-attempt.repository';
import { InMemoryAssessmentItemRepository } from './infrastructure/persistence/in-memory/in-memory-assessment-item.repository';
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
			provide: ASSESSMENT_ITEM_REPOSITORY,
			useClass: InMemoryAssessmentItemRepository,
		},
		{
			provide: ASSESSMENT_ATTEMPT_REPOSITORY,
			useClass: InMemoryAssessmentAttemptRepository,
		},
		{
			provide: ADAPTIVE_ENGINE_GATEWAY,
			useClass: NoopAdaptiveEngineGateway,
		},
		{
			provide: ESTIMATED_LEVEL_DIFFICULTY_POLICY,
			useFactory: () =>
				new StaticEstimatedLevelDifficultyPolicy({
					intermediaire: new DifficultyRange(0.4, 0.7),
				}),
		},
		{
			provide: BehavioralAnomalyDetector,
			useFactory: () =>
				new BehavioralAnomalyDetector({
					minQuestionCount: 20,
					maxDurationSeconds: 45,
					signal: 'FAST_RESPONSE',
					confidence: 1,
				}),
		},
		{
			provide: SubmitAssessmentUseCase,
			useFactory: (repo: AssessmentRepository) =>
				new SubmitAssessmentUseCase(repo),
			inject: [ASSESSMENT_REPOSITORY],
		},
		{
			provide: GenerateAssessmentUseCase,
			useFactory: (
				assessments: AssessmentRepository,
				items: AssessmentItemRepository,
				policy: EstimatedLevelDifficultyPolicy,
			) => new GenerateAssessmentUseCase(assessments, items, policy),
			inject: [
				ASSESSMENT_REPOSITORY,
				ASSESSMENT_ITEM_REPOSITORY,
				ESTIMATED_LEVEL_DIFFICULTY_POLICY,
			],
		},
		{
			provide: CalculateScoreUseCase,
			useFactory: (repo: AssessmentRepository) =>
				new CalculateScoreUseCase(repo),
			inject: [ASSESSMENT_REPOSITORY],
		},
		{
			provide: ProcessAssessmentAttemptUseCase,
			useFactory: (
				calculateScore: CalculateScoreUseCase,
				attempts: AssessmentAttemptRepository,
				adaptiveEngine: AdaptiveEngineGateway,
				anomalyDetector: BehavioralAnomalyDetector,
			) =>
				new ProcessAssessmentAttemptUseCase(
					calculateScore,
					attempts,
					adaptiveEngine,
					anomalyDetector,
				),
			inject: [
				CalculateScoreUseCase,
				ASSESSMENT_ATTEMPT_REPOSITORY,
				ADAPTIVE_ENGINE_GATEWAY,
				BehavioralAnomalyDetector,
			],
		},
	],
})
export class AssessmentModule {}
