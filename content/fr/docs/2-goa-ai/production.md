---
title: "Production"
linkTitle: "Production"
weight: 8
description: "Set up Temporal for durable workflows, stream events to UIs, apply adaptive rate limiting, and use system reminders."
llm_optimized: true
aliases:
---

## Limitation du débit du modèle

Chaque fournisseur de modèles applique des limites de débit. Dépassez-les et vos requêtes échouent avec 429 erreurs. Pire encore : dans un déploiement multi-réplicas, chaque réplique martèle indépendamment le API, provoquant une limitation *agrégée* invisible pour les processus individuels.

### Le problème

**Scénario :** Vous déployez 10 réplicas de votre service d'agent. Chaque réplique pense disposer de 100 000 jetons/minute. Ensemble, ils envoient 1 million de jetons/minute, soit 10 fois votre quota réel. Le fournisseur limite agressivement. Les requêtes échouent de manière aléatoire sur toutes les répliques.

**Sans limitation de tarif :**
- Les requêtes échouent de manière imprévisible avec les 429
- Aucune visibilité sur la capacité restante
- Les tentatives aggravent la congestion
- L'expérience utilisateur se dégrade sous charge

**Avec limitation de débit adaptative :**
- Chaque réplique partage un budget coordonné
- Les demandes sont en file d'attente jusqu'à ce que la capacité soit disponible
- Le backoff se propage à travers le cluster
- Une dégradation gracieuse au lieu d’échecs

### Aperçu

Le package `features/model/middleware` fournit un **limiteur de débit adaptatif de type AIMD** qui se situe à la limite du client modèle. Il estime les coûts des jetons, bloque les appelants jusqu'à ce que la capacité soit disponible et ajuste automatiquement son budget de jetons par minute en réponse aux signaux de limitation de débit des fournisseurs.

### Stratégie AIMD

Le limiteur utilise une stratégie **Augmentation Additive / Diminution Multiplicative (AIMD)** :

| Événement | Action | Formule |
|-------|--------|---------|
| Succès | Sonde (augmentation additive) | `TPM += recoveryRate` (5 % de la valeur initiale) |
| `ErrRateLimited` | Backoff (diminution multiplicative) | `TPM *= 0.5` |

Le nombre effectif de jetons par minute (TPM) est limité par :
- **Minimum** : 10 % du TPM initial (plancher pour éviter la famine)
- **Maximum** : Le plafond `maxTPM` configuré

### Utilisation de base

Créez un seul limiteur par processus et enveloppez votre client modèle :

```go
import (
    "context"
    "os"

    "goa.design/goa-ai/features/model/openai"
    "goa.design/goa-ai/features/model/middleware"
    "goa.design/goa-ai/runtime/agent/runtime"
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
    modelClient, err := openai.New(openai.Options{
        APIKey:       os.Getenv("OPENAI_API_KEY"),
        DefaultModel: "gpt-5-mini",
        HighModel:    "gpt-5",
        SmallModel:   "gpt-5-nano",
    })
    if err != nil {
        panic(err)
    }

    // Wrap with rate limiting middleware
    rateLimitedClient := limiter.Middleware()(modelClient)

    rt := runtime.New()
    if err := rt.RegisterModel("default", rateLimitedClient); err != nil {
        panic(err)
    }
}
```

### Limitation du débit en fonction du cluster

Pour les déploiements multi-processus, coordonnez la limitation du débit entre les instances à l'aide d'une carte répliquée Pulse :

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

Lors de l'utilisation de la limitation tenant compte du cluster :
- **Le backoff se propage à l'échelle mondiale** : lorsqu'un processus reçoit `ErrRateLimited`, tous les processus réduisent leur budget
- **Le sondage est coordonné** : les demandes réussies augmentent le budget partagé
- **Réconciliation automatique** : les processus surveillent les changements externes et mettent à jour leurs limiteurs locaux

### Estimation des jetons

Le limiteur estime le coût de la demande à l’aide d’une heuristique simple :
- Compte les caractères dans les parties de texte et les résultats de l'outil de chaîne
- Convertit en jetons en utilisant environ 3 caractères par jeton
- Ajoute un tampon de 500 jetons pour les invites système et la surcharge du fournisseur

Cette estimation est intentionnellement conservatrice pour éviter un sous-dénombrement.

### Intégration avec le runtime

Câblez des clients à débit limité dans le runtime Goa-AI :

