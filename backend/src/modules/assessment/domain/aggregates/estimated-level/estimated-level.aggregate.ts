import { CompetencyId } from '../../../../../shared/competency-id';

/**
 * Per-learner, per-competency estimated mastery (« Niveau estimé » in Ubiquitous Language).
 * Persisted summary used to publish toward Adaptive BC; kept separate from ADL's runtime VO (`estimated-level.vo`).
 */
export class EstimatedLevel {
  /** Incrémente à chaque `updateLevel`; la 1ère observation pose le niveau brut (sans mélange EWMA depuis 0) pour éviter un faux sous-seuil (<0.5) qui déclenche la remédiation BC3 alors que la tentative interprète est bonne. */
  private observationCount = 0;

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
    const clamped = Math.min(1, Math.max(0, observedScore));

    if (this.observationCount === 0) {
      this.smoothedLevel = clamped;
      this.observationCount += 1;
      return;
    }

    const alpha = 0.35;
    const blended = this.smoothedLevel * (1 - alpha) + clamped * alpha;
    this.smoothedLevel = Math.min(1, Math.max(0, blended));
    this.observationCount += 1;
  }
}
