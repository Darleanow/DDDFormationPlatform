import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Programme } from '../domain/entities/programme.entity';
import { Cours } from '../domain/entities/cours.entity';
import { Module } from '../domain/entities/module.entity';
import { Lecon } from '../domain/entities/lecon.entity';
import { Exercice } from '../domain/entities/exercice.entity';
import { Competence } from '../domain/entities/competence.entity';
import { TypeLecon } from '../domain/enums/type-lecon.enum';

@Injectable()
export class CsvCatalogService implements OnModuleInit {
    private competences: Competence[] = [];
    private programmes: Programme[] = [];
    private cours: Cours[] = [];
    private modules: Module[] = [];
    private lecons: Lecon[] = [];
    private exercices: Exercice[] = [];

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
            const p = new Programme();
            p.id = raw.id;
            p.nom = raw.nom;
            p.description = raw.description;
            p.objectifPrincipal = raw.objectifPrincipal;
            p.tenantId = raw.tenantId;
            p.cours = [];
            return p;
        });

        // 3. Cours
        const coursRaw = this.readCsv(path.join(dataPath, 'cours.csv'));
        this.cours = coursRaw.map(raw => {
            const c = new Cours();
            c.id = raw.id;
            c.nom = raw.nom;
            c.description = raw.description;
            c.ordre = parseInt(raw.ordre, 10);
            c.programmeId = raw.programmeId;
            c.modules = [];
            const prog = this.programmes.find(p => p.id === raw.programmeId);
            if (prog) {
                c.programme = prog;
                prog.cours.push(c);
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
            const c = this.cours.find(co => co.id === raw.coursId);
            if (c) {
                m.cours = c;
                c.modules.push(m);
            }
            const compIds = raw.competenceIds ? raw.competenceIds.split('|') : [];
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
            const l = new Lecon();
            l.id = raw.id;
            l.titre = raw.titre;
            l.contenu = raw.contenu;
            l.type = raw.type as TypeLecon;
            l.ordre = parseInt(raw.ordre, 10);
            l.moduleId = raw.moduleId;
            l.exercices = [];
            const m = this.modules.find(mod => mod.id === raw.moduleId);
            if (m) {
                l.module = m;
                m.lecons.push(l);
            }
            const compIds = raw.competenceIds ? raw.competenceIds.split('|') : [];
            l.competences = compIds.map((id: string) => this.competences.find(cp => cp.id === id)!);
            return l;
        });

        // 7. Exercices
        const exercicesRaw = this.readCsv(path.join(dataPath, 'exercices.csv'));
        // Note: CSV has moduleId, but our entity now uses leconId (hierarchy).
        // We assign exercices to the first lecon of the module for the POC.
        this.exercices = exercicesRaw.map(raw => {
            const e = new Exercice();
            e.id = raw.id;
            e.titre = raw.titre;
            e.description = raw.description;
            e.enonce = raw.enonce;
            e.ordre = parseInt(raw.ordre, 10);
            
            const lecon = this.lecons.find(l => l.moduleId === raw.moduleId);
            if (lecon) {
                e.lecon = lecon;
                e.leconId = lecon.id;
                lecon.exercices.push(e);
            }
            
            const compIds = raw.competenceIds ? raw.competenceIds.split('|') : [];
            e.competences = compIds.map((id: string) => this.competences.find(cp => cp.id === id)!);
            return e;
        });
        
        console.log(`[CsvCatalogService] Data loaded: ${this.programmes.length} programmes, ${this.modules.length} modules, ${this.lecons.length} lecons, ${this.exercices.length} exercices.`);
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
    getCoursByProgramme(progId: string) { return this.cours.filter(c => c.programmeId === progId); }
    getCoursById(id: string) { return this.cours.find(c => c.id === id); }
    getModulesByCours(coursId: string) { return this.modules.filter(m => m.coursId === coursId); }
    getModuleById(id: string) { return this.modules.find(m => m.id === id); }
    getLeconsByModule(moduleId: string) { return this.lecons.filter(l => l.moduleId === moduleId); }
    getLeconById(id: string) { return this.lecons.find(l => l.id === id); }
    getExercicesByLecon(leconId: string) { return this.exercices.filter(e => e.leconId === leconId); }
    getExerciceById(id: string) { return this.exercices.find(e => e.id === id); }
    getCompetences() { return this.competences; }
    getCompetenceById(id: string) { return this.competences.find(c => c.id === id); }
}
