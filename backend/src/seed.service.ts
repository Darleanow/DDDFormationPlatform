import { Injectable, Inject, OnApplicationBootstrap } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { TENANT_REPOSITORY } from './modules/tenant/domain/repositories/tenant.repository.interface';
import type { ITenantRepository } from './modules/tenant/domain/repositories/tenant.repository.interface';
import { Tenant } from './modules/tenant/domain/aggregates/tenant.aggregate';

import { LEARNER_REPOSITORY } from './modules/identity/domain/repositories/learner.repository.interface';
import type { ILearnerRepository } from './modules/identity/domain/repositories/learner.repository.interface';
import { Learner } from './modules/identity/domain/aggregates/learner.aggregate';

import { ENROLLMENT_REPOSITORY } from './modules/identity/domain/repositories/enrollment.repository.interface';
import type { IEnrollmentRepository } from './modules/identity/domain/repositories/enrollment.repository.interface';
import { Enrollment } from './modules/identity/domain/aggregates/enrollment.aggregate';

import type { ICertificationRepository } from './modules/certification/domain/repositories/certification.repository.interface';
import { Certification } from './modules/certification/domain/entities/certification.entity';
import { IssuanceRule } from './modules/certification/domain/entities/issuance-rule.entity';
import type { CompetencyId } from './shared/competency-id';
import { IdentityToAdaptiveAdapter } from './modules/adaptive/infrastructure/integration/identity-to-adaptive.adapter';
import { buildAliceDemoCompactActivities } from './modules/adaptive/infrastructure/integration/alice-demo-compact-path';
import { EnrollmentConfirmedEvent } from './modules/identity/domain/events/enrollment-confirmed.event';
import { LearningPathRepository } from './modules/adaptive/domain/repositories/learning-path.repository';

