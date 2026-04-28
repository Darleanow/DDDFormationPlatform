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
    const normalized = normalizeEstimatedLevel(estimatedLevel);
    const range = this.ranges[normalized];
    if (!range) {
      throw new Error('Unsupported estimated level');
    }

    return range;
  }
}
