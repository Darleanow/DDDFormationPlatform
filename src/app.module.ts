import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdentityModule } from './modules/identity/identity.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { AdaptiveModule } from './modules/adaptive/adaptive.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { CertificationModule } from './modules/certification/certification.module';
import { TenantModule } from './modules/tenant/tenant.module';

@Module({
  imports: [IdentityModule, CatalogModule, AdaptiveModule, AssessmentModule, CertificationModule, TenantModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
