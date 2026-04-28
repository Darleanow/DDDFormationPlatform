import { VerifierEligibiliteEtDelivrerHandler } from './verifier-eligibilite-et-delivrer.handler';
import { VerifierEligibiliteEtDelivrerCommand } from './verifier-eligibilite-et-delivrer.command';
import { EligibilityCheckService } from '../../domain/services/eligibility-check.service';
import { CertificateIssuanceService } from '../../domain/services/certificate-issuance.service';
import { RuleEngineService } from '../../domain/services/rule-engine.service';
import { ICertificationRepository } from '../../domain/repositories/certification.repository.interface';
import { IDelivranceRepository } from '../../domain/repositories/delivrance.repository.interface';
import { Certification } from '../../domain/entities/certification.entity';
import { RegleObtention } from '../../domain/entities/regle-obtention.entity';
import { ValidationCompetence } from '../../domain/value-objects/validation-competence.value-object';
import { CompetenceId } from '../../../../shared/competence-id';
import { ScoreGlobalInsuffisantException } from '../../domain/exceptions/score-global-insuffisant.exception';

describe('VerifierEligibiliteEtDelivrerHandler', () => {
  let handler: VerifierEligibiliteEtDelivrerHandler;
  let mockCertifRepo: jest.Mocked<ICertificationRepository>;
  let mockDelivranceRepo: jest.Mocked<IDelivranceRepository>;

  beforeEach(() => {
    // Mocks des interfaces (Ports)
    mockCertifRepo = {
      findById: jest.fn(),
    };
    mockDelivranceRepo = {
      save: jest.fn(),
    };

    // Services du domaine réels pour un test d'intégration des règles
    const ruleEngine = new RuleEngineService();
    const eligibilityCheck = new EligibilityCheckService(ruleEngine);
    const issuanceService = new CertificateIssuanceService();

    handler = new VerifierEligibiliteEtDelivrerHandler(
      mockCertifRepo,
      mockDelivranceRepo,
      eligibilityCheck,
      issuanceService,
    );
  });

  it("devrait délivrer le certificat et le sauvegarder si l'apprenant est éligible", async () => {
    // GIVEN
    const regles = new RegleObtention(70, new Set([]), new Set([]));
    const certification = new Certification(
      'cert-123',
      'tenant-1',
      'Certif Test',
      regles,
    );

    mockCertifRepo.findById.mockResolvedValue(certification);

    const command = new VerifierEligibiliteEtDelivrerCommand(
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
  });

  it('ne devrait rien sauvegarder et lever une exception si le score est insuffisant', async () => {
    // GIVEN
    const regles = new RegleObtention(70, new Set([]), new Set([]));
    const certification = new Certification(
      'cert-456',
      'tenant-1',
      'Certif Test 2',
      regles,
    );

    mockCertifRepo.findById.mockResolvedValue(certification);

    const command = new VerifierEligibiliteEtDelivrerCommand(
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
  });

  it('devrait lever une erreur systémique si la certification est introuvable', async () => {
    // GIVEN
    mockCertifRepo.findById.mockResolvedValue(null); // Certification inexistante

    const command = new VerifierEligibiliteEtDelivrerCommand(
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
  });
});
