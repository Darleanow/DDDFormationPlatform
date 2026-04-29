import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LearningPathRepository } from '../../domain/repositories/learning-path.repository';
import { LearningPath } from '../../domain/entities/learning-path.entity';
import { Activity } from '../../domain/entities/activity.entity';
import { CoverageConstraint } from '../../domain/value-objects/coverage-constraint.vo';
import { EstimatedLevel } from '../../domain/value-objects/estimated-level.vo';

/**
 * In-memory implementation of LearningPathRepository.
 * Used for mock/dev mode — no database required.
 * Pre-seeded with realistic fake data for BC3 development & demo.
 */
@Injectable()
export class LearningPathInMemoryRepository implements LearningPathRepository {
  private readonly store = new Map<string, LearningPath>();

  constructor() {
    this.seed();
  }

  async save(path: LearningPath): Promise<void> {
    this.store.set(path.id, path);
    // Also index by learnerId for findByLearnerId
    (this as any)._learnerIndex =
      (this as any)._learnerIndex ?? new Map<string, string>();
    (this as any)._learnerIndex.set(path.learnerId, path.id);
  }

  async findByLearnerId(learnerId: string): Promise<LearningPath | null> {
    const index: Map<string, string> = (this as any)._learnerIndex ?? new Map();
    const pathId = index.get(learnerId);
    return pathId ? (this.store.get(pathId) ?? null) : null;
  }

  async findById(id: string): Promise<LearningPath | null> {
    return this.store.get(id) ?? null;
  }

  // ---------------------------------------------------------------------------
  // Seed — realistic fake data covering all Gherkin scenarios
  // ---------------------------------------------------------------------------

