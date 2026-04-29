import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Tenant } from '../../domain/aggregates/tenant.aggregate';
import type { ITenantRepository } from '../../domain/repositories/tenant.repository.interface';
import { TENANT_REPOSITORY } from '../../domain/repositories/tenant.repository.interface';

/**
 * OHS — Open Host Service
 * Point d'entrée unique pour la résolution de tenant.
 * Tous les autres BCs injectent ce service (jamais le repo directement).
 */
@Injectable()
export class TenantResolverService {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
  ) {}

  async resolve(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new NotFoundException(`Tenant '${tenantId}' not found`);
    if (!tenant.isActive)
      throw new NotFoundException(`Tenant '${tenantId}' is inactive`);
    return tenant;
  }

  async assertExists(tenantId: string): Promise<void> {
    const exists = await this.tenantRepo.exists(tenantId);
    if (!exists) throw new NotFoundException(`Tenant '${tenantId}' not found`);
  }
}
