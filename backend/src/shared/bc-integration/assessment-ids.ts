/** Stable ID shared by BC3 (LearningPath assessment activities) and BC4 (Assessment aggregate). SK: pedagogical competency id anchor. */
export function assessmentAggregateIdForCompetency(competencyId: string): string {
  // Segment `competence` kept so existing seeded paths / CSV data remain aligned.
  return `assessment:competence:${competencyId}`;
}

const ASSESSMENT_COMPETENCE_PREFIX = 'assessment:competence:';

/** Inverse de {@link assessmentAggregateIdForCompetency} — null si ce n’est pas une ligne d’évaluation BC3. */
export function competencyIdFromAssessmentContentId(contentId: string): string | null {
  if (!contentId.startsWith(ASSESSMENT_COMPETENCE_PREFIX)) return null;
  return contentId.slice(ASSESSMENT_COMPETENCE_PREFIX.length);
}
