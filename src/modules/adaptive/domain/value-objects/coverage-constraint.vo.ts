export class CoverageConstraint {
  private constructor(
    private readonly mandatoryCompetencyIds: string[],
    private readonly deadlineAt: Date | null,
    private readonly weeklyHours: number,
  ) {}

  static from(props: {
    mandatoryCompetencyIds: string[];
    deadlineAt?: Date;
    weeklyHours: number;
  }): CoverageConstraint {
    if (props.weeklyHours <= 0)
      throw new Error('Weekly availability is invalid !');
    return new CoverageConstraint(
      props.mandatoryCompetencyIds,
      props.deadlineAt ?? null,
      props.weeklyHours,
    );
  }

  getMandatoryCompetencyIds(): string[] {
    return [...this.mandatoryCompetencyIds];
  }

  getWeeklyHours(): number {
    return this.weeklyHours;
  }

  getDeadline(): Date | null {
    return this.deadlineAt;
  }

  isFeasible(totalRequiredHours: number): boolean {
    if (!this.deadlineAt) return true;
    const weeksLeft = this.weeksUntilDeadline();
    return weeksLeft * this.weeklyHours >= totalRequiredHours;
  }

  private weeksUntilDeadline(): number {
    if (!this.deadlineAt) return Infinity;
    const ms = this.deadlineAt.getTime() - Date.now();
    return Math.max(0, ms / (1000 * 60 * 60 * 24 * 7));
  }
}
