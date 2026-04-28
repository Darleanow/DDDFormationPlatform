import type { Learner } from '../aggregates/learner.aggregate';

export interface ILearnerRepository {
  findById(id: string): Promise<Learner | null>;
  findByEmail(email: string, tenantId: string): Promise<Learner | null>;
  save(learner: Learner): Promise<void>;
}

export const LEARNER_REPOSITORY = Symbol('ILearnerRepository');
