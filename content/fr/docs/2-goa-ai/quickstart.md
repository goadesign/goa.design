---
title: "Démarrage rapide"
linkTitle: "Démarrage rapide"
weight: 1
description: "Build a working AI agent in 10 minutes. Start with a stub, add streaming, validation, then connect a real LLM."
llm_optimized: true
aliases:
---

{{< alert title="Tested Example" color="info" >}}
Ce code est testé en CI. Si quelque chose ne fonctionne pas, [déposer un problème](https://github.com/goadesign/goa-ai/issues).
{{< /alert >}}

Au cours des 10 prochaines minutes, vous allez construire un système agentique prêt à la production en partant de zéro. Outils à sécurité de type, flux en temps réel, validation automatique avec tentatives d'auto-réparation, intégration LLM et composition d'agents, le tout à partir d'un DSL déclaratif. Un truc plutôt cool.

**Ce que vous allez construire:**

1. **Stub agent** - comprendre la boucle plan/exécution (3 min)
2. **Streaming** - voir les événements au fur et à mesure qu'ils se produisent
3. **Validation** - réessai automatique en cas de mauvaise entrée
4. **LLM réel - connectez OpenAI ou Claude
5. **Composition d'agents** - agents appelant des agents

À la fin, vous aurez un agent sûr avec des outils validés, un flux en temps réel et les bases d'un déploiement en production.

---

## Prérequis

```bash
# Go 1.24+
go version

# Install Goa CLI
go install goa.design/goa/v3/cmd/goa@latest
```

---

## Étape 1 : Configuration du projet

```bash
mkdir quickstart && cd quickstart
go mod init quickstart
go get goa.design/goa/v3@latest goa.design/goa-ai@latest
```

Créez `design/design.go`. Ce fichier définit votre agent et ses outils en utilisant le DSL de Goa. Voyez-le comme un contrat : ce que l'agent peut faire, les entrées qu'il accepte et les sorties qu'il renvoie.

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// Service groups related agents and methods
var _ = Service("demo", func() {
    // Agent defines an AI agent with a name and description
    Agent("assistant", "A helpful assistant", func() {
        // Use declares a toolset the agent can access
        Use("weather", func() {
            // Tool defines a capability the LLM can invoke
            Tool("get_weather", "Get current weather", func() {
                // Args defines the input schema (what the LLM sends)
                Args(func() {
                    Attribute("city", String, "City name")
                    Required("city")
                })
                // Return defines the output schema (what the tool returns)
                Return(func() {
                    Attribute("temperature", Int, "Temperature in Celsius")
                    Attribute("conditions", String, "Weather conditions")
                    Required("temperature", "conditions")
                })
            })
        })
    })
})
```

Générer du code :

```bash
goa gen quickstart/design
```

Ceci crée un répertoire `gen/` avec :
- **Aide à l'enregistrement de l'agent** - connectez votre agent au runtime
- **Tool specs and codecs** - gestion sûre des données utiles et des résultats
- **Schémas JSON** - pour les définitions d'outils LLM

Ne modifiez jamais les fichiers dans `gen/` - ils sont régénérés à chaque exécution de `goa gen`.

---

## Étape 2 : Exécuter avec un planificateur de stub

Avant de connecter un vrai LLM, nous allons comprendre comment les agents Goa-AI fonctionnent en utilisant un planificateur stub. Cela rend le flux explicite et vous aide à déboguer les problèmes plus tard.

**The plan/execute loop:**
1. L'exécution appelle `PlanStart` avec le message de l'utilisateur
2. Le planificateur renvoie une réponse finale ou l'outil appelle
3. Si des outils ont été appelés, le moteur d'exécution les exécute et appelle `PlanResume` avec les résultats
4. La boucle se poursuit jusqu'à ce que le planificateur renvoie une réponse finale

Création de `main.go` :

```go
package main

import (
    "context"
    "fmt"

    // Generated package for our assistant agent
    assistant "quickstart/gen/demo/agents/assistant"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
)

// StubPlanner implements the planner.Planner interface.
// A real planner would call an LLM; this one hardcodes the flow.
type StubPlanner struct{}

// PlanStart is called with the initial user message.
// Return ToolCalls to invoke tools, or FinalResponse to end the run.
func (p *StubPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    // Request a tool call: "toolset.tool_name" format
    return &planner.PlanResult{
        ToolCalls: []*planner.ToolCall{{
            Name:    "weather.get_weather",        // toolset.tool format
            Payload: []byte(`{"city": "Tokyo"}`),  // JSON matching Args schema
        }},
    }, nil
}

// PlanResume is called after tools execute, with their results in in.Messages.
// Decide: call more tools, or return a final response.
func (p *StubPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    // We have tool results; return final answer
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "Tokyo is 22°C and sunny!"}},
            },
        },
    }, nil
}

