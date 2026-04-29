import { AdaptiveEngineGateway } from '../../application/ports/adaptive-engine.gateway';

export class NoopAdaptiveEngineGateway implements AdaptiveEngineGateway {
  async submitScore(): Promise<void> {
    return;
  }
}
