---
title: "Highbay"
weight: 5
description: "Plan de contrôle multi-agents piloté par contrat pour Goa et Goa-AI séparant intention, tests, implémentation et vérification."
llm_optimized: true
---

[Highbay](https://github.com/goadesign/highbay) est un plan de contrôle local pour construire, vérifier et faire évoluer des services [Goa](/fr/docs/1-goa/) et [Goa-AI](/fr/docs/2-goa-ai/) avec des agents de code. Il répartit vos agents en rôles distincts autour d'un contrat compilé, exécute une vérification indépendante avant approbation et fusionne les commits approuvés sur votre branche locale depuis le navigateur.

Pour suivre visuellement un changement à travers chaque rôle, consultez la [page Highbay](/fr/highbay/).

## Aperçu {#workflow}

Lorsqu'un seul agent écrit à la fois le code et les tests chargés de le valider, ses angles morts passent inaperçus et la plomberie de transport écrite à la main dérive au fil des évolutions. Highbay associe la séparation des rôles à la génération déterministe de Goa et Goa-AI :

| Participant | Connexion | Responsabilité |
|-------------|-----------|----------------|
| **Vous** | Page navigateur | Confirmer la Change Card, inspecter l'architecture, lancer les builds, approuver les vérifications réussies et fusionner sur votre branche locale |
| **Guide** | MCP `highbay` (rôle `guide`) | Votre session d'agent active ; initialise les dossiers vides, rédige les flux `Story` et le design Goa, et propose ou révise les Change Cards |
| **Test Writer** | MCP `highbay` (copie `.highbay-tests`) | Écrit un test de scénario par flux `Story` terminé dans `eval/` sans modifier le code applicatif |
| **Builder** | MCP `highbay` (copie `.highbay-build`) | Exécute `generate_code` pour matérialiser `design/` et `gen/`, implémente la logique métier, vérifie dans un conteneur Linux et demande la vérification |
| **Serveur Highbay** | Processus local par projet | Contrôle les permissions par rôle, valide et accepte les suites `eval/`, compile les binaires candidats et exécute la vérification |

## Cinq points de contrôle (`CP1`–`CP5`) {#checkpoints}

Chaque aperçu, suite de tests acceptée, cible en direct, vérification et approbation est rattaché à l'empreinte exacte `request_revision` de la Change Card :

1. **`CP1` — Valider une Change Card** : Votre agent évalue une `Story` (`github.com/goadesign/highbay/story/dsl`) dans son brouillon isolé et propose une Change Card en langage clair (résumé, questions produit ouvertes, exemples d'acceptation concrets et comportements préservés). Vous répondez et confirmez dans le navigateur.
2. **`CP2` — Prévisualiser l'architecture** : Inspectez le diagramme C4 dérivé du design Goa et [Model](/fr/docs/3-ecosystem/model/) dans **Architecture** avant de lancer les agents.
3. **`CP3` — Ajuster les prompts en direct (optionnel)** : Si le service inclut un agent Goa-AI et qu'une clé fournisseur ou passerelle modèle est configurée, le bâtisseur peut démarrer une copie en direct du commit candidat et tester des surcharges de prompts.
4. **`CP4` — Vérification indépendante** : Highbay recompile et contrôle le rapport `eval/` du rédacteur de tests sur `highbay/tests-<n>` avant de l'accepter, puis compile le commit du bâtisseur et exécute contre lui cette suite `eval/` acceptée (sans clé API requise sauf si la suite `eval/` appelle un fournisseur en direct ; l'exemple optionnel `-example` fournit un modèle scénarisé et le contrôle vierge n'utilise aucun modèle). Pour les évaluateurs configurés par l'opérateur, les noms, contrôles et journaux des scénarios holdout sont expurgés des rapports destinés au bâtisseur via `Report.ForBuilders()` (le rédacteur de tests ne peut pas soumettre de holdouts).
5. **`CP5` — Approuver et fusionner** : Examinez le rapport dans **Approve**, enregistrez l'approbation et cliquez sur **Merge into current branch** pour fusionner les commits vérifiés sur votre branche locale.

## Installation

Highbay fonctionne sur macOS ou Linux et requiert **Go 1.27.3+**, **Git 2.45+** (`user.name` et `user.email` configurés) et **Docker** (utilisé par `check_project` pour compiler et tester le travail du bâtisseur dans des conteneurs Linux).

Installez `hbay` et enregistrez vos agents de programmation :

```bash
go install github.com/goadesign/highbay/cmd/hbay@latest
hbay up
```

`hbay up` enregistre le serveur MCP `hbay stdio` et la skill `/highbay` (`$highbay` dans Codex) auprès des clients détectés — Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI et VS Code — et démarre [Chorus](/fr/docs/3-ecosystem/chorus/) s'il est installé. Utilisez `hbay setup -global` pour enregistrer MCP et les skills sans démarrer Chorus.

Lorsque le dossier de configuration Herdr (`$HERDR_APP_HOME` ou `~/.config/herdr-app`) existe, l'installation ajoute aussi le compagnon flottant Highbay dans `mods/highbay/` et associe **Command–Option–Shift–H** (`⌥⌘⇧H`) sur macOS si le raccourci est libre.

---

## Démarrer un projet : coquille vierge par défaut {#blank-and-example}

Ouvrez un dossier vide dans votre agent et invoquez `/highbay` (`$highbay` dans Codex) :

```text
/highbay — build a refund assistant: refunds up to $50 get instant store credit; larger ones wait for a manager.
```

Dans un dossier non initialisé, votre agent appelle `init_project(dir: ".")` (en dérivant `example.com/<dossier>` si aucun chemin de module n'est fourni) :

- **Coquille propre par défaut (`worked_example: false`)** : `init_project` et `hbay init` créent une structure neutre à deux modules Go (`<module>` et `<module>/eval`) avec Goa, Goa-AI, Model et Story épinglés dans `go.mod`, sans endpoints ni agent de démonstration, et un scénario neutre de démarrage dans `eval/`. Votre première Change Card ne décrit que votre produit.
- **Exemple exécutable sur demande (`worked_example: true` / `-example`)** : Pour explorer d'abord un exemple complet d'agent Goa-AI, d'outil, de flux `Story` et de suite scénarisée, passez `-example` en CLI ou demandez `worked_example: true` :

```bash
hbay init -dir ./demo-shop -module example.com/shop -example
```

- **Dépôts Goa existants** : Adopter Highbay dans un dépôt existant requiert un commit Git initial ainsi qu'une suite `<module>/eval` au format Highbay ou des paramètres de vérification configurés (`hbay verification set`) ; voir [What a build adds](https://github.com/goadesign/highbay/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds).

---

## Fenêtres côte à côte dans Herdr ou travailleurs en arrière-plan {#herdr}

Dans la vue **Build**, choisissez directement l'agent, le modèle et les permissions de chaque rôle :

| Mode d'exécution | Quand il s'applique | Fonctionnement |
|------------------|---------------------|----------------|
| **Herdr + Chorus** | `herdr-core`, `herdr-app` et Chorus (`chorus up`) sont disponibles | Relie la fenêtre active de votre agent, ouvre `builder` et `test_writer` à ses côtés pendant **Build** et les referme après fusion ou abandon. Appuyez sur **⌥⌘⇧H** sur macOS pour ouvrir le compagnon Highbay. |
| **Travailleurs en arrière-plan** | Herdr n'est pas installé ou n'est pas utilisé | Lance `builder` et `test_writer` comme processus CLI non interactifs supervisés par le serveur après confirmation dans **Build**, sans Herdr ni Chorus. |

---

## Architecture et limites de confiance {#architecture}

{{< figure src="/images/diagrams/HighbayArchitecture.svg" alt="Architecture Highbay montrant Guide Agent, Browser Page, Highbay Server, Test Writer, Builder et Verifier" class="img-fluid" >}}

1. **DSL portable `Story` (`github.com/goadesign/highbay/story/dsl`)** : Déclare acteurs, flux (`StartsWith`, `Step`, `Outcome`) et questions ouvertes `Question` en Go à côté de `design/`. Chaque flux terminé exige un test de scénario dans `eval/`.
2. **Génération Goa et Goa-AI (`generate_code`)** : Matérialise le `design/` convenu dans `.highbay-build` et exécute les générateurs épinglés sans modification manuelle de `gen/`.
3. **Acceptation des tests (`internal/testwriter`)** : Régénère la table des tests Story, vérifie qu'aucun fichier hors de `eval/` n'a changé, compile le binaire de test et enregistre `highbay/tests-<n>`.
4. **Vérification et processus (`verify/candidate`)** : Les identifiants par rôle séparent les permissions MCP ; pour les évaluateurs configurés, les noms, contrôles et journaux des scénarios holdout sont expurgés des rapports destinés au bâtisseur (le rédacteur de tests ne peut pas soumettre de holdouts). Les agents, l'évaluation du design, les binaires candidats et `eval/` tournent comme processus locaux sous votre compte utilisateur et peuvent lire les fichiers locaux, tandis que `check_project` utilise des conteneurs Docker locaux.

## Voir aussi

- [Dépôt GitHub Highbay](https://github.com/goadesign/highbay) — Code source, `HOW_IT_WORKS.md`, `REFERENCE.md` et `story/dsl`
- [Page Highbay](/fr/highbay/) — Parcours détaillé d'un changement à travers les trois rôles
- [Documentation Chorus](/fr/docs/3-ecosystem/chorus/) — Coordination multi-agents utilisée par les fenêtres Herdr
- [Développer avec un agent de code](/fr/docs/ai-development/) — Flux piloté par le contrat avec Goa et Goa-AI
