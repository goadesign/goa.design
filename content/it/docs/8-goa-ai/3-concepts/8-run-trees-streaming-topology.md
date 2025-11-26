---
title: "Run Tree e Topologia Streaming"
linkTitle: "Run Tree e Streaming"
weight: 8
description: "Comprendi come Goa-AI modella i run degli agenti come albero e come lo streaming proietta quella topologia a diversi audience."
---

## Run, Sessioni e Run Tree

Goa-AI modella l'esecuzione come un **albero di run e tool**:

- **Run** – una esecuzione di un agente:
  - identificato da un `RunID`,
  - descritto da `run.Context` (RunID, SessionID, TurnID, label, cap),
  - tracciato durevolmente tramite `run.Record` (stato, timestamp, label).

- **Session** – una conversazione o workflow che copre uno o più run:
  - `SessionID` raggruppa run correlati (es., chat multi-turno).
  - Le UI tipicamente renderizzano una session alla volta.

- **Run tree** – relazioni padre/figlio tra run e tool:
  - run agente di primo livello (es., `chat`),
  - child agent run (agent-as-tool, es., `ada`, `diagnostics`),
  - tool di servizio sotto quegli agenti.

Il runtime mantiene questo albero usando:

- `run.Handle` – handle leggero: `RunID`, `AgentID`, `ParentRunID`, `ParentToolCallID`.
- Helper agent-as-tool e registrazioni toolset che **creano sempre veri child run** per agenti annidati (nessun hack inline nascosto).

## Agent-as-Tool e RunLink

Quando un agente usa un altro agente come tool:

- Il runtime:
  - avvia un **child run** per l'agente provider con il proprio `RunID`,
  - traccia il collegamento padre/figlio in `run.Context`,
  - esegue un loop plan/execute/resume completo nel child.
- Il risultato tool padre (`planner.ToolResult`) porta:

```go
RunLink *run.Handle
```

Questo `RunLink` permette:

- ai planner di ragionare sul child run (es., per audit/logging),
- alle UI di creare "card agente" annidate che possono sottoscriversi allo stream del child run,
- a strumenti esterni di navigare da un run padre ai suoi figli senza indovinare.

## Stream Per-Run, Non Firehose Globali

Ogni run ha il proprio **stream** di valori `stream.Event`:

- `AssistantReply`, `PlannerThought`,
- `ToolStart`, `ToolUpdate`, `ToolEnd`,
- `AwaitClarification`, `AwaitExternalTools`,
- `Usage`, `Workflow`,
- `AgentRunStarted` (link da tool padre → child run).

I consumatori si sottoscrivono per run:

```go
sink := &MySink{}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil { /* gestisci */ }
defer stop()
```

Questo evita firehose globali e permette alle UI di:

- attaccare una connessione per run (es., per sessione chat),
- decidere quando "entrare" negli agenti figli sottoscrivendosi ai loro run usando metadati `AgentRunStarted` (`ChildRunID`, `ChildAgentID`).

## Stream Profile e Policy Figli

`stream.StreamProfile` descrive cosa vede un audience:

- quali tipi di evento sono inclusi,
- e come i child run vengono proiettati tramite `ChildStreamPolicy`:
  - **Off** – i child run sono nascosti da questo audience; solo chiamate/risultati tool padre.
  - **Flatten** – gli eventi child vengono proiettati nello stream padre (stile debug "firehose").
  - **Linked** – il padre emette eventi link `AgentRunStarted`; gli eventi child restano sui loro stream.

Profili built-in:

- `stream.UserChatProfile()` – adatto per chat utente finale
- `stream.AgentDebugProfile()` – vista operativa verbose
- `stream.MetricsProfile()` – metriche/telemetria

## Come Questo Ti Aiuta a Progettare UI

Dato il run tree + modello streaming, una tipica UI chat può:

- sottoscriversi al **run chat root** con un profilo chat utente,
- renderizzare: risposte assistente, righe tool per tool di primo livello, eventi "agent run started" come **Card Agente** annidate,
- quando l'utente espande una card: sottoscriversi al child run usando `ChildRunID`, renderizzare la timeline di quell'agente dentro la card.

Idea chiave: **la topologia di esecuzione (run tree) è sempre preservata**, e lo streaming è solo un insieme di proiezioni su quell'albero per diversi audience.


