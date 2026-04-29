import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CatalogQueryService } from '../../../catalog/application/catalog-query.service';
import { PrerequisiteGraphService } from '../../../catalog/application/prerequisite-graph.service';
import { EnrollmentConfirmedEvent as AdaptiveEnrollmentConfirmedEvent } from '../../application/events/enrollment-confirmed.event';
import { EnrollmentConfirmedHandler } from '../../application/handlers/enrollment-confirmed.handler';
import { assessmentAggregateIdForCompetency } from '../../../../shared/bc-integration/assessment-ids';

type CatalogActivity = {
  contentId: string;
  competencyIds: string[];
  estimatedHours: number;
  type: 'LESSON' | 'EXERCISE' | 'ASSESSMENT';
};

/**
 * Adapter that listens to the public `enrollment.confirmed` event emitted by BC1
 * and translates it to the richer payload expected by the Adaptive engine.
 *
 * Séquençage : modules en **ordre topologique des prérequis** (voir PrerequisiteGraphService),
 * puis par module : leçons (ordonnées), puis exercices de chaque leçon,
 * puis évaluations par compétence couverte par ce module (IDs stables BC3/BC4).
 */
@Injectable()
export class IdentityToAdaptiveAdapter {
  constructor(
    private readonly catalogService: CatalogQueryService,
    private readonly prereqGraph: PrerequisiteGraphService,
    private readonly handler: EnrollmentConfirmedHandler,
  ) {}

  @OnEvent('enrollment.confirmed')
  async handleIdentityEvent(payload: any): Promise<void> {
    const programId =
      payload.programId ?? payload.program?.id ?? null;

    const weeklyHours =
      payload.weeklyAvailabilityHours ?? payload.constraints?.weeklyHours ?? 0;
    const deadline = payload.deadline ?? payload.constraints?.deadline ?? undefined;

    let mandatoryCompetencyIds: string[] = [];
    const catalogActivities: CatalogActivity[] = [];

    if (programId) {
      const programme = await this.catalogService.findProgrammeById(programId);
      if (programme) {
        mandatoryCompetencyIds = [];

        const sortedModules =
          await this.prereqGraph.getModulesInTopologicalOrderForProgram(programId);

        for (const mod of sortedModules) {
          mod.competences?.forEach((c) => mandatoryCompetencyIds.push(c.id));

          let lessons =
            (await this.catalogService.findLessonsByModule(mod.id)) || [];
          lessons = [...lessons].sort((a, b) => a.ordre - b.ordre);

          for (const lesson of lessons) {
            catalogActivities.push({
              contentId: lesson.id,
              competencyIds: (lesson.competences || []).map((c: { id: string }) => c.id),
              estimatedHours: 1,
              type: 'LESSON',
            });

            let exercises =
              (await this.catalogService.findExercisesByLesson(lesson.id)) || [];
            exercises = [...exercises].sort((a, b) => a.ordre - b.ordre);
            for (const ex of exercises) {
              catalogActivities.push({
                contentId: ex.id,
                competencyIds: (ex.competences || []).map(
                  (c: { id: string }) => c.id,
                ),
                estimatedHours: Math.max(0.25, Number(ex.difficulty ?? 0.5)),
                type: 'EXERCISE',
              });
            }
          }

          const compIdsUnit = [...new Set((mod.competences || []).map((c: { id: string }) => c.id))];
          for (const cid of compIdsUnit) {
            catalogActivities.push({
              contentId: assessmentAggregateIdForCompetency(cid),
              competencyIds: [cid],
              estimatedHours: 0.5,
              type: 'ASSESSMENT',
            });
          }
        }

        mandatoryCompetencyIds = Array.from(new Set(mandatoryCompetencyIds));
      }
    }

    const adaptiveEvent = new AdaptiveEnrollmentConfirmedEvent(
      payload.learnerId,
      programId,
      payload.tenantId,
      (await this.catalogService.findProgrammeById(programId))?.objectifPrincipal ??
        programId,
      {
        weeklyHours,
        deadline,
        mandatoryCompetencyIds,
      },
      catalogActivities,
    );

    await this.handler.handle(adaptiveEvent);
  }
}
