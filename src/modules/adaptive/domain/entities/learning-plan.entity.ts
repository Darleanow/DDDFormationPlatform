import { LearningPath } from '../entities/learning-path.entity';

export class LearningPlan {
  private readonly slots: WeeklySlot[];

  private constructor(
    public readonly id: string,
    public readonly learnerId: string,
    public readonly pathId: string,
    public readonly generatedAt: Date,
    slots: WeeklySlot[],
  ) {
    this.slots = [...slots];
  }

  /**
   * Builds a temporal projection of a LearningPath.
   * Allocates pending activities into weekly slots
   * based on the learner's available hours per week.
   */
  static fromPath(id: string, path: LearningPath): LearningPlan {
    const pendingActivities = path
      .getActivities()
      .filter((a) => a.isPending())
      .sort((a, b) => a.order - b.order);

    const weeklyHours = path.getConstraint().getWeeklyHours();
    const slots: WeeklySlot[] = [];

    let weekIndex = 0;
    let hoursUsedThisWeek = 0;
    let currentSlotActivities: WeeklySlot['activities'] = [];
    const startOfWeek = LearningPlan.getStartOfCurrentWeek();

    for (const activity of pendingActivities) {
      // If activity doesn't fit in remaining hours, start a new week
      if (
        hoursUsedThisWeek + activity.estimatedHours > weeklyHours &&
        currentSlotActivities.length > 0
      ) {
        slots.push(
          new WeeklySlot(
            LearningPlan.addWeeks(startOfWeek, weekIndex),
            currentSlotActivities,
            hoursUsedThisWeek,
          ),
        );
        weekIndex++;
        hoursUsedThisWeek = 0;
        currentSlotActivities = [];
      }

      currentSlotActivities.push({
        activityId: activity.id,
        contentId: activity.contentId,
        type: activity.type,
        estimatedHours: activity.estimatedHours,
        order: activity.order,
      });
      hoursUsedThisWeek += activity.estimatedHours;
    }

    // Flush remaining activities
    if (currentSlotActivities.length > 0) {
      slots.push(
        new WeeklySlot(
          LearningPlan.addWeeks(startOfWeek, weekIndex),
          currentSlotActivities,
          hoursUsedThisWeek,
        ),
      );
    }

    return new LearningPlan(id, path.learnerId, path.id, new Date(), slots);
  }

  getSlots(): WeeklySlot[] {
    return [...this.slots];
  }

  getTotalPlannedWeeks(): number {
    return this.slots.length;
  }

  getEstimatedCompletionDate(): Date | null {
    if (this.slots.length === 0) return null;
    return this.slots[this.slots.length - 1].weekStartDate;
  }

  isFeasibleByDeadline(deadline: Date): boolean {
    const completionDate = this.getEstimatedCompletionDate();
    if (!completionDate) return true;
    return completionDate <= deadline;
  }

  private static getStartOfCurrentWeek(): Date {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    now.setDate(diff);
    now.setHours(0, 0, 0, 0);
    return now;
  }

  private static addWeeks(base: Date, weeks: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + weeks * 7);
    return d;
  }
}

export interface ScheduledActivity {
  activityId: string;
  contentId: string;
  type: string;
  estimatedHours: number;
  order: number;
}

export class WeeklySlot {
  constructor(
    public readonly weekStartDate: Date,
    public readonly activities: ScheduledActivity[],
    public readonly plannedHours: number,
  ) {}
}
