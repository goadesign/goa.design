---
title: "Inicio rápido"
linkTitle: "Inicio rápido"
weight: 1
description: "Build a working AI agent in 10 minutes. Start with a stub, add streaming, validation, then connect a real LLM."
llm_optimized: true
aliases:
---

{{< alert title="Tested Example" color="info" >}}
Este código se prueba en CI. Si algo no funciona, [file an issue](https://github.com/goadesign/goa-ai/issues).
{{< /alert >}}

En los próximos 10 minutos, construirás un sistema agentic listo para producción desde cero. Herramientas de tipo seguro, streaming en tiempo real, validación automática con reintentos de autocuración, integración LLM y composición de agentes, todo desde un DSL declarativo. Cosas geniales.

**Qué construirás:**

1. **Agente Stub** - entender el bucle plan/ejecutar (3 min)
2. **Streaming** - ver los eventos a medida que ocurren
3. **Validación** - reintento automático en entradas erróneas
4. **Real LLM** - conectar OpenAI o Claude
5. **Composición de agentes** - agentes que llaman a agentes

Al final, tendrás un agente de tipo seguro con herramientas validadas, streaming en tiempo real y la base para el despliegue en producción.

---

## Prerrequisitos

```bash
# Go 1.24+
go version

# Install Goa CLI
go install goa.design/goa/v3/cmd/goa@latest
```

---

## Paso 1: Configuración del proyecto

```bash
mkdir quickstart && cd quickstart
go mod init quickstart
go get goa.design/goa/v3@latest goa.design/goa-ai@latest
```

Cree `design/design.go`. Este fichero define tu agente y sus herramientas usando el DSL de Goa. Piensa en él como un contrato: qué puede hacer el agente, qué entradas acepta y qué salidas devuelve.

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

Generar código:

```bash
goa gen quickstart/design
```

Esto crea un directorio `gen/` con:
- **Ayudantes de registro de agente** - cablea tu agente al tiempo de ejecución
- **Especificaciones de herramientas y codecs** - manejo seguro de la carga útil/resultado
- **Esquemas JSON** - para definiciones de herramientas LLM

Nunca edites archivos en `gen/` - se regeneran en cada ejecución de `goa gen`.

---

## Paso 2: Ejecutar con un Stub Planner

Antes de conectar un LLM real, vamos a entender cómo funcionan los agentes de Goa-AI utilizando un planificador stub. Esto hace el flujo explícito y te ayuda a depurar problemas más tarde.

**El bucle plan/execute:**
1. El tiempo de ejecución llama a `PlanStart` con el mensaje del usuario
2. El planificador devuelve una respuesta final o la herramienta llama a
3. Si se ha llamado a herramientas, el tiempo de ejecución las ejecuta y llama a `PlanResume` con los resultados
4. El bucle continúa hasta que el planificador devuelve una respuesta final

Crea `main.go`:

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

Ejecutar:

```bash
go mod tidy && go run main.go
```

Salida:
```
RunID: demo.assistant-abc123
Assistant: Tokyo is 22°C and sunny!
```

**Qué ha pasado:**
1. El tiempo de ejecución llamó a `PlanStart` → el planificador solicitó la herramienta `get_weather`
2. El tiempo de ejecución ejecutó la herramienta a través de `StubExecutor`
3. El tiempo de ejecución llamó a `PlanResume` con los resultados de la herramienta → el planificador devolvió la respuesta final

El planificador stub hardcodes este flujo, pero un planificador LLM real sigue el mismo patrón-sólo decide dinámicamente basado en la conversación.

### Opcional: añadir Prompt Override Store

Si quieres overrides de prompts gestionados en runtime desde el primer dia, conecta un prompt store al crear el runtime:

```go
import (
    promptmongo "goa.design/goa-ai/features/prompt/mongo"
    clientmongo "goa.design/goa-ai/features/prompt/mongo/clients/mongo"
)

promptClient, _ := clientmongo.New(clientmongo.Options{
    Client:   mongoClient,
    Database: "quickstart",
})
promptStore, _ := promptmongo.NewStore(promptClient)

rt := runtime.New(
    runtime.WithPromptStore(promptStore),
)
```

Tambien puedes ejecutar sin prompt store; en ese caso, el runtime usa solo los prompt specs base.

---

## Paso 3: Añadir Streaming

Los agentes pueden ser opacos. Los eventos de streaming permiten ver exactamente lo que está ocurriendo, lo que resulta útil para depurar y crear interfaces de usuario en tiempo real.

Goa-AI emite eventos tipados a lo largo de la ejecución: `ToolStart`, `ToolEnd`, `Workflow` cambios de fase, `AssistantReply` chunks, y más. Se consumen a través de una interfaz `Sink`.

Vea los eventos a medida que suceden:

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

Salida:
```
📋 started
🔧 Tool: weather.get_weather
✅ Done: weather.get_weather
📋 completed

RunID: demo.assistant-abc123
```

---

## Paso 4: Añadir Validación

Los LLMs cometen errores. Enviarán cadenas vacías, valores de enum inválidos o JSON malformado. Sin validación, estos errores bloquean sus herramientas o producen resultados basura.

Goa-AI valida las cargas útiles de las herramientas en el límite, antes de que se ejecute el ejecutor. Las llamadas no válidas devuelven un `RetryHint` que el planificador puede utilizar para autocorregirse. Esto sucede de forma automática; sólo tiene que definir las restricciones.

Actualice `design/design.go` con restricciones:

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

Regenerar:

```bash
goa gen quickstart/design
```

Ahora si un planificador envía `{"city": ""}` o `{"units": "kelvin"}`:

1. **Rechazado** en el límite (antes de que se ejecute el ejecutor)
2. **RetryHint** devuelto con error de validación
3. El planificador puede **autocorregir** y reintentar

Esto es lo que devuelve el tiempo de ejecución cuando falla la validación:

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

No se bloquea. No hay análisis manual. El LLM ve un mensaje de error claro y lo soluciona en el siguiente intento.

---

## Paso 5: LLM real

Ahora vamos a sustituir el stub por un LLM real. El trabajo del planificador es:
1. Construir una petición con el historial de conversaciones y las herramientas disponibles
2. Enviarla al modelo
3. Interpretar la respuesta, ya sean llamadas a herramientas o una respuesta final

El tiempo de ejecución se encarga de todo lo demás: ejecución de herramientas, validación, reintentos y streaming.

Conectarse a OpenAI o Claude. Primero, crea un planificador real que utilice el cliente modelo:

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

Ejecútalo con tu clave API:

```bash
export OPENAI_API_KEY="sk-..."
go run main.go
```

Todos los adaptadores de modelos implementan la misma interfaz `model.Client`, por lo que cambiar entre OpenAI, Claude u otros proveedores es solo un cambio de configuración: tu código de planificador sigue siendo el mismo.

---

## Paso 6: Composición del Agente

Los sistemas de IA del mundo real no son agentes individuales, sino especialistas que trabajan juntos. Un agente de investigación recopila datos, un analista los interpreta y un escritor da formato al resultado.

Goa-AI soporta esto de forma nativa con **agente-como-herramienta**. Cualquier agente puede exponer capacidades que otros agentes invocan como herramientas. El agente anidado se ejecuta con su propio planificador y herramientas, pero dentro del flujo de trabajo del agente padre: transacción única, historial unificado, trazabilidad completa.

Los agentes pueden llamar a otros agentes como herramientas. Añadir a `design/design.go`:

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

Regenerar:

```bash
goa gen quickstart/design
```

Ahora cuando el asistente necesite información meteorológica:
1. El planificador del asistente decide llamar a `ask_weather`
2. El tiempo de ejecución invoca al agente meteorológico como una ejecución hija
3. El agente meteorológico ejecuta su propio bucle plan/execute con sus propias herramientas
4. El agente meteorológico devuelve su respuesta al padre
5. El planificador del asistente recibe el resultado y continúa

**Cada agente tiene su propio planificador, herramientas y contexto. El tiempo de ejecución se encarga de la orquestación, y se obtiene una visibilidad completa de ambas ejecuciones a través de eventos de streaming.

---

## What You Built

✅ **Agente tipificado** con herramientas validadas por esquema
✅ **Streaming de eventos** para visibilidad en tiempo real
✅ **Validación** con sugerencias automáticas de reintento
✅ **Integración de LLM** real
✅ **Composición de agentes** con árboles de ejecución

Todo ello desde un DSL declarativo. El diseño es su fuente de verdad: cámbielo, regenérelo y sus tipos, esquemas y validación se mantendrán sincronizados automáticamente.

**Qué se ejecuta bajo el capó:**
- Los códecs generados manejan la serialización JSON con los tipos adecuados
- La validación se ejecuta en el límite antes de que su código se ejecute
- El bucle plan/execute gestiona el estado y los reintentos
- Los eventos fluyen a cualquier sumidero que configure

Esta es la base. Para la producción, añadirá Temporal para la durabilidad, Mongo para la persistencia y Pulse para la transmisión distribuida, pero el código del agente seguirá siendo el mismo.

---

## Próximos pasos

| Guía | Lo que aprenderá |
|-------|-------------------|
| [DSL Reference](dsl-reference/) | Todas las funciones de DSL: políticas, MCP, registros | | [Runtime](runtime/)
| [Runtime](runtime/) | Planificar/ejecutar bucle, motores, almacenes de memoria |
| [Conjuntos de herramientas](toolsets/) | Herramientas respaldadas por servicios, transformaciones, ejecutores | 
| [Composición de agentes](agent-composition/) | Profundización en patrones de agentes como herramientas |
| [Producción](production/) | Configuración temporal, streaming a UIs, limitación de tasa |
