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

import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqljs',
      location: ':memory:',
      autoLoadEntities: true,
      synchronize: true,
      autoSave: false,
    }),
    TenantModule,
    IdentityModule,
    CatalogModule,
    AssessmentModule,
    AdaptiveModule,
    CertificationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
