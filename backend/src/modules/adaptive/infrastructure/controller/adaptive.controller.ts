import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LearningPathRepository } from '../../domain/repositories/learning-path.repository';
import { ConstraintSolverService } from '../../domain/services/constraint-solver.service';
import { Recommendation } from '../../domain/entities/recommendation.entity';
import { LearningPlan } from '../../domain/entities/learning-plan.entity';
import { Activity } from '../../domain/entities/activity.entity';
import { ProgramModuleOverviewService } from '../../application/services/program-module-overview.service';
import {
  AssessmentResultHandler,
  AssessmentResultPayload,
  MANUAL_ASSESSMENT_UI_SCORE,
} from '../../application/handlers/assessment-result.handler';
import { competencyIdFromAssessmentContentId } from '../../../../shared/bc-integration/assessment-ids';

// ── DTOs ────────────────────────────────────────────────────────────────────

export class ActivityDto {
  id: string;
  contentId: string;
  type: string;
  competencyIds: string[];
  estimatedHours: number;
  order: number;
  status: string;
}

export class PathResponseDto {
  learnerId: string;
  activities: ActivityDto[];
  nextActivity: ActivityDto | null;
  /** True lorsque les heures PENDING dépassent la capacité jusqu’à l’échéance avec la disponibilité hebdo. */
  coverageAtRisk: boolean;
  alertMessage?: string;
  /** Obligatoires pas encore présents sur au moins une activité COMPLETED — normal en cours de route. */
  uncoveredCompetences: string[];
  /** Évaluations consécutives &gt; 90 % (objectif 3 pour sauter le contenu redondant sur la compétence). */
  accelerationAssessmentStreak: number;
}

export class RecommendationResponseDto {
  learnerId: string;
  nextActivity: ActivityDto | null;
  reason: string;
  coverageAtRisk: boolean;
}

export class WeeklySlotDto {
  weekStartDate: Date;
  plannedHours: number;
  activities: {
    contentId: string;
    type: string;
    estimatedHours: number;
    order: number;
  }[];
}

export class LearningPlanResponseDto {
  learnerId: string;
  pathId: string;
  totalWeeks: number;
  estimatedCompletionDate: Date | null;
  feasibleByDeadline: boolean | null;
  slots: WeeklySlotDto[];
}

export class ModuleOverviewRowDto {
  moduleId!: string;
  nom!: string;
  canAccess!: boolean;
  missingPrerequisites!: { id: string; titre: string }[];
  completedSteps!: number;
  totalSteps!: number;
  fullyDone!: boolean;
  steps!: {
    type: string;
    contentId: string;
    label: string;
    completed: boolean;
  }[];
}

export class ProgramModulesOverviewResponseDto {
  learnerId!: string;
  programId!: string;
  modules!: ModuleOverviewRowDto[];
}

// ── Controller ───────────────────────────────────────────────────────────────

@Controller('adaptive/path')
export class AdaptiveController {
  constructor(
    private readonly repo: LearningPathRepository,
    private readonly solver: ConstraintSolverService,
    private readonly moduleOverview: ProgramModuleOverviewService,
    private readonly assessmentResultHandler: AssessmentResultHandler,
  ) {}

  /**
   * GET /adaptive/path/:learnerId/program-modules?programId=...
   * Catalogue BC2 + prérequis + progression réelle sur le parcours BC3 (doit être avant :learnerId).
   */
  @Get(':learnerId/program-modules')
  async getProgramModulesOverview(
    @Param('learnerId') learnerId: string,
    @Query('programId') programId: string,
  ): Promise<ProgramModulesOverviewResponseDto> {
    if (!programId?.trim()) {
      throw new BadRequestException('Query programId est requis (ex. p001).');
    }
    const modules = await this.moduleOverview.build(learnerId, programId.trim());
    return {
      learnerId,
      programId: programId.trim(),
      modules,
    };
  }

  /**
   * GET /adaptive/path/:learnerId
   * Returns the full learning path with constraint status.
   */
  @Get(':learnerId')
  async getPath(
    @Param('learnerId') learnerId: string,
  ): Promise<PathResponseDto> {
    const path = await this.repo.findByLearnerId(learnerId);
    if (!path) {
      throw new NotFoundException(
        `Parcours non trouvé pour l'apprenant ${learnerId}`,
      );
    }

    const result = this.solver.solve(path);
    const nextActivity = path.getNextPendingActivity();

    const uncoveredCompetences = result.uncoveredMandatoryCompetences;
    let alertMessage: string | undefined;
    if (!result.scheduleFeasible) {
      alertMessage = this.solver.scheduleRiskMessage(path);
    }

    return {
      learnerId,
      activities: path.getActivities().map((a) => this.toDto(a)),
      nextActivity: nextActivity ? this.toDto(nextActivity) : null,
      coverageAtRisk: !result.scheduleFeasible,
      alertMessage,
      uncoveredCompetences,
      accelerationAssessmentStreak: path.getAssessmentAccelerationStreak(),
    };
  }