// We could also inject the Catalog and Adaptive repos to fully populate the mock DB
// For now, let's at least create the Tenant, Learner, and Enrollment.

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: ITenantRepository,
    @Inject(LEARNER_REPOSITORY) private readonly learnerRepo: ILearnerRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    @Inject('ICertificationRepository') private readonly certRepo: ICertificationRepository,
    private readonly identityToAdaptive: IdentityToAdaptiveAdapter,
    @Inject(LearningPathRepository) private readonly learningPathRepo: LearningPathRepository,
  ) {}

  async onApplicationBootstrap() {
    console.log('🌱 Starting database seeding (in-memory mode)...');

    // 1. Create a Tenant
    const tenantId = 'tenant-universite-lyon';
    const existingTenant = await this.tenantRepo.findById(tenantId);
    if (!existingTenant) {
      const tenant = Tenant.create(tenantId, 'Université Lyon — démo catalogue', {
        scoreSeuil: 75,
        maxAttempts: 3,
      });
      await this.tenantRepo.save(tenant);
      console.log('✅ Created mock Tenant: Université Lyon (démo)');
    }

    // 2. Create a Learner
    const learnerId = 'learner-alice';
    const existingLearner = await this.learnerRepo.findById(learnerId);
    if (!existingLearner) {
      const learner = Learner.create({
        id: learnerId,
        tenantId,
        email: 'alice.dupont@universite-paris.fr',
        firstName: 'Alice',
        lastName: 'Dupont',
      });
      await this.learnerRepo.save(learner);
      console.log('✅ Created mock Learner: Alice Dupont');
    }

    const programId = 'p001';

    /** Inscription générique programme p001 — deux apprenants : Alice (parcours compact démo accélération) et Bruno (catalogue BC2 complet pour comparer). */
    const enrollIfMissing = async (
      learner: { id: string; firstName: string; lastName: string },
    ) => {
      const missing = !(await this.enrollmentRepo.existsByLearnerAndProgram(
        learner.id,
        programId,
      ));
      if (missing) {
        await this.enrollmentRepo.save(
          Enrollment.create({
            id: randomUUID(),
            learnerId: learner.id,
            tenantId,
            programId,
            weeklyAvailabilityHours: 10,
            deadline: new Date('2027-06-30T00:00:00Z'),
          }),
        );
        console.log(
          `✅ Inscription créée (${learner.firstName} ${learner.lastName}) — programme p001`,
        );
      }
    };

    await enrollIfMissing({ id: learnerId, firstName: 'Alice', lastName: 'Dupont' });

    const learnerBrunoClassicId = 'learner-bob-classic';
    const existingBruno = await this.learnerRepo.findById(learnerBrunoClassicId);
    if (!existingBruno) {
      await this.learnerRepo.save(
        Learner.create({
          id: learnerBrunoClassicId,
          tenantId,
          email: 'bruno.lemaire@universite-lyon.fr',
          firstName: 'Bruno',
          lastName: 'Lemaire',
        }),
      );
      console.log('✅ Apprenant démo cursus « classique » : Bruno Lemaire (learner-bob-classic)');
    }
    await enrollIfMissing({ id: learnerBrunoClassicId, firstName: 'Bruno', lastName: 'Lemaire' });

    /** Parcours BC3 @ bootstrap — évite une course où @OnEvent n’est pas encore branché. Alice : séquence courte / accélération ; Bruno : liste complète depuis le catalogue. */
    await this.bootstrapAdaptivePathForLearner({
      learnerId,
      tenantId,
      programId,
      replaceWithDemoCompactSequence: true,
    });
    await this.bootstrapAdaptivePathForLearner({
      learnerId: learnerBrunoClassicId,
      tenantId,
      programId,
      replaceWithDemoCompactSequence: false,
    });

    // 4. Create a Certification rule
    const certId = 'cert-dev-avance';
    const existingCert = await this.certRepo.findById(certId);
    if (!existingCert) {
      const rules = new IssuanceRule(
        75, 
        new Set(['C_CONCUR_2'] as CompetencyId[]), 
        new Set(['C_THREAD_1', 'C_ALGO_REC'] as CompetencyId[])
      );
      const cert = new Certification(certId, tenantId, 'Certification Dev Logiciel Avancé', rules);
      await this.certRepo.save(cert);
      console.log('✅ Created mock Certification rules');
    }

    console.log('🌳 Seeding complete!');
  }

  /** Construit ou reconstruit un parcours BC3 à partir de l’inscription (même flux que `enrollment.confirmed`). */
  private async bootstrapAdaptivePathForLearner(params: {
    learnerId: string;
    tenantId: string;
    programId: string;
    replaceWithDemoCompactSequence: boolean;
  }): Promise<void> {
    const enrollments = await this.enrollmentRepo.findByLearner(params.learnerId);
    const en = enrollments.find((e) => e.programId === params.programId);
    if (!en) {
      console.warn(
        `Seed: pas d’inscription ${params.programId} pour ${params.learnerId} — parcours BC3 ignoré.`,
      );
      return;
    }

    try {
      await this.identityToAdaptive.handleIdentityEvent(
        new EnrollmentConfirmedEvent(
          en.learnerId,
          en.tenantId,
          en.programId,
          en.weeklyAvailabilityHours,
          en.deadline,
          en.enrolledAt,
        ),
      );

      if (params.replaceWithDemoCompactSequence && params.learnerId === 'learner-alice') {
        const path = await this.learningPathRepo.findByLearnerId(params.learnerId);
        if (path) {
          path.resetActivitiesSequence(buildAliceDemoCompactActivities());
          await this.learningPathRepo.save(path);
        }
      }

      console.log(
        `✅ Parcours BC3 ${params.learnerId} — ${
          params.replaceWithDemoCompactSequence ? 'séquence courte (démo accélération)' : 'catalogue complet (cursus « classique »)'
        }`,
      );
    } catch (e) {
      console.error(`❌ Parcours adaptatif impossible pour ${params.learnerId}. Cause :`, e);
    }
  }
}
