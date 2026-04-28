import { Delivrance } from '../entities/delivrance.entity';

export interface IDelivranceRepository {
  save(delivrance: Delivrance): Promise<void>;
  // TODO: Add other necessary repository methods
}
