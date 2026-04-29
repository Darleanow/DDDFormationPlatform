import { Injectable, NotFoundException } from '@nestjs/common';
import { LearningPathRepository } from '../../domain/repositories/learning-path.repository';
import { PrerequisiteGraphService } from '../../../catalog/application/prerequisite-graph.service';
import { CatalogQueryService } from '../../../catalog/application/catalog-query.service';
import { assessmentAggregateIdForCompetency } from '../../../../shared/bc-integration/assessment-ids';

export type ModuleCatalogStep = {
  type: 'LESSON' | 'EXERCISE' | 'ASSESSMENT';
  contentId: string;
  /** Titre leçon/exo ou libellé évaluation (compétence) */
  label: string;
  completed: boolean;
};

export type ModuleOverviewRow = {
  moduleId: string;
  nom: string;
  canAccess: boolean;
  missingPrerequisites: { id: string; titre: string }[];
  completedSteps: number;
  totalSteps: number;
  fullyDone: boolean;
  /** Séquence identique au parcours BC3 : leçons → exos → évaluations module */
  steps: ModuleCatalogStep[];
};

/**
 * Vue catalogue BC2 alignée sur le graphe de prérequis et le learning path BC3 :
 * accès par compétences validées (via activités complétées), avancement réel du parcours.
 */
@Injectable()
export class ProgramModuleOverviewService {
  constructor(
    private readonly paths: LearningPathRepository,
    private readonly catalog: CatalogQueryService,
    private readonly prereqGraph: PrerequisiteGraphService,
  ) {}

  async build(learnerId: string, programId: string): Promise<ModuleOverviewRow[]> {
    const path = await this.paths.findByLearnerId(learnerId);
    if (!path) {
      throw new NotFoundException(`Parcours non trouvé pour l'apprenant ${learnerId}`);
    }

    const activities = path.getActivities();
    const completedContentIds = new Set(
      activities.filter((a) => a.isCompleted()).map((a) => a.contentId),
    );

    const validatedCompetencyIds: string[] = [];
    for (const a of activities) {
      if (a.isCompleted()) {
        validatedCompetencyIds.push(...a.competencyIds);
      }
    }
    const uniqueValidated = [...new Set(validatedCompetencyIds)];

    const modules =
      await this.prereqGraph.getModulesInTopologicalOrderForProgram(programId);

    const rows: ModuleOverviewRow[] = [];
    /** Aligné sur `IdentityToAdaptiveAdapter` : une évaluation stable par compétence sur tout le programme. */
    const seenAssessmentContentIds = new Set<string>();

    for (const mod of modules) {
      const access = await this.prereqGraph.checkAccess(mod.id, uniqueValidated);

      const lessons = [...(await this.catalog.findLessonsByModule(mod.id))].sort(
        (a, b) => a.ordre - b.ordre,
      );

      const steps: ModuleCatalogStep[] = [];
      for (const lesson of lessons) {
        steps.push({
          type: 'LESSON',
          contentId: lesson.id,
          label: lesson.titre,
          completed: completedContentIds.has(lesson.id),
        });
        const exercises = [...(await this.catalog.findExercisesByLesson(lesson.id))].sort(
          (a, b) => a.ordre - b.ordre,
        );
        for (const ex of exercises) {
          steps.push({
            type: 'EXERCISE',
            contentId: ex.id,
            label: ex.titre,
            completed: completedContentIds.has(ex.id),
          });
        }
      }
      for (const comp of mod.competences ?? []) {
        const contentId = assessmentAggregateIdForCompetency(comp.id);
        if (seenAssessmentContentIds.has(contentId)) {
          continue;
        }
        seenAssessmentContentIds.add(contentId);
        steps.push({
          type: 'ASSESSMENT',
          contentId,
          label: `Évaluation — ${comp.nom}`,
          completed: completedContentIds.has(contentId),
        });
      }

      const totalSteps = steps.length;
      const completedSteps = steps.filter((s) => s.completed).length;

      rows.push({
        moduleId: mod.id,
        nom: mod.nom,
        canAccess: access.canAccess,
        missingPrerequisites: access.missingPrerequisites,
        completedSteps,
        totalSteps,
        fullyDone: totalSteps > 0 && completedSteps >= totalSteps,
        steps,
      });
    }

    return rows;
  }
}
