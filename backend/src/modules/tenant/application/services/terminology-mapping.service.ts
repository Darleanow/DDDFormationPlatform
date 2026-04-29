import { Injectable } from '@nestjs/common';
import { BusinessRuleOverrideService } from './business-rule-override.service';

/**
 * BC6 — Per-tenant label overrides (spec: TerminologyMappingService).
 */
@Injectable()
export class TerminologyMappingService {
  constructor(private readonly businessRules: BusinessRuleOverrideService) {}

  resolve(tenantId: string, term: string): Promise<string> {
    return this.businessRules.resolveTerminology(tenantId, term);
  }
}
