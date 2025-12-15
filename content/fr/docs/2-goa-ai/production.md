---
title: "Production"
linkTitle: "Production"
weight: 8
description: "Set up Temporal for durable workflows, stream events to UIs, apply adaptive rate limiting, and use system reminders."
llm_optimized: true
aliases:
---

## Limitation du taux de modélisation

Tous les fournisseurs de modèles imposent des limites de débit. Si vous les dépassez, vos demandes échouent avec 429 erreurs. Pire : dans un déploiement multiréplique, chaque réplique martèle indépendamment l'API, provoquant un étranglement *global* invisible pour les processus individuels.

### Le problème

**Scénario : vous déployez 10 répliques de votre service d'agent. Chaque réplique pense qu'elle a 100K tokens/minute disponibles. Ensemble, ils envoient 1M de jetons/minute, soit 10 fois votre quota réel. Le fournisseur d'accès à Internet a mis en place un système d'étranglement agressif. Les demandes échouent de manière aléatoire sur toutes les répliques.

**Sans limitation de débit:**
- Les demandes échouent de manière imprévisible avec 429s
- Aucune visibilité sur la capacité restante
- Les nouvelles tentatives aggravent la congestion
- L'expérience de l'utilisateur se dégrade sous la charge

**Avec la limitation adaptative du débit:**
- Chaque réplique partage un budget coordonné
- Les demandes sont mises en attente jusqu'à ce que la capacité soit disponible
- Le backoff se propage à travers le cluster
- Dégradation progressive au lieu de défaillances

### Vue d'ensemble

Le paquet `features/model/middleware` fournit un **limiteur de débit adaptatif de type AIMD** qui se trouve à la limite du client modèle. Il estime le coût des jetons, bloque les appelants jusqu'à ce que la capacité soit disponible et ajuste automatiquement son budget de jetons par minute en réponse aux signaux de limitation de débit des fournisseurs.

### Stratégie AIMD

Le limiteur utilise une stratégie **Additive Increase / Multiplicative Decrease (AIMD)** :

| Le limiteur utilise une stratégie **d'augmentation additive / de diminution multiplicative (AIMD)** : événement, action, formule
|-------|--------|---------|
| Succès | Sonde (augmentation additive) | `TPM += recoveryRate` (5% de la valeur initiale) | `ErrRateLimited` (5% de la valeur initiale)
| `ErrRateLimited` | Backoff (diminution multiplicative) | `TPM *= 0.5` |

Le nombre effectif de jetons par minute (TPM) est limité par :
- **Minimum** : 10% du TPM initial (plancher pour éviter la famine)
- **Maximum** : Le plafond configuré `maxTPM`

### Utilisation de base

Créez un seul limiteur par processus et enveloppez votre modèle de client :

```go
import (
    "context"

    "goa.design/goa-ai/features/model/middleware"
    "goa.design/goa-ai/features/model/bedrock"
)

func main() {
    ctx := context.Background()

    // Create the adaptive rate limiter
    // Parameters: context, rmap (nil for local), key, initialTPM, maxTPM
    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        nil,     // nil = process-local limiter
        "",      // key (unused when rmap is nil)
        60000,   // initial tokens per minute
        120000,  // maximum tokens per minute
    )

    // Create your underlying model client
    bedrockClient, err := bedrock.NewClient(bedrock.Options{
        Region: "us-east-1",
        Model:  "anthropic.claude-sonnet-4-20250514-v1:0",
    })
    if err != nil {
        panic(err)
    }

    // Wrap with rate limiting middleware
    rateLimitedClient := limiter.Middleware()(bedrockClient)

    // Use rateLimitedClient with your runtime or planners
    rt := runtime.New(
        runtime.WithModelClient("claude", rateLimitedClient),
    )
}
```

### Limitation du débit en fonction des clusters

Pour les déploiements multiprocessus, coordonnez la limitation de débit entre les instances à l'aide d'une carte répliquée par Pulse :

