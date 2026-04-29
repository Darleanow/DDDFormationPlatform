import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AssessmentResultPayload as AssessmentPayload } from '../../infrastructure/acl/assessment-acl';
import { AssessmentResultHandler } from '../../application/handlers/assessment-result.handler';
import {
  BC_INPROCESS_EVENT,
  type AssessmentScorePublishedForAdaptivePayload,
} from '../../../../shared/bc-integration/in-process-events';

/**
 * Adapter that listens to BC4 assessment result events and forwards
 * a translated payload to the Adaptive AssessmentResultHandler (ACL boundary).
 */
@Injectable()
export class AssessmentToAdaptiveAdapter {
  constructor(private readonly handler: AssessmentResultHandler) {}

  @OnEvent(BC_INPROCESS_EVENT.ASSESSMENT_RESULT)
  async handleAssessmentEvent(
    payload: AssessmentScorePublishedForAdaptivePayload,
  ): Promise<void> {
    const adapted = new AssessmentPayload(
      payload.learnerId,
      payload.competencyId,
      payload.estimatedLevel,
    );

    await this.handler.handle(adapted);
  }
}
