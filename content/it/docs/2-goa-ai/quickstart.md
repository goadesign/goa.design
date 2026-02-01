---
title: "Avvio rapido"
linkTitle: "Avvio rapido"
weight: 1
description: "Build a working AI agent in 10 minutes. Start with a stub, add streaming, validation, then connect a real LLM."
llm_optimized: true
aliases:
---

{{< alert title="Tested Example" color="info" >}}
Questo codice è testato in CI. Se qualcosa non funziona, [segnalare un problema] (https://github.com/goadesign/goa-ai/issues).
{{< /alert >}}

Nei prossimi 10 minuti, costruirete da zero un sistema agenziale pronto per la produzione. Strumenti sicuri dal punto di vista tipologico, streaming in tempo reale, validazione automatica con tentativi di autoguarigione, integrazione LLM e composizione di agenti, il tutto da un DSL dichiarativo. Roba da matti.

**Cosa costruirete:**

1. **Agente Stub** - capire il ciclo di pianificazione/esecuzione (3 min)
2. **Streaming** - vedere gli eventi mentre accadono
3. **Validazione** - Riprova automatica in caso di input errato
4. **LLM reale** - connettere OpenAI o Claude
5. **Composizione di agenti** - agenti che chiamano agenti

Alla fine, avrete un agente sicuro dal punto di vista tipologico con strumenti convalidati, streaming in tempo reale e le basi per la distribuzione in produzione.

---

## Prerequisiti

```bash
# Go 1.24+
go version

# Install Goa CLI
go install goa.design/goa/v3/cmd/goa@latest
```

---

## Passo 1: Impostazione del progetto

```bash
mkdir quickstart && cd quickstart
go mod init quickstart
go get goa.design/goa/v3@latest goa.design/goa-ai@latest
```

Creare `design/design.go`. Questo file definisce l'agente e i suoi strumenti utilizzando il DSL di Goa. Consideratelo come un contratto: cosa può fare l'agente, quali input accetta e quali output restituisce.

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

Generare codice:

```bash
goa gen quickstart/design
```

Questo crea una cartella `gen/` con:
- **Aiutanti di registrazione dell'agente** - collegano l'agente al runtime
- **Specifiche degli strumenti e codec** - gestione del carico utile/risultato sicuro dal punto di vista del tipo
- **Schemi JSON** - per le definizioni degli strumenti LLM

Non modificare mai i file in `gen/`: vengono rigenerati a ogni esecuzione di `goa gen`.

---

## Passo 2: Eseguire con uno Stub Planner

Prima di collegare un vero LLM, cerchiamo di capire come funzionano gli agenti Goa-AI utilizzando un pianificatore stub. Questo rende il flusso esplicito e aiuta a risolvere i problemi in un secondo momento.

**Il ciclo di pianificazione/esecuzione:**
1. Il runtime chiama `PlanStart` con il messaggio dell'utente
2. Il pianificatore restituisce una risposta finale o chiama lo strumento
3. Se gli strumenti sono stati chiamati, il runtime li esegue e richiama `PlanResume` con i risultati
4. Il ciclo continua finché il pianificatore non restituisce una risposta finale

Creare `main.go`:

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

Eseguire:

```bash
go mod tidy && go run main.go
```

Uscita:
```
RunID: demo.assistant-abc123
Assistant: Tokyo is 22°C and sunny!
```

**Cosa è successo:**
1. Il runtime ha chiamato `PlanStart` → il pianificatore ha richiesto lo strumento `get_weather`
2. Il runtime ha eseguito il tool tramite `StubExecutor`
3. Il runtime ha chiamato `PlanResume` con i risultati del tool → il pianificatore ha restituito la risposta finale

Il pianificatore stub codifica questo flusso, ma un vero pianificatore LLM segue lo stesso schema: decide solo dinamicamente in base alla conversazione.

---

## Passo 3: Aggiungere il flusso

Gli agenti possono essere opachi. Gli eventi di streaming consentono di vedere esattamente ciò che sta accadendo, utile per il debug e la costruzione di interfacce utente in tempo reale.

Goa-AI emette eventi tipizzati durante l'esecuzione: `ToolStart`, `ToolEnd`, `Workflow` cambi di fase, `AssistantReply` chunks e altro ancora. Si consumano tramite un'interfaccia `Sink`.

Vedere gli eventi mentre accadono:

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

Uscita:
```
📋 started
🔧 Tool: weather.get_weather
✅ Done: weather.get_weather
📋 completed

RunID: demo.assistant-abc123
```

---

## Passo 4: Aggiungere la validazione

Gli LLM commettono errori. Inviano stringhe vuote, valori enum non validi o JSON malformato. Senza validazione, questi errori mandano in crash gli strumenti o producono risultati inutili.

Goa-AI convalida i payload degli strumenti al confine, prima che l'esecutore venga eseguito. Le chiamate non valide restituiscono un `RetryHint` che il pianificatore può utilizzare per autocorreggersi. Questo avviene automaticamente, basta definire i vincoli.

Aggiornare `design/design.go` con i vincoli:

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

Rigenerare:

```bash
goa gen quickstart/design
```

Ora se un pianificatore invia `{"city": ""}` o `{"units": "kelvin"}`:

1. **Rifiutato** al confine (prima che l'esecutore venga eseguito)
2. **RetryHint** restituito con errore di convalida
3. Il pianificatore può effettuare una **correzione** e riprovare

Ecco cosa restituisce il runtime quando la validazione fallisce:

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

Nessun arresto anomalo. Nessun parsing manuale. L'LLM vede un chiaro messaggio di errore e lo risolve al prossimo tentativo.

---

## Passo 5: LLM reale

Ora sostituiamo lo stub con un vero LLM. Il compito del pianificatore è quello di:
1. Costruire una richiesta con la cronologia delle conversazioni e gli strumenti disponibili
2. Inviarla al modello
3. Interpretare la risposta: chiamate di strumenti o risposta finale

Il runtime gestisce tutto il resto: esecuzione dello strumento, convalida, tentativi e streaming.

Connettersi a OpenAI o Claude. Per prima cosa, creare un vero pianificatore che utilizzi il client del modello:

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

Eseguire con la chiave API:

```bash
export OPENAI_API_KEY="sk-..."
go run main.go
```

Tutti gli adattatori di modello implementano la stessa interfaccia `model.Client`, per cui il passaggio da OpenAI, Claude o altri provider è solo una modifica della configurazione: il codice del pianificatore rimane lo stesso.

---

## Passo 6: Composizione dell'agente

I sistemi di IA del mondo reale non sono agenti singoli, ma specialisti che lavorano insieme. Un agente di ricerca raccoglie dati, un analista li interpreta, uno scrittore formatta l'output.

Goa-AI supporta tutto questo in modo nativo con **agent-as-tool**. Ogni agente può esporre capacità che altri agenti invocano come strumenti. L'agente annidato viene eseguito con il proprio pianificatore e i propri strumenti, ma all'interno del flusso di lavoro del genitore: singola transazione, cronologia unificata, tracciabilità completa.

Gli agenti possono richiamare altri agenti come strumenti. Aggiungere a `design/design.go`:

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

Rigenerare:

```bash
goa gen quickstart/design
```

Ora, quando l'assistente ha bisogno di informazioni meteo:
1. Il pianificatore dell'assistente decide di chiamare `ask_weather`
2. Il runtime invoca l'agente meteo come esecuzione figlia
3. L'agente meteo esegue il proprio ciclo di pianificazione/esecuzione con i propri strumenti
4. L'agente meteo restituisce la sua risposta al genitore
5. Il pianificatore dell'assistente riceve il risultato e prosegue

**Ogni agente ha il suo pianificatore, i suoi strumenti e il suo contesto ** Il runtime gestisce l'orchestrazione e l'utente ha piena visibilità su entrambe le esecuzioni tramite eventi in streaming.

---

## Cosa hai costruito

✅ **Agente di tipo** con strumenti convalidati dallo schema
**Eventi di streaming** per una visibilità in tempo reale
**Validazione** con suggerimenti automatici per i tentativi di recupero
✅ **Integrazione con LLM** reale
✅ **Composizione di agenti** con alberi di esecuzione

Il tutto da un DSL dichiarativo. Il progetto è la vostra fonte di verità: cambiatelo, rigeneratelo e i tipi, gli schemi e la validazione rimarranno automaticamente sincronizzati.

**Cosa c'è sotto il cofano?
- I codec generati gestiscono la serializzazione JSON con tipi appropriati
- La convalida viene eseguita prima dell'esecuzione del codice
- Il ciclo plan/execute gestisce lo stato e i tentativi di esecuzione
- Gli eventi vengono inviati a qualsiasi sink configurato dall'utente

Queste sono le fondamenta. Per la produzione, si aggiungerà Temporal per la durata, Mongo per la persistenza e Pulse per lo streaming distribuito, ma il codice dell'agente rimarrà lo stesso.

---

## Prossimi passi

| Guida | Cosa imparerete
|-------|-------------------|
| [DSL Reference](dsl-reference/) | Tutte le funzioni DSL: policy, MCP, registri |
| [Runtime](runtime/) | Ciclo di pianificazione/esecuzione, motori, archivi di memoria |
| [Toolsets](toolsets/) | Strumenti supportati da servizi, trasformazioni, esecutori |
| [Agent Composition](agent-composition/) | Approfondimento sui modelli di agenti come strumenti |
| [Produzione](production/) | Configurazione temporale, streaming verso le UI, limitazione della velocità |
