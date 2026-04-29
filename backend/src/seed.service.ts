import { Injectable, OnApplicationBootstrap, Inject } from '@nestjs/common';
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

// We could also inject the Catalog and Adaptive repos to fully populate the mock DB
// For now, let's at least create the Tenant, Learner, and Enrollment.

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: ITenantRepository,
    @Inject(LEARNER_REPOSITORY) private readonly learnerRepo: ILearnerRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    @Inject('ICertificationRepository') private readonly certRepo: ICertificationRepository,
  ) {}

  async onApplicationBootstrap() {
    console.log('🌱 Starting database seeding (in-memory mode)...');

    // 1. Create a Tenant
    const tenantId = 'tenant-1';
    const existingTenant = await this.tenantRepo.findById(tenantId);
    if (!existingTenant) {
      const tenant = Tenant.create(tenantId, 'Université Paris Saclay', {
        scoreSeuil: 75,
        maxAttempts: 3,
      });
      await this.tenantRepo.save(tenant);
      console.log('✅ Created mock Tenant: Université Paris Saclay');
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

    // 3. Create an Enrollment
    const programId = 'prog-1';
    const existingEnrollment = await this.enrollmentRepo.existsByLearnerAndProgram(learnerId, programId);
    if (!existingEnrollment) {
      const enrollment = Enrollment.create({
        id: randomUUID(),
        learnerId,
        tenantId,
        programId,
        weeklyAvailabilityHours: 10,
        deadline: new Date('2027-06-30T00:00:00Z'),
      });
      await this.enrollmentRepo.save(enrollment);
      console.log('✅ Created mock Enrollment for Alice in Dévelopement Logiciel Avancé');
    }

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
}
