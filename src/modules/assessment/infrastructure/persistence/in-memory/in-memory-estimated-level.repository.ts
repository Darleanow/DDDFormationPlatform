import { Injectable } from '@nestjs/common';
import { CompetencyId } from '../../../../../shared/competency-id';
import { EstimatedLevel } from '../../../domain/aggregates/estimated-level/estimated-level.aggregate';
import { EstimatedLevelRepository } from '../../../domain/repositories/estimated-level.repository';

@Injectable()
export class InMemoryEstimatedLevelRepository implements EstimatedLevelRepository {
  private levels: Map<string, EstimatedLevel> = new Map();

  private getKey(learnerId: string, competencyId: CompetencyId): string {
    return `${learnerId}_${competencyId}`;
  }

  async findByLearnerAndCompetency(learnerId: string, competencyId: CompetencyId): Promise<EstimatedLevel | null> {
    const key = this.getKey(learnerId, competencyId);
    return this.levels.get(key) || null;
  }

  async save(estimatedLevel: EstimatedLevel): Promise<void> {
    const key = this.getKey(estimatedLevel.getLearnerId(), estimatedLevel.getCompetencyId());
    this.levels.set(key, estimatedLevel);
  }
}
