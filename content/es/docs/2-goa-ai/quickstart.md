---
title: "Inicio rápido"
linkTitle: "Inicio rápido"
weight: 1
description: "Construye un agente de IA funcional en 10 minutos. Empieza con un stub, añade streaming y validación, y después conecta un LLM real."
llm_optimized: true
aliases:
---

Esta guía te lleva desde un módulo vacío hasta un agente Goa-AI generado y
ejecutable. El ejemplo generado utiliza el motor en memoria, por lo que no
necesitas Temporal, MongoDB, Redis ni una clave de API de modelo para la primera
ejecución.

Vas a construir:

1. Un diseño de Goa con un agente, una herramienta tipada y una completion directa tipada.
2. Código generado del agente, el toolset, la completion y el cableado del runtime.
3. Un scaffold de ejemplo ejecutable con un planificador stub que puedes sustituir por uno respaldado por un modelo.
4. Los primeros ganchos de producción: sesiones explícitas, ejecutores de herramientas generados, streaming y registro de modelos.

---

## 1. Crear un módulo

```bash
go install goa.design/goa/v3/cmd/goa@latest

mkdir quickstart && cd quickstart
go mod init example.com/quickstart
go get goa.design/goa/v3@latest goa.design/goa-ai@latest
mkdir design
```

Goa-AI actualmente apunta a versiones modernas de Go. Utiliza la versión de Go
declarada por el módulo `goa.design/goa-ai` o una posterior.

---

## 2. Definir el agente

Crea `design/design.go`:

```go
package design

import (
	. "goa.design/goa/v3/dsl"
	. "goa.design/goa-ai/dsl"
)

var _ = API("orchestrator", func() {})

var AskPayload = Type("AskPayload", func() {
	Attribute("question", String, "User question to answer")
	Example(map[string]any{"question": "What is the capital of Japan?"})
	Required("question")
})

var Answer = Type("Answer", func() {
	Attribute("text", String, "Answer text")
	Example(map[string]any{"text": "Tokyo is the capital of Japan."})
	Required("text")
})

var TaskDraft = Type("TaskDraft", func() {
	Attribute("name", String, "Task name")
	Attribute("goal", String, "Outcome-style goal")
	Required("name", "goal")
})

var _ = Service("orchestrator", func() {
	Completion("draft_task", "Produce a task draft directly", func() {
		Return(TaskDraft)
	})

	Agent("chat", "Friendly Q&A assistant", func() {
		Use("helpers", func() {
			Tool("answer", "Answer a simple question", func() {
				Args(AskPayload)
				Return(Answer)
			})
		})
		RunPolicy(func() {
			DefaultCaps(MaxToolCalls(2), MaxConsecutiveFailedToolCalls(1))
			TimeBudget("15s")
		})
	})
})
```

Esta es la fuente de la verdad. Las herramientas y las completions reutilizan
los tipos, descripciones, ejemplos y validaciones normales de Goa. Los esquemas
expuestos al modelo, los codecs tipados y los contratos del runtime se generan
a partir de este diseño.

---

## 3. Generar código y ejemplo

```bash
goa gen example.com/quickstart/design
goa example example.com/quickstart/design
go run ./cmd/orchestrator
```

Forma esperada:

```text
RunID: orchestrator-chat-...
Assistant: Hello from example planner.
Completion draft_task: ...
Completion stream draft_task: ...
```

`goa gen` crea los contratos generados. `goa example` crea el scaffold propiedad
de la aplicación:

- `gen/`: código generado. No edites este directorio a mano.
- `cmd/orchestrator/main.go`: punto de entrada del ejemplo ejecutable.
- `internal/agents/bootstrap/bootstrap.go`: construcción del runtime y registro del agente.
- `internal/agents/chat/planner/planner.go`: planificador stub que hay que sustituir.
- `gen/orchestrator/completions/`: helpers tipados de completion directa.

Regenera tras cambios en el DSL. Vuelve a ejecutar `goa example` cuando quieras
actualizaciones del scaffold y mantén las modificaciones de la aplicación en
`cmd/` e `internal/`.

---

## 4. Entender el bucle del runtime

**El bucle plan/execute:**

1. `PlanStart` recibe los mensajes iniciales del usuario.
2. El planificador devuelve un `FinalResponse`, llamadas a herramientas o una solicitud de await.
3. El runtime valida y ejecuta las llamadas a herramientas admitidas utilizando las especificaciones generadas y los ejecutores registrados.
4. `PlanResume` recibe las salidas de herramientas visibles para el planificador.
5. El bucle se repite hasta que el planificador devuelve una respuesta final, un resultado de herramienta terminal o el runtime aplica los límites o presupuestos de tiempo.