```go
// Create limiters for each model you use
claudeLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 60000, 120000)
gptLimiter := middleware.NewAdaptiveRateLimiter(ctx, nil, "", 90000, 180000)

// Wrap underlying clients
claudeClient := claudeLimiter.Middleware()(bedrockClient)
gptClient := gptLimiter.Middleware()(openaiClient)

// Configure runtime with rate-limited clients
rt := runtime.New(runtime.WithEngine(temporalEng))
if err := rt.RegisterModel("claude", claudeClient); err != nil {
    panic(err)
}
if err := rt.RegisterModel("gpt-4", gptClient); err != nil {
    panic(err)
}
```

### Que se passe-t-il sous charge

| Niveau de trafic | Sans limiteur | Avec limiteur |
|---------------|-----------------|--------------|
| En dessous du quota | Les demandes réussissent | Les demandes réussissent |
| Au quota | 429 échecs aléatoires | File d'attente des requêtes, puis réussite |
| Dépassement du quota | Cascade d'échecs, blocages du fournisseur | Le recul absorbe l'éclatement, récupération progressive |
| Surcharge soutenue | Toutes les demandes échouent | File d'attente de requêtes avec une latence limitée |

### Paramètres de réglage

| Paramètre | Défaut | Description |
|-----------|---------|-------------|
| `initialTPM` | (requis) | Budget de départ en jetons par minute |
| `maxTPM` | (requis) | Plafond pour sondage |
| Sol | 10% du montant initial | Budget minimum (évite la famine) |
| Taux de récupération | 5% du montant initial | Augmentation additive par réussite |
| Facteur de recul | 0.5 | Diminution multiplicative sur 429 |

**Exemple :** Avec `initialTPM=60000, maxTPM=120000` :
- Plancher : 6 000 TPM
- Récupération : +3 000 TPM par lot réussi
- Backoff : réduire de moitié le TPM actuel sur 429

### Surveillance

Suivez le comportement du limiteur de débit avec des métriques et des journaux :

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

- **Un limiteur par modèle/fournisseur** : créez des limiteurs distincts pour différents modèles afin d'isoler leurs budgets
- **Définissez un TPM initial réaliste** : commencez par la limite de débit documentée par votre fournisseur ou une estimation prudente
- **Utilisez la limitation adaptée aux clusters en production** : coordonnez les réplicas pour éviter la limitation globale
- ** Surveiller les événements d'interruption ** : enregistrez ou émettez des métriques lorsque des interruptions se produisent pour détecter une limitation soutenue.
- **Définissez maxTPM au-dessus de la valeur initiale** : laissez une marge pour sonder lorsque le trafic est inférieur au quota

---

## Remplacements d'invite avec le magasin Mongo

La gestion des invites de production utilise généralement :

- spécifications d'invite de base enregistrées dans `runtime.PromptRegistry`, et
- les enregistrements de remplacement limités ont persisté dans Mongo via `features/prompt/mongo`.

### Câblage

```go
import (
    promptmongo "goa.design/goa-ai/features/prompt/mongo"
    clientmongo "goa.design/goa-ai/features/prompt/mongo/clients/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

promptClient, err := clientmongo.New(clientmongo.Options{
    Client:     mongoClient,
    Database:   "aura",
    Collection: "prompt_overrides", // optional (default is prompt_overrides)
})
if err != nil {
    panic(err)
}

promptStore, err := promptmongo.NewStore(promptClient)
if err != nil {
    panic(err)
}

rt := runtime.New(
    runtime.WithEngine(temporalEng),
    runtime.WithPromptStore(promptStore),
)
```

### Remplacer la résolution et le déploiement

La priorité de remplacement est déterministe :

