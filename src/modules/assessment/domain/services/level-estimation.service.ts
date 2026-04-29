/**
 * BC4 — Estimated mastery level derived from interpreted assessment results (spec: LevelEstimationService).
 * Representation is a bounded numeric score aligned with Adaptive Engine consumption via ACL.
 */

export interface LevelEstimationResult {
  /** Normalized estimated level in [0, 1] for downstream BC3 adaptive logic. */
  readonly estimatedLevel: number;
}

/** Maps a raw interpreted score curve into an estimated proficiency level snapshot. */
export class LevelEstimationService {
  /**
   * @param interpretedScore Interpreted score typically in [0, 1] from {@link AssessmentResultInterpreter}.
   */
  estimateFromInterpretedScore(interpretedScore: number): LevelEstimationResult {
    const clamped = Math.min(1, Math.max(0, interpretedScore));
    return { estimatedLevel: clamped };
  }
}
