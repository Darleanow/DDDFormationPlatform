// src/modules/catalog/api/catalog.controller.ts
import { Controller, Get, Param, Query, ParseArrayPipe, NotFoundException } from '@nestjs/common';
import { CatalogQueryService } from '../application/catalog-query.service';
import { PrerequisiteGraphService } from '../application/prerequisite-graph.service';
import { Program } from '../domain/entities/program.entity';
import { Course } from '../domain/entities/course.entity';
import { Module } from '../domain/entities/module.entity';
import { Lesson } from '../domain/entities/lesson.entity';
import { Exercise } from '../domain/entities/exercise.entity';
import { Competence } from '../domain/entities/competence.entity';

@Controller('catalog')
export class CatalogController {
    constructor(
        private readonly catalogQuery: CatalogQueryService,
        private readonly prereqService: PrerequisiteGraphService,
    ) { }

    // --- Programmes ---
    @Get('programmes')
    async getProgrammes(): Promise<Program[]> {
        return this.catalogQuery.findAllProgrammes();
    }

    @Get('programmes/:id')
    async getProgramme(@Param('id') id: string): Promise<Program> {
        const prog = await this.catalogQuery.findProgrammeById(id);
        if (!prog) throw new NotFoundException('Programme non trouvé');
        return prog;
    }

    @Get('programmes/:id/course')
    async getCoursByProgramme(@Param('id') id: string): Promise<Course[]> {
        return this.catalogQuery.findCoursByProgramme(id);
    }

    // --- Course ---
    @Get('course/:id')
    async getCours(@Param('id') id: string): Promise<Course> {
        const course = await this.catalogQuery.findCoursById(id);
        if (!course) throw new NotFoundException('Course non trouvé');
        return course;
    }

    @Get('course/:id/modules')
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

    @Get('modules/:id/lessons')
    async getLessonsByModule(@Param('id') id: string): Promise<Lesson[]> {
        return this.catalogQuery.findLessonsByModule(id);
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

    // --- Lessons ---
    @Get('lessons/:id')
    async getLesson(@Param('id') id: string): Promise<Lesson> {
        const lesson = await this.catalogQuery.findLessonById(id);
        if (!lesson) throw new NotFoundException('Lesson not found');
        return lesson;
    }

    @Get('lessons/:id/exercises')
    async getExercisesByLesson(@Param('id') id: string): Promise<Exercise[]> {
        return this.catalogQuery.findExercisesByLesson(id);
    }

    // --- Exercices ---
    @Get('exercises/:id')
    async getExercice(@Param('id') id: string): Promise<Exercise> {
        const exo = await this.catalogQuery.findExerciceById(id);
        if (!exo) throw new NotFoundException('Exercise non trouvé');
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