---
title: "Cadre Goa-AI"
linkTitle: "Goa-AI"
weight: 2
description: "Design-first framework for building agentic, tool-driven systems in Go."
llm_optimized: true
content_scope: "Complete Goa-AI Documentation"
aliases:
---

## Aperçu

Goa-AI étend la philosophie de conception de Goa aux systèmes agentiques. Définir des agents, des ensembles d'outils, des complétions appartenant au service et des politiques dans un DSL ; générez du code prêt pour la production avec des contrats tapés, des flux de travail durables et des événements en streaming.

---

## Pourquoi Goa-AI ?

### Agents axés sur la conception {#design-first-agents}

**Arrêtez d'écrire du code d'agent fragile. Commencez par les contrats.**

La plupart des frameworks d'agents vous obligent à câbler ensemble les invites, les outils et les appels API. Lorsque les choses se cassent (et ce sera le cas), vous déboguez du code dispersé sans source de vérité claire.

Goa-AI inverse ceci : **définissez les capacités de votre agent dans un DSL typé**, puis générez l'implémentation. Votre conception *est* votre documentation. Vos contrats *sont* votre validation. Les modifications se propagent automatiquement.

```go
Agent("assistant", "A helpful coding assistant", func() {
    Use("code_tools", func() {
        Tool("analyze", "Analyze code for issues", func() {
            Args(func() {
                Attribute("code", String, "Source code to analyze", func() {
                    MinLength(1)           // Can't be empty
                    MaxLength(100000)      // Reasonable size limit
                })
                Attribute("language", String, "Programming language", func() {
                    Enum("go", "python", "javascript", "typescript", "rust", "java")
                })
                Required("code", "language")
            })
            Return(AnalysisResult)
        })
    })
})
```

Lorsqu'un planificateur appelle cet outil avec des arguments non valides (par exemple, un `code` vide)
chaîne ou `language: "cobol"` - Goa-AI rejette l'appel à la limite saisie et
renvoie un indice de nouvelle tentative structuré. Votre planificateur peut utiliser cet indice pour demander un
question complémentaire ou réessayez avec des arguments corrigés. Pas d'analyse de chaîne ad hoc
ou un schéma JSON entretenu à la main est requis.

**Avantages:**
- **Source unique de vérité** — Le DSL définit le comportement, les types et la documentation
- **Sécurité au moment de la compilation** — Détectez les charges utiles incompatibles avant l'exécution
- **Clients générés automatiquement** — Appels d'outils de type sécurisé sans câblage manuel
- **Modèles cohérents** — Chaque agent suit la même structure
- **Appels d'outils réparables** — Les erreurs de validation produisent des conseils de nouvelle tentative structurés avec commentaires

→ Apprenez-en davantage dans la [Référence DSL](dsl-reference/) et le [Démarrage rapide](quickstart/)

---

### Complétions directes dactylographiées {#typed-direct-completions}

**Toutes les interactions structurées ne devraient pas être un appel d'outil.**

Parfois, le bon contrat est une réponse finale dactylographiée de l'assistant : aucun outil
invocation, pas d'analyse manuscrite JSON, pas de définition de schéma parallèle cachée dans
texte d'invite.

Goa-AI modélise cela explicitement avec `Completion(...)` sur un service :

```go
var TaskDraft = Type("TaskDraft", func() {
    Attribute("name", String, "Task name")
    Attribute("goal", String, "Outcome-style goal")
    Required("name", "goal")
})

var _ = Service("tasks", func() {
    Completion("draft_from_transcript", "Produce a task draft directly", func() {
        Return(TaskDraft)
    })
})
```

Les noms de réalisation font partie du contrat de sortie structurée. Ils doivent être
1 à 64 caractères ASCII, peuvent contenir des lettres, des chiffres, `_` et `-`, et doivent
commencez par une lettre ou un chiffre.

Codegen émet `gen/<service>/completions/` avec le schéma JSON, des codecs typés,
et des assistants générés qui demandent une sortie structurée imposée par le fournisseur et
décoder la réponse finale de l'assistant via le codec généré. Diffusion en continu
les assistants restent sur la surface brute `model.Streamer` : les morceaux `completion_delta` sont
en aperçu uniquement, exactement un dernier morceau `completion` est canonique et généré
Les assistants `Decode<Name>Chunk(...)` décodent uniquement cette charge utile finale. Les fournisseurs qui
ne pas implémenter la sortie structurée échouer explicitement avec
`model.ErrStructuredOutputUnsupported`.

**Avantages:**
- **Une surface contractuelle** — Réutilisez les types Goa, les validations et `OneOf` pour la sortie directe de l'assistant
- **Pas de JSON analysé manuellement** — Les codecs générés possèdent leurs propres encodage, décodage et validation
- **Sortie structurée neutre par rapport au fournisseur** — L'assistant masque le câblage du fournisseur derrière un API typé.