// StubExecutor implements runtime.Executor.
// Called when the planner requests a tool. Returns the tool's result.
type StubExecutor struct{}

func (e *StubExecutor) Execute(ctx context.Context, meta runtime.ToolCallMeta, req *planner.ToolRequest) (*planner.ToolResult, error) {
    // Return data matching the Return schema defined in the DSL
    return &planner.ToolResult{
        Name:   req.Name,
        Result: map[string]any{"temperature": 22, "conditions": "Sunny"},
    }, nil
}

func main() {
    ctx := context.Background()

    // Create runtime with in-memory engine (no external dependencies)
    rt := runtime.New()
    sessionID := "demo-session"
    if _, err := rt.CreateSession(ctx, sessionID); err != nil {
        panic(err)
    }

    // Register the agent with its planner and executor
    err := assistant.RegisterAssistantAgent(ctx, rt, assistant.AssistantAgentConfig{
        Planner:  &StubPlanner{},
        Executor: &StubExecutor{},
    })
    if err != nil {
        panic(err)
    }

    // Create a typed client for the agent
    client := assistant.NewClient(rt)

    // Start a run with a user message
    out, err := client.Run(ctx, sessionID, []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "What's the weather?"}},
    }})
    if err != nil {
        panic(err)
    }

    // Print the result
    fmt.Println("RunID:", out.RunID)
    if out.Final != nil {
        for _, p := range out.Final.Parts {
            if tp, ok := p.(model.TextPart); ok {
                fmt.Println("Assistant:", tp.Text)
            }
        }
    }
}
```

Exécuter :

```bash
go mod tidy && go run main.go
```

Sortie :
```
RunID: demo.assistant-abc123
Assistant: Tokyo is 22°C and sunny!
```

**What happened:**
1. L'exécution a appelé `PlanStart` → le planificateur a demandé l'outil `get_weather`
2. Le Runtime a exécuté l'outil via `StubExecutor`
3. Le Runtime a appelé `PlanResume` avec les résultats de l'outil → le planificateur a renvoyé la réponse finale

Le planificateur de stub code en dur ce flux, mais un planificateur LLM réel suit le même modèle - il décide simplement de manière dynamique en fonction de la conversation.

---

## Étape 3 : Ajouter le flux

Les agents peuvent être opaques. Les événements de flux vous permettent de voir exactement ce qui se passe, ce qui est utile pour le débogage et la construction d'interfaces utilisateur en temps réel.

Goa-AI émet des événements typés tout au long de l'exécution : `ToolStart`, `ToolEnd`, `Workflow` changements de phase, `AssistantReply` morceaux, etc. Vous les consommez via une interface `Sink`.

Voir les événements au fur et à mesure qu'ils se produisent :

```go
package main

import (
    "context"
    "fmt"

    assistant "quickstart/gen/demo/agents/assistant"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/runtime/agent/stream"
)

// Same stub planner as before
type StubPlanner struct{}

