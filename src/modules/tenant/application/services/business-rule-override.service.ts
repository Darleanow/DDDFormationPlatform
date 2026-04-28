import { Inject, Injectable } from '@nestjs/common';
import type { ITenantRepository } from '../../domain/repositories/tenant.repository.interface';
import { TENANT_REPOSITORY } from '../../domain/repositories/tenant.repository.interface';
import { TenantResolverService } from './tenant-resolver.service';

@Injectable()
export class BusinessRuleOverrideService {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    private readonly resolver: TenantResolverService,
  ) {}

  async getRule<T = unknown>(
    tenantId: string,
    key: string,
  ): Promise<T | undefined> {
    const tenant = await this.resolver.resolve(tenantId);
    return tenant.rules[key] as T | undefined;
  }

  async overrideRule(
    tenantId: string,
    key: string,
    value: unknown,
  ): Promise<void> {
    const tenant = await this.resolver.resolve(tenantId);
    tenant.overrideRule(key, value);
    await this.tenantRepo.save(tenant);
  }

  async resolveTerminology(tenantId: string, term: string): Promise<string> {
    const tenant = await this.resolver.resolve(tenantId);
    return tenant.resolveTerminology(term);
  }
}