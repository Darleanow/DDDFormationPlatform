import { ICertificationRepository } from '../../domain/repositories/certification.repository.interface';
import { Certification } from '../../domain/entities/certification.entity';

export class InMemoryCertificationRepository implements ICertificationRepository {
  public readonly items: Certification[] = [];

  findById(id: string): Promise<Certification | null> {
    const cert = this.items.find((c) => c.id === id);
    return Promise.resolve(cert || null);
  }

  findAll(): Promise<Certification[]> {
    return Promise.resolve([...this.items]);
  }

  save(certification: Certification): Promise<void> {
    const index = this.items.findIndex(c => c.id === certification.id);
    if (index >= 0) {
      this.items[index] = certification;
    } else {
      this.items.push(certification);
    }
    return Promise.resolve();
  }
}
