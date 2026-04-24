---
title: "Avvio rapido"
linkTitle: "Avvio rapido"
weight: 1
description: "Build a working AI agent in 10 minutes. Start with a stub, add streaming, validation, then connect a real LLM."
llm_optimized: true
aliases:
---

Questa guida ti porta da un modulo vuoto a un agente Goa-AI generato ed eseguibile.
L'esempio generato utilizza il motore in memoria, quindi non è necessario Temporal,
MongoDB, Redis o una chiave API del modello per la prima esecuzione.

Costruirai:

1. Un progetto Goa con un agente, uno strumento digitato e un completamento diretto digitato.
2. Codice di cablaggio dell'agente, del set di strumenti, del completamento e del runtime generato.
3. Un esempio di impalcatura eseguibile con un pianificatore stub che è possibile sostituire con un pianificatore supportato da modello.
4. I primi hook di produzione: sessioni esplicite, esecutori di strumenti generati, streaming e registrazione del modello.

---

## 1. Crea un modulo

```bash
go install goa.design/goa/v3/cmd/goa@latest

mkdir quickstart && cd quickstart
go mod init example.com/quickstart
go get goa.design/goa/v3@latest goa.design/goa-ai@latest
mkdir design
```

Goa-AI attualmente prende di mira il moderno Go. Utilizza la versione Go dichiarata da
Modulo `goa.design/goa-ai` o successivo.

---

## 2. Definire l'agente

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

Questa è la fonte della verità. Strumenti e completamenti riutilizzano i normali tipi Goa,
descrizioni, esempi e validazioni. Gli schemi rivolti al modello, i codec tipizzati,
e i contratti di runtime vengono generati da questo progetto.

---

## 3. Genera codice ed esempio

```bash
goa gen example.com/quickstart/design
goa example example.com/quickstart/design
go run ./cmd/orchestrator
```

Forma prevista:

```text
RunID: orchestrator-chat-...
Assistant: Hello from example planner.
Completion draft_task: ...
Completion stream draft_task: ...
```

`goa gen` crea i contratti generati. `goa example` crea proprietà dell'applicazione
impalcatura:

- `gen/`: codice generato. Non modificare questa directory manualmente.
- `cmd/orchestrator/main.go`: punto di ingresso di esempio eseguibile.
- `internal/agents/bootstrap/bootstrap.go`: costruzione del runtime e registrazione dell'agente.
- `internal/agents/chat/planner/planner.go`: pianificatore stub da sostituire.
- `gen/orchestrator/completions/`: helper digitati per il completamento diretto.

Rigenerare dopo le modifiche DSL. Esegui nuovamente `goa example` quando vuoi l'impalcatura
aggiornamenti, quindi mantenere le modifiche dell'applicazione in `cmd/` e `internal/`.

---

## 4. Comprendere il ciclo di runtime

**Il ciclo di pianificazione/esecuzione:**

1. `PlanStart` riceve i messaggi utente iniziali.
2. Il pianificatore restituisce un `FinalResponse`, chiamate strumento o una richiesta di attesa.
3. Il runtime convalida ed esegue le chiamate agli strumenti ammessi utilizzando le specifiche generate e gli esecutori registrati.
4. `PlanResume` riceve gli output dello strumento visibili dal pianificatore.
5. Il ciclo si ripete finché il pianificatore non restituisce una risposta finale, un risultato dello strumento terminale o il runtime non impone limiti/budget di tempo.

L'esempio generato inizia con uno stub planner in modo che questo flusso sia visibile prima
colleghi un modello. Un vero pianificatore segue lo stesso contratto; delega semplicemente
la decisione a un cliente modello.

---

## 5. Chiama l'agente dal codice

I pacchetti di agenti generati espongono client tipizzati. Le esecuzioni a sessione richiedono un
sessione esplicita; le esecuzioni one-shot sono intenzionalmente senza sessioni.

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

Utilizzare `Run` o `Start` per il lavoro conversazionale/sessionale. Utilizzare `OneShotRun` o
`StartOneShot` per processi di richiesta/risposta che dovrebbero essere osservabili da `RunID`
ma non dovrebbe appartenere a una sessione.

