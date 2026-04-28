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
     * @param validatedCompetenceIds - Liste des CompetenceId déjà validés par l’apprenant (provenant de BC4/BC5)
     * @returns Un objet indiquant l'accès et la liste des prérequis non satisfaits.
     */
    async checkAccess(moduleId: string, validatedCompetenceIds: string[]): Promise<AccessCheckResult> {
        const module = await this.catalogQueryService.findModuleById(moduleId);
        if (!module) {
            throw new Error(`Module ${moduleId} non trouvé`);
        }

        const missing: { id: string; titre: string }[] = [];
        // Vérifier les modules prérequis directs
        for (const prereqModule of module.prerequis) {
            // Un prérequis de type module est considéré satisfait si au moins une des compétences qu'il couvre est validée
            const hasPrereq = prereqModule.competences.some(c => validatedCompetenceIds.includes(c.id));
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
}