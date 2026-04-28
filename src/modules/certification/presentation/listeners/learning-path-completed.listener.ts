import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VerifyEligibilityAndIssueHandler } from '../../application/commands/verify-eligibility-and-issue.handler';
import { VerifyEligibilityAndIssueCommand } from '../../application/commands/verify-eligibility-and-issue.command';
import type { ICertificationRepository } from '../../domain/repositories/certification.repository.interface';
import {
  mapPathCompletionResultsToValidationCompetences,
  normalizeGlobalScoreForCertificationRules,
} from '../../application/mappers/path-completion-to-validation.mapper';
import { BC_INPROCESS_EVENT } from '../../../../shared/bc-integration/in-process-events';

/**
 * External contract from BC3 — shape only, no BC5 dependency in BC3.
 */
export interface LearningPathCompletedIntegrationEvent {
  learningPathId: string;
  learnerId: string;
  targetCertificationId: string;
  globalScore: number;
  competencyResults: Array<{
    competencyId: string;
    score: number;
  }>;
}

@Injectable()
export class LearningPathCompletedListener {
  constructor(
    private readonly handler: VerifyEligibilityAndIssueHandler,
    @Inject('ICertificationRepository')
    private readonly certificationRepo: ICertificationRepository,
  ) {}

  @OnEvent(BC_INPROCESS_EVENT.LEARNING_PATH_COMPLETED_CLASSNAME)
  async handleEvent(payload: LearningPathCompletedIntegrationEvent): Promise<void> {
    const certification = await this.certificationRepo.findById(
      payload.targetCertificationId,
    );
    if (!certification) {
      return;
    }

    const validations = mapPathCompletionResultsToValidationCompetences(
      certification.regles,
      payload.competencyResults,
    );
    const normalizedGlobal = normalizeGlobalScoreForCertificationRules(
      payload.globalScore,
      certification.regles.scoreSeuil,
    );

    const command = new VerifyEligibilityAndIssueCommand(
      payload.learnerId,
      payload.targetCertificationId,
      normalizedGlobal,
      validations,
    );

    await this.handler.execute(command);
  }
}
