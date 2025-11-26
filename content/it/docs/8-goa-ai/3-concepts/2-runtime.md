---
title: "Concetti Runtime"
linkTitle: "Concetti Runtime"
weight: 2
description: "Comprendi come il runtime Goa-AI orchestra gli agenti, applica le policy e gestisce lo stato."
---

Il runtime Goa-AI orchestra il loop plan/execute/resume, applica le policy, gestisce lo stato e coordina con engine, planner, tool, memoria, hook e moduli di funzionalità.

## Panoramica dell'Architettura

| Livello | Responsabilità |
| --- | --- |
| DSL + Codegen | Produce registry degli agenti, spec/codec dei tool, workflow, adapter MCP |
| Runtime Core | Orchestra il loop plan/start/resume, applicazione delle policy, hook, memoria, streaming |
| Adapter Engine Workflow | L'adapter Temporal implementa `engine.Engine`; altri engine possono essere collegati |
| Moduli Funzionalità | Integrazioni opzionali (MCP, Pulse, store Mongo, provider di modelli) |

## Architettura Agentica di Alto Livello

A runtime, Goa-AI organizza il tuo sistema attorno a un piccolo insieme di costrutti componibili:

- **Agenti**: Orchestratori a lunga durata identificati da `agent.Ident` (es., `service.chat`).
  Ogni agente possiede un planner, una run policy, workflow generati e registrazioni di tool.

- **Run**: Una singola esecuzione di un agente.
  I run sono identificati da un `RunID` e tracciati tramite `run.Context` e `run.Handle`, e sono raggruppati per `SessionID` e `TurnID` per formare conversazioni.

- **Toolset & tool**: Collezioni nominate di capacità, identificate da `tools.Ident` (`service.toolset.tool`). I toolset service-backed chiamano API; i toolset agent-backed eseguono altri agenti come tool.

- **Planner**: Il tuo livello strategico guidato da LLM che implementa `PlanStart` / `PlanResume`.
  I planner decidono quando chiamare i tool vs rispondere direttamente; il runtime applica cap e budget temporali attorno a quelle decisioni.

- **Run tree & agent-as-tool**: Quando un agente chiama un altro agente come tool, il runtime avvia un vero child run con il proprio `RunID`. Il `ToolResult` padre porta un `RunLink` (`*run.Handle`) che punta al child, e un corrispondente evento `AgentRunStarted` viene emesso nel run padre così UI e debugger possono agganciarsi allo stream child su richiesta.

- **Stream & profili**: Ogni run ha il proprio stream di valori `stream.Event` (risposte assistente, pensieri planner, tool start/update/end, await, usage, workflow, e link agent-run). `stream.StreamProfile` seleziona quali tipi di evento sono visibili per un dato audience (chat UI, debug, metriche) e come i child run vengono proiettati: off, flattened, o linked.

Questo modello mentale ti permette di costruire grafi di agenti complessi mantenendo esecuzione, osservabilità e proiezioni UI chiaramente separati e facili da ragionare.

## Quick Start

```go
package main

import (
    "context"

    chat "example.com/assistant/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    // L'engine in-memory è il default; passa WithEngine per Temporal o engine custom.
    rt := runtime.New()
    ctx := context.Background()
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: newChatPlanner()})
    if err != nil {
        panic(err)
    }

    client := chat.NewClient(rt)
    out, err := client.Run(ctx, []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Riassumi l'ultimo stato."}},
    }}, runtime.WithSessionID("session-1"))
    if err != nil {
        panic(err)
    }
    // Usa out.RunID, out.Final (il messaggio dell'assistente), ecc.
}
```

## Client-Only vs Worker

Due ruoli usano il runtime:

- **Client-only** (sottometti run): Costruisce un runtime con un engine client-capable e non registra agenti. Usa il `<agent>.NewClient(rt)` generato che porta la route (workflow + coda) registrata dai worker remoti.
- **Worker** (esegui run): Costruisce un runtime con un engine worker-capable, registra agenti (con planner reali), e lascia che l'engine faccia polling ed esegua workflow/attività.

