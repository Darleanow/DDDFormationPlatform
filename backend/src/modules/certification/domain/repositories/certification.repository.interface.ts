import { Certification } from '../entities/certification.entity';

export interface ICertificationRepository {
  findById(id: string): Promise<Certification | null>;
  findAll(): Promise<Certification[]>;
  save(certification: Certification): Promise<void>;
}