```go
import (
    "context"

    "goa.design/goa-ai/features/model/middleware"
    "goa.design/pulse/rmap"
)

func main() {
    ctx := context.Background()

    // Create a Pulse replicated map backed by Redis
    rm, err := rmap.NewMap(ctx, "rate-limits", rmap.WithRedis(redisClient))
    if err != nil {
        panic(err)
    }

    // Create cluster-aware limiter
    // All processes sharing this map and key coordinate their budgets
    limiter := middleware.NewAdaptiveRateLimiter(
        ctx,
        rm,
        "claude-sonnet",  // shared key for this model
        60000,            // initial TPM
        120000,           // max TPM
    )

    // Wrap your client as before
    rateLimitedClient := limiter.Middleware()(bedrockClient)
}
```

Lors de l'utilisation d'une limitation tenant compte des clusters :
- **Backoff se propage globalement** : Lorsqu'un processus reçoit `ErrRateLimited`, tous les processus réduisent leur budget
- **La prospection est coordonnée** : Les requêtes réussies augmentent le budget partagé
- **Réconciliation automatique** : Les processus surveillent les changements externes et mettent à jour leurs limiteurs locaux

### Estimation des jetons

Le limiteur estime le coût de la demande à l'aide d'une simple heuristique :
- Compte les caractères dans les parties de texte et les résultats de l'outil d'analyse des chaînes de caractères
- Convertit les jetons en utilisant ~3 caractères par jeton
- Ajoute une mémoire tampon de 500 jetons pour les invites du système et les frais généraux du fournisseur

Cette estimation est volontairement conservatrice afin d'éviter toute sous-estimation.

### Intégration avec le Runtime

Connecter les clients à débit limité au moteur d'exécution de Goa-AI :

```go
// Create limiters for each model you use
claudeLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 60000, 120000)
gptLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 90000, 180000)

// Wrap underlying clients
claudeClient := claudeLimiter.Middleware()(bedrockClient)
gptClient := gptLimiter.Middleware()(openaiClient)

// Configure runtime with rate-limited clients
rt := runtime.New(
    runtime.WithEngine(temporalEng),
    runtime.WithModelClient("claude", claudeClient),
    runtime.WithModelClient("gpt-4", gptClient),
)
```

### Ce qui se passe sous charge

| Niveau de trafic - Sans limiteur - Avec limiteur - Sans limiteur - Avec limiteur - Sans limiteur - Sans limiteur - Avec limiteur
|---------------|-----------------|--------------|
| Le niveau de trafic est inférieur au quota, les requêtes aboutissent, les requêtes aboutissent
| Les requêtes se mettent en file d'attente, puis réussissent
| Cascade d'échecs, le fournisseur se bloque | Backoff absorbe la rafale, récupération progressive |
| Surcharge prolongée | Toutes les demandes échouent | Demandes en file d'attente avec latence limitée |

### Paramètres de réglage

| Paramètres de réglage
|-----------|---------|-------------|
`initialTPM` | (obligatoire) | Budget de départ en jetons par minute |
| `maxTPM` | (obligatoire) | Plafond pour le sondage |
| 10% du budget initial | Budget minimum (pour éviter la famine) |
| Taux de récupération | 5% de l'initial | Augmentation additive par succès |
| Facteur de recul | 0,5 | Diminution multiplicative sur 429 |

**Exemple:** Avec `initialTPM=60000, maxTPM=120000` :
- Plancher : 6 000 TPM
- Récupération : +3 000 TPM par lot réussi
- Backoff : diviser par deux les MPT actuels sur 429

### Surveillance

Suivre le comportement du limiteur de débit à l'aide de mesures et de journaux :

```go
// The limiter logs backoff events at WARN level
// Monitor for sustained throttling by tracking:
// - Wait time distribution (how long requests queue)
// - Backoff frequency (how often 429s occur)
// - Current TPM vs. initial TPM

// Example: export current capacity to Prometheus
currentTPM := limiter.CurrentTPM()
```

### Meilleures pratiques

