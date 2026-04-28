// src/modules/catalog/api/catalog.controller.ts
import { Controller, Get, Param, Query, ParseArrayPipe, NotFoundException } from '@nestjs/common';
import { CatalogQueryService } from '../application/catalog-query.service';
import { PrerequisiteGraphService } from '../application/prerequisite-graph.service';
import { Programme } from '../domain/entities/programme.entity';
import { Cours } from '../domain/entities/cours.entity';
import { Module } from '../domain/entities/module.entity';
import { Lecon } from '../domain/entities/lecon.entity';
import { Exercice } from '../domain/entities/exercice.entity';
import { Competence } from '../domain/entities/competence.entity';

@Controller('catalog')
export class CatalogController {
    constructor(
        private readonly catalogQuery: CatalogQueryService,
        private readonly prereqService: PrerequisiteGraphService,
    ) { }

    // --- Programmes ---
    @Get('programmes')
    async getProgrammes(): Promise<Programme[]> {
        return this.catalogQuery.findAllProgrammes();
    }

    @Get('programmes/:id')
    async getProgramme(@Param('id') id: string): Promise<Programme> {
        const prog = await this.catalogQuery.findProgrammeById(id);
        if (!prog) throw new NotFoundException('Programme non trouvé');
        return prog;
    }

    @Get('programmes/:id/cours')
    async getCoursByProgramme(@Param('id') id: string): Promise<Cours[]> {
        return this.catalogQuery.findCoursByProgramme(id);
    }

    // --- Cours ---
    @Get('cours/:id')
    async getCours(@Param('id') id: string): Promise<Cours> {
        const cours = await this.catalogQuery.findCoursById(id);
        if (!cours) throw new NotFoundException('Cours non trouvé');
        return cours;
    }

    @Get('cours/:id/modules')
    async getModulesByCours(@Param('id') id: string): Promise<Module[]> {
        return this.catalogQuery.findModulesByCours(id);
    }

    // --- Modules ---
    @Get('modules/:id')
    async getModule(@Param('id') id: string): Promise<Module> {
        const module = await this.catalogQuery.findModuleById(id);
        if (!module) throw new NotFoundException('Module non trouvé');
        return module;
    }

    @Get('modules/:id/lecons')
    async getLeconsByModule(@Param('id') id: string): Promise<Lecon[]> {
        return this.catalogQuery.findLeconsByModule(id);
    }

    @Get('modules/:id/prerequisites')
    async getDirectPrerequisites(@Param('id') id: string) {
        return this.prereqService.getDirectPrerequisites(id);
    }

    @Get('modules/:id/access')
    async checkAccess(
        @Param('id') moduleId: string,
        @Query('validatedCompetences', new ParseArrayPipe({ items: String, separator: ',', optional: true })) validatedCompetences: string[] = [],
    ) {
        try {
            return this.prereqService.checkAccess(moduleId, validatedCompetences);
        } catch (e) {
            throw new NotFoundException(e.message);
        }
    }

    // --- Leçons ---
    @Get('lecons/:id')
    async getLecon(@Param('id') id: string): Promise<Lecon> {
        const lecon = await this.catalogQuery.findLeconById(id);
        if (!lecon) throw new NotFoundException('Leçon non trouvée');
        return lecon;
    }

    @Get('lecons/:id/exercices')
    async getExercicesByLecon(@Param('id') id: string): Promise<Exercice[]> {
        return this.catalogQuery.findExercicesByLecon(id);
    }

    // --- Exercices ---
    @Get('exercices/:id')
    async getExercice(@Param('id') id: string): Promise<Exercice> {
        const exo = await this.catalogQuery.findExerciceById(id);
        if (!exo) throw new NotFoundException('Exercice non trouvé');
        return exo;
    }

    // --- Compétences (Shared Kernel) ---
    @Get('competences')
    async getCompetences(): Promise<Competence[]> {
        return this.catalogQuery.findAllCompetences();
    }

    @Get('competences/:id')
    async getCompetence(@Param('id') id: string): Promise<Competence> {
        const comp = await this.catalogQuery.findCompetenceById(id);
        if (!comp) throw new NotFoundException('Compétence non trouvée');
        return comp;
    }
}