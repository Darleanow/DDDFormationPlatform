import { RuleEngineService } from './rule-engine.service';

export class EligibilityCheckService {
  constructor(private readonly ruleEngineService: RuleEngineService) {}

  // TODO: Implement orchestration to check if a learner is eligible for a specific certification
}
