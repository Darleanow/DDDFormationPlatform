import { RegleObtention } from '../entities/regle-obtention.entity';
import { ValidationCompetence } from '../value-objects/validation-competence.value-object';
import { ScoreGlobalInsuffisantException } from '../exceptions/score-global-insuffisant.exception';
import { CompetenceCritiqueEnEchecException } from '../exceptions/competence-critique-en-echec.exception';
import { CompetenceObligatoireManquanteException } from '../exceptions/competence-obligatoire-manquante.exception';
import { Injectable } from '@nestjs/common';
/**
 * Domain Service : Moteur d'évaluation des règles de certification.
 * Évalue si les résultats d'un apprenant respectent le référentiel de certification.
 */
@Injectable()
export class RuleEngineService {
  /**
   * Évalue les règles d'obtention par rapport aux résultats de l'apprenant.
   *
   * @param regles Les règles configurées pour le Tenant.
   * @param scoreApprenant Le score calculé rapporté par le BC4 (Assessment).
   * @param validationsApprenant La liste des compétences validées ou échouées.
   * @returns true si éligible, sinon lève une exception de domaine.
   */
  evaluer(
    regles: RegleObtention,
    scoreApprenant: number,
    validationsApprenant: ValidationCompetence[],
  ): boolean {
    // 1. Vérification du Score Global
    if (scoreApprenant < regles.scoreSeuil) {
      throw new ScoreGlobalInsuffisantException(
        `Score insuffisant : attendu ${regles.scoreSeuil}, obtenu ${scoreApprenant}.`,
      );
    }

    // 2. Vérification des Compétences Critiques (échecs éliminatoires)
    const competencesEnEchec = validationsApprenant.filter(
      (v) => !v.estValidee,
    );
    for (const echec of competencesEnEchec) {
      if (regles.estUneCompetenceCritique(echec.competenceId)) {
        throw new CompetenceCritiqueEnEchecException(
          `La compétence critique "${echec.competenceId}" est en échec, certification impossible.`,
        );
      }
    }

    // 3. Vérification des Compétences Obligatoires
    const competencesValideesIds = new Set(
      validationsApprenant
        .filter((v) => v.estValidee)
        .map((v) => v.competenceId),
    );

    for (const obligatoireId of regles.competencesObligatoires) {
      if (!competencesValideesIds.has(obligatoireId)) {
        throw new CompetenceObligatoireManquanteException(
          `La compétence obligatoire "${obligatoireId}" n'a pas été validée ou évaluée.`,
        );
      }
    }

    // Si on arrive ici, toutes les règles sont satisfaites.
    return true;
  }
}
