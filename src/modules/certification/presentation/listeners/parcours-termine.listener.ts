import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VerifierEligibiliteEtDelivrerHandler } from '../../application/commands/verifier-eligibilite-et-delivrer.handler';
import { VerifierEligibiliteEtDelivrerCommand } from '../../application/commands/verifier-eligibilite-et-delivrer.command';
import { ValidationCompetence } from '../../domain/value-objects/validation-competence.value-object';
import { CompetenceId } from '../../../../shared-kernel/competence-id';

// This interfaces represents the external contract (BC3)
// Our module doesn't know where it comes from, just its shape.
export interface LearningPathCompletedIntegrationEvent {
  learningPathId: string;
  learnerId: string;
  targetCertificationId: string;
  globalScore: number;
  competences: Array<{
    competenceId: string;
    score: number;
    isCriticalFailure: boolean;
  }>;
}

@Injectable()
export class ParcoursTermineListener {
  constructor(private readonly handler: VerifierEligibiliteEtDelivrerHandler) {}

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @OnEvent('learningPath.completed', { async: true })
  async handleEvent(
    payload: LearningPathCompletedIntegrationEvent,
  ): Promise<void> {
    // 🛡️ Anti-Corruption Layer : Translation from external format (BC3) to internal Command (BC5)
    // We map BC3's `isCriticalFailure` to our DDD boundary which operates with `estValidee = false`
    const validedCompetences = payload.competences.map(
      (comp) =>
        new ValidationCompetence(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          comp.competenceId as CompetenceId, // Cast domain type from ID
          !comp.isCriticalFailure,
        ),
    );

    const command = new VerifierEligibiliteEtDelivrerCommand(
      payload.learnerId,
      payload.targetCertificationId, // BC3 mapped to BC5's terminology
      payload.globalScore,
      validedCompetences,
    );

    // Call the application layer
    await this.handler.execute(command);
  }
}