func (p *StubPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        ToolCalls: []*planner.ToolCall{{Name: "weather.get_weather", Payload: []byte(`{"city":"Tokyo"}`)}},
    }, nil
}

func (p *StubPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{
            Message: &model.Message{
                Role:  model.ConversationRoleAssistant,
                Parts: []model.Part{model.TextPart{Text: "Tokyo is 22°C and sunny!"}},
            },
        },
    }, nil
}

type StubExecutor struct{}

func (e *StubExecutor) Execute(ctx context.Context, meta runtime.ToolCallMeta, req *planner.ToolRequest) (*planner.ToolResult, error) {
    return &planner.ToolResult{Name: req.Name, Result: map[string]any{"temperature": 22, "conditions": "Sunny"}}, nil
}

// ConsoleSink implements stream.Sink to receive events.
// Events are typed—switch on the concrete type to handle each kind.
type ConsoleSink struct{}

func (s *ConsoleSink) Send(ctx context.Context, event stream.Event) error {
    // Type switch on event to handle different event kinds
    switch e := event.(type) {
    case stream.ToolStart:
        fmt.Printf("🔧 Tool: %s\n", e.Data.ToolName)
    case stream.ToolEnd:
        fmt.Printf("✅ Done: %s\n", e.Data.ToolName)
    case stream.Workflow:
        fmt.Printf("📋 %s\n", e.Data.Phase)
    // Other events: AssistantReply, PlannerThought, UsageDelta, etc.
    }
    return nil
}

func (s *ConsoleSink) Close(ctx context.Context) error { return nil }

func main() {
    ctx := context.Background()

    // Pass the sink to the runtime—all events flow through it
    rt := runtime.New(runtime.WithStream(&ConsoleSink{}))
    sessionID := "demo-session"
    if _, err := rt.CreateSession(ctx, sessionID); err != nil {
        panic(err)
    }

    _ = assistant.RegisterAssistantAgent(ctx, rt, assistant.AssistantAgentConfig{
        Planner:  &StubPlanner{},
        Executor: &StubExecutor{},
    })

    client := assistant.NewClient(rt)
    out, _ := client.Run(ctx, sessionID, []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "What's the weather?"}},
    }})

    fmt.Println("\nRunID:", out.RunID)
}
```

Sortie :
```
📋 started
🔧 Tool: weather.get_weather
✅ Done: weather.get_weather
📋 completed

RunID: demo.assistant-abc123
```

---

## Étape 4 : Ajouter la validation

Les LLMs font des erreurs. Ils enverront des chaînes vides, des valeurs d'enum invalides, ou du JSON malformé. Sans validation, ces erreurs font planter vos outils ou produisent des résultats erronés.

Goa-AI valide les charges utiles des outils à la frontière, avant que votre exécuteur ne s'exécute. Les appels non valides renvoient un `RetryHint` que le planificateur peut utiliser pour s'auto-corriger. Cela se fait automatiquement ; il vous suffit de définir les contraintes.

Mettez à jour `design/design.go` avec les contraintes :

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("demo", func() {
    Agent("assistant", "A helpful assistant", func() {
        Use("weather", func() {
            Tool("get_weather", "Get current weather", func() {
                Args(func() {
                    // MinLength/MaxLength: string length constraints
                    Attribute("city", String, "City name", func() {
                        MinLength(2)   // Rejects "" or "X"
                        MaxLength(100) // Rejects very long strings
                    })
                    // Enum: only these values are valid
                    Attribute("units", String, "Temperature units", func() {
                        Enum("celsius", "fahrenheit") // Rejects "kelvin"
                    })
                    Required("city") // city must be present
                })
                Return(func() {
                    Attribute("temperature", Int, "Temperature")
                    Attribute("conditions", String, "Weather conditions")
                    Required("temperature", "conditions")
                })
            })
        })
    })
})
```

Régénérer :

```bash
goa gen quickstart/design
```

Maintenant, si un planificateur envoie `{"city": ""}` ou `{"units": "kelvin"}` :

