import type { Enrollment } from '../aggregates/enrollment.aggregate';

export interface IEnrollmentRepository {
  findById(id: string): Promise<Enrollment | null>;
  findByLearner(learnerId: string): Promise<Enrollment[]>;
  existsByLearnerAndProgram(learnerId: string, programId: string): Promise<boolean>;
  save(enrollment: Enrollment): Promise<void>;
}

export const ENROLLMENT_REPOSITORY = Symbol('IEnrollmentRepository');
