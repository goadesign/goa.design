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

Goa-AI étend la philosophie "design-first" de Goa aux systèmes agentiques. Définissez des agents, des ensembles d'outils et des politiques dans un DSL ; générez du code prêt à la production avec des contrats typés, des flux de travail durables et des événements en continu.

---

## Pourquoi Goa-AI ?

### Design-First Agents {#design-first-agents}

**Arrêtez d'écrire un code d'agent fragile. Commencez par des contrats

La plupart des cadres d'agents vous obligent à relier impérativement les invites, les outils et les appels d'API. Lorsque les choses se cassent - et elles se cassent - vous devez déboguer un code éparpillé sans source de vérité claire.

Goa-AI renverse cette situation : **définissez les capacités de votre agent dans un DSL typé**, puis générez l'implémentation. Votre conception *est* votre documentation. Vos contrats *sont* votre validation. Les changements se propagent automatiquement.

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

Lorsque le LLM appelle cet outil avec des arguments invalides - par exemple, une chaîne `code` vide ou `language: "cobol"` - Goa-AI **réessaie automatiquement** avec un message d'erreur de validation. Le LLM voit exactement ce qui n'a pas fonctionné et se corrige. Aucun code manuel de gestion des erreurs n'est nécessaire.

**Avantages:**
- **Source unique de vérité** - Le DSL définit le comportement, les types et la documentation
- **Sécurité au moment de la compilation** - Les charges utiles mal adaptées sont détectées avant l'exécution
- **Clients auto-générés** - invocations d'outils à sécurité de type sans câblage manuel
- **Des modèles cohérents** - Chaque agent suit la même structure
- **Agents autoguidés** - Les erreurs de validation déclenchent des tentatives automatiques avec retour d'information

→ Pour en savoir plus, consultez les pages [DSL Reference](dsl-reference/) et [Quickstart](quickstart/)

---

### Exécuter des arbres {#run-trees-composition}

**Construire des systèmes complexes à partir de pièces simples et observables.**

Les applications d'IA du monde réel ne sont pas des agents uniques, mais des flux de travail orchestrés où les agents délèguent à d'autres agents, où les outils génèrent des sous-tâches et où vous devez tout tracer.

Le **modèle d'arbre d'exécution** de Goa-AI vous donne une exécution hiérarchique avec une observabilité totale. Chaque exécution d'agent a un identifiant unique. Les exécutions enfant sont liées aux parents. Les événements s'enchaînent en temps réel. Déboguez toute défaillance en parcourant l'arbre.

{{< figure src="/images/diagrams/RunTree.svg" alt="Hierarchical agent execution with run trees showing parent-child relationships" class="img-fluid" >}}

**Avantages:**
- **Agent en tant qu'outil** - Tout agent peut être invoqué en tant qu'outil par un autre agent
- **Traçage hiérarchique** - Suivi de l'exécution à travers les frontières de l'agent
- **Défaillances isolées** - Les exécutions des enfants échouent indépendamment ; les parents peuvent réessayer ou se rétablir
- **Topologie de flux** - Les événements remontent le long de l'arbre pour les interfaces utilisateur en temps réel

