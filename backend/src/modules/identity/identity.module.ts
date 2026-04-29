import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearnerEntity } from './infrastructure/entities/learner.entity';
import { EnrollmentEntity } from './infrastructure/entities/enrollment.entity';
import { TypeOrmLearnerRepository } from './infrastructure/repositories/typeorm-learner.repository';
import { TypeOrmEnrollmentRepository } from './infrastructure/repositories/typeorm-enrollment.repository';
import { LEARNER_REPOSITORY } from './domain/repositories/learner.repository.interface';
import { ENROLLMENT_REPOSITORY } from './domain/repositories/enrollment.repository.interface';
import { EnrollmentService } from './application/services/enrollment.service';
import { TenantModule } from '../tenant/tenant.module';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityController } from './infrastructure/controllers/identity.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([LearnerEntity, EnrollmentEntity]),
    TenantModule,
    CatalogModule,
  ],
  controllers: [IdentityController],
  providers: [
    { provide: LEARNER_REPOSITORY, useClass: TypeOrmLearnerRepository },
    { provide: ENROLLMENT_REPOSITORY, useClass: TypeOrmEnrollmentRepository },
    EnrollmentService,
  ],
  exports: [
    EnrollmentService,
    { provide: LEARNER_REPOSITORY, useClass: TypeOrmLearnerRepository },
    { provide: ENROLLMENT_REPOSITORY, useClass: TypeOrmEnrollmentRepository },
  ],
})
export class IdentityModule {}