El ejemplo generado arranca con un planificador stub para que este flujo sea
visible antes de conectar un modelo. Un planificador real sigue el mismo
contrato; simplemente delega la decisión en un cliente de modelo.

---

## 5. Llamar al agente desde código

Los paquetes de agente generados exponen clientes tipados. Las ejecuciones con
sesión requieren una sesión explícita; las ejecuciones one-shot son
intencionadamente sin sesión.

```go
rt, cleanup, err := bootstrap.New(ctx)
if err != nil {
	log.Fatal(err)
}
defer cleanup()

if _, err := rt.CreateSession(ctx, "session-1"); err != nil {
	log.Fatal(err)
}

client := chat.NewClient(rt)
out, err := client.Run(ctx, "session-1", []*model.Message{{
	Role:  model.ConversationRoleUser,
	Parts: []model.Part{model.TextPart{Text: "Hello"}},
}})
if err != nil {
	log.Fatal(err)
}
fmt.Println(out.RunID)

out, err = client.OneShotRun(ctx, []*model.Message{{
	Role:  model.ConversationRoleUser,
	Parts: []model.Part{model.TextPart{Text: "Summarize this document"}},
}})
```

Utiliza `Run` o `Start` para trabajo conversacional o con sesión. Utiliza
`OneShotRun` o `StartOneShot` para trabajos del tipo request/response que
deban ser observables por `RunID` pero que no deban pertenecer a una sesión.

---

## 6. Implementar un ejecutor de herramientas

Los paquetes de agente generados incluyen un helper `RegisterUsedToolsets` para
los toolsets locales. Los ejecutores reciben metadatos explícitos de ejecución
y devuelven un resultado de ejecución propiedad del runtime:

```go
type HelpersExecutor struct{}

func (e *HelpersExecutor) Execute(
	ctx context.Context,
	meta *runtime.ToolCallMeta,
	call *planner.ToolRequest,
) (*runtime.ToolExecutionResult, error) {
	switch call.Name {
	case helpers.Answer:
		args, err := helpers.UnmarshalAnswerPayload(call.Payload)
		if err != nil {
			return runtime.Executed(&planner.ToolResult{
				Name:  call.Name,
				Error: planner.NewToolError("invalid answer payload"),
			}), nil
		}
		return runtime.Executed(&planner.ToolResult{
			Name:   call.Name,
			Result: &helpers.AnswerResult{Text: "Answer: " + args.Question},
		}), nil
	default:
		return runtime.Executed(&planner.ToolResult{
			Name:  call.Name,
			Error: planner.NewToolError("unknown tool"),
		}), nil
	}
}

if err := chat.RegisterUsedToolsets(ctx, rt, chat.WithHelpersExecutor(&HelpersExecutor{})); err != nil {
	log.Fatal(err)
}
```

El runtime valida el JSON del payload con los codecs generados antes de la
ejecución, codifica los resultados satisfactorios con los codecs de resultado
generados, registra eventos canónicos de la ejecución y pasa las salidas
visibles al planificador a `PlanResume`.

---

## 7. Conectar un modelo

Registra los clientes de proveedor en el runtime y después accede a ellos desde
los planificadores por ID. Para planificadores con streaming, prefiere
`PlannerModelClient`; es el responsable de emitir los eventos de assistant,
thinking y uso.

```go
modelClient, err := rt.NewOpenAIModelClient(runtime.OpenAIConfig{
	APIKey:       os.Getenv("OPENAI_API_KEY"),
	DefaultModel: "gpt-5-mini",
	HighModel:    "gpt-5",
	SmallModel:   "gpt-5-nano",
})
if err != nil {
	log.Fatal(err)
}
if err := rt.RegisterModel("default", modelClient); err != nil {
	log.Fatal(err)
}
```

Esbozo del planificador:

```go
func (p *Planner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
	mc, ok := in.Agent.PlannerModelClient("default")
	if !ok {
		return nil, errors.New("model client default is not registered")
	}

	summary, err := mc.Stream(ctx, &model.Request{
		Messages: in.Messages,
		Tools:    in.Agent.AdvertisedToolDefinitions(),
		Stream:   true,
	})
	if err != nil {
		return nil, err
	}
	if len(summary.ToolCalls) > 0 {
		return &planner.PlanResult{ToolCalls: summary.ToolCalls}, nil
	}
	return &planner.PlanResult{
		FinalResponse: &planner.FinalResponse{
			Message: &model.Message{
				Role:  model.ConversationRoleAssistant,
				Parts: []model.Part{model.TextPart{Text: summary.Text}},
			},
		},
		Streamed: true,
	}, nil
}
```

