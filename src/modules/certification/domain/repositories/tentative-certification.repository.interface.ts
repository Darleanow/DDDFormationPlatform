import { TentativeCertification } from '../entities/tentative-certification.entity';

export interface ITentativeCertificationRepository {
  findByLearnerAndCertification(
    learnerId: string,
    certificationId: string,
  ): Promise<TentativeCertification | null>;
  
  save(tentative: TentativeCertification): Promise<void>;
}
