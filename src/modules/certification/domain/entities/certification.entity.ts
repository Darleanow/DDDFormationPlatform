import { RegleObtention } from './regle-obtention.entity';

/**
 * Aggregate Root : L'entité centrale de ce Bounded Context.
 * Elle représente une certification pouvant être délivrée à un apprenant
 * sous réserve qu'il respecte les Règles d'Obtention locales (Tenant).
 */
export class Certification {
  constructor(
    public readonly id: string,
    public readonly tenantId: string, // Isolation Multi-Tenant
    public readonly titre: string,
    public readonly regles: RegleObtention, // Les conditions spécifiques associées
  ) {}

  /**
   * En DDD, les Aggregate Roots contiennent souvent la logique pour modifier
   * leur propre état interne, garantissant ainsi l'intégrité des invariants.
   */
  public changerTitre(nouveauTitre: string): Certification {
    if (!nouveauTitre || nouveauTitre.trim() === '') {
      throw new Error('Le titre de la certification ne peut pas être vide.');
    }
    return new Certification(this.id, this.tenantId, nouveauTitre, this.regles);
  }
}
