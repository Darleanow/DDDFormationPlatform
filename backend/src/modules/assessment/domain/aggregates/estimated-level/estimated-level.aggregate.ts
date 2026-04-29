import { CompetencyId } from '../../../../../shared/competency-id';

/**
 * Per-learner, per-competency estimated mastery (« Niveau estimé » in Ubiquitous Language).
 * Persisted summary used to publish toward Adaptive BC; kept separate from ADL's runtime VO (`estimated-level.vo`).
 */
export class EstimatedLevel {
  constructor(
    private readonly learnerId: string,
    private readonly competencyId: CompetencyId,
    private readonly tenantId: string | undefined,
    private smoothedLevel: number,
  ) {}

  getLearnerId(): string {
    return this.learnerId;
  }

  getCompetencyId(): CompetencyId {
    return this.competencyId;
  }

  get currentLevelValue(): number {
    return this.smoothedLevel;
  }

  /** Blend new observed score into running estimate (formative path). */
  updateLevel(observedScore: number): void {
    const alpha = 0.35;
    const blended =
      Number.isFinite(this.smoothedLevel) && Number.isFinite(observedScore)
        ? this.smoothedLevel * (1 - alpha) + observedScore * alpha
        : observedScore;
    this.smoothedLevel = Math.min(1, Math.max(0, blended));
  }
}
