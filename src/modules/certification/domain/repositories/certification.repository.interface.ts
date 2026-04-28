import { Certification } from '../entities/certification.entity';

export interface ICertificationRepository {
  findById(id: string): Promise<Certification | null>;
  // TODO: Add other necessary repository methods
}
