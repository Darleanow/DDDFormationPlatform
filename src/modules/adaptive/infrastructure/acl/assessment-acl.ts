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
    public readonly rawScore: number,
    public readonly difficulty: number,
    public readonly remediationContentId: string,
    public readonly remediationHours: number,
  ) {}
}

@Injectable()
export class AssessmentAcl {
  /**
   * Translates BC4 payload into an EstimatedLevel for BC3.
   * This is the Anti-Corruption Layer: BC3 never sees BC4's internal model.
   * Score adjustment: difficulty-weighted (0.6 on a hard item > 0.6 on an easy one).
   */
  translateResult(payload: AssessmentResultPayload): EstimatedLevel {
    const adjustedScore = payload.rawScore * (0.5 + payload.difficulty * 0.5);
    const clamped = Math.min(1, Math.max(0, adjustedScore));
    return EstimatedLevel.from(payload.competenceId, clamped);
  }
}