Utiliza `in.Agent.ModelClient("default")` cuando necesites control del stream
en crudo y combínalo con `planner.ConsumeStream`. Elige un único propietario
del stream por turno del planificador.

---

## 8. Añadir streaming

Goa-AI emite eventos de stream tipados para texto del assistant, inicios y
finales de herramienta, estado del workflow, awaits, uso y enlaces a
ejecuciones hijas. Conecta cualquier `stream.Sink`:

```go
type ConsoleSink struct{}

func (s *ConsoleSink) Send(ctx context.Context, event stream.Event) error {
	switch e := event.(type) {
	case stream.AssistantReply:
		fmt.Print(e.Data.Text)
	case stream.ToolStart:
		fmt.Printf("tool_start: %s\n", e.Data.ToolName)
	case stream.ToolEnd:
		fmt.Printf("tool_end: %s\n", e.Data.ToolName)
	case stream.Workflow:
		fmt.Printf("workflow: %s\n", e.Data.Phase)
	}
	return nil
}

func (s *ConsoleSink) Close(ctx context.Context) error { return nil }

rt := runtime.New(runtime.WithStream(&ConsoleSink{}))
```

Para interfaces de usuario en producción, publica en Pulse y suscríbete al
stream de la sesión (`session/<session_id>`). Cierra la conexión del usuario
cuando observes `run_stream_end` para la ejecución activa.

---

## 9. Usar completions directas tipadas

`Completion(...)` es para salidas estructuradas del assistant que no son una
llamada a herramienta. Los helpers generados solicitan salida estructurada
forzada por el proveedor y decodifican mediante codecs generados:

```go
resp, err := completions.CompleteDraftTask(ctx, modelClient, &model.Request{
	Messages: []*model.Message{{
		Role:  model.ConversationRoleUser,
		Parts: []model.Part{model.TextPart{Text: "Draft a task for launch readiness."}},
	}},
})
if err != nil {
	log.Fatal(err)
}
fmt.Println(resp.Value.Name)
```

Los nombres de completion forman parte del contrato de salida estructurada:
entre 1 y 64 caracteres ASCII, letras, dígitos, `_` o `-`, empezando por una
letra o dígito. Los helpers de completion con streaming exponen chunks de
vista previa `completion_delta` y decodifican únicamente el chunk final
canónico `completion`.

---

## 10. Componer agentes

Los agentes pueden exportar toolsets que otros agentes consumen. Los agentes
anidados se ejecutan como workflows hijos con su propio `RunID`, y los streams
emiten `child_run_linked` para que las interfaces de usuario puedan renderizar
árboles de ejecución.

```go
Agent("researcher", "Research specialist", func() {
	Export("research", func() {
		Tool("deep_search", "Perform deep research", func() {
			Args(ResearchRequest)
			Return(ResearchReport)
		})
	})
})

Agent("coordinator", "Delegates specialist work", func() {
	Use(AgentToolset("orchestrator", "researcher", "research"))
})
```

Cada agente mantiene su propio planificador, herramientas, política y registro
de ejecución. El padre ve un resultado de herramienta normal con un `RunLink`
a la ejecución hija.

---

## Lo que has construido

- Un agente design-first con herramientas validadas por esquema.
- Codecs generados de payload y resultado, y esquemas JSON expuestos al modelo.
- Un contrato de completion directa tipada.
- Un cliente de runtime generado con ejecución con sesión y one-shot.
- Un camino hacia la planificación respaldada por modelos, interfaces con streaming y composición de agentes.

Para producción, añade el motor Temporal para durabilidad, stores respaldados
por Mongo para memoria, sesión y logs de ejecución, Pulse para streaming
distribuido, y middleware de modelo para los límites de tasa del proveedor.
El diseño de Goa sigue siendo la fuente de la verdad.

---

## Próximos pasos

| Guía | Lo que aprenderás |
|-------|-------------------|
| [DSL Reference](dsl-reference/) | Todas las funciones del DSL: políticas, MCP, registros |
| [Runtime](runtime/) | Bucle plan/execute, motores, stores de memoria |
| [Toolsets](toolsets/) | Herramientas respaldadas por servicios, transformaciones, ejecutores |
| [Agent Composition](agent-composition/) | Inmersión profunda en patrones de agente como herramienta |
| [Production](production/) | Configuración de Temporal, streaming a interfaces de usuario, limitación de tasa |
