import { DifficultyRange } from '../../domain/value-objects/difficulty-range';

export const ADAPTIVE_DIFFICULTY_SERVICE = Symbol('ADAPTIVE_DIFFICULTY_SERVICE');

/** BC4 — Maps learner estimated level to item difficulty band (spec: AdaptiveDifficultyService). */
export interface AdaptiveDifficultyService {
  getRangeFor(estimatedLevel: string): DifficultyRange;
}

const normalizeEstimatedLevel = (level: string): string =>
  level
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export class StaticAdaptiveDifficultyService implements AdaptiveDifficultyService {
  constructor(private readonly ranges: Record<string, DifficultyRange>) {}

  getRangeFor(estimatedLevel: string): DifficultyRange {
    const trimmed = estimatedLevel.trim();

    // Niveau exprimé comme probabilité BC4 (0–1) — cas le plus fréquent depuis l’API / le front.
    const asNum = Number.parseFloat(trimmed.replace(',', '.'));
    if (Number.isFinite(asNum) && asNum >= 0 && asNum <= 1) {
      const key = this.numericProbabilityToBandKey(asNum);
      const band = this.ranges[key];
      if (band) {
        return band;
      }
    }

    const normalized = normalizeEstimatedLevel(estimatedLevel);
    const range = this.ranges[normalized];
    if (!range) {
      throw new Error('Unsupported estimated level');
    }

    return range;
  }

  /**
   * Coupe [0, 1] en trois bandes alignées sur debutant / intermediaire / avance
   * (même clés que dans {@link assessment.module}).
   */
  private numericProbabilityToBandKey(p: number): string {
    if (p < 1 / 3) return 'debutant';
    if (p < 2 / 3) return 'intermediaire';
    return 'avance';
  }
}
