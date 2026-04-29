# BC5 - Certification

Ce module implémente le Bounded Context "Certification" de la plateforme `DDDFormationPlatform`. L'objectif est de gérer la logique d'éligibilité aux diplômes/certifications (score minimum, compétences validées, et l'absence d'échecs sur les compétences critiques) de manière dynamique par locataire (tenant).

## Statut d'implémentation 🚀

Ce module est **totalement implémenté et testé** selon les principes de Clean Architecture, TDD et DDD :

- **Couche Domaine (`domain/`)** : 
  - Entités `Certification`, `Delivrance` et `RegleObtention`.
  - Le `RuleEngineService` a été développé en pur TDD avec 100% de couverture de code pour l'évaluation granulaire des règles de certification.
- **Couche Application (`application/`)** : 
  - Le `VerifierEligibiliteEtDelivrerHandler` (CQRS) orchestre le processus de bout en bout de façon lisible et découplée des détails techniques.
- **Couche Infrastructure (`infrastructure/`)** : 
  - Développement de 3 Repositories `InMemory` respectant le pattern Ports & Adapters, prêts à être basculés vers n'importe quel ORM (ex: TypeORM).
- **Couche Présentation/ACL (`presentation/`)** : 
  - Un `ParcoursTermineListener` joue le rôle de point d'entrée asynchrone pour réceptionner les événements des autres BC et protéger notre modélisation métier (Anti-Corruption Layer).
- **Pratiques de Code Appliquées** : TypeScript strict (`import type` pour fix NestJS DI decorators), KISS, DRY, SOLID. 

## Architecture

Ce module suit strictement la Clean Architecture et le Domain-Driven Design (DDD).

### Structure des dossiers

- **`domain/`** : Le cœur métier (Entities, Value Objects, Domain Services, Exceptions, Interfaces de Repositories). *Zero dépendance externe (pas de NestJS, ni TypeORM).*
- **`application/`** : L'orchestration des cas d'utilisation via le pattern CQRS (Commands, Queries).
- **`infrastructure/`** : Détails d'implémentation (Bases de données / Mocks in-memory actuels, Anti-Corruption Layers).
- **`presentation/`** : Les points d'entrée de notre contexte (Controllers HTTP, Event Listeners).

## Workflow Principal

1. Un **ParcoursTermineEvent** est émis par le BC3 (Adaptive Engine) ou BC4 (Assessment).
2. Le `ParcoursTermineListener` (ACL) capte et traduit cet événement.
3. Il déclenche une `VerifierEligibiliteEtDelivrerCommand` qui passe dans la couche application.
4. Le handler récupère la `Certification` concernée et fait appel au service de domaine exclusif.
5. `RuleEngineService` évalue rigoureusement toutes les règles (`RegleObtention`). 
6. En cas de succès, une `Delivrance` est construite et un `CertificationDelivreeEvent` est émis.
7. Le profil de l'apprenant reçoit sa certification persistée en base (via le Repository abstrait).
