export class CompetenceCritiqueEnEchecException extends Error {
  constructor(message?: string) {
    super(
      message ||
        "La certification est refusée en raison de l'échec d'une compétence critique.",
    );
    this.name = 'CompetenceCritiqueEnEchecException';
  }
}
