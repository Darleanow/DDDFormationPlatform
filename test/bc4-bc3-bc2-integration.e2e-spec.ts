import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { AssessmentModule } from '../src/modules/assessment/assessment.module';
import { AdaptiveModule } from '../src/modules/adaptive/adaptive.module';
import { CatalogModule } from '../src/modules/catalog/catalog.module';

import { ProcessAssessmentAttemptUseCase } from '../src/modules/assessment/application/use-cases/process-assessment-attempt.use-case';
import { LearningPathRepository } from '../src/modules/adaptive/domain/repositories/learning-path.repository';
import { LearningPath } from '../src/modules/adaptive/domain/entities/learning-path.entity';
import { CoverageConstraint } from '../src/modules/adaptive/domain/value-objects/coverage-constraint.vo';
import { Activity } from '../src/modules/adaptive/domain/entities/activity.entity';
import { assessmentAggregateIdForCompetency } from '../src/shared/bc-integration/assessment-ids';

describe('Integration between BC4 (Assessment), BC3 (Adaptive) and BC2 (Catalog)', () => {
  let moduleRef: TestingModule;
  let processAttempt: ProcessAssessmentAttemptUseCase;
  let bc3Repo: LearningPathRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        CatalogModule,
        AdaptiveModule,
        AssessmentModule,
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init(); // Important pour enregistrer les @OnEvent listeners

    processAttempt = moduleRef.get<ProcessAssessmentAttemptUseCase>(ProcessAssessmentAttemptUseCase);
    bc3Repo = moduleRef.get<LearningPathRepository>(LearningPathRepository);
  });

  it('devrait déclencher une remédiation dans BC3 en interrogeant BC2 après un échec dans BC4', async () => {
    const learnerId = 'bobby-123';
    const competenceCible = 'c001'; // Typescript Basics (matches the catalog mock)

    /** Stable BC4 aggregate id seeded from catalogue (CompetenceID SK — Context Map). */
    const assessmentId = assessmentAggregateIdForCompetency(competenceCible);

    // Seed a learning path in BC3 for the same learner (ASSESSMENT pending before LESSON).
    const path = LearningPath.create({
      id: 'path-bobby',
      learnerId: learnerId,
      tenantId: 'tenant-1',
      constraint: CoverageConstraint.from({
        mandatoryCompetencyIds: [competenceCible],
        weeklyHours: 10,
      }),
    });
    const activity1 = new Activity('act-eval-1', assessmentId, 'ASSESSMENT', [competenceCible], 1, 1);
    const activity2 = new Activity('act-lesson-2', 'lesson-2', 'LESSON', ['another-comp'], 1, 2);
    path.addActivity(activity1);
    path.addActivity(activity2);
    await bc3Repo.save(path);

    await processAttempt.execute({
      learnerId,
      assessmentId,
      attemptId: 'attempt-1',
      questionCount: 1,
      durationSeconds: 15,
      itemResults: [
        { itemId: 'item-default-c001', isCorrect: false },
      ],
    });

    const updatedPath = await bc3Repo.findByLearnerId(learnerId);
    expect(updatedPath).toBeDefined();

    const activities = updatedPath!.getActivities();

    // The path should now have a REMEDIATION activity
    const hasRemediation = activities.some(a => a.type === 'REMEDIATION' && a.competenceIds.includes(competenceCible));

    expect(hasRemediation).toBe(true);

    const remediationActivity = activities.find(a => a.type === 'REMEDIATION');
    expect(remediationActivity).toBeDefined();
    expect(remediationActivity?.contentId).toBeTruthy();
  });
});
