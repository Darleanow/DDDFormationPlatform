import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EnrollmentService } from '../../application/services/enrollment.service';
import { Learner } from '../../domain/aggregates/learner.aggregate';
import type { ILearnerRepository } from '../../domain/repositories/learner.repository.interface';
import type { IEnrollmentRepository } from '../../domain/repositories/enrollment.repository.interface';
import type { TenantResolverService } from '../../../tenant/application/services/tenant-resolver.service';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { EnrollmentConfirmedEvent } from '../../domain/events/enrollment-confirmed.event';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let learnerRepo: jest.Mocked<ILearnerRepository>;
  let enrollmentRepo: jest.Mocked<IEnrollmentRepository>;
  let tenantResolver: jest.Mocked<TenantResolverService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const futureDeadline = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  beforeEach(() => {
    learnerRepo = { findById: jest.fn(), findByEmail: jest.fn(), save: jest.fn() };
    enrollmentRepo = {
      findById: jest.fn(),
      findByLearner: jest.fn(),
      existsByLearnerAndProgram: jest.fn(),
      save: jest.fn(),
    };
    tenantResolver = { resolve: jest.fn(), assertExists: jest.fn() } as any;
    eventEmitter = { emit: jest.fn() } as any;

    service = new EnrollmentService(learnerRepo, enrollmentRepo, tenantResolver, eventEmitter);
  });

  // Scenario: Enrollment with declared constraints
  describe('enroll', () => {
    it('enrolls a learner with constraints and publishes EnrollmentConfirmedEvent', async () => {
      const alice = Learner.create({
        id: 'alice-id',
        tenantId: 'univ-lyon',
        email: 'alice@univ.fr',
        lastName: 'Dupont',
        firstName: 'Alice',
      });

      tenantResolver.assertExists.mockResolvedValue(undefined);
      learnerRepo.findById.mockResolvedValue(alice);
      enrollmentRepo.existsByLearnerAndProgram.mockResolvedValue(false);
      enrollmentRepo.save.mockResolvedValue(undefined);

      const enrollment = await service.enroll({
        learnerId: 'alice-id',
        tenantId: 'univ-lyon',
        programId: 'prog-advanced-software',
        weeklyAvailabilityHours: 10,
        deadline: futureDeadline,
      });

      expect(enrollment.learnerId).toBe('alice-id');
      expect(enrollment.weeklyAvailabilityHours).toBe(10);
      expect(enrollmentRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EnrollmentConfirmedEvent.EVENT_NAME,
        expect.any(EnrollmentConfirmedEvent),
      );
    });

    // Scenario: Enrollment rejected outside tenant scope
    it('rejects enrollment if learner belongs to a different tenant', async () => {
      const bob = Learner.create({
        id: 'bob-id',
        tenantId: 'company-x',
        email: 'bob@corp.com',
        lastName: 'Martin',
        firstName: 'Bob',
      });

      tenantResolver.assertExists.mockResolvedValue(undefined);
      learnerRepo.findById.mockResolvedValue(bob);

      await expect(
        service.enroll({
          learnerId: 'bob-id',
          tenantId: 'univ-lyon',
          programId: 'prog-reserved-univ',
          weeklyAvailabilityHours: 5,
          deadline: futureDeadline,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('rejects if tenant does not exist', async () => {
      tenantResolver.assertExists.mockRejectedValue(new NotFoundException());
      await expect(
        service.enroll({
          learnerId: 'alice-id',
          tenantId: 'unknown',
          programId: 'prog-x',
          weeklyAvailabilityHours: 5,
          deadline: futureDeadline,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects if learner is already enrolled in the same program', async () => {
      const alice = Learner.create({
        id: 'alice-id',
        tenantId: 'univ-lyon',
        email: 'alice@univ.fr',
        lastName: 'Dupont',
        firstName: 'Alice',
      });

      tenantResolver.assertExists.mockResolvedValue(undefined);
      learnerRepo.findById.mockResolvedValue(alice);
      enrollmentRepo.existsByLearnerAndProgram.mockResolvedValue(true);

      await expect(
        service.enroll({
          learnerId: 'alice-id',
          tenantId: 'univ-lyon',
          programId: 'prog-advanced-software',
          weeklyAvailabilityHours: 10,
          deadline: futureDeadline,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});