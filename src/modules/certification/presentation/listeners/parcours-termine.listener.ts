import { Injectable } from '@nestjs/common';
import { VerifierEligibiliteEtDelivrerHandler } from '../../application/commands/verifier-eligibilite-et-delivrer.handler';
import { VerifierEligibiliteEtDelivrerCommand } from '../../application/commands/verifier-eligibilite-et-delivrer.command';
import { ValidationCompetence } from '../../domain/value-objects/validation-competence.value-object';

export interface ParcoursTerminePayload {
  learnerId: string;
  certificationId: string;
  scoreGlobal: number;
  validations?: ValidationCompetence[];
}

@Injectable()
export class ParcoursTermineListener {
  constructor(private readonly handler: VerifierEligibiliteEtDelivrerHandler) {}

  async handleEvent(payload: ParcoursTerminePayload): Promise<void> {
    // Anti-Corruption Layer : Traduction du format du monde extérieur vers le format Command interne (BC5)
    const command = new VerifierEligibiliteEtDelivrerCommand(
      payload.learnerId,
      payload.certificationId,
      payload.scoreGlobal,
      payload.validations ?? [],
    );
    
    await this.handler.execute(command);
  }
}
