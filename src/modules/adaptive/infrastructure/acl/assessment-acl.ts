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
    public readonly remediationContentId?: string,
    public readonly remediationHours?: number,
    public readonly tenantId?: string,
  ) {}
}

@Injectable()
export class AssessmentAcl {
  /**
   * Translates BC4 payload into an EstimatedLevel for BC3.
   * This is the Anti-Corruption Layer: BC3 never sees BC4's internal model.
   */
  translateResult(payload: AssessmentResultPayload): EstimatedLevel {
    // TODO: revisit alignment between BC4 estimated level and BC3 scoring rules.
    const clamped = Math.min(1, Math.max(0, payload.estimatedLevel));
    return EstimatedLevel.from(payload.competenceId, clamped);
  }
}
