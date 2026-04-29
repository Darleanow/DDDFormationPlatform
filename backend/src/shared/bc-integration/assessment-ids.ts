/** Stable ID shared by BC3 (LearningPath assessment activities) and BC4 (Assessment aggregate). SK: pedagogical competency id anchor. */
export function assessmentAggregateIdForCompetency(competencyId: string): string {
  // Segment `competence` kept so existing seeded paths / CSV data remain aligned.
  return `assessment:competence:${competencyId}`;
}
