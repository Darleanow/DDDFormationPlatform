import { LearningPath } from '../entities/learning-path.entity';

export type SolverResult =
  | { feasible: true }
  | { feasible: false; uncoveredCompetences: string[]; alertMessage: string };

export class ConstraintSolverService {
  solve(path: LearningPath): SolverResult {
    const uncovered = path.getMandatoryUncoveredCompetences();

    if (!path.isCoverageFeasible() || uncovered.length > 0) {
      return {
        feasible: false,
        uncoveredCompetences: uncovered,
        alertMessage: `Skill uncovered in delay : ${uncovered.length}`,
      };
    }

    return { feasible: true };
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
      const aIsMandatory = a.competenceIds.some((c) => uncovered.has(c));
      const bIsMandatory = b.competenceIds.some((c) => uncovered.has(c));
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
