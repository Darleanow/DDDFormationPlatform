import { IssuanceRule } from './issuance-rule.entity';

/**
 * Aggregate Root : L'entité centrale de ce Bounded Context.
 * Elle représente une certification pouvant être délivrée à un apprenant
 * sous réserve qu'il respecte les Règles d'Obtention locales (Tenant).
 */
export class Certification {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly titre: string,
    public readonly regles: IssuanceRule,
  ) {}

  public renameTitle(nextTitle: string): Certification {
    if (!nextTitle || nextTitle.trim() === '') {
      throw new Error('Le titre de la certification ne peut pas être vide.');
    }
    return new Certification(this.id, this.tenantId, nextTitle, this.regles);
  }
}
