---
title: "Goa-AI: agenti da un design"
linkTitle: "Goa-AI"
weight: 2
description: "Progetta tool tipizzati, server MCP e contratti di agenti IA in Go. Genera schemi e codec, poi esegui in memoria in locale o in modo durevole su Temporal."
llm_optimized: true
---

Goa-AI porta il compilatore di contratti di Goa agli agenti IA, ai server MCP e ai tool registry ospitati. Definisci argomenti dei tool, tipi di ritorno, template di prompt e policy di esecuzione in Go; `goa gen` produce schemi JSON, codec di validazione al perimetro, binding ai servizi e **`AGENTS_QUICKSTART.md`**. Il tuo codice possiede il planner e gli handler di dominio.

- **Inizia in locale (motore in memoria, nessuna infrastruttura esterna):** **[Crea il tuo primo agente](quickstart/)** (Go 1.27+, funziona in autonomia senza un servizio Goa separato)
- **Ti serve solo un server MCP?** Vai direttamente a **[Integrazione MCP](mcp-integration/)**
- **Usi un coding agent?** Affianca il file generato **`AGENTS_QUICKSTART.md`** al **[flusso con coding agent](../ai-development/)**

{{< anchors "panoramica" "sviluppa-con-un-agente-di-coding" "integra-agenti-nel-prodotto" >}}

## Da un unico contratto a un agente in esecuzione

### 1. Dichiara servizio, tool collegato e policy (`design/catalog.go`)

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("catalog", func() {})

var LookupPayload = Type("LookupPayload", func() {
    Field(1, "tenant_id", String, "Caller tenant ID")
    Field(2, "sku", String, "Product SKU", func() {
        Pattern("^[A-Z0-9-]+$")
        Example("BOOK-1")
    })
    Required("tenant_id", "sku")
})

var Product = Type("Product", func() {
    Field(1, "sku", String, "Product SKU", func() {
        Example("BOOK-1")
    })
    Field(2, "name", String, "Display name", func() {
        Example("The Go Book")
    })
    Field(3, "price_cents", Int, "Price in cents", func() {
        Example(3800)
    })
    Required("sku", "name", "price_cents")
})

var _ = Service("catalog", func() {
    Method("lookup", func() {
        Payload(LookupPayload)
        Result(Product)
    })

    Agent("assistant", "Answer product questions", func() {
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(6))
        })
        Use("catalog", func() {
            // Required tenant_id is hidden from the LLM JSON schema
            Tool("lookup", "Find a product by SKU", func() {
                BindTo("lookup")
                Inject("tenant_id")
            })
        })
    })
})
```

### 2. Genera schemi, binding e `AGENTS_QUICKSTART.md`

Salva `design/catalog.go` qui sopra, poi inizializza il modulo ed esegui il generatore:

```bash
go mod init example.com/catalog
go get goa.design/goa-ai@v0.90.0
go mod tidy
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy
```

Eseguire `goa` tramite `go run` usa l'esatta versione del generatore fissata in `go.mod` (senza Node.js né chiavi API). `goa example` crea `cmd/catalog/main.go` con uno stub planner a zero credenziali; passa `runtime.WithLabels(map[string]string{"tenant_id": "acme"})` su `client.Run(...)` in `cmd/catalog/main.go` e `go run ./cmd/catalog` stamperà:

```text
RunID: demo-assistant-run
Assistant: Hello from example planner.
```

`Inject("tenant_id")` rimuove `tenant_id` dal file `gen/catalog/agents/assistant/specs/tool_schemas.json` esposto al modello mantenendo la regola regex su `sku`:

```json
{
  "id": "catalog.lookup",
  "payload": {
    "schema": {
      "properties": {
        "sku": { "type": "string", "pattern": "^[A-Z0-9-]+$" }
      },
      "required": ["sku"]
    }
  },
  "hidden_fields": ["tenant_id"]
}
```

### 3. Collega un planner basato su modello ed esegui (In-Memory o Temporal)

Per collegare un modello reale (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, Bedrock o Vertex AI), implementa `planner.Planner` (`PlanStart` e `PlanResume`) e imposta `Model` (o `ModelClass`) su ogni `model.Request`:

```go
type CatalogPlanner struct{}

func (p *CatalogPlanner) PlanStart(
    ctx context.Context, in *planner.PlanInput,
) (*planner.PlanResult, error) {
    return p.next(ctx, in.Agent, in.Messages)
}

func (p *CatalogPlanner) PlanResume(
    ctx context.Context, in *planner.PlanResumeInput,
) (*planner.PlanResult, error) {
    return p.next(ctx, in.Agent, in.Messages)
}