→ En savoir plus dans la [Référence DSL](dsl-reference/) et [Runtime](runtime/)

---

### Exécuter Trees {#run-trees-composition}

**Construisez des systèmes complexes à partir d'éléments simples et observables.**

Les applications d'IA du monde réel ne sont pas des agents uniques : ce sont des flux de travail orchestrés dans lesquels les agents délèguent à d'autres agents, les outils génèrent des sous-tâches et vous devez tout tracer.

Le **modèle d'arbre d'exécution** de Goa-AI vous offre une exécution hiérarchique avec une observabilité totale. Chaque exécution d'agent possède un ID unique. L'enfant gère le lien avec les parents. Les événements sont diffusés en temps réel. Déboguez tout échec en parcourant l’arborescence.

{{< figure src="/images/diagrams/RunTree.svg" alt="Hierarchical agent execution with run trees showing parent-child relationships" class="img-fluid" >}}

**Avantages:**
- **Agent-as-tool** — N'importe quel agent peut être invoqué en tant qu'outil par un autre agent
- **Traçage hiérarchique** — Suivez l'exécution au-delà des limites des agents
- **Échecs isolés** : les exécutions enfants échouent indépendamment ; les parents peuvent réessayer ou récupérer
- **Topologie de streaming** — Les événements remontent l'arborescence pour UIs en temps réel

