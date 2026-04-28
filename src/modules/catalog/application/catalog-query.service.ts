// src/modules/catalog/application/catalog-query.service.ts
import { Injectable } from '@nestjs/common';
import { CsvCatalogService } from '../infrastructure/csv-catalog.service';
import { Program } from '../domain/entities/program.entity';
import { Course } from '../domain/entities/course.entity';
import { Module } from '../domain/entities/module.entity';
import { Lesson } from '../domain/entities/lesson.entity';
import { Exercise } from '../domain/entities/exercise.entity';
import { Competence } from '../domain/entities/competence.entity';

@Injectable()
export class CatalogQueryService {
    constructor(private readonly csvService: CsvCatalogService) { }

    // --- Programmes ---
    async findAllProgrammes(): Promise<Program[]> {
        return this.csvService.getProgrammes();
    }

    async findProgrammeById(id: string): Promise<Program | null> {
        return this.csvService.getProgrammeById(id) || null;
    }

    // --- Course ---
    async findCoursByProgramme(programmeId: string): Promise<Course[]> {
        return this.csvService.getCoursByProgramme(programmeId);
    }

    async findCoursById(id: string): Promise<Course | null> {
        return this.csvService.getCoursById(id) || null;
    }

    // --- Modules ---
    async findModulesByCours(coursId: string): Promise<Module[]> {
        return this.csvService.getModulesByCours(coursId);
    }

    async findModuleById(id: string): Promise<Module | null> {
        return this.csvService.getModuleById(id) || null;
    }

    async findModulesByCompetence(competencyId: string): Promise<Module[]> {
        return this.csvService.getModulesByCompetence(competencyId);
    }

    // --- Leçons ---
    async findLeconsByModule(moduleId: string): Promise<Lesson[]> {
        return this.csvService.getLeconsByModule(moduleId);
    }

    async findLeconById(id: string): Promise<Lesson | null> {
        return this.csvService.getLeconById(id) || null;
    }

    // --- Exercices ---
    async findExercicesByLecon(leconId: string): Promise<Exercise[]> {
        return this.csvService.getExercicesByLecon(leconId);
    }

    async findExerciceById(id: string): Promise<Exercise | null> {
        return this.csvService.getExerciceById(id) || null;
    }

    // --- Compétences ---
    async findAllCompetences(): Promise<Competence[]> {
        return this.csvService.getCompetences();
    }

    async findCompetenceById(id: string): Promise<Competence | null> {
        return this.csvService.getCompetenceById(id) || null;
    }
}