import { CompetenceId } from '../../../../shared/competence-id';

/**
 * Value Object (ou Entité) décrivant les critères stricts pour l'obtention d'une certification.
 * Peut varier selon le locataire (tenant).
 */
export class RegleObtention {
  constructor(
    // Le score global minimum requis (ex: 70 pour 70%)
    public readonly scoreSeuil: number,

    // Les compétences qui DOIVENT TOUTES être validées (si non-validées, pas de certification)
    public readonly competencesObligatoires: Set<CompetenceId>,

    // Les compétences dont un ÉCHEC est bloquant/éliminatoire
    public readonly competencesCritiques: Set<CompetenceId>,

    // Nombre maximum de tentatives autorisées
    public readonly nbMaxTentatives: number = 3,
  ) {}

  /**
   * Méthode utilitaire pour vérifier si une compétence est considérée comme critique.
   */
  estUneCompetenceCritique(competenceId: CompetenceId): boolean {
    return this.competencesCritiques.has(competenceId);
  }

  /**
   * Méthode utilitaire pour vérifier si une compétence est obligatoire.
   */
  estUneCompetenceObligatoire(competenceId: CompetenceId): boolean {
    return this.competencesObligatoires.has(competenceId);
  }
}
