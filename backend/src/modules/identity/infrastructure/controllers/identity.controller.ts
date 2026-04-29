import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { EnrollmentService } from '../../application/services/enrollment.service';
import { CreateLearnerDto, EnrollLearnerDto } from '../../application/dtos/identity.dto';
import type { ILearnerRepository } from '../../domain/repositories/learner.repository.interface';
import { LEARNER_REPOSITORY } from '../../domain/repositories/learner.repository.interface';
import type { IEnrollmentRepository } from '../../domain/repositories/enrollment.repository.interface';
import { ENROLLMENT_REPOSITORY } from '../../domain/repositories/enrollment.repository.interface';

/**
 * BC1 — Identity & Enrollment HTTP interface.
 * Exposes Apprenant creation and Inscription endpoints.
 */
@Controller('identity')
export class IdentityController {
  constructor(
    private readonly enrollmentService: EnrollmentService,
    @Inject(LEARNER_REPOSITORY)
    private readonly learnerRepo: ILearnerRepository,
    @Inject(ENROLLMENT_REPOSITORY)
    private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  /** POST /identity/learners — Creates a new Apprenant. */
  @Post('learners')
  async createLearner(@Body() dto: CreateLearnerDto) {
    const learner = await this.enrollmentService.createLearner(dto);
    return {
      id: learner.id,
      tenantId: learner.tenantId,
      email: learner.email,
      firstName: learner.firstName,
      lastName: learner.lastName,
    };
  }

  /** GET /identity/learners/:id — Retrieve an Apprenant by ID. */
  @Get('learners/:id')
  async getLearner(@Param('id') id: string) {
    const learner = await this.learnerRepo.findById(id);
    if (!learner) return { error: 'Apprenant non trouvé' };
    return {
      id: learner.id,
      tenantId: learner.tenantId,
      email: learner.email,
      firstName: learner.firstName,
      lastName: learner.lastName,
    };
  }

  /** POST /identity/learners/:id/enroll — Inscription d'un apprenant à un programme. */
  @Post('learners/:id/enroll')
  async enroll(@Param('id') learnerId: string, @Body() dto: Omit<EnrollLearnerDto, 'learnerId'>) {
    const enrollment = await this.enrollmentService.enroll({ ...dto, learnerId });
    return {
      id: enrollment.id,
      learnerId: enrollment.learnerId,
      tenantId: enrollment.tenantId,
      programId: enrollment.programId,
      weeklyAvailabilityHours: enrollment.weeklyAvailabilityHours,
      deadline: enrollment.deadline,
      enrolledAt: enrollment.enrolledAt,
    };
  }
}
