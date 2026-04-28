// src/modules/catalog/application/catalog-query.service.ts
import { Injectable } from '@nestjs/common';
import { CsvCatalogService } from '../infrastructure/csv-catalog.service';
import { Programme } from '../domain/entities/programme.entity';
import { Cours } from '../domain/entities/cours.entity';
import { Module } from '../domain/entities/module.entity';
import { Lecon } from '../domain/entities/lecon.entity';
import { Exercice } from '../domain/entities/exercice.entity';
import { Competence } from '../domain/entities/competence.entity';

@Injectable()
export class CatalogQueryService {
    constructor(private readonly csvService: CsvCatalogService) { }

    // --- Programmes ---
    async findAllProgrammes(): Promise<Programme[]> {
        return this.csvService.getProgrammes();
    }

    async findProgrammeById(id: string): Promise<Programme | null> {
        return this.csvService.getProgrammeById(id) || null;
    }

    // --- Cours ---
    async findCoursByProgramme(programmeId: string): Promise<Cours[]> {
        return this.csvService.getCoursByProgramme(programmeId);
    }

    async findCoursById(id: string): Promise<Cours | null> {
        return this.csvService.getCoursById(id) || null;
    }

    // --- Modules ---
    async findModulesByCours(coursId: string): Promise<Module[]> {
        return this.csvService.getModulesByCours(coursId);
    }

    async findModuleById(id: string): Promise<Module | null> {
        return this.csvService.getModuleById(id) || null;
    }

    async findModulesByCompetence(competenceId: string): Promise<Module[]> {
        return this.csvService.getModulesByCompetence(competenceId);
    }

    // --- Leçons ---
    async findLeconsByModule(moduleId: string): Promise<Lecon[]> {
        return this.csvService.getLeconsByModule(moduleId);
    }

    async findLeconById(id: string): Promise<Lecon | null> {
        return this.csvService.getLeconById(id) || null;
    }

    // --- Exercices ---
    async findExercicesByLecon(leconId: string): Promise<Exercice[]> {
        return this.csvService.getExercicesByLecon(leconId);
    }

    async findExerciceById(id: string): Promise<Exercice | null> {
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