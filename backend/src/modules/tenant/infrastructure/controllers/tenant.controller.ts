import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TenantResolverService } from '../../application/services/tenant-resolver.service';
import { BusinessRuleOverrideService } from '../../application/services/business-rule-override.service';
import type { ITenantRepository } from '../../domain/repositories/tenant.repository.interface';
import { TENANT_REPOSITORY } from '../../domain/repositories/tenant.repository.interface';
import { Tenant } from '../../domain/aggregates/tenant.aggregate';

/**
 * BC6 — Multi-Tenant Configuration HTTP interface (OHS pattern).
 * Exposes Tenant lifecycle and business-rule override endpoints.
 */
@Controller('tenants')
export class TenantController {
  constructor(
    private readonly resolver: TenantResolverService,
    private readonly ruleOverride: BusinessRuleOverrideService,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
  ) {}

  /** POST /tenants — Create a new Tenant (Organisation Cliente). */
  @Post()
  async createTenant(@Body() body: { name: string; rules?: Record<string, unknown> }) {
    const tenant = Tenant.create(randomUUID(), body.name, body.rules ?? {});
    await this.tenantRepo.save(tenant);
    return {
      id: tenant.id,
      name: tenant.name,
      isActive: tenant.isActive,
      rules: tenant.rules,
    };
  }

  /** GET /tenants/:id — Resolve a tenant by ID. */
  @Get(':id')
  async getTenant(@Param('id') id: string) {
    const tenant = await this.resolver.resolve(id);
    return {
      id: tenant.id,
      name: tenant.name,
      isActive: tenant.isActive,
      rules: tenant.rules,
    };
  }

  /** PATCH /tenants/:id/rules — Override a business rule for a tenant. */
  @Patch(':id/rules')
  async overrideRule(
    @Param('id') tenantId: string,
    @Body() body: { key: string; value: unknown },
  ) {
    await this.ruleOverride.overrideRule(tenantId, body.key, body.value);
    const tenant = await this.resolver.resolve(tenantId);
    return {
      id: tenant.id,
      name: tenant.name,
      rules: tenant.rules,
    };
  }

  /** GET /tenants/:id/terminology/:term — Resolve terminology for a tenant. */
  @Get(':id/terminology/:term')
  async resolveTerminology(
    @Param('id') tenantId: string,
    @Param('term') term: string,
  ) {
    const resolved = await this.ruleOverride.resolveTerminology(tenantId, term);
    return { term, resolved };
  }
}
