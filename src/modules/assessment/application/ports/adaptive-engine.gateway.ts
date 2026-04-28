export const ADAPTIVE_ENGINE_GATEWAY = Symbol('ADAPTIVE_ENGINE_GATEWAY');

export interface AdaptiveEngineGateway {
  submitScore(input: {
    assessmentId: string;
    attemptId: string;
    score: number;
    tenantId?: string;
  }): Promise<void>;
}