1. Portée `session`
2. Portée `facility`
3. Portée `org`
4. portée mondiale
5. spécification de base (quand aucun remplacement n'existe)

Stratégie de déploiement recommandée :

- Enregistrez d’abord les nouvelles spécifications de base.
- Déployez les remplacements à grande échelle (`org`), puis limitez-les à `facility`/`session` pour les Canaries.
- Suivez les versions efficaces via les événements `prompt_rendered` et `model.Request.PromptRefs`.
- Revenez en arrière en écrivant un remplacement plus récent dans la même portée (ou en supprimant les remplacements spécifiques à la portée pour revenir en arrière).

---

## Configuration Temporal

Cette section couvre la configuration de Temporal pour des flux de travail d'agent durables dans les environnements de production.

### Aperçu

Temporal offre une exécution durable pour vos agents Goa-AI. Les exécutions d'agents deviennent des workflows Temporal avec un historique basé sur les événements. Les appels d'outils deviennent des activités avec des tentatives configurables. Chaque transition d'état est persistante. Un travailleur redémarré relit l'historique et reprend exactement là où il s'était arrêté.

### Comment fonctionne la durabilité

| Composant | Rôle | Durabilité |
|-----------|------|------------|
| **Flux de travail** | Orchestration exécutée par les agents | Provenant d'événements ; survit aux redémarrages |
| **Activité planifiée** | Appel d'inférence LLM | Nouvelles tentatives sur des échecs transitoires |
| **Exécuter l'activité de l'outil** | Appel d'outil | Politiques de nouvelle tentative par outil |
| **État** | Historique des virages, résultats de l'outil | Persistance dans l'historique du flux de travail |

**Exemple concret :** Votre agent appelle un LLM, qui renvoie 3 appels d'outil. Deux outils complets. Le service du troisième outil plante.

- ❌ **Sans Temporal :** L'exécution entière échoue. Vous réexécutez l'inférence ($$$) et réexécutez les deux outils réussis.
- ✅ **Avec Temporal :** Seul l'outil en panne réessaye. Le flux de travail est relu à partir de l'historique : pas de nouvel appel LLM, pas de réexécution des outils terminés. Coût : une nouvelle tentative, pas un redémarrage complet.

### Ce qui survit aux échecs

| Scénario d'échec | Sans Temporal | Avec Temporal |
|------------------|------------------|---------------|
| Le processus de travail plante | Courez perdu, redémarrez à zéro | Les rediffusions de l'histoire, continue |
| L’appel de l’outil expire | Échec de l'exécution (ou manipulation manuelle) | Nouvelle tentative automatique avec interruption |
| Limite de taux (429) | L'exécution échoue | Recule, réessaye automatiquement |
| Partition réseau | Progrès partiel perdu | Reprise après reconnexion |
| Déployer pendant l'exécution | Les courses en vol échouent | Les travailleurs s'épuisent, de nouveaux travailleurs reprennent |

### Installation

**Option 1 : Docker (développement)**

Un mot d’ordre pour le développement local :
```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

**Option 2 : Temporalite (Développement)**

```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

**Option 3 : Cloud Temporal (Production)**

Inscrivez-vous sur [temporal.io](https://temporal.io) et configurez votre client avec des informations d'identification cloud.

**Option 4 : auto-hébergé (production)**

Déployez Temporal à l'aide de Docker Compose ou Kubernetes. Consultez la [documentation Temporal](https://docs.temporal.io) pour les guides de déploiement.

### Configuration d'exécution

Goa-AI résume le backend d'exécution derrière l'interface `Engine`. Échangez les moteurs sans changer le code de l'agent :

**Moteur en mémoire** (développement) :
```go
// Default: no external dependencies
rt := runtime.New()
```

**Moteur Temporal** (production) :
```go
import (
    runtimeTemporal "goa.design/goa-ai/runtime/agent/engine/temporal"
    "go.temporal.io/sdk/client"

    // Your generated tool specs aggregate.
    // The generated package exposes: func Spec(tools.Ident) (*tools.ToolSpec, bool)
    specs "<module>/gen/<service>/agents/<agent>/specs"
)

temporalEng, err := runtimeTemporal.NewWorker(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
        // Required: enforce goa-ai's workflow boundary contract.
        // Tool results and server-data cross workflow boundaries as canonical JSON bytes
        // (for example api.ToolEvent payloads), not decoded planner.ToolResult values.
        DataConverter: runtimeTemporal.NewAgentDataConverter(specs.Spec),
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

### Synchronisation et tentatives d'activité

Utilisez le DSL pour les budgets d'exécution sémantiques : combien de temps l'exécution entière peut prendre, combien de temps un
la tentative du planificateur peut s'exécuter et la durée pendant laquelle une tentative d'outil peut s'exécuter.

```go
Agent("operator", "Production operations agent", func() {
    RunPolicy(func() {
        DefaultCaps(MaxToolCalls(20), MaxConsecutiveFailedToolCalls(3))
        Timing(func() {
            Budget("5m")
            Plan("45s")
            Tools("90s")
        })
    })
})
```

L'adaptateur Temporal possède des mécanismes de moteur de flux de travail tels que l'attente en file d'attente et
délais d'attente de vivacité. Configurez-les sur le moteur, pas dans le DSL :

```go
temporalEng, err := runtimeTemporal.NewWorker(runtimeTemporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "127.0.0.1:7233",
        Namespace: "default",
    },
    WorkerOptions: runtimeTemporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
    ActivityDefaults: runtimeTemporal.ActivityDefaults{
        Planner: runtimeTemporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 30 * time.Second,
            LivenessTimeout:  20 * time.Second,
        },
        Tool: runtimeTemporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 2 * time.Minute,
            LivenessTimeout:  20 * time.Second,
        },
    },
})
```

Les activités de plan/CV généré, d'exécution d'outil et de publication de hook utilisent une nouvelle tentative
des politiques qui ne sont sûres que lorsque les tentatives sont logiquement idempotentes. Événements de crochet
transporter des clés d'événement stables et les exécutions d'outils doivent persister ou rejouer canoniquement
résultats par `ToolCallID` plutôt que de répéter des effets secondaires irréversibles.

### Configuration du travailleur

Les travailleurs interrogent les files d’attente de tâches et exécutent des flux de travail/activités. Les travailleurs sont automatiquement démarrés pour chaque agent enregistré : aucune configuration manuelle n'est nécessaire dans la plupart des cas.

### Meilleures pratiques

- **Utilisez des espaces de noms distincts** pour différents environnements (dev, staging, prod)
- **Configurer les politiques de nouvelle tentative** par ensemble d'outils en fonction des caractéristiques de fiabilité
- **Surveiller l'exécution du flux de travail** à l'aide du UI et des outils d'observabilité de Temporal
- **Définissez des délais d'attente appropriés** pour les activités : équilibrez la fiabilité et la détection des blocages
- **Utilisez Temporal Cloud** pour la production afin d'éviter la charge opérationnelle

---

## Streaming UI

Cette section montre comment diffuser les événements d'agent sur UIs en temps réel à l'aide de l'infrastructure de streaming de Goa-AI.

### Aperçu

Goa-AI publie des **flux appartenant à la session** d'événements typés qui peuvent être transmis à UIs via :
- Événements envoyés par le serveur (SSE)
- WebSockets
- Bus de messages (Pulse, Redis Streams, etc.)

Tous les événements visibles dans le flux pour une session sont ajoutés à un seul flux : `session/<session_id>`. Chaque événement comporte à la fois `run_id` et `session_id` afin que UIs puisse regrouper les événements en couloirs/cartes par course. Les exécutions d'agents imbriquées sont liées via des événements `child_run_linked`. UIs ferme SSE/WebSocket de manière déterministe lorsqu'il observe `run_stream_end` pour l'exécution active.

### Interface du récepteur de flux

Implémentez l'interface `stream.Sink` :

```go
type Sink interface {
    Send(ctx context.Context, event stream.Event) error
    Close(ctx context.Context) error
}
```

### Types d'événements

Le package `stream` définit des types d'événements concrets qui implémentent `stream.Event`. Les plus courants pour UIs sont :

| Type d'événement | Description |
|------------|-------------|
| `AssistantReply` | Morceaux de messages de l'Assistant (texte diffusé en continu) |
| `PlannerThought` | Blocs de réflexion du planificateur (notes et raisonnement structuré) |
| `ToolStart` | L'exécution de l'outil a démarré |
| `ToolUpdate` | Progression de l'exécution de l'outil (mises à jour attendues du nombre d'enfants) |
| `ToolEnd` | Exécution de l'outil terminée (résultat, erreur, télémétrie) |
| `AwaitClarification` | Le planificateur attend des éclaircissements humains |
| `AwaitExternalTools` | Le planificateur attend les résultats d'un outil externe |
| `Usage` | Utilisation du jeton par appel de modèle |
| `Workflow` | Exécuter des mises à jour du cycle de vie et des phases |
| `ChildRunLinked` | Lien entre un appel d'outil parent et une exécution d'agent enfant |
| `RunStreamEnd` | Marqueur de limite de flux explicite pour une exécution (plus aucun événement visible dans le flux n'apparaîtra pour cette exécution) |

Les transports utilisent généralement un commutateur de type sur `stream.Event` pour la sécurité au moment de la compilation :

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
case stream.ChildRunLinked:
    // e.Data.ToolName, e.Data.ToolCallID, e.Data.ChildRunID, e.Data.ChildAgentID
case stream.RunStreamEnd:
    // run has no more stream-visible events
}
```

