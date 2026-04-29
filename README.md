# Plateforme de Formation - Architecture DDD

Ce document résume le travail effectué sur la plateforme de formation, en explicitant l'implémentation de chaque Contexte Borné (Bounded Context - BC), les raisons de ces choix architecturaux, et leur fonctionnement global en termes simples.

## Vue d'ensemble : Pourquoi le Domain-Driven Design (DDD) ?

Plutôt que de construire une application monolithique où toutes les données sont mélangées (par exemple, un `User` qui gère à la fois ses notes, ses factures et ses préférences), nous avons découpé le système en **Contextes Bornés (Bounded Contexts)**. 

**Pourquoi ?**
- **Complexité métier** : Les règles métier varient selon les organisations clientes (Tenant). Une université n'évalue pas ses apprenants comme une entreprise forme ses employés.
- **Invariants stricts** : La délivrance d'un certificat est irréversible, et l'échec à une compétence critique doit bloquer cette certification. Le DDD nous force à écrire ces règles explicitement.
- **Langage Ubiquitaire** : Chaque module possède son propre vocabulaire strict (ex. un *Apprenant* dans Identity devient un *Niveau Estimé* dans Assessment). Le code source reflète directement ces termes métier.

---

## Les 6 Contextes Bornés (Bounded Contexts)

Voici l'explication simple de ce que nous avons implémenté pour chaque domaine.

### 1. BC6 · Multi-Tenant Configuration (Fondation Transversale)
*Géré par : Léo*

**Ce que nous avons fait :**
Nous avons créé un système qui gère les "Tenants" (organisations clientes). Ce module permet de définir et de fournir le contexte d'exécution de toutes les requêtes (savoir quelle école ou entreprise utilise l'application à un instant T).

**Pourquoi :**
Pour garantir que les données sont bien isolées (Tenant isolation) et que chaque organisation peut avoir ses propres règles (ex. nombre de tentatives à un examen) sans impacter les autres.

**Comment ça marche :**
Ce BC agit comme un **Open Host Service (OHS)**. Il expose une API pour déterminer quel est le Tenant actuel, permettant aux autres BCs de configurer leurs règles dynamiquement, tout en limitant le couplage technique.

### 2. BC1 · Identity & Enrollment
*Géré par : Léo*

**Ce que nous avons fait :**
Nous avons modélisé les **Apprenants** (Learner) et leurs **Inscriptions** (Enrollments). Dans le code, ce sont ces deux agrégats (`learner.aggregate.ts` et `enrollment.aggregate.ts`) qui portent la logique de l'identité et du contexte d'étude. C'est directement dans l'agrégat *Enrollment* que l'on enregistre les contraintes de l'utilisateur (la *disponibilité hebdomadaire* et la *deadline/échéance*).

**Pourquoi :**
Gérer l'identité de l'apprenant indépendamment de son apprentissage réel. Lorsqu'un étudiant s'inscrit avec des contraintes, l'Inscription (Enrollment) devient le point de vérité pour déclencher la planification de son apprentissage.

**Comment ça marche :**
À l'inscription, un *EnrollmentService* vérifie que l'apprenant appartient bien au bon Tenant. Une fois validée, l'agrégat génère un événement d'intégration (`EnrollmentConfirmedEvent`) qui est diffusé pour informer le moteur adaptatif qu'il faut préparer un plan de cours.

### 3. BC2 · Learning Catalog
*Géré par : Corentin*

**Ce que nous avons fait :**
Nous avons construit l'arbre hiérarchique des contenus : `Programme -> Cours -> Module -> Leçon / Exercice`. Chaque contenu est associé à des *Compétences*. Nous avons aussi implémenté un système de *Prérequis* sous forme de graphe orienté.

**Pourquoi :**
Le système doit savoir quel cours débloque quel autre cours. Les contenus pédagogiques sont structurels, statiques et nécessitent des règles de versioning strictes.

**Comment ça marche :**
C'est principalement un système de gestion (CRUD avancé) qui permet de lire les dépendances. Par exemple, si un apprenant veut commencer "Concurrence avancée", un service vérifie d'abord si le prérequis "Threads fondamentaux" est satisfait.

### 4. BC4 · Assessment (Évaluation)
*Géré par : Gaspard*

**Ce que nous avons fait :**
Nous avons implémenté la logique d'évaluation, de calcul des scores pondérés, et surtout de modélisation du *Niveau Estimé* de l'apprenant. Nous avons également ajouté la détection des anomalies comportementales (ex. répondre beaucoup trop vite).

**Pourquoi :**
L'évaluation est une mécanique propre : elle ne fait que mesurer le niveau de l'apprenant à l'instant T. Elle n'a pas à savoir *quand* ou *comment* le cours est donné, elle se contente d'évaluer la compétence.

**Comment ça marche :**
Un apprenant effectue une *Tentative* sur un *Item d'évaluation*. Un service ajuste dynamiquement la difficulté en fonction de ses réponses précédentes. À la fin, ce BC calcule le *Niveau Estimé* et le diffuse aux autres modules (notamment au BC3) sous forme d'événement.

### 5. BC3 · Adaptive Engine (Cœur du Système)
*Géré par : Enzo*