- **Un limiteur par modèle/fournisseur** : Créez des limiteurs distincts pour les différents modèles afin d'isoler leurs budgets
- **Fixer une MPT initiale réaliste** : Commencez par la limite de taux documentée de votre fournisseur ou une estimation conservatrice
- **Utilisez la limitation en cluster en production** : Coordonnez entre les répliques pour éviter l'étranglement global
- **Surveillez les événements de backoff** : Surveillez les événements de backoff** : enregistrez ou émettez des métriques lorsque des backoffs se produisent afin de détecter un étranglement soutenu
- **Définir le maxTPM au-dessus de l'initial** : Laisser une marge de manœuvre pour le sondage lorsque le trafic est inférieur au quota

---

## Configuration temporelle

Cette section couvre la configuration de Temporal pour les flux de travail d'agents durables dans les environnements de production.

### Vue d'ensemble

Temporal fournit une exécution durable pour vos agents Goa-AI. Les exécutions d'agents deviennent des workflows Temporal avec un historique basé sur les événements. Les appels d'outils deviennent des activités avec des tentatives configurables. Chaque transition d'état est conservée. Un travailleur redémarré rejoue l'historique et reprend exactement là où il s'est arrêté.

### Comment fonctionne la durabilité

| Le système de gestion de l'information de l'entreprise est un système de gestion de l'information de l'entreprise
|-----------|------|------------|
| Le processus d'exécution de l'agent d'orchestration est basé sur les événements ; il survit aux redémarrages
| L'agent exécute l'orchestration en fonction des événements ; survit aux redémarrages
| L'activité de l'outil d'exécution **L'activité de l'outil d'exécution** L'invocation de l'outil
| L'activité de l'outil ne peut être exécutée qu'en cas d'échec transitoire de l'activité de l'outil

**Exemple concret:** Votre agent appelle un LLM, qui renvoie 3 appels d'outils. Deux outils aboutissent. Le service du troisième outil tombe en panne.

- ❌ **Sans Temporal:** L'exécution entière échoue. Vous réexécutez l'inférence ($$$) et ré-exécutez les deux outils réussis.
- ✅ **Avec Temporal:** Seul l'outil qui a échoué réessaie. Le flux de travail reprend à partir de l'historique - pas de nouvel appel LLM, pas de ré-exécution d'outils terminés. Coût : un essai, pas un redémarrage complet.

### Ce qui survit aux défaillances

| Scénario d'échec sans temporisation avec temporisation
|------------------|------------------|---------------|
| Le processus de travailleur se bloque | L'exécution est perdue, redémarrage à zéro | Reprise de l'historique, poursuite de l'exécution
| L'appel à l'outil se termine | L'exécution échoue (ou traitement manuel) | Réessai automatique avec délai d'attente
| L'appel de l'outil échoue (ou traitement manuel)
| L'exécution échoue, l'exécution est interrompue, les tentatives sont automatiques
| Les travailleurs s'épuisent, les nouveaux travailleurs reprennent le travail

### Installation

**Option 1 : Docker (Développement)**

One-liner pour le développement local :
```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

**Option 2 : Temporalite (Développement)**

```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

**Option 3 : Nuage temporel (Production)**

