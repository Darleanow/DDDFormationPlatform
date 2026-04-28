import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
import { OnEvent } from '@nestjs/event-emitter';
import { VerifierEligibiliteEtDelivrerHandler } from '../../application/commands/verifier-eligibilite-et-delivrer.handler';
import { VerifierEligibiliteEtDelivrerCommand } from '../../application/commands/verifier-eligibilite-et-delivrer.command';
import { ValidationCompetence } from '../../domain/value-objects/validation-competence.value-object';
import { CompetencyId } from '../../../../shared/competency-id';
import type { ITentativeCertificationRepository } from '../../domain/repositories/tentative-certification.repository.interface';
import { TentativeCertification } from '../../domain/entities/tentative-certification.entity';
import { Inject } from '@nestjs/common';
import type { ICertificationRepository } from '../../domain/repositories/certification.repository.interface';

export interface CertificativeAssessmentScoredIntegrationEvent {
  attemptId: string;
  assessmentId: string;
  learnerId: string;
  targetCertificationId: string;
  globalScore: number;
  competences: Array<{
    competencyId: string;
    score: number;
  }>;
  isSuspect: boolean;
}

@Injectable()
export class CertificativeAssessmentScoredListener {
  constructor(
    private readonly handler: VerifierEligibiliteEtDelivrerHandler,
    @Inject('ITentativeCertificationRepository')
    private readonly tentativeRepo: ITentativeCertificationRepository,
    @Inject('ICertificationRepository')
    private readonly certRepo: ICertificationRepository,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @OnEvent('CertificativeAssessmentScoredEvent', { async: true })
  async handleEvent(
    payload: CertificativeAssessmentScoredIntegrationEvent,
  ): Promise<void> {
    console.log(
      "💡 [Listener BC5] Certificative Assessment received!",
      payload.targetCertificationId,
    );

    if (payload.isSuspect) {
      console.warn("⚠️ Tentative is suspect (BC4 Anomaly). Refused certification.");
      return;
    }

    const certification = await this.certRepo.findById(payload.targetCertificationId);
    if (!certification) {
      return;
    }

    const existingTentative = await this.tentativeRepo.findByLearnerAndCertification(
      payload.learnerId,
      payload.targetCertificationId,
    );

    let tentative = existingTentative || new TentativeCertification(
      payload.learnerId,
      payload.targetCertificationId,
      0,
    );

    // Track attempt limit
    if (tentative.nbTentativesEffectuees >= certification.regles.nbMaxTentatives) {
      console.warn("⚠️ Learner attempts exceeded max attempts for this certification.");
      return;
    }

    // Increment and save attempt
    tentative = tentative.incrementer();
    await this.tentativeRepo.save(tentative);

    // Prepare domain boundaries
    const validedCompetences = payload.competences.map((comp) => {
      // In BC5 context, `estValidee` might just be a function of whether it caused a critical failure.
      // We will assume in this case, "passing" a competence means getting score >= 0.5 (or we let RuleEngine evaluate it).
      // Here we map raw scores to `ValidationCompetence=true` if score >= 0.5 (basic assumption).
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return new ValidationCompetence(
        comp.competencyId as CompetencyId,
        comp.score >= 0.5,
      );
    });

    const command = new VerifierEligibiliteEtDelivrerCommand(
      payload.learnerId,
      payload.targetCertificationId,
      payload.globalScore,
      validedCompetences,
    );

    // Call Application Layer
    await this.handler.execute(command);
  }
}
