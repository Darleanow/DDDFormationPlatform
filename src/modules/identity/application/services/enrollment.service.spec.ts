import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EnrollmentService } from '../../application/services/enrollment.service';
import { Learner } from '../../domain/aggregates/learner.aggregate';
import type { ILearnerRepository } from '../../domain/repositories/learner.repository.interface';
import type { IEnrollmentRepository } from '../../domain/repositories/enrollment.repository.interface';
import type { TenantConfigService } from '../../../tenant/application/services/tenant-config.service';
import type { CatalogQueryService } from '../../../catalog/application/catalog-query.service';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { EnrollmentConfirmedEvent } from '../../domain/events/enrollment-confirmed.event';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let learnerRepo: jest.Mocked<ILearnerRepository>;
  let enrollmentRepo: jest.Mocked<IEnrollmentRepository>;
  let tenantConfig: jest.Mocked<TenantConfigService>;
  let catalogQuery: jest.Mocked<CatalogQueryService>;
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
    tenantConfig = { assertExists: jest.fn() } as any;
    catalogQuery = {
      findProgrammeById: jest.fn(),
    } as any;
    eventEmitter = {
      emit: jest.fn(),
      emitAsync: jest.fn().mockResolvedValue(undefined),
    } as any;

    service = new EnrollmentService(
      learnerRepo,
      enrollmentRepo,
      tenantConfig,
      catalogQuery,
      eventEmitter,
    );
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

      tenantConfig.assertExists.mockResolvedValue(undefined);
      learnerRepo.findById.mockResolvedValue(alice);
      catalogQuery.findProgrammeById.mockResolvedValue({
        id: 'prog-advanced-software',
        tenantId: 'univ-lyon',
      } as any);
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
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
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

      tenantConfig.assertExists.mockResolvedValue(undefined);
      learnerRepo.findById.mockResolvedValue(bob);
      catalogQuery.findProgrammeById.mockResolvedValue({
        id: 'prog-reserved-univ',
        tenantId: 'univ-lyon',
      } as any);

      await expect(
        service.enroll({
          learnerId: 'bob-id',
          tenantId: 'univ-lyon',
          programId: 'prog-reserved-univ',
          weeklyAvailabilityHours: 5,
          deadline: futureDeadline,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });

    it('rejects enrollment when program belongs to another tenant', async () => {
      const alice = Learner.create({
        id: 'alice-id',
        tenantId: 'univ-lyon',
        email: 'alice@univ.fr',
        lastName: 'Dupont',
        firstName: 'Alice',
      });

      tenantConfig.assertExists.mockResolvedValue(undefined);
      learnerRepo.findById.mockResolvedValue(alice);
      catalogQuery.findProgrammeById.mockResolvedValue({
        id: 'corp-only-prog',
        tenantId: 'company-x',
      } as any);

      await expect(
        service.enroll({
          learnerId: 'alice-id',
          tenantId: 'univ-lyon',
          programId: 'corp-only-prog',
          weeklyAvailabilityHours: 5,
          deadline: futureDeadline,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });

    it('rejects if tenant does not exist', async () => {
      tenantConfig.assertExists.mockRejectedValue(new NotFoundException());
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

      tenantConfig.assertExists.mockResolvedValue(undefined);
      learnerRepo.findById.mockResolvedValue(alice);
      catalogQuery.findProgrammeById.mockResolvedValue({
        id: 'prog-advanced-software',
        tenantId: 'univ-lyon',
      } as any);
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