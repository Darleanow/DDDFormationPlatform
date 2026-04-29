import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningPathRepository } from '../../domain/repositories/learning-path.repository';
import { LearningPath } from '../../domain/entities/learning-path.entity';
import { LearningPathOrmEntity } from './learning-path.orm-entity';
import { LearningPathMapper } from './learning-path.mapper';

@Injectable()
export class LearningPathTypeormRepository implements LearningPathRepository {
  constructor(
    @InjectRepository(LearningPathOrmEntity)
    private readonly repository: Repository<LearningPathOrmEntity>,
  ) {}

  async save(path: LearningPath): Promise<void> {
    const orm = LearningPathMapper.toOrm(path);
    await this.repository.save(orm);
  }

  async findByLearnerId(learnerId: string): Promise<LearningPath | null> {
    const entity = await this.repository.findOne({
      where: { learnerId },
      relations: ['activities'],
    });
    return entity ? LearningPathMapper.toDomain(entity) : null;
  }

  async findById(id: string): Promise<LearningPath | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['activities'],
    });
    return entity ? LearningPathMapper.toDomain(entity) : null;
  }
}