### Exemple : Évier SSE

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
    case stream.ChildRunLinked:
        fmt.Fprintf(s.w, "data: child_run_linked: %s child=%s\n\n",
            e.Data.ToolName, e.Data.ChildRunID)
    case stream.RunStreamEnd:
        fmt.Fprintf(s.w, "data: run_stream_end: %s\n\n", e.RunID())
    }
    s.w.(http.Flusher).Flush()
    return nil
}

func (s *SSESink) Close(ctx context.Context) error {
    return nil
}
```

### Abonnement au flux de session (Pulse)

En production, UIs consomme le flux de session (`session/<session_id>`) à partir d'un bus partagé (Pulse / Redis Streams) et filtre par `run_id`. Fermez SSE/WebSocket lorsque vous observez `run_stream_end` pour l'analyse active.

### Puits de flux global

Pour diffuser toutes les exécutions via un récepteur global (par exemple, Pulse), configurez le runtime avec un récepteur de flux :

```go
rt := runtime.New(
    runtime.WithStream(pulseSink), // or your custom sink
)
```

Le runtime installe un `stream.Subscriber` par défaut qui :
- mappe les événements de hook aux valeurs `stream.Event`
- utilise le **`StreamProfile`** par défaut, qui émet les réponses de l'assistant, les réflexions du planificateur, le démarrage/la mise à jour/la fin de l'outil, les attentes, l'utilisation, le flux de travail, les liens `child_run_linked` et le marqueur du terminal `run_stream_end`.

### Profils de flux

Tous les consommateurs n’ont pas besoin de chaque événement. Les **profils de diffusion** filtrent les événements pour différents publics, réduisant ainsi le bruit et la bande passante pour des cas d'utilisation spécifiques.

| Profil | Cas d'utilisation | Événements inclus |
|---------|----------|-----------------|
| `UserChatProfile()` | Chat avec l'utilisateur final UI | Réponses de l'assistant, démarrage/fin de l'outil, achèvement du flux de travail |
| `AgentDebugProfile()` | Débogage du développeur | Tout, y compris les réflexions du planificateur |
| `MetricsProfile()` | Pipelines d’observabilité | Événements d'utilisation et de flux de travail uniquement |

**Utilisation des profils intégrés :**

```go
// User-facing chat: replies, tool status, completion
profile := stream.UserChatProfile()

