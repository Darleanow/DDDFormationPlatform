import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantEntity } from './infrastructure/entities/tenant.entity';
import { TypeOrmTenantRepository } from './infrastructure/repositories/typeorm-tenant.repository';
import { TENANT_REPOSITORY } from './domain/repositories/tenant.repository.interface';
import { TenantResolverService } from './application/services/tenant-resolver.service';
import { BusinessRuleOverrideService } from './application/services/business-rule-override.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantEntity])],
  providers: [
    { provide: TENANT_REPOSITORY, useClass: TypeOrmTenantRepository },
    TenantResolverService,
    BusinessRuleOverrideService,
  ],
  exports: [TenantResolverService, BusinessRuleOverrideService],
})
export class TenantModule {}
