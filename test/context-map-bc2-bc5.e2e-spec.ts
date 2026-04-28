/**
 * Context Map — strict E2E (BC2 Catalog, BC3 Adaptive, BC4 Assessment, BC5 Certification)
 *
 * Diagram relationships verified:
 * - BC2(U) ─C/S─▶ BC3(D): catalogue-backed activities / remediation refs
 * - BC2 ─C/S CompetenceID─▶ BC4: competence ids only tie assessment items (SK)
 * - BC4 ─ACL résultats▶ BC3: numerical payload only crosses into adaptive core (see ACL + contract)
 * - BC4(U) ─C/S scores & validations─▶ BC5(D): eligibility command carries scores + validations
 * - BC3 ─C/S─▶ BC5: path completion aggregates competence results for issuance
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';

import { CatalogModule } from '../src/modules/catalog/catalog.module';
import { CatalogQueryService } from '../src/modules/catalog/application/catalog-query.service';
import { AssessmentModule } from '../src/modules/assessment/assessment.module';
import { AdaptiveModule } from '../src/modules/adaptive/adaptive.module';
import { CertificationModule } from '../src/modules/certification/certification.module';

import {
  AssessmentRepository,
  ASSESSMENT_REPOSITORY,
} from '../src/modules/assessment/domain/repositories/assessment-repository';
import { ProcessAssessmentAttemptUseCase } from '../src/modules/assessment/application/use-cases/process-assessment-attempt.use-case';
import { VerifierEligibiliteEtDelivrerHandler } from '../src/modules/certification/application/commands/verifier-eligibilite-et-delivrer.handler';
import { VerifierEligibiliteEtDelivrerCommand } from '../src/modules/certification/application/commands/verifier-eligibilite-et-delivrer.command';
import { LearningPathRepository } from '../src/modules/adaptive/domain/repositories/learning-path.repository';

import { LearningPath } from '../src/modules/adaptive/domain/entities/learning-path.entity';
import { CoverageConstraint } from '../src/modules/adaptive/domain/value-objects/coverage-constraint.vo';
import { Activity } from '../src/modules/adaptive/domain/entities/activity.entity';

import { Certification } from '../src/modules/certification/domain/entities/certification.entity';
import { RegleObtention } from '../src/modules/certification/domain/entities/regle-obtention.entity';
import type { ICertificationRepository } from '../src/modules/certification/domain/repositories/certification.repository.interface';
import type { IDelivranceRepository } from '../src/modules/certification/domain/repositories/delivrance.repository.interface';
import { ValidationCompetence } from '../src/modules/certification/domain/value-objects/validation-competence.value-object';
import type { CompetencyId } from '../src/shared/competency-id';

import { assessmentAggregateIdForCompetency } from '../src/shared/bc-integration/assessment-ids';
import {
  BC_INPROCESS_EVENT,
  type AssessmentScorePublishedForAdaptivePayload,
} from '../src/shared/bc-integration/in-process-events';
import { CompetenceCritiqueEnEchecException } from '../src/modules/certification/domain/exceptions/competence-critique-en-echec.exception';

/** Test-only repo with observable state */
class TransparentCertRepo implements ICertificationRepository {
  readonly items: Certification[] = [];

  constructor(initial: Certification[] = []) {
    this.items.push(...initial);
  }

  reset(items: Certification[] = []) {
    this.items.length = 0;
    this.items.push(...items);
  }

  async findById(id: string): Promise<Certification | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }
}

class TransparentDelivRepo implements IDelivranceRepository {
  readonly saved: unknown[] = [];

  reset() {
    this.saved.length = 0;
  }

  async save(d: unknown): Promise<void> {
    this.saved.push(d);
  }
}