Inscrivez-vous sur [temporal.io](https://temporal.io) et configurez votre client avec des identifiants cloud.

**Option 4 : auto-hébergement (production)**

Déployez Temporal en utilisant Docker Compose ou Kubernetes. Voir la [documentation Temporal](https://docs.temporal.io) pour les guides de déploiement.

### Configuration de l'exécution

Goa-AI abstrait le backend d'exécution derrière l'interface `Engine`. Changez de moteur sans modifier le code de l'agent :

**Moteur en mémoire** (développement) :
```go
// Default: no external dependencies
rt := runtime.New()
```

**Moteur temporel** (production) :
```go
import (
    runtimeTemporal "goa.design/goa-ai/runtime/agent/engine/temporal"
    "go.temporal.io/sdk/client"
)

temporalEng, err := runtimeTemporal.New(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
    },
    WorkerOptions: runtimeTemporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
})
if err != nil {
    panic(err)
}
defer temporalEng.Close()

rt := runtime.New(runtime.WithEngine(temporalEng))
```

### Configuration des tentatives d'activité

Les appels d'outils sont des activités temporelles. Configurez les tentatives par jeu d'outils dans le DSL :

```go
Use("external_apis", func() {
    // Flaky external services: retry aggressively
    ActivityOptions(engine.ActivityOptions{
        Timeout: 30 * time.Second,
        RetryPolicy: engine.RetryPolicy{
            MaxAttempts:        5,
            InitialInterval:    time.Second,
            BackoffCoefficient: 2.0,
        },
    })
    
    Tool("fetch_weather", "Get weather data", func() { /* ... */ })
    Tool("query_database", "Query external DB", func() { /* ... */ })
})

Use("local_compute", func() {
    // Fast local tools: minimal retries
    ActivityOptions(engine.ActivityOptions{
        Timeout: 5 * time.Second,
        RetryPolicy: engine.RetryPolicy{
            MaxAttempts: 2,
        },
    })
    
    Tool("calculate", "Pure computation", func() { /* ... */ })
})
```

### Configuration du travailleur

Les travailleurs interrogent les files d'attente de tâches et exécutent les flux de travail/activités. Les travailleurs sont automatiquement démarrés pour chaque agent enregistré - aucune configuration manuelle des travailleurs n'est nécessaire dans la plupart des cas.

### Meilleures pratiques

- **Utilisez des espaces de noms distincts** pour les différents environnements (dev, staging, prod)
- **Configurer des politiques de réessai** par ensemble d'outils en fonction des caractéristiques de fiabilité
- **Surveiller l'exécution du flux de travail** en utilisant l'interface utilisateur de Temporal et les outils d'observabilité
- **Définir des délais d'attente appropriés** pour les activités - équilibrer la fiabilité par rapport à la détection des pannes
- **Utiliser Temporal Cloud** pour la production afin d'éviter la charge opérationnelle

---

## Streaming UI

Cette section montre comment diffuser en temps réel les événements de l'agent vers les interfaces utilisateur en utilisant l'infrastructure de diffusion en continu de Goa-AI.

### Vue d'ensemble

Goa-AI expose des flux **par exécution** d'événements typés qui peuvent être fournis aux interfaces utilisateur via :
- Événements envoyés par le serveur (SSE)
- WebSockets
- Bus de messages (Pulse, Redis Streams, etc.)

Chaque exécution de flux de travail possède son propre flux ; lorsque des agents appellent d'autres agents en tant qu'outils, le moteur d'exécution lance des exécutions enfant et les relie à l'aide d'événements `AgentRunStarted` et de poignées `RunLink`. Les interfaces utilisateur peuvent s'abonner à n'importe quelle exécution par identifiant et choisir le niveau de détail à restituer.

### Interface Stream Sink

Implémentez l'interface `stream.Sink` :

```go
type Sink interface {
    Send(ctx context.Context, event stream.Event) error
    Close(ctx context.Context) error
}
```

### Types d'événements

Le paquet `stream` définit des types d'événements concrets qui mettent en œuvre `stream.Event`. Les types d'événements les plus courants pour les interfaces utilisateur sont les suivants :

| Type d'événement Description
|------------|-------------|

| `PlannerThought` Blocs de réflexion du planificateur (notes et raisonnement structuré) | `ToolStart` Blocs de réflexion du planificateur (notes et raisonnement structuré)
| `ToolStart` | Exécution de l'outil démarrée |
| `ToolUpdate` | Progression de l'exécution de l'outil (mises à jour attendues du nombre d'enfants) |
| `ToolEnd` | Exécution de l'outil terminée (résultat, erreur, télémétrie) | `AwaitClarification` | Exécution de l'outil terminée (résultat, erreur, télémétrie)
| `AwaitClarification` Le planificateur attend une clarification humaine
| `AwaitExternalTools` Le planificateur attend les résultats de l'outil externe
| `Usage` | Utilisation de jetons par invocation de modèle | `Workflow` | Utilisation de jetons par invocation de modèle
| `Workflow` | Exécuter les mises à jour du cycle de vie et des phases
| `AgentRunStarted` | Lien d'un appel d'outil parent vers une exécution d'agent enfant |

Les transports commutent généralement le type sur `stream.Event` pour des raisons de sécurité à la compilation :

```go
switch e := evt.(type) {
case stream.AssistantReply:
    // e.Data.Text
case stream.PlannerThought:
    // e.Data.Note or structured thinking fields
case stream.ToolStart:
    // e.Data.ToolCallID, e.Data.ToolName, e.Data.Payload
case stream.ToolEnd:
    // e.Data.Result, e.Data.Error, e.Data.ResultPreview
case stream.AgentRunStarted:
    // e.Data.ToolName, e.Data.ToolCallID, e.Data.ChildRunID, e.Data.ChildAgentID
}
```

### Exemple : SSE Sink

```go
type SSESink struct {
    w http.ResponseWriter
}

func (s *SSESink) Send(ctx context.Context, event stream.Event) error {
    switch e := event.(type) {
    case stream.AssistantReply:
        fmt.Fprintf(s.w, "data: assistant: %s\n\n", e.Data.Text)
    case stream.PlannerThought:
        if e.Data.Note != "" {
            fmt.Fprintf(s.w, "data: thinking: %s\n\n", e.Data.Note)
        }
    case stream.ToolStart:
        fmt.Fprintf(s.w, "data: tool_start: %s\n\n", e.Data.ToolName)
    case stream.ToolEnd:
        fmt.Fprintf(s.w, "data: tool_end: %s status=%v\n\n",
            e.Data.ToolName, e.Data.Error == nil)
    case stream.AgentRunStarted:
        fmt.Fprintf(s.w, "data: agent_run_started: %s child=%s\n\n",
            e.Data.ToolName, e.Data.ChildRunID)
    }
    s.w.(http.Flusher).Flush()
    return nil
}

func (s *SSESink) Close(ctx context.Context) error {
    return nil
}
```

### Abonnement par exécution

S'abonner aux événements d'une course spécifique :

```go
sink := &SSESink{w: w}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil {
    return err
}
defer stop()
```

### Couche d'eau globale

Pour diffuser toutes les exécutions par l'intermédiaire d'un flux global (par exemple, Pulse), configurez le moteur d'exécution avec un flux de diffusion :

```go
rt := runtime.New(
    runtime.WithStream(pulseSink), // or your custom sink
)
```

Le moteur d'exécution installe un `stream.Subscriber` par défaut qui :
- fait correspondre les événements du crochet à des valeurs `stream.Event`
- utilise la `StreamProfile`** par défaut, qui émet les réponses de l'assistant, les pensées du planificateur, le démarrage/la mise à jour/la fin de l'outil, les attentes, l'utilisation, le flux de travail et les liens `AgentRunStarted`, les exécutions enfant étant conservées dans leurs propres flux

### Profils de flux

Tous les consommateurs n'ont pas besoin de tous les événements. **Les profils de flux** filtrent les événements pour différents publics, en réduisant le bruit et la bande passante pour des cas d'utilisation spécifiques.

| Profil de flux - Cas d'utilisation - Événements inclus - Profil de flux - Cas d'utilisation - Événements inclus - Profil de flux - Cas d'utilisation - Événements inclus
|---------|----------|-----------------|
| Réponse de l'assistant, démarrage/fin de l'outil, achèvement du flux de travail
`AgentDebugProfile()` Débogage du développeur | Tout, y compris les pensées du planificateur |
| | Utilisation et événements de flux de travail uniquement | `MetricsProfile()` | Pipelines d'observabilité

**Utilisation de profils intégrés:**

```go
// User-facing chat: replies, tool status, completion
profile := stream.UserChatProfile()

// Debug view: everything including planner thoughts
profile := stream.AgentDebugProfile()

// Metrics pipeline: just usage and workflow events
profile := stream.MetricsProfile()

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

**Profils personnalisés:**

```go
// Fine-grained control over which events to emit
profile := stream.StreamProfile{
    Assistant:  true,
    Thought:    false,  // Skip planner thinking
    ToolStart:  true,
    ToolUpdate: true,
    ToolEnd:    true,
    Usage:      false,  // Skip usage events
    Workflow:   true,
    RunStarted: true,   // Include agent-run-started links
}

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

Les profils personnalisés sont utiles dans les cas suivants
- Vous avez besoin d'événements spécifiques pour un consommateur spécialisé (par exemple, suivi des progrès)
- Vous souhaitez réduire la taille de la charge utile pour les clients mobiles
- Vous construisez des pipelines d'analyse qui n'ont besoin que de certains événements

### Avancé : Passerelles Pulse et Stream

Pour les installations de production, vous souhaitez souvent :
- publier des événements sur un bus partagé (par exemple, Pulse)
- conserver des flux **par exécution** sur ce bus (un sujet/clé par exécution)

Goa-AI fournit :
- `features/stream/pulse` - une implémentation `stream.Sink` soutenue par Pulse
- `runtime/agent/stream/bridge` - des aides pour connecter le bus de crochet à n'importe quel puits

Câblage typique :

```go
pulseClient := pulse.NewClient(redisClient)
s, err := pulseSink.NewSink(pulseSink.Options{
    Client: pulseClient,
    StreamIDFunc: func(ev stream.Event) (string, error) {
        if ev.RunID() == "" {
            return "", errors.New("missing run id")
        }
        return fmt.Sprintf("run/%s", ev.RunID()), nil
    },
})
if err != nil { log.Fatal(err) }

rt := runtime.New(
    runtime.WithEngine(eng),
    runtime.WithStream(s),
)
```

---

## Rappels du système

Les modèles dérivent. Ils oublient les instructions. Ils ignorent le contexte qui était clair il y a 10 tours. Lorsque votre agent exécute des tâches de longue durée, vous avez besoin d'un moyen d'injecter des *conseils dynamiques et contextuels* sans polluer la conversation de l'utilisateur.

### Le problème

**Scénario:** Votre agent gère une liste de choses à faire. Après 20 tours, l'utilisateur demande "qu'est-ce qu'il y a ensuite ?" mais le modèle a dérivé - il ne se souvient pas qu'il y a une tâche en cours. Vous devez lui donner un coup de pouce *sans que l'utilisateur ne voie un message gênant "RAPPEL : vous avez une tâche en cours".

**Sans système de rappel:**
- Vous gonflez l'invite du système avec tous les scénarios possibles
- Les conseils se perdent dans les longues conversations
- Aucun moyen d'injecter un contexte basé sur les résultats de l'outil
- Les utilisateurs voient l'échafaudage interne de l'agent

**Avec des rappels du système:**
- Injecter des conseils de manière dynamique en fonction de l'état de l'exécution
- Limiter la fréquence des conseils répétitifs afin d'éviter le gonflement des messages
- Les niveaux de priorité garantissent que les conseils de sécurité ne sont jamais supprimés
- Invisibles pour les utilisateurs - injectés sous forme de blocs `<system-reminder>`

### Vue d'ensemble

Le paquet `runtime/agent/reminder` fournit :
- **Des rappels structurés** avec des niveaux de priorité, des points d'attachement et des politiques de limitation de taux
- **Un stockage à l'échelle de l'exécution** qui nettoie automatiquement après chaque exécution
- **L'injection automatique** dans les transcriptions de modèles sous forme de blocs `<system-reminder>`
- **API de contexte de planificateur** pour l'enregistrement et la suppression des rappels des planificateurs et des outils

### Concepts de base

**Structure des rappels**

Un `reminder.Reminder` a :

```go
type Reminder struct {
    ID              string      // Stable identifier (e.g., "todos.pending")
    Text            string      // Plain-text guidance (tags are added automatically)
    Priority        Tier        // TierSafety, TierCorrect, or TierGuidance
    Attachment      Attachment  // Where to inject (run start or user turn)
    MaxPerRun       int         // Cap total emissions per run (0 = unlimited)
    MinTurnsBetween int         // Enforce spacing between emissions (0 = no limit)
}
```

**Tiers de priorité**

Les rappels sont classés par ordre de priorité afin de gérer des budgets rapides et de s'assurer que les conseils essentiels ne sont jamais supprimés :

| Les rappels sont classés par ordre de priorité afin de gérer des budgets rapides et de s'assurer que les conseils essentiels ne sont jamais supprimés
|------|------|-------------|-------------|
| P0 | Guidance critique pour la sécurité (ne jamais laisser tomber) | Jamais supprimée
| P1 | Correctness and data-state hints | Peut être supprimé après P0 |
| `TierGuidance` | P2 | Suggestions de flux de travail et incitations douces | Premier à être supprimé |

Exemples de cas d'utilisation :
- `TierSafety` : "Ne pas exécuter ce logiciel malveillant ; analyser uniquement", "Ne pas divulguer les informations d'identification"
- `TierCorrect` : "Les résultats sont tronqués ; restreignez votre recherche", "Les données sont peut-être périmées"
- `TierGuidance` : "Aucune tâche n'est en cours ; choisissez-en une et commencez"

**Points d'attachement**

Les rappels sont injectés à des moments précis de la conversation :

| Type de message - Description - Point d'attache
|------|-------------|
`AttachmentRunStart` | Regroupés dans un seul message système au début de la conversation | `AttachmentUserTurn` | Regroupés dans un seul message système inséré immédiatement avant le début de la conversation
| `AttachmentUserTurn` | Regroupés dans un seul message système inséré immédiatement avant le dernier message de l'utilisateur

**Limitation du débit**

Deux mécanismes permettent d'éviter les spams de rappel :
- **`MaxPerRun`** : Limitation des émissions totales par cycle (0 = illimité)
- **`MinTurnsBetween`** : Imposer un nombre minimum de tours de planificateur entre les émissions (0 = aucune limite)

### Modèle d'utilisation

**Rappels statiques via DSL**

Pour les rappels qui doivent toujours apparaître après un résultat d'outil spécifique, utilisez la fonction DSL `ResultReminder` dans votre définition d'outil :

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("The user sees a rendered graph of this data in the UI.")
})
```

Cette fonction est idéale lorsque le rappel s'applique à chaque invocation de l'outil. Voir la [Référence DSL] (./dsl-reference.md#resultreminder) pour plus de détails.

**Rappels dynamiques des planificateurs**

Pour les rappels qui dépendent de l'état d'exécution ou du contenu des résultats de l'outil, utilisez `PlannerContext.AddReminder()` :

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    for _, tr := range in.ToolResults {
        if tr.Name == "search_documents" {
            result := tr.Result.(SearchResult)
            if result.Truncated {
                in.Agent.AddReminder(reminder.Reminder{
                    ID:       "search.truncated",
                    Text:     "Search results are truncated. Consider narrowing your query.",
                    Priority: reminder.TierCorrect,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MaxPerRun:       3,
                    MinTurnsBetween: 2,
                })
            }
        }
    }
    // Continue with planning...
}
```

**Suppression des rappels**

Utilisez `RemoveReminder()` lorsqu'une condition préalable n'est plus valable :

```go
if allTodosCompleted {
    in.Agent.RemoveReminder("todos.no_active")
}
```

**Préservation des compteurs de limite de taux**

`AddReminder()` préserve les compteurs d'émissions lors de la mise à jour d'un rappel existant par ID. Si vous devez modifier le contenu d'un rappel tout en conservant les limites de taux :

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:              "todos.pending",
    Text:            buildUpdatedText(snap),
    Priority:        reminder.TierGuidance,
    Attachment:      reminder.Attachment{Kind: reminder.AttachmentUserTurn},
    MinTurnsBetween: 3,
})
```

**Anti-modèle** : N'appelez pas `RemoveReminder()` suivi de `AddReminder()` pour le même ID - cela remet les compteurs à zéro et contourne `MinTurnsBetween`.

### Injection et formatage

**Balisage automatique**

Le moteur d'exécution enveloppe automatiquement le texte de rappel dans des balises `<system-reminder>` lors de l'injection dans les transcriptions :

```go
// You provide plain text:
Text: "Results are truncated. Narrow your query."

