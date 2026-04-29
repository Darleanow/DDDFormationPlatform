# BC2 - Learning Catalog

Ce module (Bounded Context) gère le catalogue de formation de la plateforme. Il permet de naviguer dans la hiérarchie pédagogique, de consulter les contenus et de vérifier les prérequis d'accès.

## 🏗️ Architecture & Ubiquitous Language

Le catalogue suit une hiérarchie stricte :
**Programme** → **Cours** → **Module** → **Leçon** → **Exercice**

### Termes clés :
- **Programme** : Ensemble cohérent de formations (ex: "Mastering TypeScript").
- **Cours** : Unité pédagogique thématique (ex: "Types Avancés").
- **Module** : Subdivision d'un cours. C'est l'unité de base pour la gestion des **prérequis**.
- **Leçon** : Unité de contenu atomique (Texte, Vidéo, etc.).
- **Exercice** : Activité pratique rattachée à une leçon.
- **Compétence** : Tagguée sur les modules/leçons/exercices pour le suivi de progression.
- **Graphe de prérequis** : Graphe orienté acyclique (DAG) définissant l'ordre de dépendance entre les modules.

## 🚀 État actuel (PoC)

Pour faciliter le développement rapide (PoC), la persistance Postgres a été temporairement remplacée par un chargement direct depuis des fichiers CSV.
- **Données sources** : `thirdparties/data/*.csv`
- **Provider** : `CsvCatalogService`
- **Database** : SQLite in-memory (utilisé uniquement pour satisfaire les dépendances TypeORM globales).

## 🛠️ Endpoints API (Tests)

Voici les commandes `curl` pour tester les principaux services.

### 📚 Navigation Catalogue

**Lister les programmes :**
```bash
curl http://localhost:3000/catalog/programmes
```

**Détails d'un programme (ex: TS Mastery) :**
```bash
curl http://localhost:3000/catalog/programmes/p001
```

**Lister les modules d'un cours (ex: Fondamentaux — `course` dans l’URL, « Cours » côté glossaire) :**
```bash
curl http://localhost:3000/catalog/course/c001/modules
```

**Voir les leçons d'un module (`lessons` côté API) :**
```bash
curl http://localhost:3000/catalog/modules/m001/lessons
```

**Voir les exercices d'une leçon :**
```bash
curl http://localhost:3000/catalog/lessons/l001/exercises
```

### 🧠 Graphe de Prérequis

**Voir les prérequis directs d'un module :**
```bash
curl http://localhost:3000/catalog/modules/m002/prerequisites
```

**Vérifier l'accès à un module :**
*Simule si l'apprenant peut accéder au module m002 selon ses compétences déjà validées.*

```bash
# Accès refusé (prérequis manquants)
curl "http://localhost:3000/catalog/modules/m002/access"

# Accès accordé (avec compétence c001 validée)
curl "http://localhost:3000/catalog/modules/m002/access?validatedCompetences=c001"
```

### 🏷️ Compétences

**Lister le référentiel de compétences :**
```bash
curl http://localhost:3000/catalog/competences
```

## 🧪 Services Clés

- `CatalogQueryService` : Service d'application pour les lectures catalogue.
- `PrerequisiteGraphService` : Logique métier pour la navigation dans le graphe des dépendances.
- `CsvCatalogService` : Infrastructure de lecture des mocks CSV.
