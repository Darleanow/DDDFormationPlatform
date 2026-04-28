import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Learner } from '../../domain/aggregates/apprenant.aggregate';
import type { ILearnerRepository } from '../../domain/repositories/apprenant.repository.interface';
import { LearnerEntity } from '../persistence/entities/apprenant.entity';

@Injectable()
export class TypeOrmLearnerRepository implements ILearnerRepository {
  constructor(
    @InjectRepository(LearnerEntity)
    private readonly repo: Repository<LearnerEntity>,
  ) {}

  async findById(id: string): Promise<Learner | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? Learner.reconstitute(e) : null;
  }

  async findByEmail(email: string, tenantId: string): Promise<Learner | null> {
    const e = await this.repo.findOne({ where: { email, tenantId } });
    return e ? Learner.reconstitute(e) : null;
  }

  async save(learner: Learner): Promise<void> {
    const entity = new LearnerEntity();
    entity.id = learner.id;
    entity.tenantId = learner.tenantId;
    entity.email = learner.email;
    entity.lastName = learner.lastName;
    entity.firstName = learner.firstName;
    await this.repo.save(entity);
  }
}