1. **Rejeté** à la frontière (avant que l'exécuteur ne s'exécute)
2. **RetryHint** renvoyé avec une erreur de validation
3. Le planificateur peut **auto-corriger** et réessayer

Voici ce que l'exécution renvoie en cas d'échec de la validation :

```go
// When the LLM sends invalid input like {"city": "", "units": "kelvin"}
// the runtime returns a ToolResult with RetryHint instead of calling your executor:
&planner.ToolResult{
    Name: "weather.get_weather",
    RetryHint: &planner.RetryHint{
        Message: `validation failed: city length must be >= 2; units must be one of ["celsius", "fahrenheit"]`,
    },
}

// The planner sees this error and can retry with corrected input.
// With real LLMs, this self-correction happens automatically—
// the model reads the error, understands what went wrong, and fixes it.
```

Pas de plantage. Pas d'analyse manuelle. Le LLM voit un message d'erreur clair et le corrige à la prochaine tentative.

---

## Etape 5 : LLM réel

Remplaçons maintenant le stub par un vrai LLM. Le travail du planificateur est de :
1. Construire une requête avec l'historique de la conversation et les outils disponibles
2. L'envoyer au modèle
3. Interpréter la réponse, qu'il s'agisse d'appels d'outils ou d'une réponse finale

Le moteur d'exécution s'occupe de tout le reste : l'exécution de l'outil, la validation, les tentatives et la diffusion en continu.

Connectez-vous à OpenAI ou à Claude. Tout d'abord, créez un planificateur réel qui utilise le client modèle :

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "os"

    assistant "quickstart/gen/demo/agents/assistant"
    "goa.design/goa-ai/features/model/openai"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/runtime/agent/stream"
)

// RealPlanner calls an actual LLM instead of hardcoding responses.
// It retrieves the model client from the runtime by ID.
type RealPlanner struct {
    systemPrompt string
}

func (p *RealPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    // Get the model client by the ID we registered it with
    client, ok := in.Agent.ModelClient("openai")
    if !ok {
        return nil, fmt.Errorf("no model client")
    }

    // Build messages: system prompt first, then user messages
    msgs := append([]*model.Message{{
        Role:  model.ConversationRoleSystem,
        Parts: []model.Part{model.TextPart{Text: p.systemPrompt}},
    }}, in.Messages...)

    // Call the LLM with messages and available tools
    // in.Tools contains the JSON schemas generated from your DSL
    resp, err := client.Complete(ctx, &model.Request{
        Messages: msgs,
        Tools:    in.Tools,
    })
    if err != nil {
        return nil, err
    }

    return interpretResponse(resp)
}

func (p *RealPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    client, ok := in.Agent.ModelClient("openai")
    if !ok {
        return nil, fmt.Errorf("no model client")
    }

    // in.Messages now includes tool results from the previous turn
    msgs := append([]*model.Message{{
        Role:  model.ConversationRoleSystem,
        Parts: []model.Part{model.TextPart{Text: p.systemPrompt}},
    }}, in.Messages...)

    resp, err := client.Complete(ctx, &model.Request{
        Messages: msgs,
        Tools:    in.Tools,
    })
    if err != nil {
        return nil, err
    }

    return interpretResponse(resp)
}

// interpretResponse converts the LLM response to a PlanResult.
// If the LLM requested tools, return ToolCalls. Otherwise, return FinalResponse.
func interpretResponse(resp *model.Response) (*planner.PlanResult, error) {
    if len(resp.Content) == 0 {
        return nil, fmt.Errorf("empty response")
    }

    msg := resp.Content[len(resp.Content)-1]
    var toolCalls []*planner.ToolCall

    // Check each part of the response for tool calls or text
    for _, part := range msg.Parts {
        switch p := part.(type) {
        case model.ToolUsePart:
            // LLM wants to call a tool—convert to ToolCall
            payload, _ := json.Marshal(p.Input)
            toolCalls = append(toolCalls, &planner.ToolCall{
                Name:    p.Name,
                Payload: payload,
            })
        case model.TextPart:
            // Text response (used if no tool calls)
        }
    }

    // If tools were requested, return them for execution
    if len(toolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: toolCalls}, nil
    }

    // No tools—this is the final answer
    return &planner.PlanResult{
        FinalResponse: &planner.FinalResponse{Message: &msg},
    }, nil
}

