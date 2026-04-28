import { Injectable } from '@nestjs/common';
import { EstimatedLevel } from '../../domain/value-objects/estimated-level.vo';

/**
 * BC4 Assessment contract — owned by the ACL to isolate BC3 from BC4 evolutions.
 * This is the raw payload published by BC4 (Assessment Engine).
 */
export class AssessmentResultPayload {
  constructor(
    public readonly learnerId: string,
    public readonly competenceId: string,
    public readonly estimatedLevel: number,
  ) {}
}

@Injectable()
export class AssessmentAcl {
  /**
   * Translates BC4 payload into an EstimatedLevel for BC3.
   * This is the Anti-Corruption Layer: BC3 never sees BC4's internal model.
   * Since BC4 now correctly computes the probabilistic mastery level, we just map it.
   */
  translateResult(payload: AssessmentResultPayload): EstimatedLevel {
    const clamped = Math.min(1, Math.max(0, payload.estimatedLevel));
    return EstimatedLevel.from(payload.competenceId, clamped);
  }
}
