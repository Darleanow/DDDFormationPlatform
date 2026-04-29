import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { Program } from '../src/modules/catalog/domain/entities/program.entity.js';
import { Course } from '../src/modules/catalog/domain/entities/course.entity.js';
import { Module } from '../src/modules/catalog/domain/entities/module.entity.js';
import { Lesson } from '../src/modules/catalog/domain/entities/lesson.entity.js';
import { Exercise } from '../src/modules/catalog/domain/entities/exercise.entity.js';
import { Competence } from '../src/modules/catalog/domain/entities/competence.entity.js';
import { TypeLesson } from '../src/modules/catalog/domain/enums/type-lesson.enum.js';

/**
 * Seed script — BC2 Learning Catalog only.
 * Reads CSV files from thirdparties/data/ and seeds the database.
 */

const CatalogDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: +(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'formation_platform',
  entities: [Program, Course, Module, Lesson, Exercise, Competence],
  synchronize: true,
  logging: true,
});

function readCsv(filename: string): any[] {
  const filePath = path.join(__dirname, 'data', filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const headers = lines[0].split(',');
  const data: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(','); // This is simple splitting, assumes no commas in data values
    // Wait, some descriptions might have commas? Let's check the CSVs.
    // The CSVs generated don't seem to have commas in the descriptions, but just in case, a simple split is risky.
    // Let's implement a slightly smarter split.
    const row: any = {};
    let currentVal = '';
    let inQuotes = false;
    let colIdx = 0;
    for (let char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
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

async function genererMocksCatalogue() {
  try {
    await CatalogDataSource.initialize();
    console.log(`[${new Date().toISOString()}] Connexion à la base Postgres établie.`);

    const manager = CatalogDataSource.manager;

    // --- Clear existing catalog data ---
    await manager.query('DELETE FROM "lecon_competence"');
    await manager.query('DELETE FROM "exercice_competence"');
    await manager.query('DELETE FROM "module_competence"');
    await manager.query('DELETE FROM "module_prerequis"');
    await manager.query('DELETE FROM "exercise"');
    await manager.query('DELETE FROM "lesson"');
    await manager.query('DELETE FROM "module"');
    await manager.query('DELETE FROM "course"');
    await manager.query('DELETE FROM "program"');
    await manager.query('DELETE FROM "competence"');
    console.log(`[${new Date().toISOString()}] Données catalogue existantes effacées.`);

    // --- Read Data ---
    const competencesData = readCsv('competences.csv');
    const programmesData = readCsv('programmes.csv');
    const coursData = readCsv('course.csv');
    const modulesData = readCsv('modules.csv');
    const leconsData = readCsv('lecons.csv');
    const exercicesData = readCsv('exercises.csv');

    // Maps for resolving IDs
    const competenceMap = new Map<string, Competence>();
    const programmeMap = new Map<string, Program>();
    const coursMap = new Map<string, Course>();
    const moduleMap = new Map<string, Module>();
    const moduleLeconsMap = new Map<string, Lesson[]>();

    // --- Compétences ---
    for (const data of competencesData) {
      const c = new Competence();
      c.nom = data.nom;
      c.description = data.description;
      const saved = await manager.save(c);
      competenceMap.set(data.id, saved);
    }
    console.log(`[${new Date().toISOString()}] ${competencesData.length} compétences générées.`);

    // --- Programmes ---
    for (const data of programmesData) {
      const p = new Program();
      p.nom = data.nom;
      p.description = data.description;
      p.objectifPrincipal = data.objectifPrincipal;
      p.tenantId = data.tenantId;
      const saved = await manager.save(p);
      programmeMap.set(data.id, saved);
    }
    console.log(`[${new Date().toISOString()}] ${programmesData.length} programmes générés.`);

    // --- Course ---
    for (const data of coursData) {
      const c = new Course();
      c.nom = data.nom;
      c.description = data.description;
      c.ordre = parseInt(data.ordre, 10);
      c.programmeId = programmeMap.get(data.programmeId)!.id;
      const saved = await manager.save(c);
      coursMap.set(data.id, saved);
    }
    console.log(`[${new Date().toISOString()}] ${coursData.length} course générés.`);

    // --- Modules (First Pass: Create) ---
    for (const data of modulesData) {
      const m = new Module();
      m.nom = data.nom;
      m.description = data.description;
      m.ordre = parseInt(data.ordre, 10);
      m.coursId = coursMap.get(data.coursId)!.id;
      
      const compIds = data.competencyIds ? data.competencyIds.split('|') : [];
      m.competences = compIds.map((id: string) => competenceMap.get(id)!);
      m.prerequis = []; // Handled in second pass
      
      const saved = await manager.save(m);
      moduleMap.set(data.id, saved);
    }
    
    // --- Modules (Second Pass: Prerequisites) ---
    for (const data of modulesData) {
      if (data.prerequisIds) {
        const m = moduleMap.get(data.id)!;
        const prereqIds = data.prerequisIds.split('|');
        m.prerequis = prereqIds.map((id: string) => moduleMap.get(id)!);
        await manager.save(m);
      }
    }
    console.log(`[${new Date().toISOString()}] ${modulesData.length} modules et graphe de prérequis générés.`);

    // --- Leçons ---
    for (const data of leconsData) {
      const l = new Lesson();
      l.titre = data.titre;
      l.contenu = data.contenu;
      l.type = data.type as TypeLesson;
      l.ordre = parseInt(data.ordre, 10);
      l.moduleId = moduleMap.get(data.moduleId)!.id;
      
      const compIds = data.competencyIds ? data.competencyIds.split('|') : [];
      l.competences = compIds.map((id: string) => competenceMap.get(id)!);
      
      const saved = await manager.save(l);
      
      const leconsInModule = moduleLeconsMap.get(data.moduleId) || [];
      leconsInModule.push(saved);
      moduleLeconsMap.set(data.moduleId, leconsInModule);
    }
    console.log(`[${new Date().toISOString()}] ${leconsData.length} leçons générées.`);

    // --- Exercices ---
    for (const data of exercicesData) {
      const e = new Exercise();
      e.titre = data.titre;
      e.description = data.description;
      e.enonce = data.enonce;
      e.ordre = parseInt(data.ordre, 10);
      
      const leconsInModule = moduleLeconsMap.get(data.moduleId);
      if (!leconsInModule || leconsInModule.length === 0) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Exercise ${data.id} ignoré : aucun leçon dans le module ${data.moduleId}`);
        continue;
      }
      e.leconId = leconsInModule[0].id;
      
      const compIds = data.competencyIds ? data.competencyIds.split('|') : [];
      e.competences = compIds.map((id: string) => competenceMap.get(id)!);
      
      await manager.save(e);
    }
    console.log(`[${new Date().toISOString()}] ${exercicesData.length} exercises générés.`);

    console.log(`[${new Date().toISOString()}] ✅ Tous les mocks catalogue (depuis CSV) ont été générés avec succès !`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Erreur lors de la génération des mocks :`, error);
  } finally {
    await CatalogDataSource.destroy();
    console.log(`[${new Date().toISOString()}] Connexion fermée.`);
  }
}

genererMocksCatalogue();