import { RuleEngineService } from './rule-engine.service';
import { IssuanceRule } from '../entities/issuance-rule.entity';
import { ValidationCompetence } from '../value-objects/validation-competence.value-object';
import { CompetencyId } from '../../../../shared/competency-id';
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
      const regles = new IssuanceRule(
        70, // scoreSeuil
        new Set(['COMP_OBLIG_1'] as CompetencyId[]), // competencesObligatoires
        new Set(['COMP_CRITIQUE_1'] as CompetencyId[]), // competencesCritiques
      );

      const scoreApprenant = 78;

      const validationsApprenant = [
        new ValidationCompetence('COMP_OBLIG_1' as CompetencyId, true),
        new ValidationCompetence('COMP_CRITIQUE_1' as CompetencyId, true),
      ];

      // WHEN
      const isEligible = ruleEngine.evaluate(
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
      const regles = new IssuanceRule(
        70, // scoreSeuil
        new Set([] as CompetencyId[]),
        new Set(['secu_donnees'] as CompetencyId[]), // "Sécurité des données" est critique
      );

      const scoreApprenant = 85;

      const validationsApprenant = [
        // L'apprenant a échoué sur cette compétence
        new ValidationCompetence('secu_donnees' as CompetencyId, false),
      ];

      // WHEN / THEN
      expect(() => {
        ruleEngine.evaluate(regles, scoreApprenant, validationsApprenant);
      }).toThrow(CompetenceCritiqueEnEchecException);
    });
  });

  describe('Scenario (Implicit): Score global insuffisant', () => {
    it('devrait lever une ScoreGlobalInsuffisantException si le score est sous le seuil', () => {
      // GIVEN
      const regles = new IssuanceRule(
        70,
        new Set([] as CompetencyId[]),
        new Set([] as CompetencyId[]),
      );

      const scoreApprenant = 65; // Inférieur à 70
      const validationsApprenant: ValidationCompetence[] = [];

      // WHEN / THEN
      expect(() => {
        ruleEngine.evaluate(regles, scoreApprenant, validationsApprenant);
      }).toThrow(ScoreGlobalInsuffisantException);
    });
  });

  describe('Scenario (Implicit): Compétence obligatoire manquante ou échouée', () => {
    it('devrait lever une exception globale (ou renvoyer false) si une compétence obligatoire fait défaut', () => {
      // GIVEN
      const regles = new IssuanceRule(
        70,
        new Set(['COMP_OBLIG_1'] as CompetencyId[]),
        new Set([] as CompetencyId[]),
      );

      const scoreApprenant = 80;
      const validationsApprenant = [
        // L'apprenant a échoué sa compétence obligatoire
        new ValidationCompetence('COMP_OBLIG_1' as CompetencyId, false),
      ];

      // WHEN / THEN
      expect(() => {
        ruleEngine.evaluate(regles, scoreApprenant, validationsApprenant);
      }).toThrow(CompetenceObligatoireManquanteException);
    });
  });
});
