import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Program } from '../domain/entities/program.entity';
import { Course } from '../domain/entities/course.entity';
import { Module } from '../domain/entities/module.entity';
import { Lesson } from '../domain/entities/lesson.entity';
import { Exercise } from '../domain/entities/exercise.entity';
import { Competence } from '../domain/entities/competence.entity';
import { TypeLesson } from '../domain/enums/type-lesson.enum';

@Injectable()
export class CsvCatalogService implements OnModuleInit {
    private competences: Competence[] = [];
    private programmes: Program[] = [];
    private course: Course[] = [];
    private modules: Module[] = [];
    private lecons: Lesson[] = [];
    private exercises: Exercise[] = [];

    async onModuleInit() {
        this.loadData();
    }

    private loadData() {
        const dataPath = path.join(process.cwd(), 'thirdparties', 'data');
        
        // 1. Compétences
        const competencesRaw = this.readCsv(path.join(dataPath, 'competences.csv'));
        this.competences = competencesRaw.map(raw => {
            const c = new Competence();
            c.id = raw.id;
            c.nom = raw.nom;
            c.description = raw.description;
            return c;
        });

        // 2. Programmes
        const programmesRaw = this.readCsv(path.join(dataPath, 'programmes.csv'));
        this.programmes = programmesRaw.map(raw => {
            const p = new Program();
            p.id = raw.id;
            p.nom = raw.nom;
            p.description = raw.description;
            p.objectifPrincipal = raw.objectifPrincipal;
            p.tenantId = raw.tenantId;
            p.course = [];
            return p;
        });

        // 3. Course
        const coursRaw = this.readCsv(path.join(dataPath, 'cours.csv'));
        this.course = coursRaw.map(raw => {
            const c = new Course();
            c.id = raw.id;
            c.nom = raw.nom;
            c.description = raw.description;
            c.ordre = parseInt(raw.ordre, 10);
            c.programmeId = raw.programmeId;
            c.modules = [];
            const prog = this.programmes.find(p => p.id === raw.programmeId);
            if (prog) {
                c.program = prog;
                prog.course.push(c);
            }
            return c;
        });

        // 4. Modules
        const modulesRaw = this.readCsv(path.join(dataPath, 'modules.csv'));
        this.modules = modulesRaw.map(raw => {
            const m = new Module();
            m.id = raw.id;
            m.nom = raw.nom;
            m.description = raw.description;
            m.ordre = parseInt(raw.ordre, 10);
            m.coursId = raw.coursId;
            m.lecons = [];
            const c = this.course.find(co => co.id === raw.coursId);
            if (c) {
                m.course = c;
                c.modules.push(m);
            }
            const compIds = raw.competencyIds ? raw.competencyIds.split('|') : [];
            m.competences = compIds.map((id: string) => this.competences.find(cp => cp.id === id)!);
            m.prerequis = []; // Linked later
            return m;
        });

        // 5. Link Prerequisites
        modulesRaw.forEach(raw => {
            if (raw.prerequisIds) {
                const m = this.modules.find(mod => mod.id === raw.id)!;
                const prereqIds = raw.prerequisIds.split('|');
                m.prerequis = prereqIds.map((id: string) => this.modules.find(mod => mod.id === id)!);
            }
        });

        // 6. Leçons
        const leconsRaw = this.readCsv(path.join(dataPath, 'lecons.csv'));
        this.lecons = leconsRaw.map(raw => {
            const l = new Lesson();
            l.id = raw.id;
            l.titre = raw.titre;
            l.contenu = raw.contenu;
            l.type = raw.type as TypeLesson;
            l.ordre = parseInt(raw.ordre, 10);
            l.moduleId = raw.moduleId;
            l.exercises = [];
            const m = this.modules.find(mod => mod.id === raw.moduleId);
            if (m) {
                l.module = m;
                m.lecons.push(l);
            }
            const compIds = raw.competencyIds ? raw.competencyIds.split('|') : [];
            l.competences = compIds.map((id: string) => this.competences.find(cp => cp.id === id)!);
            return l;
        });

        // 7. Exercices
        const exercicesRaw = this.readCsv(path.join(dataPath, 'exercices.csv'));
        // Note: CSV has moduleId, but our entity now uses leconId (hierarchy).
        // We assign exercises to the first lesson of the module for the POC.
        this.exercises = exercicesRaw.map(raw => {
            const e = new Exercise();
            e.id = raw.id;
            e.titre = raw.titre;
            e.description = raw.description;
            e.enonce = raw.enonce;
            e.ordre = parseInt(raw.ordre, 10);
            e.difficulty = raw.difficulty ? parseFloat(raw.difficulty) : 0.5;
            e.weight = raw.weight ? parseInt(raw.weight, 10) : 1;
            
            const lesson = this.lecons.find(l => l.moduleId === raw.moduleId);
            if (lesson) {
                e.lesson = lesson;
                e.leconId = lesson.id;
                lesson.exercises.push(e);
            }
            
            const compIds = raw.competencyIds ? raw.competencyIds.split('|') : [];
            e.competences = compIds.map((id: string) => this.competences.find(cp => cp.id === id)!);
            return e;
        });

        this.assertModulesPrerequisiteDagAcyclic();

        console.log(`[CsvCatalogService] Data loaded: ${this.programmes.length} programmes, ${this.modules.length} modules, ${this.lecons.length} lecons, ${this.exercises.length} exercises.`);
    }

