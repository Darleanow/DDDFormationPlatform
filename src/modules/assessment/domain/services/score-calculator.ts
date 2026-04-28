import { AssessmentItem } from '../aggregates/assessment/assessment-item';
import { Score } from '../value-objects/score';

export interface AssessmentItemResult {
  itemId: string;
  isCorrect: boolean;
}

export class ScoreCalculator {
  static calculate(items: AssessmentItem[], results: AssessmentItemResult[]): Score {
    const itemsById = new Map(items.map((item) => [item.getId(), item]));
    let total = 0;

    for (const result of results) {
      const item = itemsById.get(result.itemId);
      if (!item) {
        throw new Error('Assessment item not found for score calculation');
      }

      if (result.isCorrect) {
        total += item.getWeight();
      }
    }

    return new Score(total);
  }
}
