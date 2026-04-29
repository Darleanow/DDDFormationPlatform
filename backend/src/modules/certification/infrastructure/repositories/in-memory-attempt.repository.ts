import { ICertificationAttemptRepository } from '../../domain/repositories/certification-attempt.repository.interface';
import { CertificationAttempt } from '../../domain/entities/certification-attempt.entity';

export class InMemoryAttemptRepository implements ICertificationAttemptRepository {
  public items: CertificationAttempt[] = [];

  async findByLearnerAndCertification(
    learnerId: string,
    certificationId: string,
  ): Promise<CertificationAttempt | null> {
    const found = this.items.find(
      (t) => t.learnerId === learnerId && t.certificationId === certificationId,
    );
    return found || null;
  }

  async save(attempt: CertificationAttempt): Promise<void> {
    const index = this.items.findIndex(
      (t) =>
        t.learnerId === attempt.learnerId &&
        t.certificationId === attempt.certificationId,
    );
    if (index >= 0) {
      this.items[index] = attempt;
    } else {
      this.items.push(attempt);
    }
  }
}
