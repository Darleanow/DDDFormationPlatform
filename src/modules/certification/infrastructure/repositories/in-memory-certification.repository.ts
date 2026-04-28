import { ICertificationRepository } from '../../domain/repositories/certification.repository.interface';
import { Certification } from '../../domain/entities/certification.entity';

export class InMemoryCertificationRepository implements ICertificationRepository {
  public readonly items: Certification[] = [];

  findById(id: string): Promise<Certification | null> {
    const cert = this.items.find((c) => c.id === id);
    return Promise.resolve(cert || null);
  }
}