    /**
     * Prerequisites must form a directed acyclic graph (DAG); cycles break adaptive ordering.
     */
    private assertModulesPrerequisiteDagAcyclic(): void {
        const Color = { White: 0, Gray: 1, Black: 2 };
        const color = new Map<string, number>();
        for (const m of this.modules) {
            color.set(m.id, Color.White);
        }

        const dfs = (moduleId: string): void => {
            const current = color.get(moduleId);
            if (current === Color.Gray) {
                throw new Error(
                    `Prerequisite dependency graph must be acyclic: cycle involving module "${moduleId}".`,
                );
            }
            if (current === Color.Black) {
                return;
            }
            color.set(moduleId, Color.Gray);
            const mod = this.modules.find((x) => x.id === moduleId);
            for (const prereq of mod?.prerequis ?? []) {
                dfs(prereq.id);
            }
            color.set(moduleId, Color.Black);
        };

        for (const m of this.modules) {
            if (color.get(m.id) === Color.White) {
                dfs(m.id);
            }
        }
    }

    private readCsv(filePath: string): any[] {
        if (!fs.existsSync(filePath)) return [];
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return [];
        const headers = lines[0].split(',');
        const data: any[] = [];
        for (let i = 1; i < lines.length; i++) {
            const row: any = {};
            let currentVal = '';
            let inQuotes = false;
            let colIdx = 0;
            for (let char of lines[i]) {
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) {
                    row[headers[colIdx]] = currentVal;
                    currentVal = '';
                    colIdx++;
                } else {
                    currentVal += char;
                }
            }
            row[headers[colIdx]] = currentVal;
            data.push(row);
        }
        return data;
    }

    // --- Query Methods ---
    getProgrammes() { return this.programmes; }
    getProgrammeById(id: string) { return this.programmes.find(p => p.id === id); }
    getCoursByProgramme(progId: string) { return this.course.filter(c => c.programmeId === progId); }
    getCoursById(id: string) { return this.course.find(c => c.id === id); }
    getModulesByCours(coursId: string) { return this.modules.filter(m => m.coursId === coursId); }
    getModuleById(id: string) { return this.modules.find(m => m.id === id); }
    getModulesByCompetence(competencyId: string) { 
        return this.modules.filter(m => m.competences.some(c => c.id === competencyId)); 
    }
    getLeconsByModule(moduleId: string) { return this.lecons.filter(l => l.moduleId === moduleId); }
    getLeconById(id: string) { return this.lecons.find(l => l.id === id); }
    getExercicesByLecon(leconId: string) { return this.exercises.filter(e => e.leconId === leconId); }
    getExerciceById(id: string) { return this.exercises.find(e => e.id === id); }
    getCompetences() { return this.competences; }
    getCompetenceById(id: string) { return this.competences.find(c => c.id === id); }
}
