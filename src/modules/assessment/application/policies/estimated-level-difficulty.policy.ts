import { DifficultyRange } from '../../domain/value-objects/difficulty-range';

export const ESTIMATED_LEVEL_DIFFICULTY_POLICY = Symbol(
  'ESTIMATED_LEVEL_DIFFICULTY_POLICY',
);

export interface EstimatedLevelDifficultyPolicy {
  getRangeFor(estimatedLevel: string): DifficultyRange;
}

const normalizeEstimatedLevel = (level: string): string =>
  level
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export class StaticEstimatedLevelDifficultyPolicy
  implements EstimatedLevelDifficultyPolicy
{
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
