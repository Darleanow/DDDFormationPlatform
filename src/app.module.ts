import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IdentityModule } from './modules/identity/identity.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { AdaptiveModule } from './modules/adaptive/adaptive.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { CertificationModule } from './modules/certification/certification.module';
import { TenantModule } from './modules/tenant/tenant.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      autoLoadEntities: true,
      synchronize: true,
    }),
    TenantModule,
    IdentityModule,
    CatalogModule,
    AdaptiveModule,
    AssessmentModule,
    CertificationModule,
  ],
})
export class AppModule {}
