---
title: Intégration MCP
weight: 6
description: "Integrate external MCP servers into your agents with generated wrappers and callers."
llm_optimized: true
aliases:
---

Goa-AI fournit un support de premier ordre pour l'intégration de serveurs MCP (Model Context Protocol) dans vos agents. Les ensembles d'outils MCP permettent aux agents de consommer des outils provenant de serveurs MCP externes par le biais de wrappers et d'appelants générés.

## Aperçu

L'intégration MCP suit ce flux de travail :

1. **Conception du service** : Déclarer le serveur MCP via le DSL MCP de Goa
2. **Conception de l'agent** : Référencez cette suite avec `Use(MCPToolset("service", "suite"))`
3. **Génération de code** : Produit le serveur MCP JSON-RPC (lorsqu'il est généré par Goa), ainsi que des aides d'enregistrement runtime et des specs/codecs propriétaires du toolset (suite)
4. **Câblage d'exécution** : Instanciation d'un transport `mcpruntime.Caller` (HTTP/SSE/stdio). Les aides générées enregistrent l'ensemble d'outils et adaptent les erreurs JSON-RPC en valeurs `planner.RetryHint`
5. **Exécution du planificateur** : Les planificateurs lancent simplement des appels d'outils avec des charges utiles JSON canoniques ; le moteur d'exécution les transmet à l'appelant MCP, conserve les résultats par l'intermédiaire de crochets et présente des données télémétriques structurées

---

## Déclaration des ensembles d'outils MCP

### Dans la conception des services

Tout d'abord, déclarez le serveur MCP dans votre conception de service Goa :

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
            Required("results")
        })
        MCPTool("search", "Search documents by query")
    })
})
```

### Dans la conception de l'agent

Faites ensuite référence à la suite MCP dans votre agent :

```go
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

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

### Serveurs MCP externes avec schémas en ligne

Pour les serveurs MCP externes (non soutenus par Goa), déclarer les outils avec des schémas en ligne :

```go
var RemoteSearch = MCPToolset("remote", "search", func() {
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

Au moment de l'exécution, instanciez un appelant MCP et enregistrez l'ensemble d'outils :

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

Goa-AI prend en charge plusieurs types de transport MCP par le biais du paquet `runtime/mcp`. Tous les appelants mettent en œuvre l'interface `Caller` :

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
}
```

### Appelant HTTP

Pour les serveurs MCP accessibles via HTTP JSON-RPC :

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

L'appelant HTTP effectue l'initialisation MCP lors de la création et utilise JSON-RPC synchrone sur HTTP POST pour les appels d'outils.

### Appelant SSE

Pour les serveurs MCP utilisant le flux d'événements envoyés par le serveur :

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

L'appelant SSE utilise HTTP pour la poignée de main d'initialisation mais demande des réponses `text/event-stream` pour les appels d'outils, ce qui permet aux serveurs de diffuser des événements de progression avant la réponse finale.

### Appelant Stdio

Pour les serveurs MCP fonctionnant en tant que sous-processus et communiquant via stdin/stdout :

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

L'appelant stdio lance la commande en tant que sous-processus, exécute l'accord d'initialisation MCP et maintient la session à travers les invocations de l'outil. Appelez `Close()` pour mettre fin au sous-processus lorsque vous avez terminé.

### CallerFunc Adapter

Pour les implémentations d'appelants personnalisés ou les tests :

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

Pour les clients MCP générés par Goa qui enveloppent les méthodes de service :

```go
caller := mcpassistant.NewCaller(client) // Uses Goa-generated client
```

---

## Flux d'exécution de l'outil

1. Le planificateur renvoie les appels d'outils faisant référence aux outils MCP (la charge utile est `json.RawMessage`)
2. Le moteur d'exécution détecte l'enregistrement de l'ensemble d'outils MCP
3. Transmet la charge utile JSON canonique à l'appelant MCP
4. Invite l'appelant MCP avec le nom de l'outil et la charge utile
5. L'appelant MCP gère le transport (HTTP/SSE/stdio) et le protocole JSON-RPC
6. Décode le résultat à l'aide du codec généré
7. Retourne `ToolResult` au planificateur

---

## Gestion des erreurs

Les aides générées adaptent les erreurs JSON-RPC en valeurs `planner.RetryHint` :

- **Erreurs de validation** → `RetryHint` avec des conseils pour les planificateurs
- **Erreurs de réseau** → Indications de réessai avec des recommandations de recul
- **Erreurs de serveur** → Détails de l'erreur conservés dans les résultats de l'outil

Cela permet aux planificateurs de récupérer les erreurs MCP en utilisant les mêmes schémas de réessai que les outils natifs.

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
    
    MCPServer("assistant", "1.0.0", ProtocolVersion("2025-06-18"))
    
    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
            Required("results")
        })
        MCPTool("search", "Search documents by query")
    })
})

// Agent that uses MCP tools
var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

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

### Exécution

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

Votre planificateur peut faire référence à des outils MCP tout comme à des ensembles d'outils natifs :

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

- **Laissez codegen gérer l'enregistrement** : Utilisez l'aide générée pour enregistrer les ensembles d'outils MCP ; évitez la colle écrite à la main pour que les codecs et les indices de réessai restent cohérents
- **Utilisez des appelants typés** : Préférez les appelants JSON-RPC générés par Goa lorsqu'ils sont disponibles pour la sécurité des types
- **Gérer les erreurs avec élégance** : Tracer les erreurs MCP aux valeurs `RetryHint` pour aider les planificateurs à récupérer
- **Surveiller la télémétrie** : Les appels MCP émettent des événements de télémétrie structurés ; utilisez-les pour l'observabilité
- **Choisir le bon transport** : Choisissez le bon transport** : utilisez HTTP pour les requêtes/réponses simples, SSE pour les flux, stdio pour les serveurs basés sur des sous-processus

---

## Prochaines étapes

- **[Outils](./toolsets.md)** - Comprendre les modèles d'exécution des outils
- **[Mémoire et sessions](./memory-sessions.md)** - Gérer l'état avec les transcriptions et les mémoires
- **[Production](./production.md)** - Déployer avec l'interface temporelle et le streaming
