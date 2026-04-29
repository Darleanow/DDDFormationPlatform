import { Issuance } from '../entities/issuance.entity';

export interface IIssuanceRepository {
  save(issuance: Issuance): Promise<void>;
  // TODO: Add other necessary repository methods
}
