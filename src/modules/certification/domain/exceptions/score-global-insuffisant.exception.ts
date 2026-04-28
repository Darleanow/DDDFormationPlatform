export class ScoreGlobalInsuffisantException extends Error {
  constructor(message?: string) {
    super(
      message ||
        'Le score global est insuffisant pour obtenir cette certification.',
    );
    this.name = 'ScoreGlobalInsuffisantException';
  }
}
