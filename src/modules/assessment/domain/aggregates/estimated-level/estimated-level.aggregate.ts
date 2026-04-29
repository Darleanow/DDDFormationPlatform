import { CompetencyId } from '../../../../../shared/competency-id';
import { EstimatedLevel as EstimatedLevelVO } from '../../value-objects/estimated-level';

export class EstimatedLevel {
  private currentLevel: EstimatedLevelVO;
  private readonly history: number[] = [];

  constructor(
    private readonly learnerId: string,
    private readonly competencyId: CompetencyId,
    private readonly tenantId: string | undefined,
    initialLevel: number = 0.0,
  ) {
    this.currentLevel = new EstimatedLevelVO(initialLevel);
  }

  getLearnerId(): string {
    return this.learnerId;
  }

  getCompetencyId(): CompetencyId {
    return this.competencyId;
  }

  getTenantId(): string | undefined {
    return this.tenantId;
  }

  get currentLevelValue(): number {
    return this.currentLevel.value;
  }

  updateLevel(interpretedScore: number): void {
    // A simple Exponential Moving Average logic
    // Let's assume EMA alpha factor = 0.3 for smoothing
    const alpha = 0.3;
    
    // Log history (optional, for debugging/records)
    if (interpretedScore < 0 || interpretedScore > 1) {
      throw new Error('Interpreted score must be between 0 and 1');
    }
    this.history.push(interpretedScore);

    const oldLevel = this.currentLevel.value;
    const newLevelValue = (alpha * interpretedScore) + ((1 - alpha) * oldLevel);
    
    this.currentLevel = new EstimatedLevelVO(newLevelValue);
  }
}
