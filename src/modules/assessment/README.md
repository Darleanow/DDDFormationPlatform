# Assessment Module Integration

This module exposes HTTP endpoints plus application use cases for integration. It also depends on outbound ports that must be implemented by other components in production.

## Inbound Entry Points (HTTP)
Base route: /assessments

- POST /assessments/generate
  - Purpose: Generate an assessment by estimated level and competence.
  - DTO: GenerateAssessmentDto
    - assessmentId: string
    - competenceId: string
    - estimatedLevel: string
    - tenantId?: string
  - Use case: GenerateAssessmentUseCase
  - Output: assessmentId, items[] (id, difficulty, weight)

- POST /assessments/:assessmentId/attempts/:attemptId/process
  - Purpose: Process an attempt, detect behavioral anomaly, submit score when allowed.
  - DTO: ProcessAssessmentAttemptDto
    - learnerId: string
    - questionCount: number
    - durationSeconds: number
    - itemResults: { itemId: string; isCorrect: boolean }[]
    - tenantId?: string
  - Use case: ProcessAssessmentAttemptUseCase
  - Output: learnerId, competenceId, score, interpretedScore, estimatedLevel, status, manualReviewStatus, requiresManualValidation, behavioralAnomaly?

- POST /assessments/:assessmentId/submit
  - Purpose: Legacy raw score submission for simple flows.
  - DTO: SubmitAssessmentDto
    - score: number
  - Use case: SubmitAssessmentUseCase
  - Output: assessmentId, score

## Inbound Entry Points (Application Use Cases)
Use these directly from other modules if you prefer in-process orchestration instead of HTTP.

- GenerateAssessmentUseCase.execute({ assessmentId, competenceId, estimatedLevel, tenantId? })
- ProcessAssessmentAttemptUseCase.execute({ assessmentId, attemptId, learnerId, questionCount, durationSeconds, itemResults, tenantId? })
- InterpretAssessmentResultUseCase.execute({ assessmentId, itemResults })
- CalculateScoreUseCase.execute({ assessmentId, itemResults })
- SubmitAssessmentUseCase.execute({ assessmentId, score })

## Exit Points (Outbound Ports)
These are required for full integration. Replace in-memory/noop implementations in production.

- Adaptive engine submission
  - Port: AdaptiveEngineGateway
  - Token: ADAPTIVE_ENGINE_GATEWAY
  - Method: submitScore({ learnerId, competenceId, estimatedLevel, tenantId? })

- Assessment persistence
  - Port: AssessmentRepository
  - Token: ASSESSMENT_REPOSITORY
  - Methods: findById, save

- Assessment item query
  - Port: AssessmentItemRepository
  - Token: ASSESSMENT_ITEM_REPOSITORY
  - Method: findByCompetenceId

- Assessment attempt persistence
  - Port: AssessmentAttemptRepository
  - Token: ASSESSMENT_ATTEMPT_REPOSITORY
  - Methods: findById, save

- Estimated level difficulty policy
  - Port: EstimatedLevelDifficultyPolicy
  - Token: ESTIMATED_LEVEL_DIFFICULTY_POLICY
  - Method: getRangeFor(estimatedLevel)

## Integration Notes
- If a Behavioral Anomaly is detected, the attempt is marked SUSPECT and score submission to the adaptive engine is blocked.
- Interpreted score is derived from average difficulty and answer consistency; the formula is marked TODO in code and must be revisited with domain experts.
- Adaptive integration emits the EventEmitter2 event assessment.result with { learnerId, competenceId, estimatedLevel, tenantId? }.
- Default estimated level ranges are placeholders and marked TODO in code.
