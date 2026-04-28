import { AssessmentItem } from '../aggregates/assessment/assessment-item';
import { AssessmentItemResult } from './score-calculator';
import { ScoringService } from './scoring.service';
import { Score } from '../value-objects/score';

export interface AssessmentResultInterpretation {
  score: Score;
  interpretedScore: number;
  averageDifficulty: number;
  answerConsistency: number;
}

export class AssessmentResultInterpreter {
  interpret(
    items: AssessmentItem[],
    results: AssessmentItemResult[],
  ): AssessmentResultInterpretation {
    const score = ScoringService.calculate(items, results);
    const maxScore = items.reduce((sum, item) => sum + item.getWeight(), 0);
    const normalizedRawScore = maxScore > 0 ? score.value / maxScore : 0;

    const { averageDifficulty, answerConsistency } = this.calculateSignals(
      items,
      results,
    );

    // TODO: revisit the interpretation formula with domain experts.
    const difficultyFactor = 0.5 + 0.5 * averageDifficulty;
    const consistencyFactor = 0.5 + 0.5 * answerConsistency;
    // interpretedScore is now a probability [0..1]
    const interpretedScore = Math.min(1, normalizedRawScore * difficultyFactor * consistencyFactor);

    return {
      score,
      interpretedScore,
      averageDifficulty,
      answerConsistency,
    };
  }

  private calculateSignals(
    items: AssessmentItem[],
    results: AssessmentItemResult[],
  ): { averageDifficulty: number; answerConsistency: number } {
    const itemsById = new Map(items.map((item) => [item.getId(), item]));
    let difficultySum = 0;

    for (const result of results) {
      const item = itemsById.get(result.itemId);
      if (!item) {
        throw new Error('Assessment item not found for interpretation');
      }

      difficultySum += item.getDifficulty();
    }

    const averageDifficulty =
      results.length > 0 ? difficultySum / results.length : 0;
    const answerConsistency = this.calculateConsistency(results);

    return { averageDifficulty, answerConsistency };
  }

  private calculateConsistency(results: AssessmentItemResult[]): number {
    if (results.length === 0) {
      return 0;
    }
    if (results.length === 1) {
      return 1;
    }

    let flips = 0;
    for (let index = 1; index < results.length; index += 1) {
      if (results[index].isCorrect !== results[index - 1].isCorrect) {
        flips += 1;
      }
    }

    return 1 - flips / (results.length - 1);
  }
}