describe('Context Map E2E — BC2 · BC3 · BC4 · BC5', () => {
  let moduleFixture: TestingModule;
  let catalogQuery: CatalogQueryService;
  let assessmentRepo: AssessmentRepository;
  let processAttempt: ProcessAssessmentAttemptUseCase;
  let learningPathRepo: LearningPathRepository;

  let verifier: VerifierEligibiliteEtDelivrerHandler;

  let certRepo: TransparentCertRepo;
  let delivRepo: TransparentDelivRepo;

  /** CSV fixture — must exist post-bootstrap */
  const SK_COMPETENCE = 'c001';

  beforeAll(async () => {
    certRepo = new TransparentCertRepo([]);
    delivRepo = new TransparentDelivRepo();

    moduleFixture = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        CatalogModule,
        AssessmentModule,
        AdaptiveModule,
        CertificationModule,
      ],
    })
      .overrideProvider('ICertificationRepository')
      .useValue(certRepo)
      .overrideProvider('IDelivranceRepository')
      .useValue(delivRepo)
      .compile();

    const app = moduleFixture.createNestApplication();
    await app.init();

    catalogQuery = moduleFixture.get(CatalogQueryService);
    assessmentRepo = moduleFixture.get(ASSESSMENT_REPOSITORY);
    processAttempt = moduleFixture.get(ProcessAssessmentAttemptUseCase);
    learningPathRepo = moduleFixture.get(LearningPathRepository);
    verifier = moduleFixture.get(VerifierEligibiliteEtDelivrerHandler);
  });

  beforeEach(() => {
    delivRepo.reset();
    certRepo.reset([]);
  });

  it('diagram: BC2 → BC4 binds only CompetenceID — Assessment aggregate keyed by competence', async () => {
    const comps = await catalogQuery.findAllCompetences();
    expect(comps.some((c) => c.id === SK_COMPETENCE)).toBe(true);

    const stableId = assessmentAggregateIdForCompetency(SK_COMPETENCE);
    const agg = await assessmentRepo.findById(stableId);
    expect(agg).not.toBeNull();
    expect(agg!.getItems().every((it) => it.getCompetencyId() === SK_COMPETENCE)).toBe(true);
  });

  it('diagram: BC4 → BC3 emits contract payload only (ACL ingress) — bounded shape', async () => {
    const spy = jest.spyOn(EventEmitter2.prototype, 'emitAsync');

    const aid = assessmentAggregateIdForCompetency(SK_COMPETENCE);

    await processAttempt.execute({
      learnerId: 'e2e-acl-probe',
      assessmentId: aid,
      attemptId: `attempt-${Date.now()}`,
      questionCount: 1,
      durationSeconds: 120,
      itemResults: [{ itemId: 'item-default-c001', isCorrect: true }],
      tenantId: 'tenant-spec',
    });

    const ingress = spy.mock.calls.find(
      (c) => (c[0] as unknown) === BC_INPROCESS_EVENT.ASSESSMENT_RESULT,
    );

    expect(ingress).toBeDefined();

    const payload = ingress![1] as AssessmentScorePublishedForAdaptivePayload;
    expect(Object.keys(payload).sort()).toEqual(
      ['competenceId', 'estimatedLevel', 'learnerId', 'tenantId'].sort(),
    );
    expect(payload.learnerId).toBe('e2e-acl-probe');
    expect(payload.competenceId).toBe(SK_COMPETENCE);
    expect(typeof payload.estimatedLevel).toBe('number');
    expect(payload.estimatedLevel).toBeGreaterThanOrEqual(0);
    expect(payload.estimatedLevel).toBeLessThanOrEqual(1);
    spy.mockRestore();
  });

  it('diagram: BC2 → BC3 — failed evaluation triggers remediation anchored on BC2 module reference', async () => {
    const learnerId = `learn-rem-${Date.now()}`;
    const aid = assessmentAggregateIdForCompetency(SK_COMPETENCE);

    const path = LearningPath.create({
      id: `path-rem-${Date.now()}`,
      learnerId,
      tenantId: 't-b2-b3',
      constraint: CoverageConstraint.from({
        mandatoryCompetencyIds: [SK_COMPETENCE],
        weeklyHours: 10,
      }),
      targetCertificationId: 'cert-placeholder',
    });
    path.addActivity(
      new Activity('eval-a', aid, 'ASSESSMENT', [SK_COMPETENCE], 1, 0),
    );
    path.addActivity(
      new Activity('lesson-b', 'lecon-tail', 'LESSON', ['c999'], 1, 1),
    );

    await learningPathRepo.save(path);

    await processAttempt.execute({
      learnerId,
      assessmentId: aid,
      attemptId: `att-rem-${Date.now()}`,
      questionCount: 1,
      durationSeconds: 30,
      itemResults: [{ itemId: 'item-default-c001', isCorrect: false }],
    });

    const updated = await learningPathRepo.findByLearnerId(learnerId);
    expect(updated).not.toBeNull();
    const rem = updated!.getActivities().find((a) => a.type === 'REMEDIATION');
    expect(rem).toBeDefined();

    const mods = await catalogQuery.findModulesByCompetence(SK_COMPETENCE);
    expect(mods.length).toBeGreaterThan(0);
    expect(rem!.contentId).toBe(mods[0].id);
  });

  it('diagram: BC3 → BC5 — path completion aggregates BC4-derived levels and issues certification', async () => {
    const certId = `CERT-CM-${Date.now()}`;
    certRepo.reset([
      new Certification(
        certId,
        'tenant-e2e',
        'Certification context map',
        new RegleObtention(
          70,
          new Set([SK_COMPETENCE as CompetencyId]),
          new Set(),
        ),
      ),
    ]);

    const learnerId = `learn-full-${Date.now()}`;
    const aid = assessmentAggregateIdForCompetency(SK_COMPETENCE);

    const spyIssue = jest.spyOn(EventEmitter2.prototype, 'emitAsync');

    const path = LearningPath.create({
      id: `path-full-${Date.now()}`,
      learnerId,
      tenantId: 't-bc5',
      constraint: CoverageConstraint.from({
        mandatoryCompetencyIds: [SK_COMPETENCE],
        weeklyHours: 40,
      }),
      targetCertificationId: certId,
    });
    path.addActivity(
      new Activity('solo-eval', aid, 'ASSESSMENT', [SK_COMPETENCE], 1, 0),
    );
    await learningPathRepo.save(path);

    await processAttempt.execute({
      learnerId,
      assessmentId: aid,
      attemptId: `ok-${Date.now()}`,
      questionCount: 1,
      durationSeconds: 90,
      itemResults: [{ itemId: 'item-default-c001', isCorrect: true }],
      tenantId: 'tenant-bc5',
    });

    expect(delivRepo.saved).toHaveLength(1);

    const issuedEmit = spyIssue.mock.calls.find(
      (c) => (c[0] as unknown) === BC_INPROCESS_EVENT.CERTIFICATION_ISSUED,
    );
    expect(issuedEmit).toBeDefined();
    spyIssue.mockRestore();
  });

  it('diagram: BC4(U) → BC5(D) scores + validations — direct eligibility supply (supplier contract)', async () => {
    const certId = `CERT-DIRECT-${Date.now()}`;
    certRepo.reset([
      new Certification(
        certId,
        'tenant-bc5',
        'Direct eligibility',
        new RegleObtention(
          70,
          new Set([SK_COMPETENCE as CompetencyId]),
          new Set(),
        ),
      ),
    ]);

    await verifier.execute(
      new VerifierEligibiliteEtDelivrerCommand(
        `learner-direct-${Date.now()}`,
        certId,
        82,
        [new ValidationCompetence(SK_COMPETENCE as CompetencyId, true)],
      ),
    );

    expect(delivRepo.saved).toHaveLength(1);
  });

  it('diagram: BC4(U) → BC5(D) rejects certification when critique rule fails', async () => {
    const certId = `CERT-CRIT-${Date.now()}`;
    certRepo.reset([
      new Certification(
        certId,
        'tenant-bc5',
        'Critère bloquant',
        new RegleObtention(
          70,
          new Set([SK_COMPETENCE as CompetencyId]),
          new Set([SK_COMPETENCE as CompetencyId]),
        ),
      ),
    ]);

    await expect(
      verifier.execute(
        new VerifierEligibiliteEtDelivrerCommand(`learner-crit-${Date.now()}`, certId, 92, [
          new ValidationCompetence(SK_COMPETENCE as CompetencyId, false),
        ]),
      ),
    ).rejects.toBeInstanceOf(CompetenceCritiqueEnEchecException);

    expect(delivRepo.saved).toHaveLength(0);
  });

  it('BC3 persists EstimatedLevel-derived state only — no BC4 aggregates on LearningPath aggregate', async () => {
    const learner = `inspect-${Date.now()}`;
    const aid = assessmentAggregateIdForCompetency(SK_COMPETENCE);

    const path = LearningPath.create({
      id: `path-clean-${Date.now()}`,
      learnerId: learner,
      tenantId: 't1',
      constraint: CoverageConstraint.from({
        mandatoryCompetencyIds: [SK_COMPETENCE],
        weeklyHours: 10,
      }),
      targetCertificationId: 'x',
    });
    path.addActivity(new Activity('a1', aid, 'ASSESSMENT', [SK_COMPETENCE], 1, 0));
    await learningPathRepo.save(path);

    await processAttempt.execute({
      learnerId: learner,
      assessmentId: aid,
      attemptId: `t-${Date.now()}`,
      questionCount: 1,
      durationSeconds: 45,
      itemResults: [{ itemId: 'item-default-c001', isCorrect: true }],
    });

    const reloaded = await learningPathRepo.findByLearnerId(learner);
    expect(reloaded).not.toBeNull();
    const json = JSON.stringify(reloaded!.getActivities());
    expect(json.includes('AssessmentItem')).toBe(false);
    expect(json.includes('item-default')).toBe(false);
  });
});
