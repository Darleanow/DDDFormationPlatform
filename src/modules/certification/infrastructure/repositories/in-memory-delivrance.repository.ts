import { IDelivranceRepository } from '../../domain/repositories/delivrance.repository.interface';
import { Delivrance } from '../../domain/entities/delivrance.entity';

export class InMemoryDelivranceRepository implements IDelivranceRepository {
  public readonly items: Delivrance[] = [];

  save(delivrance: Delivrance): Promise<void> {
    this.items.push(delivrance);
    return Promise.resolve();
  }
}
