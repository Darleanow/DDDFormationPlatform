import { Tenant } from '../aggregates/tenant.aggregate';

export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findByName(name: string): Promise<Tenant | null>;
  save(tenant: Tenant): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export const TENANT_REPOSITORY = Symbol('ITenantRepository');
