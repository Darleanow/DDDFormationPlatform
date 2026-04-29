import { VerifyEligibilityAndIssueHandler } from './verify-eligibility-and-issue.handler';
import { VerifyEligibilityAndIssueCommand } from './verify-eligibility-and-issue.command';
import { EligibilityCheckService } from '../../domain/services/eligibility-check.service';
import { CertificateIssuanceService } from '../../domain/services/certificate-issuance.service';
import { RuleEngineService } from '../../domain/services/rule-engine.service';
import { ICertificationRepository } from '../../domain/repositories/certification.repository.interface';
import { IIssuanceRepository } from '../../domain/repositories/issuance.repository.interface';
import { Certification } from '../../domain/entities/certification.entity';
import { IssuanceRule } from '../../domain/entities/issuance-rule.entity';
import { ValidationCompetence } from '../../domain/value-objects/validation-competence.value-object';
import { CompetencyId } from '../../../../shared/competency-id';
import { ScoreGlobalInsuffisantException } from '../../domain/exceptions/score-global-insuffisant.exception';
import { CertificationIssuedEvent } from '../../domain/events/certification-issued.event';

describe('VerifyEligibilityAndIssueHandler', () => {
  let handler: VerifyEligibilityAndIssueHandler;
  let mockCertifRepo: jest.Mocked<ICertificationRepository>;
  let mockDelivranceRepo: jest.Mocked<IIssuanceRepository>;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    // Mocks des interfaces (Ports)
    mockCertifRepo = {
      findById: jest.fn(),
    };
    mockDelivranceRepo = {
      save: jest.fn(),
    };
    eventEmitter = { emit: jest.fn(), emitAsync: jest.fn().mockResolvedValue(undefined) };

    // Services du domaine réels pour un test d'intégration des règles
    const ruleEngine = new RuleEngineService();
    const eligibilityCheck = new EligibilityCheckService(ruleEngine);
    const issuanceService = new CertificateIssuanceService();

    handler = new VerifyEligibilityAndIssueHandler(
      mockCertifRepo,
      mockDelivranceRepo,
      eligibilityCheck,
      issuanceService,
      eventEmitter as any,
    );
  });

  it("devrait délivrer le certificat et le sauvegarder si l'apprenant est éligible", async () => {
    // GIVEN
    const regles = new IssuanceRule(70, new Set([]), new Set([]));
    const certification = new Certification(
      'cert-123',
      'tenant-1',
      'Certif Test',
      regles,
    );

    mockCertifRepo.findById.mockResolvedValue(certification);

    const command = new VerifyEligibilityAndIssueCommand(
      'learner-1',
      'cert-123',
      80, // Score Ok
      [],
    );

    // WHEN
    await handler.execute(command);

    // THEN
    expect(mockCertifRepo.findById).toHaveBeenCalledWith('cert-123');
    // Vérifier que repository de délivrance a bien été appelé (une délivrance a été créée et sauvegardée)
    expect(mockDelivranceRepo.save).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      CertificationIssuedEvent.EVENT_NAME,
      expect.any(CertificationIssuedEvent),
    );
  });

  it('ne devrait rien sauvegarder et lever une exception si le score est insuffisant', async () => {
    // GIVEN
    const regles = new IssuanceRule(70, new Set([]), new Set([]));
    const certification = new Certification(
      'cert-456',
      'tenant-1',
      'Certif Test 2',
      regles,
    );

    mockCertifRepo.findById.mockResolvedValue(certification);

    const command = new VerifyEligibilityAndIssueCommand(
      'learner-1',
      'cert-456',
      50, // Score KO (50 < 70)
      [],
    );

    // WHEN / THEN
    await expect(handler.execute(command)).rejects.toThrow(
      ScoreGlobalInsuffisantException,
    );

    // On s'assure qu'aucune délivrance n'a fuité dans la base de données
    expect(mockDelivranceRepo.save).not.toHaveBeenCalled();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('devrait lever une error systémique si la certification est introuvable', async () => {
    // GIVEN
    mockCertifRepo.findById.mockResolvedValue(null); // Certification inexistante

    const command = new VerifyEligibilityAndIssueCommand(
      'learner-1',
      'unknown-cert',
      90,
      [],
    );

    // WHEN / THEN
    await expect(handler.execute(command)).rejects.toThrow(
      'Certification "unknown-cert" introuvable.',
    );
    expect(mockDelivranceRepo.save).not.toHaveBeenCalled();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });
});
