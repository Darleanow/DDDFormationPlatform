export class ProcessAssessmentAttemptDto {
  learnerId!: string;
  questionCount!: number;
  durationSeconds!: number;
  itemResults!: Array<{ itemId: string; isCorrect: boolean }>;
  tenantId?: string;
}