---

## 6. Implementa un esecutore di strumenti

I pacchetti agente generati includono un helper `RegisterUsedToolsets` per local
set di strumenti. Gli esecutori ricevono metadati di esecuzione espliciti e restituiscono un runtime di proprietà
risultato dell'esecuzione:

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

Il runtime convalida il payload JSON con i codec generati prima dell'esecuzione,
codifica i risultati positivi con i codec dei risultati generati, registra l'esecuzione canonica
eventi e passa gli output visibili dal pianificatore a `PlanResume`.

---

## 7. Connetti un modello

Registra i clienti del fornitore con il runtime, quindi accedi ad essi dai pianificatori tramite ID.
Per i pianificatori di streaming, preferisci `PlannerModelClient`; possiede assistente/pensiero
e l'emissione di eventi di utilizzo.

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

Schizzo del pianificatore:

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

Utilizza `in.Agent.ModelClient("default")` quando hai bisogno di controllo e associazione del flusso non elaborato
con `planner.ConsumeStream`. Scegli un proprietario dello stream per turno del pianificatore.

---

## 8. Aggiungi streaming

Goa-AI emette eventi di flusso digitati per il testo dell'assistente, l'avvio/fine dello strumento, il flusso di lavoro
stato, attesa, utilizzo e collegamenti di esecuzione figlio. Cablare qualsiasi `stream.Sink`:

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

Per le UI di produzione, pubblica su Pulse e iscriviti al flusso della sessione
(`session/<session_id>`). Chiudi la connessione utente quando osservi
`run_stream_end` per la corsa attiva.

---

## 9. Utilizza i completamenti diretti digitati

`Completion(...)` è per l'output dell'assistente strutturato che non è una chiamata allo strumento.
Gli helper generati richiedono l'output strutturato imposto dal provider e lo decodificano
codec generati:

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

I nomi di completamento fanno parte del contratto di output strutturato: 1-64 ASCII
caratteri, lettere/cifre/`_`/`-`, che iniziano con una lettera o una cifra. Streaming
gli aiutanti di completamento espongono i blocchi di anteprima `completion_delta` e decodificano solo i file
pezzo canonico finale `completion`.

---

## 10. Comporre agenti

Gli agenti possono esportare set di strumenti utilizzati da altri agenti. Gli agenti nidificati vengono eseguiti come secondari
flussi di lavoro con il proprio `RunID` e i flussi emettono `child_run_linked` in modo che le interfacce utente possano
eseguire il rendering degli alberi.

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

Ogni agente mantiene il proprio pianificatore, strumenti, policy e registro di esecuzione. Il genitore vede a
risultato normale dello strumento con `RunLink` nell'esecuzione figlio.

---

## Cosa hai costruito

- Un agente incentrato sulla progettazione con strumenti convalidati dallo schema.
- Codec di payload/risultati generati e schemi JSON rivolti al modello.
- Un contratto tipizzato a completamento diretto.
- Un client runtime generato con esecuzione in sessione e one-shot.
- Un percorso verso la pianificazione supportata da modelli, le interfacce utente in streaming e la composizione degli agenti.

Per la produzione, aggiungi il motore Temporal per una maggiore durata, negozi supportati da Mongo
log di memoria/sessione/esecuzione, Pulse per lo streaming distribuito e middleware del modello
per i limiti tariffari del fornitore. Il design di Goa rimane la fonte della verità.

---

## Passaggi successivi

| Guida | Cosa imparerai ||-------|-------------------|
| [DSL Reference](dsl-reference/) | Tutte le funzioni DSL: policy, MCP, registri || [Runtime](runtime/) | Pianifica/esegui loop, motori, archivi di memoria || [Toolsets](toolset/) | Strumenti supportati da servizi, trasformazioni, esecutori || [Agent Composition](agent-composition/) | Approfondimento sui modelli di agente come strumento || [Production](production/) | Configurazione temporale, streaming alle interfacce utente, limitazione della velocità |