→ Plongée en profondeur dans [Composition de l'agent](agent-composition/) et [Exécution](runtime/)

---

### Streaming structuré {#structured-streaming}

**Visibilité en temps réel sur chaque décision prise par vos agents.**

Les agents boîte noire sont un handicap. Lorsque votre agent appelle un outil, commence à réfléchir ou rencontre une erreur, vous devez le savoir *immédiatement*, et non après l'expiration du délai de demande.

Goa-AI émet des **événements typés** tout au long de l'exécution : `assistant_reply` pour le streaming de texte, `tool_start`/`tool_end` pour le cycle de vie de l'outil, `planner_thought` pour la visibilité du raisonnement, `usage` pour le suivi des jetons. Les événements circulent via une simple interface **Sink** vers n'importe quel transport, et la production UIs consomme un seul **flux appartenant à la session** (`session/<session_id>`) et se ferme lorsqu'elle observe `run_stream_end` pour l'exécution active.

```go
// Wire a sink at startup — all events from all runs flow through it
rt := runtime.New(runtime.WithStream(mySink))
```

Les **profils de flux** filtrent les événements pour différents consommateurs : `UserChatProfile()` pour l'utilisateur final UIs, `AgentDebugProfile()` pour les vues des développeurs, `MetricsProfile()` pour les pipelines d'observabilité. Les récepteurs intégrés pour Pulse (Redis Streams) permettent un streaming distribué entre les services.

**Avantages:**
- **Agnostique du transport** — Les mêmes événements fonctionnent sur WebSocket, SSE, Pulse ou des backends personnalisés
- **Contrats typés** — Aucune analyse de chaîne ; les événements sont fortement typés avec des charges utiles documentées
- **Livraison sélective** — Les profils de flux filtrent les événements par consommateur
- **Prêt pour le multi-tenant** — Les événements transportent `RunID` et `SessionID` pour le routage et le filtrage

→ Détails de mise en œuvre dans [Production Streaming](production/#streaming-ui)

---

### Durabilité Temporal {#temporal-durability}

**Les exécutions d'agents survivent aux pannes, aux redémarrages et aux pannes de réseau.**

Sans durabilité, un processus interrompu perd toute progression. Un appel API à débit limité échoue pendant toute l’exécution. Un incident réseau lors de l’exécution de l’outil signifie réexécuter une inférence coûteuse.

Goa-AI utilise **Temporal** pour une exécution durable. Les exécutions d'agents deviennent des workflows ; les appels d'outils deviennent des activités avec des tentatives configurables. Chaque transition d'état est persistante. Un outil en panne réessaye automatiquement, *sans* réexécuter l'appel LLM qui l'a produit.

```go
// Development: in-memory (no dependencies)
rt := runtime.New()

// Production: Temporal for durability
eng, _ := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{HostPort: "localhost:7233"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "my-agents"},
})
rt := runtime.New(runtime.WithEngine(eng))
```

**Avantages:**
- **Aucune inférence inutile** — Les outils ayant échoué réessayent sans rappeler le LLM
- **Récupération après incident** — Redémarrez les travailleurs à tout moment ; les exécutions reprennent depuis le dernier point de contrôle
- **Gestion des limites de débit** — L'intervalle exponentiel absorbe la limitation de API
- **Déploiement sécurisé** : les déploiements continus ne perdent pas le travail en vol

→ Guide d'installation et réessayez la configuration dans [Production](production/#temporal-setup)

---

### Registres d'outils {#tool-registries}

**Découvrez et utilisez des outils où que vous soyez : votre cluster ou le cloud public.**

À mesure que les écosystèmes d'IA se développent, les outils sont partout : services internes, API tierces, registres publics MCP. Les définitions des outils de codage en dur ne sont pas évolutives. Vous avez besoin d’une découverte dynamique.

Goa-AI fournit un **registre interne clusterisé** pour vos propres ensembles d'outils et une **fédération** avec des registres externes comme le catalogue MCP de Anthropic. Définissez une fois, découvrez partout.

```go
// Connect to public registries
var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Security(AnthropicOAuth)
    Federation(func() {
        Include("web-search", "code-execution", "filesystem")
        Exclude("experimental/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})

// Or run your own clustered registry
var CorpRegistry = Registry("corp", func() {
    Description("Internal tool registry")
    URL("https://registry.corp.internal")
    Security(CorpAPIKey)
    SyncInterval("5m")
})
```

**Clustering de registre interne :**

Plusieurs nœuds de registre portant le même nom forment automatiquement un cluster via Redis. État partagé, contrôles de santé coordonnés, mise à l’échelle horizontale : tout est automatique.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Agent-registry-provider topology showing gRPC and Pulse Streams connections" class="img-fluid" >}}

**Avantages:**
- **Découverte dynamique** : les agents trouvent les outils au moment de l'exécution, et non au moment de la compilation.
- **Mise à l'échelle multicluster** — Les nœuds de registre se coordonnent automatiquement via Redis
- **Fédération de registre public** : importez des outils depuis Anthropic, OpenAI ou n'importe quel registre MCP.
- **Surveillance de l'état** — Contrôles ping/pong automatiques avec seuils configurables
- **Import sélectif** — Modèles d'inclusion/exclusion pour un contrôle granulaire

→ En savoir plus dans [Intégration MCP](mcp-integration/) et [Production](production/)

---

## Résumé des principales fonctionnalités

| Fonctionnalité | Ce que vous obtenez |
|---------|--------------|
| [Agents axés sur la conception](#design-first-agents) | Définir des agents dans DSL, générer du code de type sécurisé |
| [Intégration MCP](mcp-integration/) | Prise en charge native de Model Context Protocol |
| [Registres d'outils](#tool-registries) | Découverte en cluster + fédération de registre public |
| [Exécuter des arbres](#run-trees-composition) | Agents appelant des agents avec une traçabilité complète |
| [Diffusion structurée](#structured-streaming) | Événements typés en temps réel pour UIs et observabilité |
| [Durabilité Temporal](#temporal-durability) | Exécution tolérante aux pannes qui survit aux échecs |
| [Contrats tapés](dsl-reference/) | Sécurité de type de bout en bout pour toutes les opérations sur les outils |
| [Remplissions directes saisies](#typed-direct-completions) | Réponses structurées de l'assistant final avec codecs et assistants générés |
| [Résultats limités et données du serveur](toolsets/#server-data) | Résultats de modèles efficaces en jetons ainsi que données serveur uniquement pour UIs et audit |
| [L'humain dans la boucle](runtime/#pause--resume) | Pause, reprise, résultats d'outils externes et confirmation forcée par l'exécution |
| [Outils de comptabilité et de terminal](dsl-reference/#bookkeeping) | Outils de progression/statut qui ne consomment pas de budget de récupération et peuvent mettre fin aux exécutions de manière atomique |
| [Remplacements d'invite](production/#prompt-overrides-with-mongo-store) | Spécifications d'invite de base, ainsi que remplacements et provenance soutenus par Mongo |

## Guides de documentation

| Guide | Description | ~ Jetons |
|-------|-------------|---------|
| [Démarrage rapide](quickstart/) | Installation et premier agent | ~2,700 |
| [Référence DSL](dsl-reference/) | DSL complet : agents, ensembles d'outils, politiques, MCP | ~3,600 |
| [Exécution](runtime/) | Architecture d'exécution, boucle de planification/exécution, moteurs | ~2,400 |
| [Jeux d'outils](toolsets/) | Types d'ensembles d'outils, modèles d'exécution, transformations | ~2,300 |
| [Composition d'agent](agent-composition/) | Agent en tant qu'outil, arborescences d'exécution, topologie de streaming | ~1,400 |
| [Intégration MCP](mcp-integration/) | Serveurs MCP, transports, wrappers générés | ~1,200 |
| [Mémoire et sessions](memory-sessions/) | Transcriptions, mémoires, sessions, exécutions | ~1,600 |
| [Production](production/) | Configuration Temporal, streaming UI, intégration de modèles | ~2,200 |
| [Test et dépannage](testing/) | Agents de test, planificateurs, outils, erreurs courantes | ~2,000 |

**Section totale :** ~21 400 jetons

## Architecture

Goa-AI suit un pipeline **définir → générer → exécuter** qui transforme les conceptions déclaratives en systèmes d'agents prêts pour la production.

{{< figure src="/images/goa-ai-architecture.svg" alt="Goa-AI Architecture" class="img-fluid" >}}

**Aperçu des calques :**

| Couche | But |
|-------|---------|
| **DSL** | Déclarez les agents, les outils, les politiques et les intégrations externes dans le code Go à version contrôlée |
| **Codegen** | Générez des spécifications, des codecs, des définitions de flux de travail et des clients de registre de type sécurisé ; ne modifiez jamais `gen/` |
| **Exécution** | Exécuter la boucle planifier/exécuter avec application des politiques, persistance de la mémoire et streaming d'événements |
| **Moteur** | Backends d'exécution d'échange : en mémoire pour le développement, Temporal pour la durabilité de la production |
| **Caractéristiques** | Fournisseurs de modèles de plug-in (OpenAI, Anthropic, AWS Bedrock), persistance (Mongo), streaming (Pulse) et registres |

**Points d'intégration clés :**

- **Clients modèles** — Fournisseurs LLM abstraits derrière une interface unifiée ; basculer entre OpenAI, Anthropic ou Bedrock sans changer le code de l'agent
- **Registre** – Découvrez et invoquez des ensembles d'outils au-delà des limites des processus ; regroupé via Redis pour une mise à l'échelle horizontale
- **Pulse Streaming** — Bus d'événements en temps réel pour les mises à jour UI, les pipelines d'observabilité et la communication interservices
- **Moteur Temporal** — Exécution de flux de travail durable avec tentatives automatiques, relecture et récupération après incident

### Fournisseurs de modèles et extensibilité {#model-providers}

Goa-AI fournit des adaptateurs de première classe pour trois fournisseurs LLM :

- **OpenAI** (`features/model/openai`)
- **Anthropic Claude** (`features/model/anthropic`)
- **AWS Bedrock** (`features/model/bedrock`)

Tous les trois implémentent la même interface `model.Client` utilisée par les planificateurs. Les applications enregistrent les clients modèles avec le runtime à l'aide de `rt.RegisterModel("provider-id", client)` et y font référence par ID à partir des planificateurs et des configurations d'agent générées, de sorte que l'échange de fournisseurs est un changement de configuration plutôt qu'une refonte.

L'ajout d'un nouveau fournisseur suit le même schéma :

1. Implémentez `model.Client` pour votre fournisseur en mappant ses types de SDK sur `model.Request`, `model.Response` et en diffusant des `model.Chunk`.
2. Encapsulez éventuellement le client avec un middleware partagé (par exemple, `features/model/middleware.NewAdaptiveRateLimiter`) pour une limitation de débit et des métriques adaptatives.
3. Appelez `rt.RegisterModel("my-provider", client)` avant d’enregistrer des agents, puis référencez `"my-provider"` à partir de vos planificateurs ou configurations d’agent.

Étant donné que les planificateurs et le temps d'exécution dépendent uniquement de `model.Client`, les nouveaux fournisseurs se connectent sans modifier vos conceptions Goa ou le code d'agent généré.

## Exemple rapide

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("calculator", func() {
    Description("Calculator service with an AI assistant")
    
    // Define a service method that the tool will bind to
    Method("add", func() {
        Description("Add two numbers")
        Payload(func() {
            Attribute("a", Int, "First number")
            Attribute("b", Int, "Second number")
            Required("a", "b")
        })
        Result(Int)
    })
    
    // Define the agent within the service
    Agent("assistant", "A helpful assistant agent", func() {
        // Use a toolset with tools bound to service methods
        Use("calculator", func() {
            Tool("add", "Add two numbers", func() {
                Args(func() {
                    Attribute("a", Int, "First number")
                    Attribute("b", Int, "Second number")
                    Required("a", "b")
                })
                Return(Int)
                BindTo("add")  // Bind to the service method
            })
        })
        
        // Configure the agent's run policy
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

## Commencer

Commencez par le guide [Quickstart](quickstart/) pour installer Goa-AI et créer votre premier agent.

Pour une couverture complète du DSL, consultez la [Référence DSL](dsl-reference/).

Pour comprendre l'architecture d'exécution, consultez le guide [Runtime](runtime/).
