export interface RemediationContent {
  contentId: string;
  estimatedHours: number;
}

export const LEARNING_CATALOG_GATEWAY = Symbol('LEARNING_CATALOG_GATEWAY');

export interface LearningCatalogGateway {
  /**
   * Fetches a module piece (a remedial lesson/exercise) suited for learning a specific competence
   */
  findRemediationContent(competencyId: string): Promise<RemediationContent | null>;
}