// Debug view: everything including planner thoughts
profile := stream.AgentDebugProfile()

// Metrics pipeline: just usage and workflow events
profile := stream.MetricsProfile()

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

**Profils personnalisés :**

```go
// Fine-grained control over which events to emit
profile := stream.StreamProfile{
    Assistant:  true,
    Thoughts:   false,  // Skip planner thinking
    ToolStart:  true,
    ToolUpdate: true,
    ToolEnd:    true,
    Usage:      false,  // Skip usage events
    Workflow:   true,
    ChildRuns:  true,   // Include parent tool → child run links
}

sub, _ := stream.NewSubscriberWithProfile(sink, profile)
```

Les profils personnalisés sont utiles lorsque :
- Vous avez besoin d'événements spécifiques pour un consommateur spécialisé (par exemple, suivi des progrès)
- Vous souhaitez réduire la taille de la charge utile pour les clients mobiles
- Vous créez des pipelines d'analyse qui n'ont besoin que de certains événements

### Avancé : Pulse et ponts de flux

Pour les configurations de production, vous souhaitez souvent :
- publier des événements sur un bus partagé (par exemple, Pulse)
- utiliser un **flux appartenant à la session** sur ce bus (`session/<session_id>`)

Goa-AI fournit :
- `features/stream/pulse` – une implémentation `stream.Sink` soutenue par Pulse
- `runtime/agent/stream/bridge` – aides pour câbler le bus à crochet à n’importe quel évier

Câblage typique :

```go
pulseClient := pulse.NewClient(redisClient)
s, err := pulseSink.NewSink(pulseSink.Options{
    Client: pulseClient,
    // Optional: override stream naming (defaults to `session/<SessionID>`).
    StreamID: func(ev stream.Event) (string, error) {
        if ev.SessionID() == "" {
            return "", errors.New("missing session id")
        }
        return fmt.Sprintf("session/%s", ev.SessionID()), nil
    },
})
if err != nil { log.Fatal(err) }

rt := runtime.New(
    runtime.WithEngine(eng),
    runtime.WithStream(s),
)
```

