import { Module } from '@nestjs/common';

import {
  ADAPTIVE_ENGINE_GATEWAY,
  AdaptiveEngineGateway,
} from './application/ports/adaptive-engine.gateway';
import { CalculateScoreUseCase } from './application/use-cases/calculate-score.use-case';
import { GenerateAssessmentUseCase } from './application/use-cases/generate-assessment.use-case';
import { InterpretAssessmentResultUseCase } from './application/use-cases/interpret-assessment-result.use-case';
import { ProcessAssessmentAttemptUseCase } from './application/use-cases/process-assessment-attempt.use-case';
import { SubmitAssessmentUseCase } from './application/use-cases/submit-assessment.use-case';
import {
  ADAPTIVE_DIFFICULTY_SERVICE,
  StaticAdaptiveDifficultyService,
  type AdaptiveDifficultyService,
} from './application/services/adaptive-difficulty.service';
import { AnomalyDetectionService } from './domain/services/anomaly-detection.service';
import { AssessmentResultInterpreter } from './domain/services/assessment-result-interpreter';
import { LevelEstimationService } from './domain/services/level-estimation.service';
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
import { InMemoryAssessmentAttemptRepository } from './infrastructure/persistence/in-memory/in-memory-assessment-attempt.repository';
import { InMemoryAssessmentItemRepository } from './infrastructure/persistence/in-memory/in-memory-assessment-item.repository';
import { InMemoryAssessmentRepository } from './infrastructure/persistence/in-memory/in-memory-assessment.repository';
import { AssessmentController } from './presentation/controllers/assessment.controller';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEmitterAdaptiveEngineGateway } from './infrastructure/integration/event-emitter-adaptive-engine.gateway';
import { CatalogModule } from '../catalog/catalog.module';
import { CompetencyAssessmentsBootstrap } from './infrastructure/bootstrap/competency-assessments-bootstrap.service';

@Module({
  imports: [CatalogModule],
  controllers: [AssessmentController],
  providers: [
    CompetencyAssessmentsBootstrap,
    LevelEstimationService,
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
      useFactory: (eventEmitter: EventEmitter2) =>
        new EventEmitterAdaptiveEngineGateway(eventEmitter),
      inject: [EventEmitter2],
    },
    {
      provide: ADAPTIVE_DIFFICULTY_SERVICE,
      useFactory: (): AdaptiveDifficultyService =>
        new StaticAdaptiveDifficultyService({
          debutant: new DifficultyRange(0.1, 0.4),
          intermediaire: new DifficultyRange(0.4, 0.7),
          avance: new DifficultyRange(0.7, 0.95),
        }),
    },
    {
      provide: AssessmentResultInterpreter,
      useClass: AssessmentResultInterpreter,
    },
    {
      provide: AnomalyDetectionService,
      useFactory: () =>
        new AnomalyDetectionService({
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
        adaptiveDifficulty: AdaptiveDifficultyService,
      ) =>
        new GenerateAssessmentUseCase(assessments, items, adaptiveDifficulty),
      inject: [
        ASSESSMENT_REPOSITORY,
        ASSESSMENT_ITEM_REPOSITORY,
        ADAPTIVE_DIFFICULTY_SERVICE,
      ],
    },
    {
      provide: CalculateScoreUseCase,
      useFactory: (repo: AssessmentRepository) =>
        new CalculateScoreUseCase(repo),
      inject: [ASSESSMENT_REPOSITORY],
    },
    {
      provide: InterpretAssessmentResultUseCase,
      useFactory: (
        assessments: AssessmentRepository,
        interpreter: AssessmentResultInterpreter,
      ) => new InterpretAssessmentResultUseCase(assessments, interpreter),
      inject: [ASSESSMENT_REPOSITORY, AssessmentResultInterpreter],
    },
    {
      provide: ProcessAssessmentAttemptUseCase,
      useFactory: (
        interpretResult: InterpretAssessmentResultUseCase,
        attempts: AssessmentAttemptRepository,
        assessments: AssessmentRepository,
        adaptiveEngine: AdaptiveEngineGateway,
        anomalyDetectionService: AnomalyDetectionService,
        eventEmitter: EventEmitter2,
      ) =>
        new ProcessAssessmentAttemptUseCase(
          interpretResult,
          attempts,
          assessments,
          adaptiveEngine,
          anomalyDetectionService,
          eventEmitter,
        ),
      inject: [
        InterpretAssessmentResultUseCase,
        ASSESSMENT_ATTEMPT_REPOSITORY,
        ASSESSMENT_REPOSITORY,
        ADAPTIVE_ENGINE_GATEWAY,
        AnomalyDetectionService,
        EventEmitter2,
      ],
    },
  ],
})
export class AssessmentModule {}
