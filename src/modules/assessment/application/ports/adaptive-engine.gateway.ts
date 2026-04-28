export const ADAPTIVE_ENGINE_GATEWAY = Symbol('ADAPTIVE_ENGINE_GATEWAY');

export interface AdaptiveEngineGateway {
  submitScore(input: {
    learnerId: string;
    competenceId: string;
    estimatedLevel: number;
    tenantId?: string;
  }): Promise<void>;
}
