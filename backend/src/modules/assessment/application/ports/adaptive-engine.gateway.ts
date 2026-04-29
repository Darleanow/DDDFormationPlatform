export const ADAPTIVE_ENGINE_GATEWAY = Symbol('ADAPTIVE_ENGINE_GATEWAY');

export interface AdaptiveEngineGateway {
  submitScore(input: {
    learnerId: string;
    competencyId: string;
    estimatedLevel: number;
    streakSignalScore?: number;
    tenantId?: string;
  }): Promise<void>;
}