type WeatherExecutor struct{}

func (e *WeatherExecutor) Execute(ctx context.Context, meta runtime.ToolCallMeta, req *planner.ToolRequest) (*planner.ToolResult, error) {
    // Real implementation would call a weather API here
    return &planner.ToolResult{
        Name:   req.Name,
        Result: map[string]any{"temperature": 22, "conditions": "Sunny"},
    }, nil
}

// ConsoleSink streams assistant text to the console in real-time
type ConsoleSink struct{}

func (s *ConsoleSink) Send(ctx context.Context, event stream.Event) error {
    switch e := event.(type) {
    case stream.ToolStart:
        fmt.Printf("🔧 Tool: %s\n", e.Data.ToolName)
    case stream.AssistantReply:
        // Print text chunks as they arrive (streaming output)
        fmt.Print(e.Data.Text)
    }
    return nil
}
func (s *ConsoleSink) Close(ctx context.Context) error { return nil }

func main() {
    ctx := context.Background()

    // --- OpenAI ---
    modelClient, err := openai.NewFromAPIKey(os.Getenv("OPENAI_API_KEY"), "gpt-4o")
    if err != nil {
        panic(err)
    }

    // --- Claude via Bedrock (uncomment to use instead) ---
    // import "goa.design/goa-ai/features/model/bedrock"
    //
    // bedrockClient, err := bedrock.New(bedrock.Options{
    //     Region: "us-east-1",
    //     Model:  "anthropic.claude-sonnet-4-20250514-v1:0",
    // })
    // if err != nil {
    //     panic(err)
    // }
    // // Then use: runtime.WithModelClient("claude", bedrockClient)
    // // And in planner: in.Agent.ModelClient("claude")

    // Create runtime with streaming and model client
    // The ID ("openai") is how the planner retrieves it
    rt := runtime.New(
        runtime.WithStream(&ConsoleSink{}),
        runtime.WithModelClient("openai", modelClient),
    )
    sessionID := "demo-session"
    if _, err := rt.CreateSession(ctx, sessionID); err != nil {
        panic(err)
    }

    // Register the agent with the real planner
    err = assistant.RegisterAssistantAgent(ctx, rt, assistant.AssistantAgentConfig{
        Planner:  &RealPlanner{systemPrompt: "You are a helpful weather assistant."},
        Executor: &WeatherExecutor{},
    })
    if err != nil {
        panic(err)
    }

    // Run the agent
    client := assistant.NewClient(rt)
    out, err := client.Run(ctx, sessionID, []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "What's the weather in Paris?"}},
    }})
    if err != nil {
        panic(err)
    }

    fmt.Println("\n\nRunID:", out.RunID)
}
```

Exécutez avec votre clé API :

```bash
export OPENAI_API_KEY="sk-..."
go run main.go
```

Tous les adaptateurs de modèle mettent en œuvre la même interface `model.Client`, de sorte que le passage d'OpenAI à Claude ou à d'autres fournisseurs n'est qu'un changement de configuration - le code de votre planificateur reste le même.

---

## Étape 6 : Composition de l'agent

Les systèmes d'IA du monde réel ne sont pas constitués d'agents isolés : ce sont des spécialistes qui travaillent ensemble. Un agent de recherche recueille des données, un analyste les interprète et un rédacteur met en forme les résultats.

Goa-AI prend cela en charge de manière native avec **agent-as-tool**. Tout agent peut exposer des capacités que d'autres agents invoquent en tant qu'outils. L'agent imbriqué fonctionne avec son propre planificateur et ses propres outils, mais dans le cadre du flux de travail du parent - une seule transaction, un historique unifié, une traçabilité complète.

Les agents peuvent appeler d'autres agents en tant qu'outils. Ajouter à `design/design.go` :

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// Weather specialist agent—has its own tools and planner
var _ = Service("weather", func() {
    Agent("forecaster", "Weather specialist", func() {
        // Internal tools only this agent can use
        Use("weather_tools", func() {
            Tool("get_forecast", "Get forecast", func() {
                Args(func() {
                    Attribute("city", String, "City")
                    Required("city")
                })
                Return(func() {
                    Attribute("forecast", String, "Forecast")
                    Required("forecast")
                })
            })
        })

        // Export makes this agent callable as a tool by other agents.
        // The exported toolset defines the interface other agents see.
        Export("ask_weather", func() {
            Tool("ask", "Ask weather specialist", func() {
                Args(func() {
                    Attribute("question", String, "Question")
                    Required("question")
                })
                Return(func() {
                    Attribute("answer", String, "Answer")
                    Required("answer")
                })
            })
        })
    })
})

// Main assistant uses the weather agent as a tool
var _ = Service("demo", func() {
    Agent("assistant", "A helpful assistant", func() {
        // UseAgentToolset imports an exported toolset from another agent.
        // Args: service name, agent name, exported toolset name
        UseAgentToolset("weather", "forecaster", "ask_weather")
    })
})
```