**Ce que nous avons fait :**
C'est le moteur de la plateforme. Il génère et met à jour dynamiquement le *Parcours d'Apprentissage* d'un apprenant. Il inclut les services de séquençage, de remédiation, d'accélération et de résolution des contraintes de temps.

**Pourquoi :**
Pour personnaliser l'apprentissage. Si un élève comprend vite, on accélère. S'il échoue, on remédie. Et le tout doit tenir dans sa "disponibilité hebdomadaire" jusqu'à la date d'"échéance" (contraintes définies dans le BC1).

**Comment ça marche :**
Ce BC écoute les événements du BC4 (niveaux estimés). S'il détecte un échec, le `RemediationService` insère un module correctif. Si l'élève a un super score, l'`AccelerationService` lui fait sauter des étapes. Une **Couche Anti-Corruption (ACL)** est utilisée pour récupérer les données de BC4 sans que le modèle du moteur ne soit pollué par le format de données des évaluations.

### 6. BC5 · Certification
*Géré par : Anis*

**Ce que nous avons fait :**
Nous avons créé le moteur de règles pour délivrer les certificats. Un apprenant doit avoir un certain score global, valider des compétences clés et surtout n'avoir aucun échec sur une *Compétence critique*.

**Pourquoi :**
La délivrance d'un diplôme obéit à des règles de compliance très strictes. Une délivrance est un acte irréversible. L'isoler garantit qu'aucune erreur dans le moteur de cours n'entraînera une fausse délivrance de certification.

**Comment ça marche :**
Un `RuleEngineService` vérifie que toutes les règles combinées sont satisfaites. Si tout est vert, le `CertificateIssuanceService` émet la certification définitive.


---

L'architecture s'articule autour d'une cartographie stricte des interactions entre nos 6 Contextes Bornés. Voici l'explication des flux illustrés par le diagramme :

1. **BC6 (Multi-Tenant Config) comme Open Host Service (OHS)** :
   - BC6 agit en tant que fournisseur universel (`OHS [U] -> [D]`) pour **tous les autres BCs** (BC1, BC2, BC3, BC4, BC5). Il expose un contrat standard pour la résolution de configuration. Cela lui permet d'évoluer indépendamment tout en protégeant les consommateurs.

2. **Alimentation du Moteur Adaptatif (BC3)** :
   - **BC1 (Identity)** et **BC2 (Catalog)** sont des fournisseurs "Upstream" (`C/S [U] -> [D]`) pour **BC3 (Adaptive Engine)** ("Downstream"). BC3 consomme les contraintes d'apprenant de BC1 et les structures de cours de BC2 pour pouvoir générer les parcours adaptatifs.

3. **Partage minimal des Compétences** :
   - **BC2 (Catalog)** partage la notion de compétence avec **BC4 (Assessment)** et **BC5 (Certification)** via une relation Customer/Supplier (`C/S CompetenceID`). On ne partage que l'identifiant pour éviter un couplage fort avec les métadonnées pédagogiques complexes du catalogue.

4. **Boucle d'Évaluation (BC3 ↔ BC4)** :
   - **BC3** sollicite **BC4** (relation `C/S`) lors du séquençage d'une activité d'évaluation.
   - En retour, **BC3** consomme les résultats de **BC4** à travers une **Couche Anti-Corruption (ACL)** (`ACL <- résultats`). L'ACL traduit et filtre les données : elle protège le cœur de notre système (BC3) afin que toute modification interne à BC4 n'impacte pas le moteur adaptatif.

5. **Validation et Certification (BC5)** :
   - **BC5 (Certification)** est un consommateur en fin de chaîne. Il récupère les scores et les validations de compétences de **BC4** (`C/S [U] -> [D] scores + validations`), ainsi que les informations de **BC3** (`C/S`), afin d'alimenter son moteur de règles et de prendre la décision irréversible de délivrance.

---

## Conclusion

L'architecture choisie maximise l'indépendance des équipes et la cohérence fonctionnelle :
1. Les **Tenants (BC6)** et l'**Identité (BC1)** fournissent le cadre légal et les acteurs.
2. Le **Catalogue (BC2)** fournit le contenu statique.
3. L'**Assessment (BC4)** mesure ponctuellement les compétences.
4. L'**Adaptive Engine (BC3)** orchestre dynamiquement tout cela (C'est le Core Domain).
5. La **Certification (BC5)** scelle les apprentissages par une validation finale.

Les limites entre ces BCs sont strictes. Les objets ne sont pas réutilisés aveuglément d'un module à l'autre, mais passent par des modèles d'intégration bien définis (OHS, C/S, ACL) qui garantissent un découplage sain.

---

## Guide de Démarrage (Monorepo)

Ce projet utilise les espaces de travail (`workspaces`) `npm` pour gérer le monorepo contenant le backend et le frontend.

### Structure du Projet

```text
.
├── backend/     # API NestJS (port 3000)
├── frontend/    # Application Next.js (port 3001)
├── package.json # workspaces + scripts (`npm run dev`)
└── .nvmrc       # Version de Node
```

### Installation

Installez toutes les dépendances depuis la **racine du dépôt** (un seul lockfile) :

```bash
npm install
```

### Lancement

Lancez le backend et le frontend simultanément :

```bash
npm run dev
```

Scripts ciblant uniquement l'API ou l'UI :

```bash
npm run start:dev --workspace=backend
npm run dev --workspace=frontend
```