→ Approfondissement de la [Composition de l'agent](agent-composition/) et de l'[Exécution](runtime/)

---

### Streaming structuré {#structured-streaming}

**Visibilité en temps réel de chaque décision prise par vos agents.**

Les agents "boîte noire" sont un handicap. Lorsque votre agent appelle un outil, commence à réfléchir ou rencontre une erreur, vous devez le savoir *immédiatement*, pas après que la requête ait expiré.

Goa-AI émet des **événements typés** tout au long de l'exécution : `assistant_reply` pour le texte en continu, `tool_start`/`tool_end` pour le cycle de vie de l'outil, `planner_thought` pour la visibilité du raisonnement, `usage` pour le suivi des jetons. Les événements transitent par une simple interface **Sink** vers n'importe quel transport et, en production, les UIs consomment un flux **détenu par la session** (`session/<session_id>`) et ferment à l’observation de `run_stream_end` pour l’exécution active.

```go
// Wire a sink at startup — all events from all runs flow through it
rt := runtime.New(runtime.WithStream(mySink))
```

*les *profils de flux** filtrent les événements pour différents consommateurs : `UserChatProfile()` pour les interfaces utilisateur, `AgentDebugProfile()` pour les vues des développeurs, `MetricsProfile()` pour les pipelines d'observabilité. Les puits intégrés pour Pulse (Redis Streams) permettent une diffusion en continu distribuée entre les services.

**Avantages:**
- **Agrément de transport** - Les mêmes événements fonctionnent sur WebSocket, SSE, Pulse, ou des backends personnalisés
- **Contrats typés** - Pas d'analyse de chaîne ; les événements sont fortement typés avec des charges utiles documentées
- **Livraison sélective - Les profils de flux filtrent les événements par consommateur
- **Prêt pour le multi-tenant** - Les événements portent `RunID` et `SessionID` pour le routage et le filtrage

→ Détails de la mise en œuvre dans [Production Streaming] (production/#streaming-ui)

---

### Durabilité temporelle {#temporal-durability}

**Les agents qui survivent aux pannes, aux redémarrages et aux défaillances du réseau.**

Sans durabilité, un processus bloqué perd toute progression. Un appel d'API à taux limité fait échouer l'ensemble de l'exécution. Une défaillance du réseau au cours de l'exécution d'un outil implique de réexécuter une inférence coûteuse.

Goa-AI utilise **Temporal** pour une exécution durable. Les exécutions d'agents deviennent des flux de travail ; les appels d'outils deviennent des activités avec des tentatives configurables. Chaque transition d'état est conservée. Un outil qui tombe en panne réessaie automatiquement -*sans* ré-exécuter l'appel LLM qui l'a produit.

```go
// Development: in-memory (no dependencies)
rt := runtime.New()

// Production: Temporal for durability
eng, _ := temporal.New(temporal.Options{
    ClientOptions: &client.Options{HostPort: "localhost:7233"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "my-agents"},
})
rt := runtime.New(runtime.WithEngine(eng))
```

**Avantages:**
- **Pas d'inférence inutile** - Les outils ayant échoué réessayent sans rappeler le LLM
- **Récupération en cas de crash** - Redémarrage des travailleurs à tout moment ; les exécutions reprennent à partir du dernier point de contrôle
- **Gestion de la limite de taux** - Le backoff exponentiel absorbe l'étranglement de l'API
- **Sécurité des déploiements** - Les déploiements continus ne perdent pas le travail en cours

→ Guide d'installation et configuration de la reprise dans [Production] (production/#temporal-setup)

---

### Registres d'outils {#tool-registries}

**Découvrez et consommez des outils à partir de n'importe où - votre cluster ou le nuage public.**

Avec le développement des écosystèmes d'IA, les outils sont omniprésents : services internes, API tierces, registres MCP publics. Le codage en dur des définitions d'outils n'est pas évolutif. Vous avez besoin d'une découverte dynamique.

Goa-AI fournit un **registre interne groupé** pour vos propres ensembles d'outils et **fédération** avec des registres externes comme le catalogue MCP d'Anthropic. Définissez une fois, découvrez partout.

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

**Registre interne en grappe:**

Plusieurs nœuds de registre portant le même nom forment automatiquement un cluster via Redis. État partagé, contrôles de santé coordonnés, mise à l'échelle horizontale, tout est automatique.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Agent-registry-provider topology showing gRPC and Pulse Streams connections" class="img-fluid" >}}

**Avantages:**
- **Découverte dynamique** - Les agents trouvent les outils au moment de l'exécution et non de la compilation
- **Mise à l'échelle multi-cluster** - Les nœuds du registre se coordonnent automatiquement via Redis
- **Fédération de registres publics** - Importation d'outils à partir d'Anthropic, OpenAI, ou tout autre registre MCP
- **Surveillance de l'état de santé** - Vérifications automatiques des ping/pong avec des seuils configurables
- **Importation sélective** - Inclure/exclure des modèles pour un contrôle granulaire

→ En savoir plus dans [Intégration MCP](mcp-integration/) et [Production](production/)

---

## Résumé des caractéristiques principales

| Caractéristiques de l'offre de l'entreprise
|---------|--------------|
| [Design-First Agents](#design-first-agents) | Définition d'agents en DSL, génération de code à sécurité de type |
| Intégration MCP](mcp-integration/) | Support natif du protocole Model Context | | Registres d'outils](mcp-integration/)
| | Registres d'outils](#tool-registries) | Découverte en grappe + fédération de registres publics |
| [Run Trees](#run-trees-composition) | Agents appelant des agents avec une traçabilité complète |
| Événements typés en temps réel pour les interfaces utilisateur et l'observabilité |
| Durabilité temporelle](#temporal-durability) | Exécution tolérante aux fautes qui survit aux défaillances |
| [Contrats typés](dsl-reference/) | Sécurité de type de bout en bout pour toutes les opérations de l'outil |

## Guides de documentation

| Guide de l'utilisateur - Description - ~Tokens - ~Tokens - ~Tokens - ~Tokens - ~Tokens
|-------|-------------|---------|
| [Quickstart](quickstart/) | Installation et premier agent | ~2,700 |
| DSL Reference](dsl-reference/) | DSL complet : agents, toolsets, policies, MCP | ~3,600 |
| [Runtime](runtime/) | Architecture du runtime, boucle plan/execute, moteurs | ~2,400 |
| [Outils](toolsets/) | Types d'outils, modèles d'exécution, transformations | ~2 300 |
| Composition de l'agent](agent-composition/) | Agent en tant qu'outil, arbres d'exécution, topologie de streaming | ~1.400 |
| [Intégration MCP](mcp-integration/) | Serveurs MCP, transports, wrappers générés | ~1,200 |
| [Mémoire et sessions](memory-sessions/) | Transcriptions, mémoires, sessions, exécutions | ~1.600 |
| Production](production/) | Configuration temporelle, interface utilisateur en continu, intégration de modèles | ~2 200 |
| [Test et dépannage](testing/) | Agents de test, planificateurs, outils, erreurs courantes | ~2 000 |

**Total de la section:** ~21 400 jetons

## Architecture

Goa-AI suit un pipeline **define → generate → execute** qui transforme les conceptions déclaratives en systèmes d'agents prêts à la production.

{{< figure src="/images/goa-ai-architecture.svg" alt="Goa-AI Architecture" class="img-fluid" >}}

**Layer Overview:**

| Couche - Objectif - Objectif - Objectif - Objectif
|-------|---------|
| La couche de base est composée de deux couches : **DSL** | Déclarer les agents, les outils, les politiques et les intégrations externes dans un code Go à version contrôlée
| La couche d'exécution a pour but de générer des spécifications, des codecs, des définitions de flux de travail et des clients de registre sécurisés par type, sans jamais modifier `gen/` | La couche d'exécution a pour but d'exécuter les tâches de la couche d'exécution
| Le moteur d'exécution exécute la boucle plan/exécution avec l'application de la politique, la persistance de la mémoire et le flux d'événements
| Le moteur d'exécution de la boucle plan/exécution avec persistance de la mémoire et flux d'événements
| Les caractéristiques de l'application sont les suivantes : - Branchez des fournisseurs de modèles (OpenAI, Anthropic, AWS Bedrock), de la persistance (Mongo), du streaming (Pulse) et des registres (AWS)

**Points d'intégration clés:**

- **Clients de modèle** - Fournisseurs LLM abstraits derrière une interface unifiée ; basculez entre OpenAI, Anthropic, ou Bedrock sans changer le code de l'agent
- **Registre** - Découvrez et invoquez des ensembles d'outils à travers les frontières de processus ; mis en cluster via Redis pour une mise à l'échelle horizontale
- **Pulse Streaming** - Bus d'événements en temps réel pour les mises à jour de l'interface utilisateur, les pipelines d'observabilité et la communication inter-services
- **Moteur temporel** - Exécution durable de flux de travail avec tentatives automatiques, relecture et récupération en cas de panne

### Fournisseurs de modèles et extensibilité {#model-providers}

Goa-AI fournit des adaptateurs de première classe pour trois fournisseurs LLM :

- **OpenAI** (`features/model/openai`)
- **Anthropic Claude** (`features/model/anthropic`)
- **AWS Bedrock** (`features/model/bedrock`)

Ces trois modèles mettent en œuvre la même interface `model.Client` utilisée par les planificateurs. Les applications enregistrent les clients modèles avec le runtime en utilisant `rt.RegisterModel("provider-id", client)` et s'y réfèrent par ID à partir des planificateurs et des configurations d'agents générées, de sorte que l'échange de fournisseurs est un changement de configuration plutôt qu'une refonte.

L'ajout d'un nouveau fournisseur suit le même schéma :

1. Implémentez `model.Client` pour votre fournisseur en mappant ses types SDK sur `model.Request`, `model.Response` et `model.Chunk` en continu.
2. En option, enveloppez le client avec un intergiciel partagé (par exemple, `features/model/middleware.NewAdaptiveRateLimiter`) pour la limitation adaptative du débit et les mesures.
3. Appelez `rt.RegisterModel("my-provider", client)` avant d'enregistrer les agents, puis faites référence à `"my-provider"` à partir de vos planificateurs ou de la configuration des agents.

Comme les planificateurs et le moteur d'exécution ne dépendent que de `model.Client`, les nouveaux fournisseurs s'intègrent sans modifier vos conceptions Goa ou le code de l'agent généré.

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

## Pour commencer

Commencez par le guide [Quickstart](quickstart/) pour installer Goa-AI et créer votre premier agent.

Pour une couverture complète du DSL, voir la [Référence DSL](dsl-reference/).

Pour comprendre l'architecture du runtime, voir le guide [Runtime](runtime/).