### Esempio Client-Only

```go
rt := runtime.New(runtime.WithEngine(temporalClient)) // engine client

// Nessuna registrazione agenti necessaria in un processo solo chiamante
client := chat.NewClient(rt)
out, err := client.Run(ctx, msgs, runtime.WithSessionID("s1"))
```

### Esempio Worker

```go
rt := runtime.New(runtime.WithEngine(temporalWorker)) // engine worker-enabled
err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner})
// Avvia il loop worker dell'engine secondo l'integrazione dell'engine (es., Temporal worker.Run()).
```

## Plan → Execute Tools → Resume (Loop)

1. Il runtime avvia un workflow per l'agente (in-memory o Temporal) e registra un nuovo `run.Context` con `RunID`, `SessionID`, `TurnID`, label e cap delle policy.
2. Chiama il `PlanStart` del tuo planner con i messaggi correnti e il contesto del run.
3. Schedula le chiamate tool restituite dal planner (il planner passa payload JSON canonici; il runtime gestisce encoding/decoding usando i codec generati).
4. Chiama `PlanResume` con i risultati dei tool; il loop si ripete finché il planner non restituisce una risposta finale o i cap/budget temporali vengono raggiunti. Man mano che l'esecuzione procede, il run avanza attraverso i valori `run.Phase` (`prompted`, `planning`, `executing_tools`, `synthesizing`, fasi terminali).
5. Hook e subscriber dello stream emettono eventi (pensieri planner, tool start/update/end, await, usage, workflow, link agent-run) e, quando configurato, persistono entry di transcript e metadati del run.

## Policy e Cap

Applicati per turno del planner:

- **Max tool call**: Previene loop fuori controllo
- **Fallimenti consecutivi**: Interrompe dopo N fallimenti tool consecutivi
- **Budget temporali**: Limiti wall-clock applicati dal runtime

I tool possono essere allowlist/filtrati dai motori di policy.

## Esecuzione Tool

- **Toolset nativi**: Scrivi le implementazioni; il runtime gestisce la decodifica degli arg tipizzati usando i codec generati
- **Agent-as-tool**: I toolset agent-tool generati eseguono agenti provider come child run (inline dalla prospettiva del planner) e adattano il loro `RunOutput` in un `planner.ToolResult` con un handle `RunLink` verso il child run
- **Toolset MCP**: Il runtime inoltra JSON canonico ai caller generati; i caller gestiscono il trasporto

## Memoria, Streaming, Telemetria

- **Hook bus** pubblica eventi hook strutturati per l'intero ciclo di vita dell'agente: run start/completion, cambi di fase, scheduling/risultati/aggiornamenti tool, note del planner e blocchi di pensiero, await, retry hint, e link agent-as-tool.
- **Memory store** (`memory.Store`) sottoscrivono e appendono eventi di memoria durevoli (messaggi user/assistant, chiamate tool, risultati tool, note planner, thinking) per `(agentID, RunID)`.
- **Run store** (`run.Store`) tracciano metadati del run (stato, fasi, label, timestamp) per ricerca e dashboard operative.
- **Stream sink** (`stream.Sink`, es. Pulse o SSE/WebSocket custom) ricevono valori `stream.Event` tipizzati prodotti dallo `stream.Subscriber`. Uno `StreamProfile` controlla quali tipi di evento vengono emessi e come i child run vengono proiettati (off, flattened, linked).
- **Telemetria**: Logging, metriche e tracing OTEL-aware strumentano workflow e attività end to end.

### Osservare Eventi per un Singolo Run

Oltre ai sink globali, puoi osservare lo stream di eventi per un singolo run ID usando l'helper `Runtime.SubscribeRun`:

```go
type mySink struct{}

func (s *mySink) Send(ctx context.Context, e stream.Event) error {
    // consegna evento a SSE/WebSocket, log, ecc.
    return nil
}

func (s *mySink) Close(ctx context.Context) error { return nil }

stop, err := rt.SubscribeRun(ctx, "run-123", &mySink{})
if err != nil {
    panic(err)
}
defer stop()
```

