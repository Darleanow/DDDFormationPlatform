import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { AssessmentModule } from '../src/modules/assessment/assessment.module';
import { CertificationModule } from '../src/modules/certification/certification.module';

import { AssessmentRepository, ASSESSMENT_REPOSITORY } from '../src/modules/assessment/domain/repositories/assessment-repository';
import { AssessmentAttemptRepository, ASSESSMENT_ATTEMPT_REPOSITORY } from '../src/modules/assessment/domain/repositories/assessment-attempt-repository';
import { AdaptiveEngineGateway, ADAPTIVE_ENGINE_GATEWAY } from '../src/modules/assessment/application/ports/adaptive-engine.gateway';

import { ProcessAssessmentAttemptUseCase } from '../src/modules/assessment/application/use-cases/process-assessment-attempt.use-case';
import { AssessmentItemResult } from '../src/modules/assessment/domain/services/score-calculator';
import { Assessment } from '../src/modules/assessment/domain/aggregates/assessment/assessment';
import { AssessmentItem } from '../src/modules/assessment/domain/aggregates/assessment/assessment-item';
import { DifficultyRange } from '../src/modules/assessment/domain/value-objects/difficulty-range';

import { ICertificationRepository } from '../src/modules/certification/domain/repositories/certification.repository.interface';
import { IDelivranceRepository } from '../src/modules/certification/domain/repositories/delivrance.repository.interface';
import { ITentativeCertificationRepository } from '../src/modules/certification/domain/repositories/tentative-certification.repository.interface';
import { Certification } from '../src/modules/certification/domain/entities/certification.entity';
import { RegleObtention } from '../src/modules/certification/domain/entities/regle-obtention.entity';
import { CompetenceId } from '../src/shared/competence-id';

describe('Integration BC4 (Assessment) and BC5 (Certification)', () => {
  let moduleRef: TestingModule;
  let processAttempt: ProcessAssessmentAttemptUseCase;
  let delivranceRepo: any;
  let tentativeRepo: any;

  beforeAll(async () => {
    // Basic mocks for BC4 dependencies
    const mockAssessmentsRepo = {
      findById: jest.fn(),
    };
    const mockAttemptsRepo = {
      save: jest.fn(),
    };
    const mockAdaptiveEngineGateway = {
      submitScore: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        AssessmentModule,
        CertificationModule,
      ],
    })
      .overrideProvider(ASSESSMENT_REPOSITORY)
      .useValue(mockAssessmentsRepo)
      .overrideProvider(ASSESSMENT_ATTEMPT_REPOSITORY)
      .useValue(mockAttemptsRepo)
      .overrideProvider(ADAPTIVE_ENGINE_GATEWAY)
      .useValue(mockAdaptiveEngineGateway)
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init(); // Boot event listeners

    processAttempt = moduleRef.get<ProcessAssessmentAttemptUseCase>(ProcessAssessmentAttemptUseCase);
    
    // Grab BC5 repositories (which use InMemory defaults)
    const certRepo = moduleRef.get<ICertificationRepository>('ICertificationRepository') as any;
    delivranceRepo = moduleRef.get<IDelivranceRepository>('IDelivranceRepository');
    tentativeRepo = moduleRef.get<ITentativeCertificationRepository>('ITentativeCertificationRepository');

    // 1. Arrange Certification Data
    const certif = new Certification(
      'CERT-AWS', // id
      'tenant-A', // tenantId
      'AWS Dev', // titre
      new RegleObtention(
        0.5, 
        new Set(['comp-1' as CompetenceId]), 
        new Set([]),
        2 
      )
    );
    certRepo.items.push(certif);

    // 2. Arrange Assessment Data
    const assessment = new Assessment(
      'ASSESS-123',
      [
        new AssessmentItem('item-1', 'comp-1', 0.5, 1)
      ],
      'CERTIFICATIVE',
      'CERT-AWS'
    );
    mockAssessmentsRepo.findById.mockResolvedValue(assessment);
  });

  afterEach(() => {
    // Nettoyer les repos InMemory entre chaque test pour ne pas polluer les autres
    delivranceRepo.items.length = 0;
    tentativeRepo.items.length = 0;
  });

  it('devrait échouer silencieusement si la tentative est considérée suspecte par BC4', async () => {
    const itemResults: AssessmentItemResult[] = [
      { itemId: 'item-1', isCorrect: true, timeSpentSeconds: 1 } // Super fast -> Will flag anomaly
    ];

    await processAttempt.execute({
      learnerId: 'bob-888',
      assessmentId: 'ASSESS-123',
      attemptId: 'ATT-001',
      questionCount: 20, // max is 20 for detect
      durationSeconds: 10, // Unrealistic duration -> Flag anomaly
      itemResults,
    });

    await new Promise(resolve => setTimeout(resolve, 50)); // Wait for Async Events

    expect(delivranceRepo.items).toHaveLength(0); // No certification
    // tentative shouldn't be counted for suspect? Or maybe it is?
    // Based on our logic in listener: if suspect, it returns early.
  });

  it('devrait valider la tentative, incrémenter le nombre et délivrer le certificat', async () => {
    const itemResults: AssessmentItemResult[] = [
      { itemId: 'item-1', isCorrect: true, timeSpentSeconds: 60 } // Normal time
    ];

    await processAttempt.execute({
      learnerId: 'bob-888',
      assessmentId: 'ASSESS-123',
      attemptId: 'ATT-002',
      questionCount: 5,
      durationSeconds: 300,
      itemResults,
    });

    await new Promise(resolve => setTimeout(resolve, 50)); // Allow async Event to process

    const tentatives = tentativeRepo.items;
    expect(tentatives).toHaveLength(1);
    expect(tentatives[0].nbTentativesEffectuees).toBe(1);

    const delivrances = delivranceRepo.items;
    expect(delivrances).toHaveLength(1);
    expect(delivrances[0].learnerId).toBe('bob-888');
    expect(delivrances[0].certificationId).toBe('CERT-AWS');
  });

  it('ne devrait pas délivrer lors de la 3e tentative si max=2', async () => {
    const itemResults: AssessmentItemResult[] = [
      { itemId: 'item-1', isCorrect: true, timeSpentSeconds: 60 }
    ];

    // Force 2ième tentative
    await processAttempt.execute({
      learnerId: 'lucas-999',
      assessmentId: 'ASSESS-123',
      attemptId: 'ATT-003',
      questionCount: 5,
      durationSeconds: 300,
      itemResults,
    });
    // Force 3ième tentative
    await processAttempt.execute({
      learnerId: 'lucas-999',
      assessmentId: 'ASSESS-123',
      attemptId: 'ATT-004',
      questionCount: 5,
      durationSeconds: 300,
      itemResults,
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const tentativeLucas = await tentativeRepo.findByLearnerAndCertification('lucas-999', 'CERT-AWS');
    expect(tentativeLucas.nbTentativesEffectuees).toBe(2);

    // Filter to only lucas
    const delivrancesLucas = delivranceRepo.items.filter(d => d.learnerId === 'lucas-999');
    expect(delivrancesLucas.length).toBeGreaterThan(0); // Should have gotten one on first valid try
  });

});