func (p *CatalogPlanner) next(
    ctx context.Context,
    agent planner.PlannerContext,
    msgs []*model.Message,
) (*planner.PlanResult, error) {
    mc, ok := agent.PlannerModelClient("default")
    if !ok {
        return nil, errors.New(`model "default" is not registered`)
    }
    res, err := mc.Stream(ctx, &model.Request{
        Model:    "gpt-5-mini",
        Messages: msgs,
        Tools:    agent.AdvertisedToolDefinitions(),
        Stream:   true,
    })
    if err != nil {
        return nil, err
    }
    if len(res.ToolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: res.ToolCalls}, nil
    }
    return &planner.PlanResult{FinalResponse: res.FinalResponse()}, nil
}
```

Crea una sessione esplicita in `runtime/agent/storage/inmem` (`inmem.New()`, affiancato in locale al motore di esecuzione in memoria predefinito o a `runtime.WithEngine(temporalEng)` in produzione) e passa un `runtime.WithRunID` univoco insieme a `runtime.WithLabels`:

```go
store := inmem.New()
if _, err := store.CreateSession(ctx, "session-1", time.Now().UTC()); err != nil {
    return err
}
rt := runtime.New(store)
modelClient, err := rt.NewOpenAIModelClient(runtime.OpenAIConfig{
    APIKey: os.Getenv("OPENAI_API_KEY"), DefaultModel: "gpt-5-mini",
})
if err != nil {
    return err
}
if err := rt.RegisterModel("default", modelClient); err != nil {
    return err
}
if err := assistant.RegisterAssistantAgent(ctx, rt,
    assistant.AssistantAgentConfig{Planner: &CatalogPlanner{}},
); err != nil {
    return err
}
// catalogClient is catalog.NewClient(...) wrapping your Goa endpoints
exec := assistantcatalog.NewAssistantCatalogExec(
    assistantcatalog.WithClient(catalogClient),
)
if err := assistant.RegisterUsedToolsets(
    ctx, rt, assistant.WithCatalogExecutor(exec),
); err != nil {
    return err
}

client := assistant.NewClient(rt)
msg := &model.Message{
    Role: model.ConversationRoleUser,
    Parts: []model.Part{
        model.TextPart{Text: "What does BOOK-1 cost?"},
    },
}
out, err := client.Run(ctx, "session-1", []*model.Message{msg},
    runtime.WithRunID("run-1"),
    runtime.WithLabels(map[string]string{"tenant_id": "acme"}),
)
```

```text
tool_start: catalog.lookup {"sku":"BOOK-1"}  # tenant_id="acme" injected
tool_end:   {"sku":"BOOK-1","name":"The Go Book","price_cents":3800}
assistant:  BOOK-1 ("The Go Book") costs $38.00.
```

## Capacità principali

### Contratti dei tool tipizzati e limiti {#design-first-agents}

Definisci input e output dei tool con le validazioni Goa, `Inject("tenant_id")` per campi di contesto lato server nascosti al modello, `BoundedResult` per risposte paginate con cursore e `Confirmation` per pause di approvazione umana prima dell'esecuzione di azioni sensibili. Vedi [Toolset](toolsets/) e [Valori predefiniti dei payload dei tool](tool-payload-defaults/).

### Completion dirette strutturate {#typed-direct-completions}

Dichiara `Completion(...)` quando un servizio richiede una risposta tipizzata e validata da schema da parte di un modello senza un ciclo multi-turno di tool. Gli helper unari e in streaming generati decodificano e validano l'output. Vedi [Riferimento DSL](dsl-reference/) e [Runtime](runtime/).

### Server MCP e tool registry ospitati {#tool-registries}

- **Server MCP (`MCP(...)`)**: Esponi i metodi dei servizi Goa come tool MCP, risorse e template di prompt via HTTP senza eseguire un runtime agente. Vedi [Integrazione MCP](mcp-integration/).
- **Tool registry e ricerca**: Esegui il gateway registry incluso basato su Redis/[Pulse](../3-ecosystem/pulse/) affinché gli agenti scoprano dinamicamente gli schemi tra i servizi invece di inserire ogni schema di tool in ogni prompt. Vedi [Registry](registry/) e [Ricerca dei tool](tool-search/).

### Composizione degli agenti e alberi di esecuzione {#run-trees-composition}

Esporta un agente come tool consumato da un agente padre (`Export` / `Use`). Le esecuzioni figlie mantengono ID di esecuzione indipendenti, budget propri e span di telemetria collegati al genitore. Vedi [Composizione degli agenti](agent-composition/).

### Eventi in streaming tipizzati {#structured-streaming}

Trasmetti eventi tipizzati del runtime (`AssistantReply`, `ToolStart`, `ToolEnd`, `AwaitConfirmation`, `RunCompleted`) alle interfacce web tramite SSE o WebSocket. Vedi [Streaming in produzione](production/#interfaccia-utente-di-streaming).

### Dal motore locale alla durabilità con Temporal {#temporal-durability}

Sviluppa e testa con il motore in memoria a zero dipendenze, poi configura il motore Temporal in produzione per ripristino dai crash, pause `Confirmation` durevoli e retry delle activity (affianca chiavi di idempotenza agli effetti esterni). Vedi [Produzione](production/).

### Suite di valutazione {#generated-evaluations}

Dichiara suite di scenari accanto al tuo agente ed esegui asserzioni deterministiche sulle traiettorie dei tool con modelli simulati scriptati o giudici semantici calibrati. Vedi [Valutazioni](evaluations/) e [Testing](testing/).

### Provider di modelli e stato di sessione {#model-providers}

Gli adapter integrati coprono **OpenAI**, **Anthropic**, **AWS Bedrock** e **Google Vertex AI**. La tua applicazione fornisce trascrizioni di sessione, autorizzazione e memoria di dominio. Vedi [Memoria e sessioni](memory-sessions/) e [Operazioni dei provider](provider-operations/).

{{< anchors "guide" >}}

## Architettura

{{< figure src="/images/goa-ai-architecture.svg" alt="Architettura Goa-AI: il DSL di design compila in pacchetti tipizzati generati, eseguiti dal Runtime su motori In-Memory o Temporal e adapter per modelli e tool" >}}
