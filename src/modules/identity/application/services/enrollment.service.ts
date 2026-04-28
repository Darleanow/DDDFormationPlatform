import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { Learner } from '../../domain/aggregates/learner.aggregate';
import { Enrollment } from '../../domain/aggregates/enrollment.aggregate';
import { EnrollmentConfirmedEvent } from '../../domain/events/enrollment-confirmed.event';
import type { ILearnerRepository } from '../../domain/repositories/learner.repository.interface';
import { LEARNER_REPOSITORY } from '../../domain/repositories/learner.repository.interface';
import type { IEnrollmentRepository } from '../../domain/repositories/enrollment.repository.interface';
import { ENROLLMENT_REPOSITORY } from '../../domain/repositories/enrollment.repository.interface';
import { TenantConfigService } from '../../../tenant/application/services/tenant-config.service';
import { CatalogQueryService } from '../../../catalog/application/catalog-query.service';
import { CreateLearnerDto, EnrollLearnerDto } from '../dtos/identity.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    @Inject(LEARNER_REPOSITORY)
    private readonly learnerRepo: ILearnerRepository,
    @Inject(ENROLLMENT_REPOSITORY)
    private readonly enrollmentRepo: IEnrollmentRepository,
    private readonly tenantConfig: TenantConfigService,
    private readonly catalogQuery: CatalogQueryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createLearner(dto: CreateLearnerDto): Promise<Learner> {
    await this.tenantConfig.assertExists(dto.tenantId);

    const learner = Learner.create({
      id: randomUUID(),
      tenantId: dto.tenantId,
      email: dto.email,
      lastName: dto.lastName,
      firstName: dto.firstName,
    });

    await this.learnerRepo.save(learner);
    return learner;
  }

  async enroll(dto: EnrollLearnerDto): Promise<Enrollment> {
    // 1. Verify tenant exists
    await this.tenantConfig.assertExists(dto.tenantId);

    // 2. Verify learner belongs to the same tenant
    const learner = await this.learnerRepo.findById(dto.learnerId);
    if (!learner) throw new ForbiddenException('Learner not found');
    if (!learner.belongsToTenant(dto.tenantId)) {
      throw new ForbiddenException('Learner cannot enroll on behalf of another tenant');
    }

    const programme = await this.catalogQuery.findProgrammeById(dto.programId);
    if (!programme) {
      throw new NotFoundException('Programme not found');
    }
    if (programme.tenantId !== learner.tenantId) {
      throw new ForbiddenException('Programme not accessible to this tenant');
    }

    // 3. Prevent duplicate enrollment
    const alreadyEnrolled = await this.enrollmentRepo.existsByLearnerAndProgram(
      dto.learnerId,
      dto.programId,
    );
    if (alreadyEnrolled) {
      throw new ConflictException('Learner is already enrolled in this program');
    }

    // 4. Create enrollment (invariants checked inside aggregate)
    const enrollment = Enrollment.create({
      id: randomUUID(),
      learnerId: dto.learnerId,
      tenantId: dto.tenantId,
      programId: dto.programId,
      weeklyAvailabilityHours: dto.weeklyAvailabilityHours,
      deadline: dto.deadline,
    });

    await this.enrollmentRepo.save(enrollment);

    // 5. Publish event to BC3 — only after successful persist
    await this.eventEmitter.emitAsync(
      EnrollmentConfirmedEvent.EVENT_NAME,
      new EnrollmentConfirmedEvent(
        enrollment.learnerId,
        enrollment.tenantId,
        enrollment.programId,
        enrollment.weeklyAvailabilityHours,
        enrollment.deadline,
        enrollment.enrolledAt,
      ),
    );

    return enrollment;
  }
}
