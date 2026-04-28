import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { AdaptiveEngineGateway } from '../../application/ports/adaptive-engine.gateway';

@Injectable()
export class EventEmitterAdaptiveEngineGateway implements AdaptiveEngineGateway {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async submitScore(input: {
    learnerId: string;
    competenceId: string;
    estimatedLevel: number;
    tenantId?: string;
  }): Promise<void> {
    this.eventEmitter.emit('assessment.result', input);
  }
}
