---
title: Intégration MCP
weight: 6
description: "Integrate external MCP servers into your agents with generated wrappers and callers."
llm_optimized: true
aliases:
---

Goa-AI offre une prise en charge de premier ordre pour l'intégration des serveurs MCP (Model Context Protocol) dans vos agents. Les ensembles d'outils MCP permettent aux agents d'utiliser des outils provenant de serveurs MCP externes via des wrappers et des appelants générés.

## Aperçu

L'intégration MCP suit ce flux de travail :

1. **Conception de services** : Déclarez le serveur MCP via MCP DSL de Goa
2. **Conception d'agent** : référencez cette suite via un ensemble d'outils déclaré avec `FromMCP(...)` ou `FromExternalMCP(...)`.
3. **Génération de code** : produit le serveur MCP JSON-RPC (lorsqu'il est soutenu par Goa), ainsi que des aides à l'enregistrement d'exécution et des spécifications/codecs appartenant à l'ensemble d'outils pour la suite.
4. **Câblage d'exécution** : instanciez un transport `mcpruntime.Caller` (HTTP/SSE/stdio). Les assistants générés enregistrent l'ensemble d'outils et adaptent les erreurs JSON-RPC en valeurs `planner.RetryHint`.
5. **Exécution du planificateur** : les planificateurs mettent simplement en file d'attente les appels d'outils avec les charges utiles canoniques JSON ; le moteur d'exécution les transmet à l'appelant MCP, conserve les résultats via des hooks et exécute une télémétrie structurée

---

## Déclaration des jeux d'outils MCP

### Dans la conception de services

Tout d’abord, déclarez le serveur MCP dans la conception de votre service Goa :

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCP("assistant-mcp", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
            Required("results")
        })
        Tool("search", "Search documents by query")
    })
})
```

### Dans la conception d'agents

Référencez ensuite la suite MCP dans votre agent :

```go
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Serveurs externes MCP avec schémas en ligne

Pour les serveurs MCP externes (non basés sur Goa), déclarez les outils avec des schémas en ligne :

```go
var RemoteSearch = Toolset("remote-search", FromExternalMCP("remote", "search"), func() {
    Tool("web_search", "Search the web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

---

## Câblage d'exécution

Au moment de l'exécution, instanciez un appelant MCP et enregistrez l'ensemble d'outils :

```go
import (
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    mcpassistant "example.com/assistant/gen/assistant/mcp_assistant"
)

// Create an MCP caller (HTTP, SSE, or stdio)
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
})
if err != nil {
    log.Fatal(err)
}

// Register the MCP toolset
if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
    log.Fatal(err)
}
```

---

## Types d'appelants MCP

Goa-AI prend en charge plusieurs types de transport MCP via le package `runtime/mcp`. Tous les appelants implémentent l'interface `Caller` :

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
}
```

### Appelant HTTP

Pour les serveurs MCP accessibles via HTTP JSON-RPC :

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Basic usage with defaults
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
})

// Full configuration
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint:        "https://assistant.example.com/mcp",
    Client:          customHTTPClient,        // Optional: custom *http.Client
    ProtocolVersion: "2024-11-05",            // Optional: MCP protocol version
    ClientName:      "my-agent",              // Optional: client name for handshake
    ClientVersion:   "1.0.0",                 // Optional: client version
    InitTimeout:     10 * time.Second,        // Optional: initialize handshake timeout
})
```

L'appelant HTTP effectue la négociation d'initialisation MCP lors de la création et utilise JSON-RPC synchrone sur HTTP POST pour les appels d'outils.

### Appelant SSE

Pour les serveurs MCP utilisant le streaming d'événements envoyés par le serveur :

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Basic usage
caller, err := mcpruntime.NewSSECaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
})

// Full configuration (same options as HTTP)
caller, err := mcpruntime.NewSSECaller(ctx, mcpruntime.HTTPOptions{
    Endpoint:        "https://assistant.example.com/mcp",
    Client:          customHTTPClient,
    ProtocolVersion: "2024-11-05",
    ClientName:      "my-agent",
    ClientVersion:   "1.0.0",
    InitTimeout:     10 * time.Second,
})
```

L'appelant SSE utilise HTTP pour la négociation d'initialisation mais demande des réponses `text/event-stream` pour les appels d'outils, permettant aux serveurs de diffuser les événements de progression avant la réponse finale.

### Appelant Stdio

Pour les serveurs MCP exécutés en tant que sous-processus communiquant via stdin/stdout :

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Basic usage
caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
})

