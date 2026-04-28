import { LearningPath } from '../entities/learning-path.entity';

export abstract class LearningPathRepository {
  abstract save(path: LearningPath): Promise<void>;
  abstract findByLearnerId(learnerId: string): Promise<LearningPath | null>;
  abstract findById(id: string): Promise<LearningPath | null>;
}
