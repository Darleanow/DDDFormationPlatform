import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdaptiveEngineGateway } from '../../application/ports/adaptive-engine.gateway';
import { BC_INPROCESS_EVENT } from '../../../../shared/bc-integration/in-process-events';

@Injectable()
export class EventEmitterAdaptiveEngineGateway implements AdaptiveEngineGateway {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async submitScore(input: {
    learnerId: string;
    competencyId: string;
    estimatedLevel: number;
    tenantId?: string;
  }): Promise<void> {
    // emitAsync: downstream BC3 listeners often async; must complete before BC4 considers work done (Context Map ACL chain).
    await this.eventEmitter.emitAsync(BC_INPROCESS_EVENT.ASSESSMENT_RESULT, input);
  }
}
