// src/modules/catalog/application/prerequisite-graph.service.ts
import { Injectable } from '@nestjs/common';
import { Module } from '../domain/entities/module.entity';
import { CatalogQueryService } from './catalog-query.service';

export interface AccessCheckResult {
    canAccess: boolean;
    missingPrerequisites: { id: string; titre: string }[];
}

@Injectable()
export class PrerequisiteGraphService {
    constructor(private readonly catalogQueryService: CatalogQueryService) { }

    /**
     * Vérifie si les compétences validées par un apprenant lui permettent d’accéder à un module.
     * @param moduleId - L’ID du module cible
     * @param validatedCompetencyIds - Liste des CompetencyId déjà validés par l’apprenant (provenant de BC4/BC5)
     * @returns Un objet indiquant l'accès et la liste des prérequis non satisfaits.
     */
    async checkAccess(moduleId: string, validatedCompetencyIds: string[]): Promise<AccessCheckResult> {
        const module = await this.catalogQueryService.findModuleById(moduleId);
        if (!module) {
            throw new Error(`Module ${moduleId} non trouvé`);
        }

        const missing: { id: string; titre: string }[] = [];
        // Vérifier les modules prérequis directs
        for (const prereqModule of module.prerequis) {
            // Un prérequis de type module est considéré satisfait si au moins une des compétences qu'il couvre est validée
            const hasPrereq = prereqModule.competences.some(c => validatedCompetencyIds.includes(c.id));
            if (!hasPrereq) {
                missing.push({ id: prereqModule.id, titre: prereqModule.nom });
            }
        }
        return {
            canAccess: missing.length === 0,
            missingPrerequisites: missing,
        };
    }

    /**
     * Retourne la liste des prérequis directs d'un module (pour affichage catalogue).
     */
    async getDirectPrerequisites(moduleId: string): Promise<{ id: string; titre: string }[]> {
        const module = await this.catalogQueryService.findModuleById(moduleId);
        if (!module) return [];
        return module.prerequis.map(p => ({ id: p.id, titre: p.nom }));
    }

    /**
     * Ordre topologique des modules du programme : tout prérequis apparaît avant le module qui en dépend.
     * Tie-break stable : ordre des cours puis `ordre` du module puis id.
     */
    async getModulesInTopologicalOrderForProgram(programmeId: string): Promise<Module[]> {
        const courses = await this.catalogQueryService.findCoursByProgramme(programmeId);
        const sortedCourses = [...courses].sort((a, b) => a.ordre - b.ordre);
        const courseIndex = new Map<string, number>();
        sortedCourses.forEach((c, i) => courseIndex.set(c.id, i));

        const modules: Module[] = [];
        for (const c of sortedCourses) {
            const ms = await this.catalogQueryService.findModulesByCours(c.id);
            modules.push(...ms);
        }
        if (modules.length === 0) return [];

        const sortKey = (m: Module) =>
            `${String(courseIndex.get(m.coursId) ?? 0).padStart(4, '0')}-${String(m.ordre).padStart(4, '0')}-${m.id}`;

        const result: Module[] = [];
        const placed = new Set<string>();

        while (result.length < modules.length) {
            const batch = modules
                .filter(
                    (m) =>
                        !placed.has(m.id) &&
                        (m.prerequis || []).every((p) => placed.has(p.id)),
                )
                .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
            if (batch.length === 0) {
                throw new Error(
                    `Cycle or invalid prerequisite refs in module graph for programme ${programmeId}`,
                );
            }
            for (const m of batch) {
                result.push(m);
                placed.add(m.id);
            }
        }

        return result;
    }
}