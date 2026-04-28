import { RegleObtention } from '../../domain/entities/regle-obtention.entity';
import { ValidationCompetence } from '../../domain/value-objects/validation-competence.value-object';
import type { CompetencyId } from '../../../../shared/competency-id';

/** Normalizes Assessment / Adaptive competency scores so they compare to `scoreSeuil`. */
function competencyScoreToPercent(score: number): number {
  return score <= 1 ? score * 100 : score;
}

/**
 * Builds {@link ValidationCompetence} instances from BC3 completion data for BC5 rule evaluation.
 */
export function mapPathCompletionResultsToValidationCompetences(
  rules: RegleObtention,
  results: ReadonlyArray<{ competencyId: string; score: number }>,
): ValidationCompetence[] {
  const ids = new Set<string>([
    ...rules.competencesObligatoires,
    ...rules.competencesCritiques,
    ...results.map((r) => r.competencyId),
  ]);

  return [...ids].map((id) => {
    const raw = results.find((r) => r.competencyId === id)?.score ?? 0;
    const pct = competencyScoreToPercent(raw);
    const mastered = pct >= rules.scoreSeuil;
    return new ValidationCompetence(id as CompetencyId, mastered);
  });
}

export function normalizeGlobalScoreForCertificationRules(
  globalScoreRaw: number,
  scoreSeuil: number,
): number {
  if (scoreSeuil <= 1) {
    return globalScoreRaw <= 1 ? globalScoreRaw : globalScoreRaw / 100;
  }
  return globalScoreRaw <= 1 ? globalScoreRaw * 100 : globalScoreRaw;
}
