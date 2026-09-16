---
nav_group: guides
title: Intégration MCP
weight: 50
description: "Créez des serveurs MCP avec outils, ressources et prompts, et utilisez des outils MCP externes."
llm_optimized: true
aliases:
---

Goa-AI permet de **créer des serveurs MCP** et de **consommer des outils MCP externes**. Ajoutez des déclarations MCP à un service Goa pour exposer ses méthodes comme outils, publier des ressources et proposer des modèles de prompts. Le générateur produit le protocole JSON-RPC et les adaptateurs de service. Héberger un serveur MCP ne nécessite pas d’exécuter un agent Goa-AI.

Les callers HTTP et stdio des agents consomment des outils : ils initialisent une session, vérifient la capacité tools du serveur et invoquent `tools/call`. Leur interface n’expose pas d’opérations sur les ressources ou les prompts. Le serveur MCP généré prend en charge les outils, ressources et prompts déclarés dans son design.

## Aperçu

L'intégration MCP suit ce flux de travail :

1. **Conception de services** : Déclarez le serveur MCP via MCP DSL de Goa
2. **Conception d'agent** : référencez cette suite via un ensemble d'outils déclaré avec `FromMCP(...)` ou `FromExternalMCP(...)`.
3. **Génération de code** : produit le serveur MCP JSON-RPC (lorsqu'il est soutenu par Goa), ainsi que des aides à l'enregistrement d'exécution et des spécifications/codecs appartenant à l'ensemble d'outils pour la suite.
4. **Câblage d'exécution** : instanciez un `mcpruntime.Caller` HTTP ou stdio.
   L'appelant HTTP accepte une réponse JSON ou un flux d'événements HTTP. Les
   fonctions générées enregistrent l'ensemble d'outils et adaptent les erreurs
   JSON-RPC en valeurs `planner.ToolFailure`.
5. **Exécution du planificateur** : les planificateurs construisent les appels avec les descripteurs typés générés ; le runtime transmet le JSON canonique à l'appelant MCP, enregistre les résultats et expose une télémétrie structurée

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
    
    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })
    
    StaticPrompt("find-docs", "Help a user find documentation",
        "user", "Find relevant documentation for the user's question.")

    Method("readme", func() {
        Result(String)
        Resource("readme", "file:///docs/README.md", "text/markdown")
    })

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

// Create an HTTP MCP caller.
caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
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

Goa-AI prend en charge HTTP et stdio via le package `runtime/mcp`. Les deux
appelants implémentent l'interface `Caller` :

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
}

type CallRequest struct {
    Tool    string
    Payload json.RawMessage
}

type CallResponse struct {
    Content           []ContentBlock
    StructuredContent json.RawMessage
}
```

### Appelant HTTP

Pour les serveurs MCP accessibles via HTTP JSON-RPC :

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    Client:   customHTTPClient, // Facultatif ; par défaut, délai de 30 secondes.
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
    InitTimeout: 10 * time.Second, // Délai d'initialisation facultatif.
})
```

L'appelant HTTP effectue la négociation d'initialisation MCP lors de sa
création. Il envoie chaque message JSON-RPC 2.0 par une requête HTTP `POST` vers
le point de terminaison configuré. Il accepte les réponses JSON ou les flux
d'événements HTTP ; aucun appelant SSE distinct n'est nécessaire.

### Appelant Stdio

Pour les serveurs MCP exécutés en tant que sous-processus communiquant via stdin/stdout :

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
    Args:    []string{"--config", "config.json"},
    Env:     []string{"MCP_DEBUG=1"}, // Ajouté à l'environnement actuel.
    Dir:     "/path/to/workdir",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
    InitTimeout: 10 * time.Second, // Délai d'initialisation facultatif.
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
    content, structured, err := myCustomMCPCall(ctx, req.Tool, req.Payload)
    if err != nil {
        return mcpruntime.CallResponse{}, err
    }
    return mcpruntime.CallResponse{
        Content:           content,
        StructuredContent: structured,
    }, nil
})
```

### Appelant JSON-RPC généré par Goa

Pour les clients MCP générés par Goa qui encapsulent les méthodes de service :

```go
caller, err := mcpassistant.NewCaller(ctx, client, mcpruntime.ClientInfo{
    Name:    "my-agent",
    Version: "1.0.0",
})
```

---

## Flux d'exécution des outils

1. Le planificateur renvoie des appels construits avec les descripteurs MCP générés ou transmet des appels de modèle validés avec `planner.ToolRequestFromModelCall`
2. Le runtime valide le résultat complet du planificateur et attribue les identifiants d'exécution, ce qui produit des valeurs `runtime.ToolCall`
3. Le runtime détecte l'enregistrement de l'ensemble d'outils MCP
4. Il transmet la charge utile JSON canonique de l'appel du runtime à l'appelant MCP
5. L'appelant MCP utilise HTTP ou stdio et gère le protocole JSON-RPC. Une
   réponse HTTP peut être du JSON ou un flux d'événements
6. Décode le résultat à l'aide du codec généré
7. Renvoie `ToolResult` au planificateur

---

## Gestion des erreurs

Les fonctions générées adaptent les erreurs JSON-RPC en valeurs
`planner.ToolFailure` :

- **Erreurs de validation** → échecs d'appel invalide accompagnés d'informations
  précises pour la correction
- **Erreurs réseau** → échecs d'indisponibilité ou de délai avec une action
  explicite de replanification ou de finalisation
- **Erreurs du serveur** → causes structurées conservées dans l'échec

Les ensembles d'outils MCP et natifs partagent ainsi le même contrat de
récupération appliqué par le runtime.

Les échecs renvoyés par un outil deviennent des `ToolFailure`. Un résultat final
invalide du planificateur devient un `OutputContractError` : il est refusé sans
nouvel appel au modèle et n'est pas présenté comme un échec d'outil.

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
    
    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })
    
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
    storageinmem "goa.design/goa-ai/runtime/agent/storage/inmem"
)

func main() {
    rt := runtime.New(storageinmem.New())
    ctx := context.Background()
    
    // Wire MCP caller
    caller, err := mcpruntime.NewHTTPCaller(ctx, mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
        ClientInfo: mcpruntime.ClientInfo{
            Name:    "my-agent",
            Version: "1.0.0",
        },
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

- **Laissez codegen gérer l'enregistrement** : utilisez la fonction générée
  pour enregistrer les ensembles d'outils MCP ; évitez le câblage manuscrit
  afin que les codecs et la récupération structurée restent cohérents
- **Utilisez des appelants tapés** : préférez les appelants JSON-RPC générés par Goa lorsqu'ils sont disponibles pour la sécurité du type
- **Classez explicitement les erreurs** : mappez les erreurs MCP vers
  `ToolFailure` avec le type d'échec et l'action `Recovery.Action` appropriés
- **Surveiller la télémétrie** : les appels MCP émettent des événements de télémétrie structurés ; utilisez-les pour l'observabilité
- **Choisissez le bon transport** : utilisez HTTP pour les serveurs distants et stdio pour les serveurs lancés comme sous-processus. L'appelant HTTP accepte les réponses JSON et les flux d'événements.

---

## Prochaines étapes

- **[Ensembles d'outils](./toolsets.md)** - Comprendre les modèles d'exécution d'outils
- **[Mémoire et sessions](./memory-sessions.md)** - Gérer l'état avec les transcriptions et les magasins de mémoire
- **[Production](./production.md)** - Déployer avec Temporal et diffuser UI
