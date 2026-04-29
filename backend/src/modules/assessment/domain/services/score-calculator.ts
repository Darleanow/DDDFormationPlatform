/**
 * Shared input shape for marking an attempt (used by scoring / interpretation).
 */
export interface AssessmentItemResult {
  itemId: string;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}
