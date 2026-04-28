import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { AssessmentModule } from '../src/modules/assessment/assessment.module';
import { AdaptiveModule } from '../src/modules/adaptive/adaptive.module';
import { CatalogModule } from '../src/modules/catalog/catalog.module';

import { ProcessAssessmentAttemptUseCase } from '../src/modules/assessment/application/use-cases/process-assessment-attempt.use-case';
import { AssessmentRepository, ASSESSMENT_REPOSITORY } from '../src/modules/assessment/domain/repositories/assessment-repository';
import { Assessment } from '../src/modules/assessment/domain/aggregates/assessment/assessment';
import { AssessmentItem } from '../src/modules/assessment/domain/aggregates/assessment/assessment-item';

import { LearningPathRepository } from '../src/modules/adaptive/domain/repositories/learning-path.repository';
import { LearningPath } from '../src/modules/adaptive/domain/entities/learning-path.entity';
import { CoverageConstraint } from '../src/modules/adaptive/domain/value-objects/coverage-constraint.vo';
import { Activity } from '../src/modules/adaptive/domain/entities/activity.entity';

describe('Integration between BC4 (Assessment), BC3 (Adaptive) and BC2 (Catalog)', () => {
  let moduleRef: TestingModule;
  let processAttempt: ProcessAssessmentAttemptUseCase;
  let bc4Repo: AssessmentRepository;
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
    bc4Repo = moduleRef.get<AssessmentRepository>(ASSESSMENT_REPOSITORY);
    bc3Repo = moduleRef.get<LearningPathRepository>(LearningPathRepository);
  });

  it('devrait déclencher une remédiation dans BC3 en interrogeant BC2 après un échec dans BC4', async () => {
    const learnerId = 'bobby-123';
    const competenceCible = 'c001'; // Typescript Basics (matches the catalog mock)

    console.log('1. [BC4] Préparation de l\'évaluation...');
    // Seed an assessment in BC4 looking at competence c001
    const assessmentId = 'eval-ts-basics';
    const evalItem = new AssessmentItem('item-1', competenceCible, 0.5, 1);
    const assessment = new Assessment(assessmentId, [evalItem]);
    await bc4Repo.save(assessment);

    console.log('2. [BC3] Préparation du parcours apprenant...');
    // Seed a learning path in BC3 for the same learner
    const path = LearningPath.create({
      id: 'path-bobby',
      learnerId: learnerId,
      tenantId: 'tenant-1',
      constraint: CoverageConstraint.from({
        mandatoryCompetenceIds: [competenceCible],
        weeklyHours: 10,
      }),
    });
    const activity1 = new Activity('act-eval-1', assessmentId, 'ASSESSMENT', [competenceCible], 1, 1);
    const activity2 = new Activity('act-lesson-2', 'lesson-2', 'LESSON', ['another-comp'], 1, 2);
    path.addActivity(activity1);
    path.addActivity(activity2);
    await bc3Repo.save(path);

    console.log('3. [App] L\'apprenant soumet son évaluation (tout faux) ...');
    // Learner fails the assessment (isCorrect: false)
    await processAttempt.execute({
      learnerId,
      assessmentId,
      attemptId: 'attempt-1',
      questionCount: 1,
      durationSeconds: 15,
      itemResults: [
        { itemId: 'item-1', isCorrect: false }
      ],
    });

    // Wait a brief moment for the EventEmitter to propagate (it is synchronous by default but just in case)
    await new Promise(res => setTimeout(res, 50));

    console.log('4. [BC3] Vérification de l\'adaptation du parcours...');
    const updatedPath = await bc3Repo.findByLearnerId(learnerId);
    expect(updatedPath).toBeDefined();

    const activities = updatedPath!.getActivities();

    // The path should now have a REMEDIATION activity
    const hasRemediation = activities.some(a => a.type === 'REMEDIATION' && a.competenceIds.includes(competenceCible));

    console.log(`Résultats : ${activities.length} activités. Remédiation présente: ${hasRemediation}`);
    expect(hasRemediation).toBe(true);

    const remediationActivity = activities.find(a => a.type === 'REMEDIATION');
    expect(remediationActivity).toBeDefined();
    expect(remediationActivity?.contentId).toBeTruthy(); // L'engine l'a récupéré via BC2

    console.log(`Succès : BC4 a évalué, le gateway a émis, BC3 a écouté, a trouvé le niveau insuffisant, a interrogé BC2 pour un module de rattrapage (${remediationActivity?.contentId}) et a ajusté le parcours !`);
  });
});
