export class CompetenceObligatoireManquanteException extends Error {
  constructor(message?: string) {
    super(message || 'Une ou plusieurs compétences obligatoires n\'ont pas été validées.');
    this.name = 'CompetenceObligatoireManquanteException';
  }
}
