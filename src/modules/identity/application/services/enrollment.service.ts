import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { Learner } from '../../domain/aggregates/learner.aggregate';
import { Enrollment } from '../../domain/aggregates/enrollment.aggregate';
import { EnrollmentConfirmedEvent } from '../../domain/events/enrollment-confirmed.event';
import type { ILearnerRepository } from '../../domain/repositories/learner.repository.interface';
import { LEARNER_REPOSITORY } from '../../domain/repositories/learner.repository.interface';
import type { IEnrollmentRepository } from '../../domain/repositories/enrollment.repository.interface';
import { ENROLLMENT_REPOSITORY } from '../../domain/repositories/enrollment.repository.interface';
import { TenantResolverService } from '../../../tenant/application/services/tenant-resolver.service';
import { CreateLearnerDto, EnrollLearnerDto } from '../dtos/identity.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    @Inject(LEARNER_REPOSITORY)
    private readonly learnerRepo: ILearnerRepository,
    @Inject(ENROLLMENT_REPOSITORY)
    private readonly enrollmentRepo: IEnrollmentRepository,
    private readonly tenantResolver: TenantResolverService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createLearner(dto: CreateLearnerDto): Promise<Learner> {
    await this.tenantResolver.assertExists(dto.tenantId);

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
    await this.tenantResolver.assertExists(dto.tenantId);

    // 2. Verify learner belongs to the same tenant
    const learner = await this.learnerRepo.findById(dto.learnerId);
    if (!learner) throw new ForbiddenException('Learner not found');
    if (!learner.belongsToTenant(dto.tenantId)) {
      throw new ForbiddenException('Program not accessible to this tenant');
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
    this.eventEmitter.emit(
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