---

## Rappels système

Les modèles dérivent. Ils oublient les instructions. Ils ignorent le contexte qui était clair il y a 10 tours. Lorsque votre agent exécute des tâches de longue durée, vous avez besoin d'un moyen d'injecter des *guides dynamiques et contextuels* sans polluer la conversation de l'utilisateur.

### Le problème

**Scénario :** Votre agent gère une liste de tâches. Après 20 tours, l'utilisateur demande « quelle est la prochaine étape ? » mais le modèle a dérivé : il ne se souvient pas qu'il y a une tâche en attente en cours. Vous devez le pousser *sans* que l'utilisateur voie un message gênant "RAPPEL : vous avez une tâche en cours".

**Sans rappels système :**
- Vous gonflez l'invite du système avec tous les scénarios possibles
- Les conseils se perdent dans de longues conversations
- Aucun moyen d'injecter du contexte en fonction des résultats de l'outil
- Les utilisateurs voient l’échafaudage des agents internes

**Avec rappels système :**
- Injecter des conseils de manière dynamique en fonction de l'état d'exécution
- Conseils répétitifs de limite de débit pour éviter les ballonnements rapides
- Les niveaux de priorité garantissent que les directives de sécurité ne sont jamais supprimées
- Invisible pour les utilisateurs – injecté sous forme de blocs `<system-reminder>`

### Aperçu

Le package `runtime/agent/reminder` fournit :
- **Rappels structurés** avec niveaux de priorité, points d'attache et politiques de limitation de débit
- **Stockage limité à l'exécution** qui nettoie automatiquement une fois chaque exécution terminée
- **Injection automatique** dans les transcriptions du modèle sous forme de blocs `<system-reminder>`
- **PlannerContext API** pour enregistrer et supprimer des rappels des planificateurs et des outils

### Concepts de base

**Structure de rappel**

Un `reminder.Reminder` possède :

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

**Niveaux prioritaires**

Les rappels sont classés par priorité pour gérer des budgets rapides et garantir que les conseils critiques ne soient jamais supprimés :

| Étage | Nom | Description | Suppression |
|------|------|-------------|-------------|
| `TierSafety` | P0 | Conseils critiques pour la sécurité (ne jamais laisser tomber) | Jamais supprimé |
| `TierCorrect` | P1 | Conseils sur l’exactitude et l’état des données | Peut être supprimé après P0 |
| `TierGuidance` | P2 | Suggestions de flux de travail et petits coups de pouce | Premier à être supprimé |

Exemples de cas d'utilisation :
- `TierSafety` : "Ne pas exécuter ce malware ; analyser uniquement", "Ne pas divulguer les informations d'identification"
- `TierCorrect` : "Les résultats sont tronqués ; affinez votre requête", "Les données peuvent être obsolètes"
- `TierGuidance` : "Aucune tâche n'est en cours ; choisissez-en une et commencez"

**Points d'attache**

Des rappels sont injectés à des moments précis de la conversation :

| Gentil | Description |
|------|-------------|
| `AttachmentRunStart` | Regroupé en un seul message système au début de la conversation |
| `AttachmentUserTurn` | Regroupé en un seul message système inséré immédiatement avant le dernier message utilisateur |

**Limitation de taux**

Deux mécanismes empêchent le spam de rappel :
- **`MaxPerRun`** : plafonner les émissions totales par cycle (0 = illimité)
- **`MinTurnsBetween`** : imposer un nombre minimum de tours de planification entre les émissions (0 = aucune limite)

### Modèle d'utilisation

**Rappels statiques via DSL**