// Full configuration
caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command:         "mcp-server",
    Args:            []string{"--config", "config.json"},
    Env:             []string{"MCP_DEBUG=1"},  // Additional environment variables
    Dir:             "/path/to/workdir",       // Working directory
    ProtocolVersion: "2024-11-05",
    ClientName:      "my-agent",
    ClientVersion:   "1.0.0",
    InitTimeout:     10 * time.Second,
})
defer caller.Close() // Clean up subprocess
```

L'appelant stdio lance la commande en tant que sous-processus, effectue la négociation d'initialisation MCP et maintient la session lors des appels d'outils. Appelez `Close()` pour terminer le sous-processus une fois terminé.

### Adaptateur CallerFunc

Pour les implémentations ou les tests d'appelants personnalisés :

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Adapt a function to the Caller interface
caller := mcpruntime.CallerFunc(func(ctx context.Context, req mcpruntime.CallRequest) (mcpruntime.CallResponse, error) {
    // Custom implementation
    result, err := myCustomMCPCall(ctx, req.Suite, req.Tool, req.Payload)
    if err != nil {
        return mcpruntime.CallResponse{}, err
    }
    return mcpruntime.CallResponse{Result: result}, nil
})
```

### Appelant JSON-RPC généré par Goa

Pour les clients MCP générés par Goa qui encapsulent les méthodes de service :

```go
caller := mcpassistant.NewCaller(client) // Uses Goa-generated client
```

---

## Flux d'exécution des outils

1. Le planificateur renvoie des appels d'outils faisant référence aux outils MCP (la charge utile est `json.RawMessage`)
2. Le moteur d'exécution détecte l'enregistrement du jeu d'outils MCP
3. Transfère la charge utile canonique JSON à l’appelant MCP
4. Appelle l'appelant MCP avec le nom de l'outil et la charge utile
5. L'appelant MCP gère le transport (HTTP/SSE/stdio) et le protocole JSON-RPC
6. Décode le résultat à l'aide du codec généré
7. Renvoie `ToolResult` au planificateur

---

## Gestion des erreurs

Les assistants générés adaptent les erreurs JSON-RPC en valeurs `planner.RetryHint` :

- **Erreurs de validation** → `RetryHint` avec conseils pour les planificateurs
- **Erreurs réseau** → Réessayez les astuces avec les recommandations d'attente
- **Erreurs de serveur** → Détails de l'erreur conservés dans les résultats de l'outil

Cela permet aux planificateurs de récupérer des erreurs MCP en utilisant les mêmes modèles de tentatives que les ensembles d'outils natifs.

---

## Exemple complet

### Conception

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// MCP server service
var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCP("assistant-mcp", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
            Required("results")
        })
        Tool("search", "Search documents by query")
    })
})

// Agent that uses MCP tools
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Durée d'exécution

```go
package main

import (
    "context"
    "log"
    
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    chat "example.com/assistant/gen/orchestrator/agents/chat"
    mcpassistant "example.com/assistant/gen/assistant/mcp_assistant"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    ctx := context.Background()
    
    // Wire MCP caller
    caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
    })
    if err != nil {
        log.Fatal(err)
    }
    if err := mcpassistant.RegisterAssistantAssistantMcpToolset(ctx, rt, caller); err != nil {
        log.Fatal(err)
    }
    
    // Register agent
    if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
        Planner: &MyPlanner{},
    }); err != nil {
        log.Fatal(err)
    }
    
    // Run agent
    client := chat.NewClient(rt)
    // ... use client ...
}
```

### Planificateur

Votre planificateur peut référencer les outils MCP tout comme les ensembles d'outils natifs :

```go
func (p *MyPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        ToolCalls: []planner.ToolRequest{
            {
                Name:    "assistant.assistant-mcp.search",
                Payload: []byte(`{"query": "golang tutorials"}`),
            },
        },
    }, nil
}
```

---

## Meilleures pratiques

- **Laissez codegen gérer l'enregistrement** : utilisez l'assistant généré pour enregistrer les ensembles d'outils MCP ; évitez la colle manuscrite afin que les codecs et les conseils de nouvelle tentative restent cohérents
- **Utilisez des appelants tapés** : préférez les appelants JSON-RPC générés par Goa lorsqu'ils sont disponibles pour la sécurité du type
- **Gérez les erreurs avec élégance** : mappez les erreurs MCP aux valeurs `RetryHint` pour aider les planificateurs à récupérer
- **Surveiller la télémétrie** : les appels MCP émettent des événements de télémétrie structurés ; utilisez-les pour l'observabilité
- **Choisissez le bon transport** : utilisez HTTP pour une requête/réponse simple, SSE pour le streaming, stdio pour les serveurs basés sur des sous-processus.

---

## Prochaines étapes

- **[Ensembles d'outils](./toolsets.md)** - Comprendre les modèles d'exécution d'outils
- **[Mémoire et sessions](./memory-sessions.md)** - Gérer l'état avec les transcriptions et les magasins de mémoire
- **[Production](./production.md)** - Déployer avec Temporal et diffuser UI
