import { CompetencyId } from '../../../../shared/competency-id';

/**
 * Value Object (ou Entité) décrivant les critères stricts pour l'obtention d'une certification.
 * Peut varier selon le locataire (tenant).
 */
export class IssuanceRule {
  constructor(
    // Le score global minimum requis (ex: 70 pour 70%)
    public readonly scoreSeuil: number,

    // Les compétences qui DOIVENT TOUTES être validées (si non-validées, pas de certification)
    public readonly competencesObligatoires: Set<CompetencyId>,

    // Les compétences dont un ÉCHEC est bloquant/éliminatoire
    public readonly competencesCritiques: Set<CompetencyId>,

    // Nombre maximum de attempts autorisées
    public readonly nbMaxTentatives: number = 3,
  ) {}

  /** Whether failing this competency blocks certification issuance. */
  isCriticalCompetency(competencyId: CompetencyId): boolean {
    return this.competencesCritiques.has(competencyId);
  }

  /** Whether this competency must be validated for certification. */
  isMandatoryCompetency(competencyId: CompetencyId): boolean {
    return this.competencesObligatoires.has(competencyId);
  }
}
