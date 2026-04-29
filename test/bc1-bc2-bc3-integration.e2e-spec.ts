import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

import { EnrollmentService } from '../src/modules/identity/application/services/enrollment.service';
import { ITenantRepository, TENANT_REPOSITORY } from '../src/modules/tenant/domain/repositories/tenant.repository.interface';
import { Tenant } from '../src/modules/tenant/domain/aggregates/tenant.aggregate';
import { LearningPathRepository } from '../src/modules/adaptive/domain/repositories/learning-path.repository';

describe('Integration between BC1 (Identity), BC2 (Catalog), and BC3 (Adaptive)', () => {
  let moduleRef: TestingModule;
  let enrollmentService: EnrollmentService;
  let tenantRepo: ITenantRepository;
  let adaptiveRepo: LearningPathRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    enrollmentService = moduleRef.get<EnrollmentService>(EnrollmentService);
    tenantRepo = moduleRef.get<ITenantRepository>(TENANT_REPOSITORY);
    adaptiveRepo = moduleRef.get<LearningPathRepository>(LearningPathRepository);
  });

  it('should create a learner, enroll them, and trigger the adaptive engine to create a learning path', async () => {
    const tenantId = 'tenant-universite-lyon';
    const programId = 'p001';

    // 1. Setup tenant
    const existingTenant = await tenantRepo.findById(tenantId);
    if (!existingTenant) {
      const tenant = Tenant.create(tenantId, 'Universite Lyon', {});
      await tenantRepo.save(tenant);
    }

    // 2. Create learner via Identity BC
    const learner = await enrollmentService.createLearner({
      tenantId,
      email: 'alice.student-e2e@exemple.com',
      firstName: 'Alice',
      lastName: 'Student E2E',
    });

    expect(learner.id).toBeDefined();

    // 3. Enroll the learner (triggers event)
    await enrollmentService.enroll({
      learnerId: learner.id,
      tenantId,
      programId,
      weeklyAvailabilityHours: 1, // Extremely low to force ConstraintSolver infeasibility & trigger prioritizeMandatory
      deadline: new Date('2028-01-01'),
    });

    // Let the event loop process the async event listener (Wait slightly)
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    // 4. Verify that the Adaptive Engine (BC3) intercepted the event and built a path
    const learningPath = await adaptiveRepo.findByLearnerId(learner.id);

    expect(learningPath).toBeDefined();
    expect(learningPath!.tenantId).toBe(tenantId);
    expect(learningPath!.getActivities().length).toBeGreaterThan(0);

    // Let's verify that the activities matched the catalogue
    const activities = learningPath!.getActivities();
    expect(activities.length).toBeGreaterThan(0);
    
    // We should have both LESSONS and ASSESSMENTS imported from catalog
    const hasLesson = activities.some(a => a.type === 'LESSON');
    const hasAssessment = activities.some(a => a.type === 'ASSESSMENT' && a.contentId.includes('competence'));
    console.log(activities.map(a => a.type + ': ' + a.contentId));
    
    expect(hasLesson).toBe(true);
    expect(hasAssessment).toBe(true);
  });
});
