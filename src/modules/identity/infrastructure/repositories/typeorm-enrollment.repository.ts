import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../../domain/aggregates/enrollment.aggregate';
import type { IEnrollmentRepository } from '../../domain/repositories/enrollment.repository.interface';
import { EnrollmentEntity } from '../entities/enrollment.entity';

@Injectable()
export class TypeOrmEnrollmentRepository implements IEnrollmentRepository {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly repo: Repository<EnrollmentEntity>,
  ) {}

  async findById(id: string): Promise<Enrollment | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? Enrollment.reconstitute(e) : null;
  }

  async findByLearner(learnerId: string): Promise<Enrollment[]> {
    const entities = await this.repo.find({ where: { learnerId } });
    return entities.map((e) => Enrollment.reconstitute(e));
  }

  async existsByLearnerAndProgram(
    learnerId: string,
    programId: string,
  ): Promise<boolean> {
    return this.repo.existsBy({ learnerId, programId });
  }

  async save(enrollment: Enrollment): Promise<void> {
    const entity = new EnrollmentEntity();
    entity.id = enrollment.id;
    entity.learnerId = enrollment.learnerId;
    entity.tenantId = enrollment.tenantId;
    entity.programId = enrollment.programId;
    entity.weeklyAvailabilityHours = enrollment.weeklyAvailabilityHours;
    entity.deadline = enrollment.deadline;
    entity.enrolledAt = enrollment.enrolledAt;
    await this.repo.save(entity);
  }
}
