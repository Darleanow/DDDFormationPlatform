import { Controller, Get, Param, Inject } from '@nestjs/common';
import type { ICertificationRepository } from '../../domain/repositories/certification.repository.interface';
import type { IIssuanceRepository } from '../../domain/repositories/issuance.repository.interface';

/**
 * BC5 — Certification HTTP interface.
 */
@Controller('certifications')
export class CertificationController {
  constructor(
    @Inject('ICertificationRepository')
    private readonly certRepo: ICertificationRepository,
    @Inject('IIssuanceRepository')
    private readonly issuanceRepo: IIssuanceRepository,
  ) {}

  /** GET /certifications — List all certifications (definition / rules catalogue). */
  @Get()
  async getAll() {
    const items = (this.certRepo as any).items ?? [];
    return items.map((c: any) => ({
      id: c.id,
      tenantId: c.tenantId,
      titre: c.titre,
      regles: {
        scoreSeuil: c.regles?.scoreSeuil,
        competencesCritiques: c.regles?.competencesCritiques
          ? Array.from(c.regles.competencesCritiques)
          : [],
        competencesObligatoires: c.regles?.competencesObligatoires
          ? Array.from(c.regles.competencesObligatoires)
          : [],
      },
    }));
  }

  /** GET /certifications/issuances/all — Certificates already issued (Délivrance in FR glossary). */
  @Get('issuances/all')
  async getAllIssuances() {
    const items = (this.issuanceRepo as any).items ?? [];
    return items.map((issuance: any) => ({
      id: issuance.id,
      learnerId: issuance.learnerId,
      certificationId: issuance.certificationId,
      issuedAt: issuance.issuedAt,
    }));
  }

  /** GET /certifications/:id — Get a certification definition by id. */
  @Get(':id')
  async getById(@Param('id') id: string) {
    const cert = await this.certRepo.findById(id);
    if (!cert) return { error: 'Certification non trouvée' };
    return {
      id: cert.id,
      tenantId: cert.tenantId,
      titre: cert.titre,
      regles: {
        scoreSeuil: (cert.regles as any)?.scoreSeuil,
        competencesCritiques: (cert.regles as any)?.competencesCritiques
          ? Array.from((cert.regles as any).competencesCritiques)
          : [],
        competencesObligatoires: (cert.regles as any)?.competencesObligatoires
          ? Array.from((cert.regles as any).competencesObligatoires)
          : [],
      },
    };
  }
}
