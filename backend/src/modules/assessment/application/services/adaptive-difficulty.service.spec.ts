import { StaticAdaptiveDifficultyService } from './adaptive-difficulty.service';
import { DifficultyRange } from '../../domain/value-objects/difficulty-range';

describe('StaticAdaptiveDifficultyService', () => {
  const service = new StaticAdaptiveDifficultyService({
    debutant: new DifficultyRange(0.1, 0.4),
    intermediaire: new DifficultyRange(0.4, 0.7),
    avance: new DifficultyRange(0.7, 0.95),
  });

  it('maps numeric 0–1 to named bands (BC4 probability)', () => {
    expect(service.getRangeFor('0.2').getMin()).toBe(0.1);
    expect(service.getRangeFor('0.5').getMin()).toBe(0.4);
    expect(service.getRangeFor('0.85').getMin()).toBe(0.7);
    expect(service.getRangeFor('1').getMin()).toBe(0.7);
    expect(service.getRangeFor('0').getMin()).toBe(0.1);
  });

  it('still accepts niveau libellé normalisé', () => {
    expect(service.getRangeFor('intermediaire').getMin()).toBe(0.4);
    expect(service.getRangeFor(' INTERMEDIAIRE ').getMin()).toBe(0.4);
  });
});
