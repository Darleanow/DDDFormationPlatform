import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { CertificationModule } from '../src/modules/certification/certification.module';
import { ICertificationRepository } from '../src/modules/certification/domain/repositories/certification.repository.interface';
import { IDelivranceRepository } from '../src/modules/certification/domain/repositories/delivrance.repository.interface';
import { Certification } from '../src/modules/certification/domain/entities/certification.entity';
import { RegleObtention } from '../src/modules/certification/domain/entities/regle-obtention.entity';
import { CompetencyId } from '../src/shared/competency-id';
import { LearningPathCompletedEvent } from '../src/modules/adaptive/domain/events/learning-path-completed.event';
import { BC_INPROCESS_EVENT } from '../src/shared/bc-integration/in-process-events';

// Fake implementations just to access arrays
class AccessibleInMemoryCertRepo {
  public items: Certification[] = [];
  async findById(id: string): Promise<Certification | null> {
    return this.items.find(c => c.id === id) || null;
  }
}
class AccessibleInMemoryDelivRepo {
  public items: any[] = [];
  async save(delivrance: any): Promise<void> {
    this.items.push(delivrance);
  }
}

describe('Integration between BC3 (Adaptive) and BC5 (Certification)', () => {
  let moduleRef: TestingModule;
  let eventEmitter: EventEmitter2;
  let certRepo: AccessibleInMemoryCertRepo;
  let delivRepo: AccessibleInMemoryDelivRepo;

  beforeAll(async () => {
    certRepo = new AccessibleInMemoryCertRepo();
    delivRepo = new AccessibleInMemoryDelivRepo();

    moduleRef = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        CertificationModule,
      ],
    })
      .overrideProvider('ICertificationRepository')
      .useValue(certRepo)
      .overrideProvider('IDelivranceRepository')
      .useValue(delivRepo)
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init(); // Important pour enregistrer les @OnEvent listeners

    eventEmitter = moduleRef.get<EventEmitter2>(EventEmitter2);
  });

  it('devrait délivrer une certification quand BC3 émet un évènement de fin de parcours', async () => {
    // 1. Mise en place : on crée une certification valide dans BC5
    const certificationId = 'CERTIF-NESTJS';
    const regle = new RegleObtention(
    70,
    new Set(['comp-1' as CompetencyId]),
    new Set(['comp-1' as CompetencyId]),
    );
    const certif = new Certification(
      certificationId,          // id
      'tenant-1',               // tenantId
      'Formation NestJS Pro',   // titre
      regle                     // regles
    );
    certRepo.items.push(certif);

    // 2. Action (Moteur BC3) : BC3 ne connait pas BC5. Il émet simplement son propre événement
    // après qu'un étudiant ait fini ses activités.
    const learnerId = 'alice-123';
    const pathCompletedEvent = new LearningPathCompletedEvent(
      'path-999',
      learnerId,
      certificationId,
      0.85,
      [{ competencyId: 'comp-1', score: 0.85 }],
    );

    await eventEmitter.emitAsync(
      BC_INPROCESS_EVENT.LEARNING_PATH_COMPLETED_CLASSNAME,
      pathCompletedEvent,
    );

    // 3. Assertion (Résultat dans BC5) : BC5 a-t-il bien transformé l'event et délivré le diplôme ?
    const resultats = delivRepo.items;
    
    expect(resultats).toHaveLength(1);
    expect(resultats[0].learnerId).toBe(learnerId);
    expect(resultats[0].certificationId).toBe(certificationId);
  });
});
