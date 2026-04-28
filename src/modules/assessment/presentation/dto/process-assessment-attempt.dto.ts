export class ProcessAssessmentAttemptDto {
  questionCount!: number;
  durationSeconds!: number;
  itemResults!: Array<{ itemId: string; isCorrect: boolean }>;
  tenantId?: string;
}