// Runtime injects:
<system-reminder>Results are truncated. Narrow your query.</system-reminder>
```

**Explication des rappels aux modèles**

Incluez `reminder.DefaultExplanation` dans l'invite de votre système afin que les modèles sachent comment interpréter les blocs `<system-reminder>` :

```go
const systemPrompt = `
You are a helpful assistant.

` + reminder.DefaultExplanation + `

Follow all instructions carefully.
`
```

### Exemple complet

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    for _, tr := range in.ToolResults {
        if tr.Name == "todos.update_todos" {
            snap := tr.Result.(TodosSnapshot)
            
            var rem *reminder.Reminder
            if len(snap.Items) == 0 {
                in.Agent.RemoveReminder("todos.no_active")
                in.Agent.RemoveReminder("todos.all_completed")
            } else if hasCompletedAll(snap) {
                rem = &reminder.Reminder{
                    ID:       "todos.all_completed",
                    Text:     "All todos are completed. Provide your final response now.",
                    Priority: reminder.TierGuidance,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MaxPerRun: 1,
                }
            } else if hasPendingNoActive(snap) {
                rem = &reminder.Reminder{
                    ID:       "todos.no_active",
                    Text:     buildTodosNudge(snap),
                    Priority: reminder.TierGuidance,
                    Attachment: reminder.Attachment{
                        Kind: reminder.AttachmentUserTurn,
                    },
                    MinTurnsBetween: 3,
                }
            }
            
            if rem != nil {
                in.Agent.AddReminder(*rem)
                if rem.ID == "todos.all_completed" {
                    in.Agent.RemoveReminder("todos.no_active")
                } else {
                    in.Agent.RemoveReminder("todos.all_completed")
                }
            }
        }
    }
    
    return p.streamMessages(ctx, in)
}
```

