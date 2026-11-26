---
title: "Highbay"
weight: 5
description: "Construisez et vérifiez des services Go et des agents IA en séparant les rôles de vos agents de code : confirmez les cas limites dans le navigateur, générez les interfaces Goa et Goa-AI et exécutez des tests de scénario indépendants avant de fusionner."
llm_optimized: true
---

[Highbay](https://github.com/goadesign/highbay) construit et vérifie des services [Goa](/fr/docs/1-goa/) et des agents [Goa-AI](/fr/docs/2-goa-ai/) avec les agents de code que vous utilisez déjà, en séparant celui qui écrit le service de celui qui écrit les tests de scénario conditionnant l’approbation. Vous tranchez les questions produit ouvertes dans votre navigateur, un agent implémente le service face aux interfaces générées par Goa, un second agent écrit les tests de scénario dans son propre espace de travail, et Highbay exécute ces tests acceptés contre le commit candidat avant que vous n'approuviez et fusionniez.

Pour tester la comparaison interactive sur l'exemple de remboursement à `50 $`, consultez la [page Highbay](/fr/highbay/).

## Installation

Highbay fonctionne sur macOS ou Linux et requiert **Go 1.27.3+**, **Git 2.45+** (`user.name` et `user.email` configurés) et **Docker** (utilisé par `check_project` pour compiler et exécuter les tests unitaires du bâtisseur dans des conteneurs Linux).

Installez `hbay` et enregistrez vos agents de code :

```bash
go install github.com/goadesign/highbay/cmd/hbay@latest
hbay up
```

`hbay up` enregistre le serveur MCP `hbay stdio` et la skill `/highbay` (`$highbay` dans Codex) auprès des agents détectés — Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI et VS Code — et démarre [Chorus](/fr/docs/3-ecosystem/chorus/) lorsqu'il est installé. Utilisez `hbay setup -global` pour enregistrer MCP et les skills sans démarrer Chorus. Rechargez votre agent ou ouvrez une nouvelle session s'il était déjà lancé pendant l'installation.

Lorsque le dossier de configuration de [Herdr](https://herdr.dev) (`$HERDR_APP_HOME` ou `~/.config/herdr-app`) existe, l'installation ajoute également le compagnon flottant Highbay dans `mods/highbay/` et associe **Command–Option–Shift–H** (`⌥⌘⇧H`) sur macOS si le raccourci est libre.

---

## Démarrer un projet {#blank-and-example}

Ouvrez un dossier dans votre agent de code et invoquez `/highbay` (`$highbay` dans Codex) :

```text
/highbay — crée un assistant de remboursement : jusqu'à 50 $ donnent un avoir immédiat ; au-delà, un responsable valide.
```

Le premier appel MCP Highbay démarre ou rejoint le serveur local du projet, enregistre votre session active comme `guide` et appelle `open_views` pour ouvrir la page dans le navigateur.

Lorsque le dossier n'est pas encore initialisé, votre agent appelle `init_project(dir: ".")` (en dérivant `example.com/<dossier>` si aucun chemin de module Go n'a été précisé ; la première initialisation prend deux ou trois minutes le temps de télécharger et compiler les modules Go) :

- **Nouvel espace de travail (`worked_example: false`, par défaut)** : `init_project` et `hbay init` créent une structure à deux modules Go (`<module>` et `<module>/eval`) avec Goa, Goa-AI, Model et Story épinglés dans `go.mod` et un test de démarrage dans `eval/`, prête pour votre propre `Story` et `design/`.
- **Exemple exécutable (`worked_example: true` / `-example`)** : Passez `-example` en CLI ou demandez `worked_example: true` à votre agent pour explorer d'abord un agent Goa-AI complet avec outil, flux `Story` et suite d'évaluation scénarisée :

```bash
hbay init -dir ./demo-shop -module example.com/shop -example
```

- **Dépôts Goa existants** : Adopter Highbay dans un dépôt Goa ou Goa-AI existant requiert au moins un commit Git ainsi qu'une suite `<module>/eval` au format Highbay ou un programme de test enregistré via `hbay verification set` (lorsqu'une suite enregistrée est configurée, Highbay l'exécute à chaque changement sans lancer de rédacteur de tests) ; voir [What a build adds](https://github.com/goadesign/highbay/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds). Notez que `hbay gen` et `generate_code` prennent en charge les designs HTTP, JSON-RPC et MCP ; les transports gRPC sont refusés aujourd'hui car la finalisation `protoc` n'est pas embarquée.

{{< highbay-views >}}

---

## Rôles et responsabilités {#workflow}

Lorsqu'une seule session d'agent écrit à la fois l'application et les tests chargés de la vérifier, les questions produit laissées ouvertes sont tranchées silencieusement et encodées des deux côtés. Highbay sépare ces responsabilités dans des copies de travail et des identifiants MCP distincts :

| Participant | Connexion | Responsabilité |
|-------------|-----------|----------------|
| **Vous** | Page navigateur | Répondre aux questions ouvertes sur la Change Card, inspecter l'aperçu d'architecture, lancer les builds, enregistrer l'approbation et fusionner sur votre branche locale |
| **Guide** | MCP `highbay` (rôle `guide`) | Votre session d'agent active ; initialise les dossiers vides, rédige les flux `Story` et le design Goa, et propose ou révise les Change Cards |
| **Test Writer** | MCP `highbay` (copie `.highbay-tests`) | Écrit un test de scénario par flux `Story` terminé dans `eval/` à partir de la Change Card confirmée sans modifier le code du service |
| **Builder** | MCP `highbay` (copie `.highbay-build`) | Exécute `generate_code` pour matérialiser `design/` et `gen/`, implémente la logique métier, contrôle dans un conteneur Linux et demande la vérification |
| **Serveur Highbay** | Processus local par projet | Applique les permissions par rôle, compile et accepte les suites `eval/`, construit les binaires candidats épinglés par empreinte, exécute la vérification et enregistre les approbations |

---

## Pourquoi la génération de code change le travail des agents {#codegen}

Lorsqu’un agent de code écrit à la main les routeurs HTTP, les gestionnaires JSON-RPC, les serveurs MCP, la validation des requêtes et les schémas JSON d’outils, il dépense des tokens sur un travail que Goa peut générer et laisse les conventions varier d’un tour à l’autre. Highbay intègre la génération au build convenu en séparant chaque responsable :

- **`gen/` du service (`generate_code`)** : Lorsque le bâtisseur lance `generate_code`, Highbay écrit le `design/` convenu du build ouvert dans `.highbay-build` et exécute les générateurs Goa et Goa-AI épinglés pour remplacer `gen/` — produisant gestionnaires, clients typés, codecs et validation structurelle pour les transports HTTP, JSON-RPC et MCP déclarés, ainsi que les schémas JSON d’outils Goa-AI, liaisons de méthodes, champs injectés, déclarations de confirmation et `AGENTS_QUICKSTART.md` à la racine du module (sauf désactivation). Goa écrit ces fichiers sans tokens de sortie LLM ; l’économie globale dépend du contexte, des itérations et des relectures nécessaires.
- **Un point de départ ciblé** : Les modifications commencent par `design/` et les interfaces Go générées pertinentes plutôt que de charger chaque fichier de transport et de schéma dans le prompt.
- **Une forme générée uniforme entre les modèles** : Régénérer `gen/` avec un même compilateur garde le code de transport, de validation et de schémas d’outils cohérent, que la logique autour ait été écrite par Claude, Codex ou Gemini.
- **Contrôles du compilateur et du serveur entre les rôles** : Donner un nouveau type de retour à une méthode puis régénérer fait échouer `go build` sur les gestionnaires renvoyant l’ancien type (tandis que les appels d’outils invalides produits par un modèle sont rejetés à l’exécution). Séparément, Highbay écrit les flux `Story` requis dans `eval/design/story_tests.go` lors de la lecture ou du contrôle de la tâche du rédacteur de tests, compile `eval/gen/`, vérifie que la suite liste chaque scénario requis et refuse lors de `verify_change` tout commit dont `design/` diffère de la révision convenue.

Pour structurer vos contrats Goa et Goa-AI avec des agents, consultez [Développer avec un agent de code](/fr/docs/ai-development/).

---

## Cinq points de contrôle (`CP1`–`CP5`) {#checkpoints}

Chaque aperçu d'architecture, commit de tests accepté, cible en direct, exécution de vérification et approbation est lié à l'empreinte exacte `request_revision` de la Change Card :

1. **`CP1` — Valider une Change Card** : Votre agent évalue une `Story` (`github.com/goadesign/highbay/story/dsl`) dans son brouillon isolé et propose une Change Card résumant le changement, les questions produit ouvertes, les exemples concrets d'acceptation et les comportements préservés. Vous répondez aux questions et confirmez la carte dans votre navigateur.
2. **`CP2` — Prévisualiser l'architecture** : Inspectez les conteneurs C4, les politiques d'agents Goa-AI et les garde-fous d'outils déclarés par le design Goa et [Model](/fr/docs/3-ecosystem/model/) dans **Architecture** avant de lancer les agents.
3. **`CP3` — Ajuster les prompts en direct (optionnel)** : Lorsque votre service inclut un agent Goa-AI et que vous configurez une clé fournisseur ou une passerelle modèle, le bâtisseur peut démarrer une copie en direct du commit candidat et tester des surcharges de prompts avant de commiter.
4. **`CP4` — Vérification indépendante** : Highbay compile et contrôle le module `eval/` du rédacteur de tests sur la branche `highbay/tests-<n>` avant d'accepter ce commit de tests, puis compile le commit candidat du bâtisseur et exécute contre lui le commit de tests accepté (aucune clé API modèle n'est requise sauf si votre suite `eval/` appelle un fournisseur en direct). Lorsqu'un opérateur configure un évaluateur séparé avec des tests holdout, Highbay affiche le résultat de chaque holdout sous un nom anonyme et omet son nom, ses contrôles et ses diagnostics dans les rapports visibles par le bâtisseur (`Report.ForBuilders()` ; le rédacteur de tests ne peut pas soumettre de holdouts).
5. **`CP5` — Approuver et fusionner** : Consultez le rapport de scénarios dans **Approve**, enregistrez votre approbation (avec vérification optionnelle de l'empreinte du binaire de livraison si la promotion est configurée), puis cliquez sur **Merge into current branch** pour fusionner les commits vérifiés de code et de tests sur votre branche locale.

---

## Fenêtres côte à côte dans Herdr ou travailleurs en arrière-plan {#herdr}

Dans la vue **Build**, vous choisissez en ligne l'agent et le modèle de chaque rôle (mémorisés par projet). Lorsque plusieurs familles d'agents sont installées (par exemple Claude Code et Codex), Highbay privilégie des familles différentes pour le bâtisseur et le rédacteur de tests ; un seul CLI installé peut aussi assurer les deux rôles :

| Mode d'exécution | Quand il s'applique | Fonctionnement |
|------------------|---------------------|----------------|
| **Herdr + Chorus** | [Herdr](https://herdr.dev) (`herdr-core`, `herdr-app`) et [Chorus](/fr/docs/3-ecosystem/chorus/) (`chorus up`) sont disponibles | Adopte la fenêtre active de votre agent lorsqu'elle est compatible, ouvre `builder` et `test_writer` à ses côtés pendant **Build** et referme automatiquement les fenêtres de travail après fusion ou abandon. Appuyez sur **⌥⌘⇧H** sur macOS pour ouvrir le compagnon Highbay. |
| **Travailleurs en arrière-plan** | Herdr n'est pas installé ou ne tourne pas | Exécute `builder` et `test_writer` comme processus CLI non interactifs supervisés par le serveur sans nécessiter Herdr ni Chorus après confirmation dans **Build**. |

---

## Architecture et limites de processus {#architecture}

{{< figure src="/images/diagrams/HighbayArchitecture.svg" alt="Architecture Highbay montrant Guide Agent, Browser Page, Highbay Server, Test Writer, Builder et Verifier" class="img-fluid" >}}

1. **DSL portable `Story` (`github.com/goadesign/highbay/story/dsl`)** : Déclare acteurs, flux (`StartsWith`, `Step`, `Outcome`) et questions ouvertes `Question` en Go à côté de `design/`. Chaque flux terminé exige un test de scénario correspondant dans `eval/` pour qu'un build compte (Highbay vérifie que chaque scénario requis est déclaré et l'exécute ; il ne juge pas si les assertions écrites dans le test suffisent).
2. **Génération Goa et Goa-AI (`generate_code`)** : Highbay matérialise le `design/` convenu dans `.highbay-build` et exécute de façon atomique les générateurs Goa et Goa-AI épinglés afin qu'aucun agent ne modifie `gen/` à la main.
3. **Acceptation du module de tests (`internal/testwriter`)** : Avant que les tests ne comptent, Highbay régénère la table des tests Story, vérifie qu'aucun fichier hors de `eval/` n'a changé, compile le binaire de test et enregistre le commit accepté sur `highbay/tests-<n>`.
4. **Vérification candidate et exécution locale (`verify/candidate`)** : Les identifiants par rôle limitent ce que chaque rôle peut appeler dans Highbay — vous seul pouvez confirmer une Change Card, enregistrer une approbation ou fusionner. Les agents, l'évaluation du design, les binaires candidats et les suites `eval/` s'exécutent comme groupes de processus locaux ordinaires sous votre session utilisateur avec vos accès aux fichiers et au réseau, tandis que `check_project` exécute la compilation et les tests unitaires dans des conteneurs Docker locaux.

## Voir aussi

- [Dépôt GitHub Highbay](https://github.com/goadesign/highbay) — Code source, `HOW_IT_WORKS.md`, `REFERENCE.md` et `story/dsl`
- [Page Highbay](/fr/highbay/) — Comparaison interactive et visite des quatre vues navigateur
- [Documentation Chorus](/fr/docs/3-ecosystem/chorus/) — Coordination multi-agents `#channel` et `@agent` utilisée par les fenêtres Herdr
- [Développer avec un agent de code](/fr/docs/ai-development/) — Flux piloté par le contrat avec Goa et Goa-AI