  /**
   * GET /adaptive/path/:learnerId/recommendation
   * Returns the next recommended activity with reason and coverage status.
   */
  @Get(':learnerId/recommendation')
  async getRecommendation(
    @Param('learnerId') learnerId: string,
  ): Promise<RecommendationResponseDto> {
    const path = await this.repo.findByLearnerId(learnerId);
    if (!path) {
      throw new NotFoundException(
        `Parcours non trouvé pour l'apprenant ${learnerId}`,
      );
    }

    const solverResult = this.solver.solve(path);
    const nextActivity = path.getNextPendingActivity();

    let recommendation: Recommendation;
    if (!nextActivity) {
      recommendation = Recommendation.noActivityAvailable(learnerId);
    } else {
      const reason = !solverResult.scheduleFeasible
        ? 'MANDATORY_PRIORITY'
        : nextActivity.type === 'REMEDIATION'
          ? 'POST_REMEDIATION'
          : 'NEXT_IN_SEQUENCE';

      recommendation = Recommendation.forNextActivity(
        learnerId,
        nextActivity,
        reason,
        !solverResult.scheduleFeasible,
      );
    }

    return {
      learnerId,
      nextActivity: recommendation.activity
        ? this.toDto(recommendation.activity)
        : null,
      reason: recommendation.reason,
      coverageAtRisk: recommendation.coverageAtRisk,
    };
  }

  /**
   * POST /adaptive/path/:learnerId/complete-current
   * Marks the current pending activity as completed.
   * Optionally pass `{ contentId }` — must match the next pending lesson/activity or 400 (order respected).
   */
  @Post(':learnerId/complete-current')
  async completeCurrentActivity(
    @Param('learnerId') learnerId: string,
    @Body()
    body?: { contentId?: string },
  ) {
    const path = await this.repo.findByLearnerId(learnerId);
    if (!path) {
      throw new NotFoundException(
        `Parcours non trouvé pour l'apprenant ${learnerId}`,
      );
    }

    const next = path.getNextPendingActivity();
    if (!next) {
      throw new BadRequestException('Aucune activité à compléter sur ce parcours.');
    }
    if (
      body?.contentId !== undefined &&
      body.contentId !== next.contentId
    ) {
      throw new BadRequestException(
        `Complétez les activités dans l'ordre. Prochain contenu prévu (${next.type}) : « ${next.contentId} », pas cette ressource.`,
      );
    }

    path.markCurrentActivityCompleted();

    const competencyFromContent =
      next.competencyIds.length > 0
        ? next.competencyIds[0]
        : competencyIdFromAssessmentContentId(next.contentId);
    if (next.type === 'ASSESSMENT' && competencyFromContent) {
      await this.assessmentResultHandler.applyAssessmentResultToPath(
        path,
        new AssessmentResultPayload(
          learnerId,
          competencyFromContent,
          MANUAL_ASSESSMENT_UI_SCORE,
          MANUAL_ASSESSMENT_UI_SCORE,
        ),
        next,
      );
    } else {
      await this.repo.save(path);
    }

    return {
      message: 'Activité marquée comme complétée',
      nextActivity: path.getNextPendingActivity()
        ? this.toDto(path.getNextPendingActivity()!)
        : null,
    };
  }

  /**
   * GET /adaptive/path/:learnerId/plan
   * Returns the temporal plan: activities allocated into weekly slots.
   */
  @Get(':learnerId/plan')
  async getLearningPlan(
    @Param('learnerId') learnerId: string,
  ): Promise<LearningPlanResponseDto> {
    const path = await this.repo.findByLearnerId(learnerId);
    if (!path) {
      throw new NotFoundException(
        `Parcours non trouvé pour l'apprenant ${learnerId}`,
      );
    }

    const plan = LearningPlan.fromPath(randomUUID(), path);
    const deadline = path.getConstraint().getDeadline();

    return {
      learnerId,
      pathId: path.id,
      totalWeeks: plan.getTotalPlannedWeeks(),
      estimatedCompletionDate: plan.getEstimatedCompletionDate(),
      feasibleByDeadline: deadline ? plan.isFeasibleByDeadline(deadline) : null,
      slots: plan.getSlots().map((slot) => ({
        weekStartDate: slot.weekStartDate,
        plannedHours: slot.plannedHours,
        activities: slot.activities.map((a) => ({
          contentId: a.contentId,
          type: a.type,
          estimatedHours: a.estimatedHours,
          order: a.order,
        })),
      })),
    };
  }

  private toDto(activity: Activity): ActivityDto {
    return {
      id: activity.id,
      contentId: activity.contentId,
      type: activity.type,
      competencyIds: activity.competencyIds,
      estimatedHours: activity.estimatedHours,
      order: activity.order,
      status: activity.getStatus().toString(),
    };
  }
}
