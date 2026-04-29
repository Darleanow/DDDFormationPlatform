/**
 * In-process event names (NestJS EventEmitter2).
 * Keeps BC2–BC5 wiring branchable without implicit string drift between emitters and @OnEvent listeners.
 */
export const BC_INPROCESS_EVENT = {
  /** BC4 emits — BC3 {@link AssessmentToAdaptiveAdapter} listens (ACL translates to BC3). */
  ASSESSMENT_RESULT: 'assessment.result',
  /** BC3 emits after {@link LearningPath} domain aggregates pull events — emitted as constructor.name → `LearningPathCompletedEvent`. */
  LEARNING_PATH_COMPLETED_CLASSNAME: 'LearningPathCompletedEvent',
  /** BC5 emits after irrevocable issuance. */
  CERTIFICATION_ISSUED: 'certification.delivered',
  /** BC3 emits when mandatory coverage cannot be met (constraint solver). */
  ADAPTIVE_COVERAGE_AT_RISK: 'adaptive.coverage.alert',
} as const;

/** Payload BC4 publishes for BC3 adaptive engine boundary (scores 0–1). */
export type AssessmentScorePublishedForAdaptivePayload = {
  learnerId: string;
  competencyId: string;
  /** Niveau agrégé / lissé (affichage parcours + updateLevel). */
  estimatedLevel: number;
  /** Score de la tentative courante (0–1) pour la série d’accélération — évite un lissage agrégé &lt; 0,9 alors que l’épreuve est réussie. */
  streakSignalScore?: number;
  tenantId?: string;
};
