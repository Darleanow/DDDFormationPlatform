import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantEntity } from './infrastructure/entities/tenant.entity';
import { TypeOrmTenantRepository } from './infrastructure/repositories/typeorm-tenant.repository';
import { TENANT_REPOSITORY } from './domain/repositories/tenant.repository.interface';
import { TenantResolverService } from './application/services/tenant-resolver.service';
import { BusinessRuleOverrideService } from './application/services/business-rule-override.service';
import { TenantConfigService } from './application/services/tenant-config.service';
import { TerminologyMappingService } from './application/services/terminology-mapping.service';
import { TenantController } from './infrastructure/controllers/tenant.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TenantEntity])],
  controllers: [TenantController],
  providers: [
    { provide: TENANT_REPOSITORY, useClass: TypeOrmTenantRepository },
    TenantResolverService,
    TenantConfigService,
    BusinessRuleOverrideService,
    TerminologyMappingService,
  ],
  exports: [
    { provide: TENANT_REPOSITORY, useClass: TypeOrmTenantRepository },
    TenantResolverService,
    TenantConfigService,
    BusinessRuleOverrideService,
    TerminologyMappingService,
  ],
})
export class TenantModule {}
