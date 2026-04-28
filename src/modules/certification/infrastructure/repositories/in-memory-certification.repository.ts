import { ICertificationRepository } from '../../domain/repositories/certification.repository.interface';
import { Certification } from '../../domain/entities/certification.entity';

export class InMemoryCertificationRepository implements ICertificationRepository {
  private readonly items: Certification[] = [];

  async findById(id: string): Promise<Certification | null> {
    // TODO: Implement in-memory search
    return null;
  }
}
