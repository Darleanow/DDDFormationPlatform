import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CatalogQueryService } from '../../../catalog/application/catalog-query.service';
import { EnrollmentConfirmedEvent as AdaptiveEnrollmentConfirmedEvent } from '../../application/events/enrollment-confirmed.event';
import { EnrollmentConfirmedHandler } from '../../application/handlers/enrollment-confirmed.handler';
import { assessmentAggregateIdForCompetency } from '../../../../shared/bc-integration/assessment-ids';

/**
 * Adapter that listens to the public `enrollment.confirmed` event emitted by BC1
 * and translates it to the richer payload expected by the Adaptive engine.
 */
@Injectable()
export class IdentityToAdaptiveAdapter {
  constructor(
    private readonly catalogService: CatalogQueryService,
    private readonly handler: EnrollmentConfirmedHandler,
  ) {}

  @OnEvent('enrollment.confirmed')
  async handleIdentityEvent(payload: any): Promise<void> {
    // Identity event shape (BC1):
    // { learnerId, tenantId, programId, weeklyAvailabilityHours, deadline, enrolledAt }

    const programId = payload.programId ?? payload.program?.id ?? null;

    // Build constraints
    const weeklyHours = payload.weeklyAvailabilityHours ?? payload.constraints?.weeklyHours ?? 0;
    const deadline = payload.deadline ?? payload.constraints?.deadline ?? undefined;

    // Try to enrich from catalogue: mandatory competence ids + catalog activities
    let mandatoryCompetencyIds: string[] = [];
    let catalogActivities: Array<any> = [];

    if (programId) {
      const program = await this.catalogService.findProgrammeById(programId);
      if (program) {
        // derive targetCertificationId from program.objectifPrincipal if present
        // gather courses/modules/lecons to build a flattened activity list
        const courses = await this.catalogService.findCoursByProgramme(programId);
        for (const course of courses || []) {
          const modules = await this.catalogService.findModulesByCours(course.id);
          for (const mod of modules || []) {
            const compIds = (mod.competences || []).map((c: any) => c.id);
            mandatoryCompetencyIds.push(...compIds);

            // take lessons as activities
            const lessons = await this.catalogService.findLessonsByModule(mod.id);
            for (const l of lessons || []) {
              catalogActivities.push({
                contentId: l.id,
                competencyIds: (l.competences || []).map((c: any) => c.id),
                estimatedHours: 1,
                type: 'LESSON',
              });
            }
          }
        }
        // deduplicate competence ids
        mandatoryCompetencyIds = Array.from(new Set(mandatoryCompetencyIds));

        // Stable BC4 evaluations (Assessment per competence SK) — must exist after CompetenceAssessmentsBootstrap (BC Assessment module).
        for (const cid of mandatoryCompetencyIds) {
          catalogActivities.push({
            contentId: assessmentAggregateIdForCompetency(cid),
            competencyIds: [cid],
            estimatedHours: 0.5,
            type: 'ASSESSMENT',
          });
        }
      }
    }

    const adaptiveEvent = new AdaptiveEnrollmentConfirmedEvent(
      payload.learnerId,
      programId,
      payload.tenantId,
      // targetCertificationId: use program.objectifPrincipal when available
      (await this.catalogService.findProgrammeById(programId))?.objectifPrincipal ?? programId,
      {
        weeklyHours,
        deadline,
        mandatoryCompetencyIds,
      },
      // fallback to empty array if nothing found
      catalogActivities,
    );

    await this.handler.handle(adaptiveEvent);
  }
}
