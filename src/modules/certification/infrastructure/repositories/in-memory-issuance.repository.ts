import { IIssuanceRepository } from '../../domain/repositories/issuance.repository.interface';
import { Issuance } from '../../domain/entities/issuance.entity';

export class InMemoryIssuanceRepository implements IIssuanceRepository {
  public readonly items: Issuance[] = [];

  save(issuance: Issuance): Promise<void> {
    this.items.push(issuance);
    return Promise.resolve();
  }
}
