import { EstimatedLevel } from './estimated-level.aggregate';
import { CompetencyId } from '../../../../shared/competency-id';

describe('EstimatedLevel Aggregate', () => {
  const learnerId = 'learner-123';
  const competencyId = 'comp-abc' as CompetencyId;
  const tenantId = 'tenant-1';

  it('should initialize with a default level of 0.0', () => {
    const estimatedLevel = new EstimatedLevel(learnerId, competencyId, tenantId);

    expect(estimatedLevel.getLearnerId()).toBe(learnerId);
    expect(estimatedLevel.getCompetencyId()).toBe(competencyId);
    expect(estimatedLevel.getTenantId()).toBe(tenantId);
    expect(estimatedLevel.currentLevelValue).toBe(0.0);
  });

  it('should initialize with a custom initial level', () => {
    const estimatedLevel = new EstimatedLevel(learnerId, competencyId, tenantId, 0.5);
    expect(estimatedLevel.currentLevelValue).toBe(0.5);
  });

  it('should smoothly update the estimated level using EMA (alpha=0.3)', () => {
    const estimatedLevel = new EstimatedLevel(learnerId, competencyId, tenantId, 0.5);
    
    // Interpreted score of 0.9
    // Formula: 0.3 * 0.9 + 0.7 * 0.5 = 0.27 + 0.35 = 0.62
    estimatedLevel.updateLevel(0.9);
    
    expect(estimatedLevel.currentLevelValue).toBeCloseTo(0.62, 5);

    // Another update with score 0.2
    // Formula: 0.3 * 0.2 + 0.7 * 0.62 = 0.06 + 0.434 = 0.494
    estimatedLevel.updateLevel(0.2);

    expect(estimatedLevel.currentLevelValue).toBeCloseTo(0.494, 5);
  });

  it('should throw an error if the updated score is out of bounds [0,1]', () => {
    const estimatedLevel = new EstimatedLevel(learnerId, competencyId, tenantId);
    
    expect(() => estimatedLevel.updateLevel(1.5)).toThrow(/between 0 and 1/);
    expect(() => estimatedLevel.updateLevel(-0.1)).toThrow(/between 0 and 1/);
  });
});
