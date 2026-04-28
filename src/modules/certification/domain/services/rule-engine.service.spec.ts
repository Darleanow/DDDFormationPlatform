import { RuleEngineService } from './rule-engine.service';
import { RegleObtention } from '../entities/regle-obtention.entity';
import { ValidationCompetence } from '../value-objects/validation-competence.value-object';
import { CompetenceId } from '../../../../shared-kernel/competence-id';
import { CompetenceCritiqueEnEchecException } from '../exceptions/competence-critique-en-echec.exception';
import { ScoreGlobalInsuffisantException } from '../exceptions/score-global-insuffisant.exception';
import { CompetenceObligatoireManquanteException } from '../exceptions/competence-obligatoire-manquante.exception';

describe('RuleEngineService (BC5 - Certification)', () => {
  let ruleEngine: RuleEngineService;

  beforeEach(() => {
    // Initialisation du service avant chaque test
    ruleEngine = new RuleEngineService();
  });

  describe('Scenario: Certification obtenue avec toutes les règles satisfaites', () => {
    it('devrait retourner true si le score, les compétences obligatoires et critiques sont valides', () => {
      // GIVEN
      const regles = new RegleObtention(
        70, // scoreSeuil
        new Set(['COMP_OBLIG_1'] as CompetenceId[]), // competencesObligatoires
        new Set(['COMP_CRITIQUE_1'] as CompetenceId[]), // competencesCritiques
      );

      const scoreApprenant = 78;

      const validationsApprenant = [
        new ValidationCompetence('COMP_OBLIG_1' as CompetenceId, true),
        new ValidationCompetence('COMP_CRITIQUE_1' as CompetenceId, true),
      ];

      // WHEN
      const isEligible = ruleEngine.evaluer(
        regles,
        scoreApprenant,
        validationsApprenant,
      );

      // THEN
      expect(isEligible).toBe(true);
    });
  });

  describe('Scenario: Blocage par compétence critique non validée', () => {
    it('devrait lever une CompetenceCritiqueEnEchecException même si le score est excellent', () => {
      // GIVEN
      const regles = new RegleObtention(
        70, // scoreSeuil
        new Set([] as CompetenceId[]),
        new Set(['secu_donnees'] as CompetenceId[]), // "Sécurité des données" est critique
      );

      const scoreApprenant = 85;

      const validationsApprenant = [
        // L'apprenant a échoué sur cette compétence
        new ValidationCompetence('secu_donnees' as CompetenceId, false),
      ];

      // WHEN / THEN
      expect(() => {
        ruleEngine.evaluer(regles, scoreApprenant, validationsApprenant);
      }).toThrow(CompetenceCritiqueEnEchecException);
    });
  });

  describe('Scenario (Implicit): Score global insuffisant', () => {
    it('devrait lever une ScoreGlobalInsuffisantException si le score est sous le seuil', () => {
      // GIVEN
      const regles = new RegleObtention(
        70,
        new Set([] as CompetenceId[]),
        new Set([] as CompetenceId[]),
      );

      const scoreApprenant = 65; // Inférieur à 70
      const validationsApprenant: ValidationCompetence[] = [];

      // WHEN / THEN
      expect(() => {
        ruleEngine.evaluer(regles, scoreApprenant, validationsApprenant);
      }).toThrow(ScoreGlobalInsuffisantException);
    });
  });

  describe('Scenario (Implicit): Compétence obligatoire manquante ou échouée', () => {
    it('devrait lever une exception globale (ou renvoyer false) si une compétence obligatoire fait défaut', () => {
      // GIVEN
      const regles = new RegleObtention(
        70,
        new Set(['COMP_OBLIG_1'] as CompetenceId[]),
        new Set([] as CompetenceId[]),
      );

      const scoreApprenant = 80;
      const validationsApprenant = [
        // L'apprenant a échoué sa compétence obligatoire
        new ValidationCompetence('COMP_OBLIG_1' as CompetenceId, false),
      ];

      // WHEN / THEN
      expect(() => {
        ruleEngine.evaluer(regles, scoreApprenant, validationsApprenant);
      }).toThrow(CompetenceObligatoireManquanteException);
    });
  });
});