Pour les rappels qui doivent toujours apparaître après un résultat d'outil spécifique, utilisez la fonction `ResultReminder` DSL dans la définition de votre outil :

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() { /* ... */ })
    Return(func() { /* ... */ })
    ResultReminder("The user sees a rendered graph of this data in the UI.")
})
```

C’est idéal lorsque le rappel s’applique à chaque invocation de l’outil. Voir la [Référence DSL] (./dsl-reference.md#resultreminder) pour plus de détails.

**Rappels dynamiques des planificateurs**

Pour les rappels qui dépendent de l'état d'exécution ou du contenu des résultats de l'outil, utilisez `PlannerContext.AddReminder()` :

```go
func (p *myPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    for _, tr := range in.ToolOutputs {
        if tr.Name == "search_documents" {
            result, err := specs.UnmarshalSearchDocumentsResult(tr.Result)
            if err != nil {
                return nil, err
            }
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

Utilisez `RemoveReminder()` lorsqu'une condition préalable n'est plus remplie :

```go
if allTodosCompleted {
    in.Agent.RemoveReminder("todos.no_active")
}
```

**Préservation des compteurs de limite de débit**

`AddReminder()` préserve les compteurs d'émissions lors de la mise à jour d'un rappel existant par ID. Si vous devez modifier le contenu du rappel tout en conservant les limites de débit :

```go
in.Agent.AddReminder(reminder.Reminder{
    ID:              "todos.pending",
    Text:            buildUpdatedText(snap),
    Priority:        reminder.TierGuidance,
    Attachment:      reminder.Attachment{Kind: reminder.AttachmentUserTurn},
    MinTurnsBetween: 3,
})
```

**Anti-modèle** : n'appelez pas `RemoveReminder()` suivi de `AddReminder()` pour le même ID : cela réinitialise les compteurs et contourne `MinTurnsBetween`.

### Injection et formatage

**Marquage automatique**

Le moteur d'exécution encapsule automatiquement le texte de rappel dans les balises `<system-reminder>` lors de l'injection dans les transcriptions :

```go
// You provide plain text:
Text: "Results are truncated. Narrow your query."

// Runtime injects:
<system-reminder>Results are truncated. Narrow your query.</system-reminder>
```

**Expliquer les rappels aux modèles**

Incluez `reminder.DefaultExplanation` dans l'invite de votre système afin que les modèles sachent comment interpréter les blocs `<system-reminder>` :

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
    for _, tr := range in.ToolOutputs {
        if tr.Name == "todos.update_todos" {
            snap, err := specs.UnmarshalUpdateTodosResult(tr.Result)
            if err != nil {
                return nil, err
            }
            
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

**Minimal et opiniâtre** : le sous-système de rappel fournit juste assez de structure pour les modèles courants sans ingénierie excessive.

**Limitation du débit d'abord** : le spam de rappel dégrade les performances du modèle. Le moteur applique les capuchons et l'espacement de manière déclarative.

**Agnostique du fournisseur** : les rappels fonctionnent avec n'importe quel backend de modèle (Bedrock, OpenAI, etc.).

**Prêt pour la télémétrie** : les identifiants et les priorités structurés rendent les rappels observables.

### Modèles avancés

**Rappels de sécurité**

Utilisez `TierSafety` pour obtenir des conseils sur la nécessité de ne jamais supprimer :

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

**Rappels multi-agents**

Les rappels sont limités à l'exécution. Si un agent en tant qu'outil émet un rappel de sécurité, cela n'affecte que cette exécution enfant. Pour propager les rappels au-delà des limites des agents, le planificateur parent doit les réenregistrer explicitement en fonction des résultats des enfants ou utiliser l'état de session partagée.

### Quand utiliser les rappels

| Scénario | Priorité | Exemple |
|----------|----------|---------|
| Contraintes de sécurité | `TierSafety` | "Ce fichier est un malware : analysez-le uniquement, ne l'exécutez jamais" |
| Obsolescence des données | `TierCorrect` | "Les résultats datent de 24 heures ; réinterrogez si la fraîcheur est importante" |
| Résultats tronqués | `TierCorrect` | "Affichage uniquement des 100 premiers résultats ; affinez votre recherche" |
| Coups de pouce au flux de travail | `TierGuidance` | "Aucune tâche n'est en cours ; choisissez-en une et commencez" |
| Conseils d'achèvement | `TierGuidance` | "Toutes les tâches sont terminées ; fournissez votre réponse finale" |

### À quoi ressemblent les rappels dans la transcription

```
User: What should I do next?

<system-reminder>You have 3 pending todos. Currently working on: "Review PR #42". 
Focus on completing the current todo before starting new work.</system-reminder>

User: What should I do next?
```

Le modèle voit le rappel ; l'utilisateur ne voit que son message et la réponse. Les rappels sont injectés de manière transparente par le runtime.

---

## Prochaines étapes

- En savoir plus sur [Mémoire et sessions](./memory-sessions/) pour la persistance des transcriptions
- Explorez [Composition d'agent](./agent-composition/) pour les modèles d'agent en tant qu'outil
- En savoir plus sur les [Toolsets](./toolsets/) pour les modèles d'exécution d'outils