  private seed(): void {
    const learnerIndex = new Map<string, string>();
    (this as any)._learnerIndex = learnerIndex;

    // ── Scénario 1 : Parcours standard en course (remédiation déjà insérée) ───
    const path1 = LearningPath.reconstitute({
      id: 'path-alice-001',
      learnerId: 'learner-alice',
      tenantId: 'tenant-universite-lyon',
      targetCertificationId: 'cert-developpement-logiciel-avance',
      constraint: CoverageConstraint.from({
        mandatoryCompetencyIds: [
          'algorithmique-recursive',
          'programmation-objet',
        ],
        weeklyHours: 10,
        deadlineAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // +60 jours
      }),
      /** contentId values reference real BC2 catalogue rows (lecons.csv / exercices.csv) so catalogue + parcours align. */
      activities: [
        new Activity(
          randomUUID(),
          'l004',
          'REMEDIATION',
          ['algorithmique-recursive'],
          2,
          0,
        ),
        new Activity(
          randomUUID(),
          'l005',
          'LESSON',
          ['algorithmique-recursive'],
          3,
          1,
        ),
        new Activity(
          randomUUID(),
          'e002',
          'EXERCISE',
          ['algorithmique-recursive'],
          2,
          2,
        ),
        new Activity(
          randomUUID(),
          'l010',
          'LESSON',
          ['programmation-objet'],
          4,
          3,
        ),
        new Activity(
          randomUUID(),
          'l013',
          'LESSON',
          ['programmation-objet'],
          3,
          4,
        ),
        new Activity(
          randomUUID(),
          'assessment:competence:programmation-objet',
          'ASSESSMENT',
          ['programmation-objet'],
          1,
          5,
        ),
      ],
      levels: [
        EstimatedLevel.from('algorithmique-recursive', 0.42), // insuffisant — remédiation déjà insérée
      ],
    });
    this.store.set(path1.id, path1);
    learnerIndex.set(path1.learnerId, path1.id);

    // ── Scénario 2 : Apprenant en accélération (maîtrise rapide) ────────────
    const path2 = LearningPath.reconstitute({
      id: 'path-bob-001',
      learnerId: 'learner-bob',
      tenantId: 'tenant-universite-lyon',
      targetCertificationId: 'cert-developpement-logiciel-avance',
      constraint: CoverageConstraint.from({
        mandatoryCompetencyIds: [
          'structures-donnees',
          'complexite-algorithmique',
        ],
        weeklyHours: 15,
        deadlineAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
      }),
      activities: [
        new Activity(
          randomUUID(),
          'content-struct-intro',
          'LESSON',
          ['structures-donnees'],
          2,
          0,
        ),
        new Activity(
          randomUUID(),
          'content-struct-ex',
          'EXERCISE',
          ['structures-donnees'],
          2,
          1,
        ),
        new Activity(
          randomUUID(),
          'content-struct-eval',
          'ASSESSMENT',
          ['structures-donnees'],
          1,
          2,
        ),
        new Activity(
          randomUUID(),
          'content-complexite-intro',
          'LESSON',
          ['complexite-algorithmique'],
          4,
          3,
        ),
        new Activity(
          randomUUID(),
          'content-complexite-ex',
          'EXERCISE',
          ['complexite-algorithmique'],
          3,
          4,
        ),
        new Activity(
          randomUUID(),
          'content-complexite-eval',
          'ASSESSMENT',
          ['complexite-algorithmique'],
          1,
          5,
        ),
      ],
      levels: [
        EstimatedLevel.from('structures-donnees', 0.93), // maîtrise → eligible accélération
        EstimatedLevel.from('complexite-algorithmique', 0.55), // en course
      ],
    });
    this.store.set(path2.id, path2);
    learnerIndex.set(path2.learnerId, path2.id);

    // ── Scénario 3 : Contrainte de couverture à risque ───────────────────────
    const path3 = LearningPath.reconstitute({
      id: 'path-carla-001',
      learnerId: 'learner-carla',
      tenantId: 'tenant-entreprise-x',
      targetCertificationId: 'cert-securite-systemes',
      constraint: CoverageConstraint.from({
        mandatoryCompetencyIds: [
          'securite-web',
          'cryptographie',
          'gestion-vulnerabilites',
        ],
        weeklyHours: 5,
        deadlineAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours seulement
      }),
      activities: [
        new Activity(
          randomUUID(),
          'content-securite-intro',
          'LESSON',
          ['securite-web'],
          4,
          0,
        ),
        new Activity(
          randomUUID(),
          'content-securite-ex',
          'EXERCISE',
          ['securite-web'],
          3,
          1,
        ),
        new Activity(
          randomUUID(),
          'content-crypto-intro',
          'LESSON',
          ['cryptographie'],
          5,
          2,
        ),
        new Activity(
          randomUUID(),
          'content-crypto-ex',
          'EXERCISE',
          ['cryptographie'],
          4,
          3,
        ),
        new Activity(
          randomUUID(),
          'content-vuln-intro',
          'LESSON',
          ['gestion-vulnerabilites'],
          3,
          4,
        ),
        new Activity(
          randomUUID(),
          'content-vuln-eval',
          'ASSESSMENT',
          ['gestion-vulnerabilites'],
          2,
          5,
        ),
      ],
      levels: [],
    });
    this.store.set(path3.id, path3);
    learnerIndex.set(path3.learnerId, path3.id);

    // ── Scénario 4 : Parcours terminé ────────────────────────────────────────
    const act4a = new Activity(
      randomUUID(),
      'content-js-fondamentaux',
      'LESSON',
      ['javascript-core'],
      3,
      0,
    );
    const act4b = new Activity(
      randomUUID(),
      'content-js-async',
      'LESSON',
      ['javascript-async'],
      2,
      1,
    );
    act4a.complete();
    act4b.complete();
    const path4 = LearningPath.reconstitute({
      id: 'path-david-001',
      learnerId: 'learner-david',
      tenantId: 'tenant-universite-lyon',
      targetCertificationId: 'cert-developpement-web-js',
      constraint: CoverageConstraint.from({
        mandatoryCompetencyIds: ['javascript-core', 'javascript-async'],
        weeklyHours: 10,
      }),
      activities: [act4a, act4b],
      levels: [
        EstimatedLevel.from('javascript-core', 0.88),
        EstimatedLevel.from('javascript-async', 0.82),
      ],
    });
    this.store.set(path4.id, path4);
    learnerIndex.set(path4.learnerId, path4.id);
  }
}
