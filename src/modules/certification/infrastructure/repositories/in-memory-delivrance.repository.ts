import { IDelivranceRepository } from '../../domain/repositories/delivrance.repository.interface';
import { Delivrance } from '../../domain/entities/delivrance.entity';

export class InMemoryDelivranceRepository implements IDelivranceRepository {
  private readonly items: Delivrance[] = [];

  async save(delivrance: Delivrance): Promise<void> {
    this.items.push(delivrance);
    // TODO: complete mock logic
  }
}
