import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Tenant,
  type TenantBusinessRules,
} from '../../domain/aggregates/tenant.aggregate';
import type { ITenantRepository } from '../../domain/repositories/tenant.repository.interface';
import { TENANT_REPOSITORY } from '../../domain/repositories/tenant.repository.interface';
import { TenantEntity } from '../entities/tenant.entity';

@Injectable()
export class TypeOrmTenantRepository implements ITenantRepository {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly repo: Repository<TenantEntity>,
  ) {}

  async findById(id: string): Promise<Tenant | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByName(name: string): Promise<Tenant | null> {
    const entity = await this.repo.findOne({ where: { name } });
    return entity ? this.toDomain(entity) : null;
  }

  async save(tenant: Tenant): Promise<void> {
    await this.repo.save(this.toEntity(tenant));
  }

  async exists(id: string): Promise<boolean> {
    return this.repo.existsBy({ id });
  }

  private toDomain(entity: TenantEntity): Tenant {
    return Tenant.reconstitute(
      entity.id,
      entity.name,
      entity.rules as TenantBusinessRules,
      entity.active,
    );
  }

  private toEntity(tenant: Tenant): TenantEntity {
    const entity = new TenantEntity();
    entity.id = tenant.id;
    entity.name = tenant.name;
    entity.rules = tenant.rules;
    entity.active = tenant.isActive;
    return entity;
  }
}

export { TENANT_REPOSITORY };