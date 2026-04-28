/**
 * LearningPathCompletedEvent — BC3 Domain Event
 *
 * Emitted when a learner has finished all activities in their LearningPath
 * and all mandatory competences have been evaluated.
 *
 * BC5 (Certification) listens to this event via its own ACL.
 * BC3 remains completely agnostic of BC5 — it simply reports the outcome.
 */
export class LearningPathCompletedEvent {
  constructor(
    /** The BC3 aggregate ID */
    public readonly learningPathId: string,

    /** The learner who completed the path */
    public readonly learnerId: string,

    /** Opaque ID — BC3 stores it without knowing what a "certification" is */
    public readonly targetCertificationId: string,

    /** Average of all recorded EstimatedLevel scores (0.0 → 1.0) */
    public readonly globalScore: number,

    /**
     * Per-competence breakdown.
     * isCriticalFailure = true when the final score < 0.5 (EstimatedLevel.isInsufficient()).
     * BC5 applies its own "compétence critique" rules on top of this data.
     */
    public readonly competences: Array<{
      competenceId: string;
      score: number;
      isCriticalFailure: boolean;
    }>,
  ) {}
}
