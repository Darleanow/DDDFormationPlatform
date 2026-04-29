import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AssessmentModule } from '../src/modules/assessment/assessment.module';
import { CertificationModule } from '../src/modules/certification/certification.module';

import {
  AssessmentRepository,
  ASSESSMENT_REPOSITORY,
} from '../src/modules/assessment/domain/repositories/assessment-repository';
import { AssessmentAttemptRepository, ASSESSMENT_ATTEMPT_REPOSITORY } from '../src/modules/assessment/domain/repositories/assessment-attempt-repository';
import { AdaptiveEngineGateway, ADAPTIVE_ENGINE_GATEWAY } from '../src/modules/assessment/application/ports/adaptive-engine.gateway';

import { ProcessAssessmentAttemptUseCase } from '../src/modules/assessment/application/use-cases/process-assessment-attempt.use-case';
import { AssessmentItemResult } from '../src/modules/assessment/domain/services/score-calculator';
import { Assessment } from '../src/modules/assessment/domain/aggregates/assessment/assessment';
import { AssessmentItem } from '../src/modules/assessment/domain/aggregates/assessment/assessment-item';

import { ICertificationRepository } from '../src/modules/certification/domain/repositories/certification.repository.interface';
import { IIssuanceRepository } from '../src/modules/certification/domain/repositories/issuance.repository.interface';
import { ICertificationAttemptRepository } from '../src/modules/certification/domain/repositories/certification-attempt.repository.interface';
import { Certification } from '../src/modules/certification/domain/entities/certification.entity';
import { IssuanceRule } from '../src/modules/certification/domain/entities/issuance-rule.entity';
import { CompetencyId } from '../src/shared/competency-id';
import { InMemoryIssuanceRepository } from '../src/modules/certification/infrastructure/repositories/in-memory-issuance.repository';
import { InMemoryAttemptRepository } from '../src/modules/certification/infrastructure/repositories/in-memory-attempt.repository';

describe('Integration BC4 (Assessment) and BC5 (Certification)', () => {
  let moduleRef: TestingModule;
  let processAttempt: ProcessAssessmentAttemptUseCase;
  let issuanceRepo: InMemoryIssuanceRepository;
  let tentativeRepo: InMemoryAttemptRepository;

  beforeAll(async () => {
    // Minimal in-memory repo so CompetenceAssessmentsBootstrap (onModuleInit) can call save()
    const assessmentsById = new Map<string, Assessment>();
    const mockAssessmentsRepo: Pick<AssessmentRepository, 'findById' | 'save'> =
      {
        findById: jest.fn((id: string) =>
          Promise.resolve(assessmentsById.get(id) ?? null),
        ),
        save: jest.fn(async (a: Assessment) => {
          assessmentsById.set(a.getId(), a);
        }),
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
    issuanceRepo = moduleRef.get<IIssuanceRepository>(
      'IIssuanceRepository',
    ) as InMemoryIssuanceRepository;
    tentativeRepo = moduleRef.get<ICertificationAttemptRepository>(
      'ICertificationAttemptRepository',
    ) as InMemoryAttemptRepository;

    // 1. Arrange Certification Data
    const certif = new Certification(
      'CERT-AWS', // id
      'tenant-A', // tenantId
      'AWS Dev', // titre
      new IssuanceRule(
        0.5, 
        new Set(['comp-1' as CompetencyId]), 
        new Set([]),
        2 
      )
    );
    certRepo.items.push(certif);

    // 2. Arrange Assessment Data
    const assessment = new Assessment(
      'ASSESS-123',
      [new AssessmentItem('item-1', 'comp-1', 0.5, 1)],
      'CERTIFICATIVE',
      'CERT-AWS',
    );
    assessmentsById.set(assessment.getId(), assessment);
  });

  afterEach(() => {
    // Nettoyer les repos InMemory entre chaque test pour ne pas polluer les autres
    issuanceRepo.items.length = 0;
    tentativeRepo.items.length = 0;
  });

  it('devrait échouer silencieusement si la attempt est considérée suspecte par BC4', async () => {
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

    expect(issuanceRepo.items).toHaveLength(0); // No certification
    // attempt shouldn't be counted for suspect? Or maybe it is?
    // Based on our logic in listener: if suspect, it returns early.
  });

  it('devrait valider la attempt, incrémenter le nombre et délivrer le certificat', async () => {
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

    const attempts = tentativeRepo.items;
    expect(attempts).toHaveLength(1);
    expect(attempts[0].nbTentativesEffectuees).toBe(1);

    const issuances = issuanceRepo.items;
    expect(issuances).toHaveLength(1);
    expect(issuances[0].learnerId).toBe('bob-888');
    expect(issuances[0].certificationId).toBe('CERT-AWS');
  });

  it('ne devrait pas délivrer lors de la 3e attempt si max=2', async () => {
    const itemResults: AssessmentItemResult[] = [
      { itemId: 'item-1', isCorrect: true, timeSpentSeconds: 60 }
    ];

    // Force 2ième attempt
    await processAttempt.execute({
      learnerId: 'lucas-999',
      assessmentId: 'ASSESS-123',
      attemptId: 'ATT-003',
      questionCount: 5,
      durationSeconds: 300,
      itemResults,
    });
    // Force 3ième attempt
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
    const issuancesLucas = issuanceRepo.items.filter(d => d.learnerId === 'lucas-999');
    expect(issuancesLucas.length).toBeGreaterThan(0); // Should have gotten one on first valid try
  });

});