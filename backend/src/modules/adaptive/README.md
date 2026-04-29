# BC3 — Adaptive Engine

Ce bounded context est le **cœur du séquençage pédagogique** : il transforme l’inscription d’un apprenant, le catalogue disponible et les retours du **Assessment (BC4)** en un **parcours d’activités** ajustables (remédiation, accélération, contrainte de couverture / échéance).

Le code utilise des identifiants et des noms d’API en **anglais** ; les notions métier restent décrites ci-dessous selon le **langage ubiquitaire** français de la plateforme.

## Langage métier et agrégats

| Terme (glossaire) | Rôle dans le code |
|-------------------|-------------------|
| Parcours d’apprentissage | Agrégat `LearningPath` : liste ordonnée d’**activités** pour un apprenant. |
| Plan d’apprentissage | `LearningPlan` : projection dans le temps (créneaux hebdomadaires, faisabilité vs échéance). |
| Activité | `Activity` : leçon, exercice, remédiation, évaluation référencée par `contentId` (référence au catalogue BC2). |
| Recommandation | `Recommendation` : explication métier (« prochaine activité », priorité obligation de couverture, etc.). |
| Remédiation | Activité corrective insérée quand une compétence n’est pas jugée acquise après évaluation (service `RemediationService`). |
| Accélération | Saut ou condensation de segments du parcours si la maîtrise suffit (`AccelerationService`). |
| Contrainte de couverture | Respect des **compétences obligatoires** et de la **fenêtre disponible** / échéance (`ConstraintSolverService`). |
| Niveau estimé | LU via BC4 puis traduit dans le domaine adaptatif comme besoin (**ACL** côté intégration, pas comme modèle identique BC4→BC3). |

## Services domaine

| Service | Responsabilité |
|---------|----------------|
| `PathSequencingService` | Séquence les activités (ordre initial, mise à jour quand résultats d’évaluation arrivent). |
| `RemediationService` | Propose ou insère des parcours de remédiation. |
| `AccelerationService` | Marque ou propose des segments « sautables » en cas de maîtrise rapide. |
| `ConstraintSolverService` | Vérifie la faisabilité de la couverture des compétences obligatoires compte tenu du volume horaire hebdomadaire et de l’échéance. |

## Intégrations avec les autres BCs

| Flux | Détail technique |
|------|-------------------|
| **BC1 — Identity / Enrollment** | `EnrollmentConfirmedHandler` : à la confirmation d’inscription émise depuis l’identity, construction / mise à jour du parcours (via `IdentityToAdaptiveAdapter` + exposition du catalogue BC2 pour matérialiser les activités). |
| **BC2 — Learning Catalog** | Port `LEARNING_CATALOG_GATEWAY` implémenté par `InternalLearningCatalogGateway` (wrap de `CatalogQueryService`) pour résoudre modules / contenus lors du séquençage et de la remédiation (lookup remédiale). |
| **BC4 — Assessment** | `AssessmentAcl` + `AssessmentToAdaptiveAdapter` : événements / résultats issus BC4 sont **traduits** avant d’affecter le parcours (anti-corruption layer — le modèle interne BC3 ne dépend pas des détails BC4 comme le score brut). |

## Persistence et exposition HTTP (PoC)

- Référence de persistance du parcours : `LearningPathRepository` — implémentation **in-memory** (`LearningPathInMemoryRepository`) tant que la persistance Postgres / TypeORM métier Adaptive n’est pas finalisée.
- Des artefacts ORM/mappers existent pour une future bascule (schémas `LearningPath`/activités dans `infrastructure/persistence/`).

Contrôleur : `AdaptiveController` (`@Controller('adaptive/path')`).

### Exemples `curl`

**Parcours complet + alerte contraintes de couverture (réponse inclut `coverageAtRisk`, `uncoveredCompetences`).**

```bash
curl http://localhost:3000/adaptive/path/<learnerId>
```

**Recommandation (« prochaine » activité + raison).**

```bash
curl http://localhost:3000/adaptive/path/<learnerId>/recommendation
```

**Plan projeté dans le temps (slots hebdomadaires, faisabilité vs deadline).**

```bash
curl http://localhost:3000/adaptive/path/<learnerId>/plan
```

**Marquer l’activité « courante » comme terminée (ordre respecté ; `contentId` optionnel pour cohérence avec la prochaine activité prévue).**

```bash
curl -X POST http://localhost:3000/adaptive/path/<learnerId>/complete-current \
  -H "Content-Type: application/json" \
  -d '{"contentId":"<contentIdCourant>"}'
```

Remplace `<learnerId>` par un identifiant connu dans les données seed (ex. celui défini dans `SeedService`). En développement, un parcours est souvent créé automatiquement à l’inscription simulée.

## Événements domaine émis ou consommés

- **Entrant** : évènements métier relatifs à inscription confirmée ou résultat d’évaluation (voir handlers dans `application/handlers/`).
- **Sortant** : exemple `LearningPathCompletedEvent` lorsque le parcours cible une certification terminée — consommé côté **BC5 Certification** pour l’éligibilité (couplage léger événements in-process configurés dans `AppModule` / `bc-integration`).

## Tests

- Tests domaine (`*.spec.ts`) sur entités (`learning-path`), services (`path-sequencing`, `constraint-solver`, agrégats complets dans `adaptive.domain.spec`).
- Tests d’intégration des adaptateurs (identity, assessment ↔ adaptive).

Voir la suite e2e du dépôt pour les traversées multi-BCs (`bc4-bc3-bc2-integration`, `bc3-bc5-integration`, etc.).
