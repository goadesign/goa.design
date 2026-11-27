---
title: "Goa-AI: agentes a partir de un diseño"
linkTitle: "Goa-AI"
weight: 2
description: "Diseña herramientas tipadas, servidores MCP y contratos de agentes de IA en Go. Genera esquemas y códecs, y ejecútalos en memoria local o de forma duradera con Temporal."
llm_optimized: true
---

Goa-AI lleva el compilador de contratos de Goa a los agentes de IA, servidores MCP y registros de herramientas alojados. Defines los argumentos de las herramientas, tipos de retorno, plantillas de prompts y políticas de ejecución en Go; `goa gen` produce esquemas JSON, códecs de validación en el borde, enlaces a servicios y **`AGENTS_QUICKSTART.md`**. Tu código conserva el planificador y los manejadores de dominio.

- **Empieza en local (motor en memoria, sin infraestructura externa):** **[Crea tu primer agente](quickstart/)** (Go 1.27+, funciona de forma autónoma sin un servicio Goa separado)
- **¿Solo necesitas un servidor MCP?** Ve directamente a **[Integración MCP](mcp-integration/)**
- **¿Usas un agente de programación?** Combina el **`AGENTS_QUICKSTART.md`** generado con el **[flujo con agentes de programación](../ai-development/)**

## De un contrato a un agente en ejecución

### 1. Declara el servicio, la herramienta vinculada y la política (`design/catalog.go`)

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

### 2. Genera esquemas, enlaces y `AGENTS_QUICKSTART.md`

```bash
go mod init example.com/catalog && go get goa.design/goa-ai@v0.90.0
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy && go run ./cmd/catalog
```

Ejecutar `goa` mediante `go run` utiliza la versión exacta del generador fijada en `go.mod` (sin Node.js ni claves de API; `goa example` crea un planificador inicial ejecutable en local). `Inject("tenant_id")` elimina `tenant_id` de `gen/catalog/agents/assistant/specs/tool_schemas.json` frente al modelo manteniendo la validación regex de `sku`:

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

### 3. Conecta el planificador y ejecuta (en memoria o con Temporal)

`goa example example.com/catalog/design` genera un planificador simulado para ejecutar pruebas locales sin claves de modelos. Para conectar un modelo real (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, Bedrock o Vertex AI), implementa `planner.Planner` (`PlanStart` y `PlanResume`):

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

Registra el agente y el ejecutor del servicio vinculado (`inmem.New()` en local; `runtime.WithEngine(temporalEng)` en producción) e inyecta `tenant_id` con `runtime.WithLabels`:

```go
rt := runtime.New(inmem.New())
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
    runtime.WithLabels(map[string]string{"tenant_id": "acme"}),
)
```

```text
tool_start: catalog.lookup {"sku":"BOOK-1"}  # tenant_id="acme" injected
tool_end:   {"sku":"BOOK-1","name":"The Go Book","price_cents":3800}
assistant:  BOOK-1 ("The Go Book") costs $38.00.
```

## Capacidades principales

### Contratos de herramientas tipados y límites {#design-first-agents}

Define entradas y salidas de herramientas con validaciones de Goa, `Inject("tenant_id")` para campos de contexto fijados en el servidor y ocultos al modelo, `BoundedResult` para respuestas paginadas con cursor y `Confirmation` para puertas de aprobación humana antes de ejecutar acciones sensibles. Consulta [Toolsets](toolsets/) y [Valores por defecto en entradas de herramientas](tool-payload-defaults/).

### Salidas directas estructuradas {#typed-direct-completions}

Declara `Completion(...)` cuando un servicio necesite una respuesta tipada y validada contra esquema por parte de un modelo sin un bucle multi-turno de herramientas. Las funciones generadas —tanto unarias como en streaming— decodifican y validan el resultado. Consulta la [Referencia DSL](dsl-reference/) y [Runtime](runtime/).

### Servidores MCP y registros de herramientas alojados {#tool-registries}

- **Servidores MCP (`MCP(...)`)**: Expón métodos de servicios Goa como herramientas MCP, recursos y plantillas de prompts sobre HTTP sin levantar un runtime de agentes. Consulta [Integración MCP](mcp-integration/).
- **Registro y búsqueda de herramientas**: Ejecuta la pasarela de registro incluida sobre Redis/[Pulse](../3-ecosystem/pulse/) para que los agentes descubran esquemas dinámicamente entre servicios en lugar de inyectar todos los esquemas en cada prompt. Consulta [Registro](registry/) y [Búsqueda de herramientas](tool-search/).

### Composición de agentes y árboles de ejecución {#run-trees-composition}

Exporta un agente como herramienta consumida por un agente padre (`Export` / `Use`). Las ejecuciones hijas conservan IDs de ejecución propios, presupuestos independientes y spans de telemetría enlazados al padre. Consulta [Composición de agentes](agent-composition/).

### Eventos tipados en streaming {#structured-streaming}

Transmite eventos tipados del runtime (`AssistantReply`, `ToolStart`, `ToolEnd`, `AwaitConfirmation`, `RunCompleted`) hacia interfaces web sobre SSE o WebSockets. Consulta [Streaming en producción](production/#ui-de-streaming).

### De memoria local a durabilidad con Temporal {#temporal-durability}

Desarrolla y prueba con el motor en memoria sin dependencias externas, y configura el motor de Temporal en producción para recuperación ante caídas, pausas duraderas con `Confirmation` y reintentos de actividades (protege los efectos externos con claves de idempotencia). Consulta [Producción](production/).

### Suites de evaluación {#generated-evaluations}

Declara suites de escenarios junto a tu agente y ejecuta aserciones deterministas sobre trayectorias de herramientas con dobles de modelo guionizados o jueces semánticos calibrados. Consulta [Evaluaciones](evaluations/) y [Pruebas](testing/).

### Proveedores de modelos y estado de sesión {#model-providers}

Los adaptadores de modelos integrados cubren **OpenAI**, **Anthropic**, **AWS Bedrock** y **Google Vertex AI**. Tu aplicación aporta las transcripciones de sesión, la autorización y la memoria de dominio. Consulta [Memoria y sesiones](memory-sessions/) y [Operación de proveedores](provider-operations/).

## Arquitectura

{{< figure src="/images/goa-ai-architecture.svg" alt="Arquitectura de Goa-AI: el DSL de diseño compila paquetes tipados que el runtime ejecuta sobre motores en memoria o Temporal y adaptadores de modelos y herramientas" >}}