`SubscribeRun` installa un subscriber filtrato che inoltra solo eventi per il `RunID` dato al tuo sink e restituisce una funzione che chiude sia la sottoscrizione che il sink.

## Astrazione Engine

- **In-memory**: Loop di sviluppo veloce, nessuna dipendenza esterna
- **Temporal**: Esecuzione durabile, replay, retry, signal, worker; gli adapter collegano attività e propagazione del contesto

## Contratti del Run

- `SessionID` è richiesto all'avvio del run. `Start` fallisce velocemente quando `SessionID` è vuoto o whitespace
- Gli agenti devono essere registrati prima del primo run. Il runtime rifiuta la registrazione dopo la prima sottomissione del run con `ErrRegistrationClosed` per mantenere i worker dell'engine deterministici
- Gli executor dei tool ricevono metadati espliciti per-call (`ToolCallMeta`) invece di pescare valori da `context.Context`
- Non fare affidamento su fallback impliciti; tutti gli identificatori di dominio (run, session, turn, correlation) devono essere passati esplicitamente

## Pausa & Ripresa

I workflow human-in-loop possono sospendere e riprendere i run usando gli helper di interrupt del runtime:

```go
import "goa.design/goa-ai/runtime/agent/interrupt"

// Pausa
if err := rt.PauseRun(ctx, interrupt.PauseRequest{
    RunID: "session-1-run-1",
    Reason: "human_review",
}); err != nil {
    panic(err)
}

// Ripresa
if err := rt.ResumeRun(ctx, interrupt.ResumeRequest{
    RunID: "session-1-run-1",
}); err != nil {
    panic(err)
}
```

Dietro le quinte, i signal di pausa/ripresa aggiornano il run store ed emettono eventi hook `run_paused`/`run_resumed` così i layer UI restano sincronizzati.

## Hook, Memoria e Streaming

Il runtime pubblica eventi strutturati su un hook bus. I subscriber di default includono:

- **Memory subscriber** – scrive chiamate tool, risultati tool, note planner, blocchi di pensiero e risposte dell'assistente al `memory.Store` configurato
- **Stream subscriber** – mappa eventi hook in valori `stream.Event` tipizzati (`AssistantReply`, `PlannerThought`, `ToolStart`, `ToolUpdate`, `ToolEnd`, `AwaitClarification`, `AwaitExternalTools`, `Usage`, `Workflow`, `AgentRunStarted`) e li inoltra allo `stream.Sink` configurato

Subscriber custom possono registrarsi tramite `Hooks.Register` per emettere analytics, attivare workflow di approvazione, ecc.

## Contratto del Planner

I planner implementano:

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` contiene chiamate tool, risposta finale, annotazioni e `RetryHint` opzionale. Il runtime applica i cap, schedula le attività tool, e alimenta i risultati tool di nuovo in `PlanResume` finché non viene prodotta una risposta finale.

## Moduli Funzionalità

- `features/mcp/*` – DSL/codegen/runtime caller della suite MCP (HTTP/SSE/stdio)
- `features/memory/mongo` – store di memoria durabile
- `features/run/mongo` – store metadati run + repository di ricerca
- `features/stream/pulse` – helper sink/subscriber Pulse
- `features/model/{bedrock,openai}` – adapter client del modello per i planner

Ogni modulo è opzionale; i servizi importano quelli di cui hanno bisogno e o passano i client risultanti a `runtime.New` tramite opzioni funzionali (es., `runtime.WithMemoryStore`, `runtime.WithRunStore`, `runtime.WithStream`) o li collegano direttamente ai loro planner.

## Prossimi Passi

- Impara i [Toolset](../3-toolsets/) per capire i modelli di esecuzione dei tool
- Esplora [Integrazione MCP](../4-mcp-integration.md) per suite di tool esterni
- Leggi i [Pattern Real-World](../../5-real-world/) per deployment in produzione

