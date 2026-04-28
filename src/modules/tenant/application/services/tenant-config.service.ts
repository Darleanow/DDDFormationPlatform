import { Injectable } from '@nestjs/common';
import { TenantResolverService } from './tenant-resolver.service';

/**
 * BC6 — Tenant configuration facade (spec: TenantConfigService).
 * Delegates to {@link TenantResolverService} for existence and resolution.
 */
@Injectable()
export class TenantConfigService {
  constructor(private readonly resolver: TenantResolverService) {}

  assertExists(tenantId: string): Promise<void> {
    return this.resolver.assertExists(tenantId);
  }
}
