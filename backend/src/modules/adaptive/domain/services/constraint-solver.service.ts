import { LearningPath } from '../entities/learning-path.entity';

/**
 * Sépare le risque « calendrier / charge » du simple « compétences obligatoires encore non couvertes »
 * — cette dernière situation est normale tout au long du parcours et ne doit pas afficher une alerte rouge.
 */
export type SolverResult = {
  /** True lorsque les heures encore PENDING tiennent dans la capacité semaine × semaines jusqu’à l’échéance. */
  scheduleFeasible: boolean;
  /** Compétences obligatoires absentes des activités COMPLETED encore (progression résiduelle attendue). */
  uncoveredMandatoryCompetences: string[];
};

export class ConstraintSolverService {
  solve(path: LearningPath): SolverResult {
    const uncoveredMandatoryCompetences = path.getMandatoryUncoveredCompetences();
    const scheduleFeasible = path.isCoverageFeasible();
    return { scheduleFeasible, uncoveredMandatoryCompetences };
  }

  scheduleRiskMessage(path: LearningPath): string | undefined {
    if (path.isCoverageFeasible()) return undefined;
    const n = path.getMandatoryUncoveredCompetences().length;
    return (
      `Charge horaire : le travail encore prévu (${n} compétence(s) obligatoire(s) pas encore acquises via le parcours) ` +
      `semble excéder les créneaux disponibles avant l’échéance avec la disponibilité hebdomadaire actuelle.`
    );
  }

  /**
   * Reorders PENDING activities to prioritize mandatory uncovered skills,
   * while keeping COMPLETED activities untouched at the beginning.
   */
  prioritizeMandatory(path: LearningPath): void {
    const uncovered = new Set(path.getMandatoryUncoveredCompetences());
    if (uncovered.size === 0) return;

    const allActivities = path.getActivities();
    const completed = allActivities.filter((a) => !a.isPending());
    const pending = allActivities.filter((a) => a.isPending());

    // Priority for pending activities covering must-have skills
    pending.sort((a, b) => {
      const aIsMandatory = a.competencyIds.some((c) => uncovered.has(c));
      const bIsMandatory = b.competencyIds.some((c) => uncovered.has(c));
      if (aIsMandatory && !bIsMandatory) return -1;
      if (!aIsMandatory && bIsMandatory) return 1;
      return a.order - b.order;
    });

    const newSequence = [...completed, ...pending];

    // Affects order globally based on the new sequence
    newSequence.forEach((a, i) => ((a as any).order = i));
    path.reorderActivities(newSequence);
  }
}