Régénérer :

```bash
goa gen quickstart/design
```

Maintenant, lorsque l'assistant a besoin d'informations météorologiques :
1. Le planificateur de l'assistant décide d'appeler `ask_weather`
2. Le runtime invoque l'agent météo en tant qu'exécution enfant
3. L'agent météorologique exécute sa propre boucle de planification/exécution avec ses propres outils
4. L'agent météorologique renvoie sa réponse au parent
5. Le planificateur de l'assistant reçoit le résultat et continue

**Chaque agent dispose de son propre planificateur, de ses propres outils et de son propre contexte ** Le moteur d'exécution se charge de l'orchestration et vous bénéficiez d'une visibilité totale sur les deux exécutions grâce aux événements en continu.

---

## Ce que vous avez construit

**Agent typé** avec des outils validés par le schéma
**Streaming events** pour une visibilité en temps réel
**Validation** avec indices de réessai automatique
**Validation** avec conseils de réessai automatique
**Composition d'agents** avec arbres d'exécution

Le tout à partir d'un DSL déclaratif. La conception est votre source de vérité - modifiez-la, régénérez-la, et vos types, schémas et validations resteront automatiquement synchronisés.

**Ce qui se passe sous le capot:**
- Les codecs générés gèrent la sérialisation JSON avec les types appropriés
- La validation s'exécute à la frontière avant que votre code ne s'exécute
- La boucle plan/exécution gère l'état et les tentatives d'exécution
- Les événements sont acheminés vers n'importe quel puits que vous configurez

Il s'agit là de la base. Pour la production, vous ajouterez Temporal pour la durabilité, Mongo pour la persistance et Pulse pour le streaming distribué, mais le code de l'agent reste le même.

---

## Prochaines étapes

| Guide de l'utilisateur - Ce que vous apprendrez - Ce que vous apprendrez
|-------|-------------------|
| [Référence DSL](dsl-reference/) | Toutes les fonctions DSL : politiques, MCP, registres |
| [Exécution](runtime/) | Planification/exécution de la boucle, moteurs, stockage de la mémoire |
| [Outils](toolsets/) | Outils adossés à des services, transformateurs, exécuteurs |
| Composition des agents](agent-composition/) | Approfondissement des modèles d'agents en tant qu'outils |
| Production](production/) | Configuration temporelle, flux vers les interfaces utilisateur, limitation du débit |
