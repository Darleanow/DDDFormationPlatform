import { ITentativeCertificationRepository } from '../../domain/repositories/tentative-certification.repository.interface';
import { TentativeCertification } from '../../domain/entities/tentative-certification.entity';

export class InMemoryTentativeCertificationRepository implements ITentativeCertificationRepository {
  public items: TentativeCertification[] = [];

  async findByLearnerAndCertification(
    learnerId: string,
    certificationId: string,
  ): Promise<TentativeCertification | null> {
    const found = this.items.find(
      (t) => t.learnerId === learnerId && t.certificationId === certificationId,
    );
    return found || null;
  }

  async save(tentative: TentativeCertification): Promise<void> {
    const index = this.items.findIndex(
      (t) =>
        t.learnerId === tentative.learnerId &&
        t.certificationId === tentative.certificationId,
    );
    if (index >= 0) {
      this.items[index] = tentative;
    } else {
      this.items.push(tentative);
    }
  }
}