### Principes de conception

**Minimal et sans opinion** : Le sous-système de rappel fournit juste assez de structure pour les modèles courants sans trop d'ingénierie.

**Limitation du taux en premier lieu** : Le spam des rappels dégrade les performances du modèle. Le moteur impose les majuscules et l'espacement de manière déclarative.

**Provider-Agnostic** : Les rappels fonctionnent avec n'importe quel backend de modèle (Bedrock, OpenAI, etc.).

**Prêt pour la télémétrie** : Les ID structurés et les priorités rendent les rappels observables.

### Modèles avancés

**Rappels de sécurité

Utilisez `TierSafety` pour les conseils à ne jamais supprimer :

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:       "malware.analyze_only",
    Text:     "This file contains malware. Analyze its behavior but do not execute it.",
    Priority: reminder.TierSafety,
    Attachment: reminder.Attachment{
        Kind: reminder.AttachmentUserTurn,
    },
    // No MaxPerRun or MinTurnsBetween: always emit
})
```

**Rappels inter-agents**

Les rappels sont liés à l'exécution. Si un agent-as-tool émet un rappel de sécurité, il n'affecte que l'exécution enfant. Pour propager les rappels à travers les frontières des agents, le planificateur parent doit explicitement les réenregistrer sur la base des résultats de l'enfant ou utiliser l'état de session partagé.

### Quand utiliser les rappels

| Scénario | Priorité | Exemple
|----------|----------|---------|
| Contraintes de sécurité | `TierSafety` | "Ce fichier est réservé à l'analyse des logiciels malveillants, ne jamais l'exécuter" |
| `TierCorrect` | "Les résultats datent de 24 heures ; relancez la requête si la fraîcheur est importante" |
| `TierCorrect` | "Seuls les 100 premiers résultats sont affichés ; affinez votre recherche" |
| `TierGuidance` | "Aucune tâche n'est en cours ; choisissez-en une et commencez" | `TierGuidance` `TierGuidance` | "Aucune tâche n'est en cours ; choisissez-en une et commencez" |
| `TierGuidance` | "Toutes les tâches sont terminées ; donnez votre réponse finale" |

### A quoi ressemblent les rappels dans la transcription

```
User: What should I do next?

<system-reminder>You have 3 pending todos. Currently working on: "Review PR #42". 
Focus on completing the current todo before starting new work.</system-reminder>

User: What should I do next?
```

Le modèle voit le rappel ; l'utilisateur ne voit que son message et la réponse. Les rappels sont injectés de manière transparente par le runtime.

---

## Prochaines étapes

- En savoir plus sur [Memory & Sessions](./memory-sessions/) pour la persistance des transcriptions
- Explorer [Agent Composition](./agent-composition/) pour les modèles d'agents en tant qu'outils
- En savoir plus sur [Toolsets](./toolsets/) pour les modèles d'exécution d'outils
