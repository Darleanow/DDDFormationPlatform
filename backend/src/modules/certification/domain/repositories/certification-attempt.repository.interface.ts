import { CertificationAttempt } from '../entities/certification-attempt.entity';

export interface ICertificationAttemptRepository {
  findByLearnerAndCertification(
    learnerId: string,
    certificationId: string,
  ): Promise<CertificationAttempt | null>;
  
  save(attempt: CertificationAttempt): Promise<void>;
}
