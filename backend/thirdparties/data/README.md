# Données CSV du catalogue (démo)

Les fichiers nourrissent `CsvCatalogService` (BC2 — Learning Catalog) en mode développement / démo.

## Prérequis modules (`modules.csv`)

- Colonne **`prerequisIds`** : identifiant d’**un** module prérequis (chaîne vide = racine locale).
- **Règle de démo** : les modules suivent une **liste simple** sans branches :  
  **`m002` → préfixe obligatoire `m001`, `m003` → `m002`, …, `m036` → `m035`**.
  Cela garantit :
  - un **graphe orienté sans cycle** (DAG) ;
  - un récit de parcours clair (« fondations → POO → concurrence → … → Chaos engineering ») ;
  - des scénarios Gherkin cohérents (ex. **Threads** avant **Concurrence avancée**, car dans l’ordre `m007` précède `m009`).
- **`competencyIds`** : tags métiers (IDs partagés avec BC4 Assessment, shared kernel minimal).

Ordre fonctionnel hors CSV : **`ordre`** reste utilisé comme position **dans le cours** (`coursId`) tant que plusieurs modules peuvent avoir le même `ordre` relatif après filtrage.

## Fichiers

| Fichier        | Contenu                                              |
|----------------|-------------------------------------------------------|
| `programmes.csv` | Programmes agrégés (tenant)                         |
| `cours.csv`      | Niveau « cours » sous un programme                   |
| `modules.csv`    | Modules + graphe de prérequis                        |
| `competences.csv`| Référentiel compétences (shared kernel léger)       |
| `lecons.csv` / `exercices.csv` | Hiérarchie module → leçon → exercice    |

Pour régénérer des lignes volumineuses hors ce dépôt, voir aussi `thirdparties/rulesmockgenerator.ts`.
