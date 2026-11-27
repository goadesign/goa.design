---
title: "Highbay"
weight: 5
description: "Construisez et vérifiez des API, serveurs MCP et workflows IA en séparant les rôles de vos agents de code : confirmez les choix ouverts dans le navigateur, générez 70 % du code Go hors tests (dans le service de référence Orders) et exécutez des tests indépendants avant de fusionner."
llm_optimized: true
---

[Highbay](https://github.com/goadesign/highbay) apporte aux agents de code que vous utilisez déjà un flux structuré pour les API, serveurs MCP et workflows IA. Chaque service partage la même organisation (`design/`, `gen/`, `cmd/`, `internal/`, `eval/`), des règles d'architecture intégrées couvrant l'authentification, les traces OpenTelemetry et journaux tamponnés ([Clue](/fr/docs/3-ecosystem/clue/)), les files Redis Streams et pools de workers ([Pulse](/fr/docs/3-ecosystem/pulse/)) ainsi que les workflows durables, avec la génération déterministe de [Goa](/fr/docs/1-goa/) et [Goa-AI](/fr/docs/2-goa-ai/). Vous tranchez les choix produit et d'autonomie ouverts dans le Studio navigateur, un agent implémente les gestionnaires face aux interfaces Go générées, un second agent écrit les tests de scénario dans sa propre copie Git, et Highbay vérifie ces deux commits avant approbation et fusion.

Pour parcourir l'exemple complet de plateforme d'incidents `ops-copilot`, consultez la [page Highbay](/fr/highbay/).

## Installation

Highbay fonctionne sur macOS ou Linux et utilise **Go 1.27.3+**, **Git 2.45+** (`user.name` et `user.email` configurés) et **Docker** (utilisé par `check_project` pour compiler et exécuter les tests unitaires du bâtisseur dans des conteneurs Linux).

Installez `highbay` et enregistrez vos agents de code via Homebrew, `npx` ou `go install` :

```bash
# macOS ou Linux (Homebrew)
brew install goadesign/tap/highbay
highbay up

# Linux ou macOS (Node.js 18+)
npx @goadesign/highbay up

# Ou avec Go 1.27.3+
go install github.com/goadesign/highbay/cmd/highbay@latest
highbay up
```

`highbay up` enregistre le serveur MCP `highbay stdio` et la skill `/highbay` (`$highbay` dans Codex) auprès des agents détectés (Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI et VS Code) et démarre [Chorus](/fr/docs/3-ecosystem/chorus/) lorsqu'il est installé. Exécutez `highbay update` à tout moment pour mettre à jour sur place le binaire, les skills, les enregistrements MCP et le compagnon Herdr, ou `highbay setup -global` pour enregistrer MCP et les skills sans démarrer Chorus. Highbay figure également sur l'Official MCP Registry (`io.github.goadesign/highbay`), Glama, Serverdex et comme plugin Claude Code (`/plugin marketplace add goadesign/highbay`). Rechargez votre agent ou ouvrez une nouvelle session s'il était déjà lancé pendant l'installation.

Lorsque le dossier de configuration de [Herdr](https://herdr.dev) (`$HERDR_APP_HOME` ou `~/.config/herdr-app`) existe, l'installation ajoute également le compagnon flottant Highbay dans `mods/highbay/` et associe **Command+Option+Shift+H** (`⌥⌘⇧H`) sur macOS si le raccourci est libre.

## Démarrer un projet {#blank-and-example}

Exécutez `highbay` dans un dossier de projet pour ouvrir le Studio dans votre navigateur. Dans un dossier vide, le Studio affiche un compositeur unique (`Describe what you want to build`), lance l'agent de code choisi comme `guide`, publie votre demande dans le volet **Team conversation** de Chorus, initialise l'espace de travail et ouvre la première Change Card dans **Agree** dès qu'elle est prête.

Si une session d'agent tourne déjà dans votre éditeur ou terminal, invoquez directement `/highbay` (`$highbay` dans Codex) :

```text
/highbay Crée une plateforme d'incidents multi-tenant avec des outils MCP pour les logs de pods et les rollbacks soumis à approbation d'astreinte.
```

Le premier appel MCP Highbay démarre ou rejoint le serveur local du projet, enregistre votre session active comme `guide` et appelle `open_views` pour ouvrir le Studio. Utilisez **+ New change** dans l'en-tête du Studio pour confier au guide une nouvelle Change Card en parallèle tout en conservant vos brouillons non enregistrés sur les autres cartes.

Lorsque le dossier n'est pas encore initialisé, votre agent appelle `init_project(dir: ".")` (en dérivant `example.com/<dossier>` si aucun chemin de module Go n'a été précisé ; la première initialisation prend deux ou trois minutes le temps de télécharger et compiler les modules Go) :

- **Nouvel espace de travail (`worked_example: false`, par défaut)** : `init_project` et `highbay init` créent une structure à deux modules Go (`<module>` et `<module>/eval`) avec Goa, Goa-AI, Model et Story épinglés dans `go.mod` et un test de démarrage dans `eval/`, prête pour votre propre `Story` et `design/`.
- **Exemple exécutable (`worked_example: true` / `-example`)** : Passez `-example` en CLI ou demandez `worked_example: true` à votre agent pour explorer d'abord un agent Goa-AI complet avec outil, flux `Story` et suite d'évaluation scénarisée :

```bash
highbay init -dir ./demo-shop -module example.com/shop -example
```

- **Dépôts Goa existants** : Adopter Highbay dans un dépôt Goa ou Goa-AI existant requiert au moins un commit Git ainsi qu'une suite `<module>/eval` au format Highbay ou un programme de test enregistré via `highbay verification set` (lorsqu'une suite enregistrée est configurée, Highbay l'exécute à chaque changement sans lancer de rédacteur de tests) ; voir [What a build adds](https://github.com/goadesign/highbay/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds). `highbay gen` et `generate_code` prennent en charge les designs HTTP, JSON-RPC et MCP ; les transports gRPC sont refusés car la finalisation `protoc` n'est pas embarquée.

{{< highbay-views >}}

## Rôles et organisation du Studio {#workflow}

Lorsqu'une seule session d'agent écrit à la fois l'application et les tests chargés de la vérifier, les questions produit laissées ouvertes sont tranchées silencieusement et encodées des deux côtés. Highbay sépare ces responsabilités dans des copies de travail et des identifiants MCP distincts, tandis que le Studio associe l'étape active (**Agree**, **Architecture**, **Build**, **Verify**, **Approve**) au volet fixe **Team conversation** de Chorus et à un tiroir **Terminal** intégré :

| Participant | Connexion | Responsabilité |
|-------------|-----------|----------------|
| **Vous** | Studio navigateur (`/views`) | Confirmer les questions ouvertes sur la Change Card, demander des révisions ciblées au guide dans **Team conversation**, prévisualiser l'architecture, lancer les builds, observer ou répondre aux terminaux, approuver et fusionner |
| **Guide** | MCP `highbay` (rôle `guide`) | Initialise les dossiers vides, évalue les flux `Story` et le design Goa dans `.highbay-draft`, répond dans Chorus et propose ou révise les Change Cards |
| **Test Writer** | MCP `highbay` (copie `.highbay-tests`) | Écrit un test de scénario par flux `Story` terminé dans `eval/` à partir de la Change Card confirmée sans modifier le code du service |
| **Builder** | MCP `highbay` (copie `.highbay-build`) | Exécute `generate_code` pour matérialiser `design/` et `gen/`, implémente les gestionnaires, contrôle dans un conteneur Linux et demande la vérification |
| **Serveur Highbay** | Processus local par projet | Applique les permissions par rôle, compile et accepte les suites `eval/`, construit les binaires candidats épinglés par empreinte, exécute la vérification et enregistre les approbations |

## Pourquoi la génération de code change le travail des agents {#codegen}

Écrire à la main les routeurs HTTP, les gestionnaires JSON-RPC, les serveurs MCP, la validation des requêtes et les schémas JSON d'outils consomme des tokens sur du code répétitif et laisse les conventions dériver d'un tour à l'autre. Highbay intègre la génération au build convenu en séparant chaque responsable :

- **`gen/` du service (`generate_code`)** : Lorsque le bâtisseur lance `generate_code`, Highbay écrit le `design/` convenu du build ouvert dans `.highbay-build` et exécute les générateurs Goa et Goa-AI épinglés pour remplacer `gen/`. Cela produit gestionnaires, clients typés, codecs et validation structurelle pour les transports HTTP, JSON-RPC et MCP déclarés, ainsi que les schémas JSON d'outils Goa-AI, liaisons de méthodes, champs injectés côté serveur, portes de confirmation et `AGENTS_QUICKSTART.md` à la racine du module (sauf désactivation). Goa écrit 70 % du code Go hors tests dans le service de référence `Orders` sans dépenser de tokens de sortie modèle ; la consommation globale dépend du contexte, des itérations et des relectures nécessaires.
- **Point de départ ciblé** : Les modifications commencent par `design/` et les interfaces Go générées pertinentes sans charger chaque fichier de transport et de schéma dans le prompt.
- **Forme générée uniforme entre modèles** : Régénérer `gen/` avec un même compilateur garde le code de transport, de validation et de schémas d'outils cohérent avec Claude, Codex ou Gemini.
- **Contrôles du compilateur et du serveur entre rôles** : Donner un nouveau type de retour à une méthode puis régénérer fait échouer `go build` sur les gestionnaires renvoyant l'ancien type, tandis que les appels d'outils invalides produits par un modèle sont rejetés à l'exécution. Séparément, Highbay écrit les flux `Story` requis dans `eval/design/story_tests.go` lors de la lecture ou du contrôle de la tâche du rédacteur de tests, génère le lanceur Go dans `eval/gen/`, compile le programme de tests pour vérifier sa liste de scénarios et refuse lors de `verify_change` tout commit dont `design/` diffère de la révision convenue.

Pour structurer vos contrats Goa et Goa-AI avec des agents, consultez [Développer avec un agent de code](/fr/docs/ai-development/).

## Cinq points de contrôle (`CP1` à `CP5`) {#checkpoints}

Chaque aperçu d'architecture, commit de tests accepté, cible en direct, exécution de vérification et approbation est lié à l'empreinte exacte `request_revision` de la Change Card :

1. **`CP1` : Valider une Change Card** : Votre agent évalue une `Story` (`github.com/goadesign/highbay/story/dsl`) dans sa copie `.highbay-draft` et propose une Change Card résumant le changement, les questions produit ouvertes, les exemples concrets d'acceptation et les comportements préservés. Vous répondez aux questions, demandez une révision dans **Team conversation** si vos réponses modifient le brouillon, puis confirmez la carte dans **Agree**.
2. **`CP2` : Prévisualiser l'architecture** : Inspectez les conteneurs C4, les politiques d'agents Goa-AI et les garde-fous d'outils déclarés par le design Goa et [Model](/fr/docs/3-ecosystem/model/) dans **Architecture**, ou cliquez sur **Ask Guide** sur un conteneur pour en discuter dans **Team conversation**.
3. **`CP3` : Ajuster les prompts en direct (optionnel)** : Lorsque votre service inclut un agent Goa-AI et que vous configurez une clé fournisseur ou une passerelle modèle, le bâtisseur peut démarrer une copie en direct du commit candidat et tester des surcharges de prompts dans **Live target** avant de commiter.
4. **`CP4` : Vérifier le candidat** : Highbay compile et contrôle le module `eval/` du rédacteur de tests sur la branche `highbay/tests-<n>` avant d'accepter ce commit de tests, puis compile le commit candidat du bâtisseur et exécute contre lui le commit de tests accepté dans **Verify** (aucune clé API modèle n'est requise sauf si votre suite `eval/` appelle un fournisseur en direct). En cas d'échec, **Message Builder** ouvre le compositeur adressé à `builder` avec les références du test. Lorsqu'un opérateur configure un évaluateur séparé avec des tests holdout, Highbay affiche le résultat de chaque holdout sous un nom anonyme et omet son nom, ses contrôles et ses diagnostics dans les rapports visibles par le bâtisseur (`Report.ForBuilders()` ; le rédacteur de tests ne peut pas soumettre de holdouts).
5. **`CP5` : Approuver et fusionner** : Consultez le rapport de scénarios validés dans **Approve**, enregistrez votre approbation (avec vérification optionnelle de l'empreinte du binaire de livraison si la promotion est configurée), puis cliquez sur **Merge into current branch** pour fusionner les commits vérifiés de code et de tests sur votre branche locale.

## Terminaux en direct, fenêtres Herdr et travailleurs en arrière-plan {#herdr}

Dans **Build**, vous choisissez en ligne l'agent et le modèle de chaque rôle (mémorisés par projet). Lorsque plusieurs familles d'agents sont installées (par exemple Claude Code et Codex), Highbay privilégie des familles différentes pour le bâtisseur et le rédacteur de tests ; un seul CLI installé peut aussi assurer les deux rôles :

| Mode d'exécution | Quand il s'applique | Fonctionnement |
|------------------|---------------------|----------------|
| **Herdr + Chorus** | [Herdr](https://herdr.dev) (`herdr-core`, `herdr-app`) et [Chorus](/fr/docs/3-ecosystem/chorus/) (`chorus up`) sont disponibles | Adopte la fenêtre active de votre agent lorsqu'elle est compatible, exécute `builder` et `test_writer` dans des PTY gérés, diffuse les messages Chorus dans **Team conversation** et permet d'observer le terminal de chaque rôle en lecture seule dans le tiroir **Terminal** du Studio (en basculant sur **Type in terminal** lorsqu'un rôle attend une réponse). Appuyez sur **⌥⌘⇧H** sur macOS pour ouvrir le compagnon Highbay. |
| **Travailleurs en arrière-plan** | Herdr n'est pas installé ou ne tourne pas | Exécute `builder` et `test_writer` comme processus CLI non interactifs supervisés par le serveur sans nécessiter Herdr ni Chorus après confirmation dans **Build**. |

## Architecture et limites de processus {#architecture}

{{< figure src="/images/diagrams/HighbayArchitecture.svg" alt="Architecture Highbay montrant Guide Agent, Browser Studio, Highbay Server, Test Writer, Builder et Verifier" class="img-fluid" >}}

1. **DSL portable `Story` (`github.com/goadesign/highbay/story/dsl`)** : Déclare acteurs, flux (`StartsWith`, `Step`, `Outcome`) et questions ouvertes `Question` en Go à côté de `design/`. Chaque flux terminé exige un test de scénario correspondant dans `eval/` pour qu'un build compte (Highbay vérifie que chaque scénario requis est déclaré et l'exécute ; il ne juge pas si les assertions écrites dans le test suffisent).
2. **Génération Goa et Goa-AI (`generate_code`)** : Highbay matérialise le `design/` convenu dans `.highbay-build` et exécute de façon atomique les générateurs Goa et Goa-AI épinglés afin qu'aucun agent ne modifie `gen/` à la main.
3. **Acceptation du module de tests (`internal/testwriter`)** : Avant que les tests ne comptent, Highbay régénère la table des tests Story, vérifie qu'aucun fichier hors de `eval/` n'a changé, compile le binaire de test et enregistre le commit accepté sur `highbay/tests-<n>`.
4. **Vérification candidate et exécution locale (`verify/candidate`)** : Les identifiants par rôle limitent ce que chaque rôle peut appeler dans Highbay, de sorte que vous seul pouvez confirmer une Change Card, enregistrer une approbation ou fusionner. Les agents, l'évaluation du design, les binaires candidats et les suites `eval/` s'exécutent comme groupes de processus locaux ordinaires sous votre session utilisateur avec vos accès aux fichiers et au réseau, tandis que `check_project` exécute la compilation et les tests unitaires dans des conteneurs Docker locaux.

## Voir aussi

- [Dépôt GitHub Highbay](https://github.com/goadesign/highbay) : Code source, `HOW_IT_WORKS.md`, `REFERENCE.md` et `story/dsl`
- [Page Highbay](/fr/highbay/) : Parcours interactif du Studio et présentation des capacités
- [Documentation Chorus](/fr/docs/3-ecosystem/chorus/) : Coordination multi-agents `#channel` et `@agent` utilisée dans **Team conversation**
- [Développer avec un agent de code](/fr/docs/ai-development/) : Flux piloté par le contrat avec Goa et Goa-AI
