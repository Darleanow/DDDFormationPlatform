# BC5 - Certification

Ce module implémente le Bounded Context "Certification" de la plateforme `DDDFormationPlatform`. L'objectif est de gérer la logique d'éligibilité aux diplômes/certifications (score minimum, compétences validées, et l'absence d'échecs sur les compétences critiques) de manière dynamique par locataire (tenant).

## Architecture

Ce module suit strictement la Clean Architecture et le Domain-Driven Design (DDD).

### Structure des dossiers

- **`domain/`** : Le cœur métié (Entities, Value Objects, Domain Services, Exceptions, Interfaces de Repositories). *Zero dépendance externe (pas de NestJS, ni TypeORM).*
- **`application/`** : L'orchestration des cas d'utilisation via le pattern CQRS (Commands, Queries).
- **`infrastructure/`** : Détails d'implémentation (Bases de données / Mocks in-memory, appels API externes, Anti-Corruption Layers).
- **`presentation/`** : Les points d'entrée de notre contexte (Controllers HTTP, Event Listeners).

## Workflow Principal

1. Un **ParcoursTermineEvent** est émis par le BC3 (Adaptive Engine) ou BC4 (Assessment).
2. Le `ParcoursTermineListener` capte cet événement.
3. Il dispatch une `VerifierEligibiliteEtDelivrerCommand` qui passe dans la couche application.
4. L'application récupère la `Certification` concernée et appelle un *Domain Service* (`EligibilityCheckService`).
5. `RuleEngineService` évalue toutes les `RegleObtention`. 
6. Si les règles passent, `CertificateIssuanceService` crée un modèle `Délivrance` et retourne un événement `CertificationDelivreeEvent`.
7. L'application sauve le modèle en base (Repository) et publie le Domain Event vers un bus d'événement pour le reste du SI.
