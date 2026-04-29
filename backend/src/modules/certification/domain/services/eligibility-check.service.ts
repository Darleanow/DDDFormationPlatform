import { RuleEngineService } from './rule-engine.service';
import { Certification } from '../entities/certification.entity';
import { ValidationCompetence } from '../value-objects/validation-competence.value-object';
import { Injectable } from '@nestjs/common';

/**
 * Domain Service : Orchestre la vérification d'éligibilité pour une Certification donnée.
 */
@Injectable()
export class EligibilityCheckService {
  constructor(private readonly ruleEngineService: RuleEngineService) {}

  /**
   * Vérifie si l'apprenant remplit toutes les conditions requises pour une certification.
   * Lève une exception métier si ce n'est pas le cas.
   */
  isEligible(
    certification: Certification,
    scoreApprenant: number,
    validationsApprenant: ValidationCompetence[],
  ): boolean {
    return this.ruleEngineService.evaluate(
      certification.regles,
      scoreApprenant,
      validationsApprenant,
    );
  }
}
