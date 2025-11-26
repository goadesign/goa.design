---
title: "Panoramica DSL"
linkTitle: "Panoramica DSL"
weight: 1
description: "Panoramica del DSL di Goa-AI e come estende Goa."
---

## Panoramica

Goa-AI estende il DSL di Goa con funzioni per dichiarare agenti, toolset e policy runtime. Il DSL viene valutato dal motore `eval` di Goa, quindi si applicano le stesse regole del DSL standard service/transport: le espressioni devono essere invocate nel contesto appropriato, e le definizioni degli attributi riutilizzano il sistema di tipi di Goa (`Attribute`, `Field`, validazioni, esempi, ecc.).

### Percorso di Import

Aggiungi il DSL degli agenti ai tuoi package di design Goa:

```go
import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)
```

### Punto di Ingresso

Dichiara gli agenti all'interno di una normale definizione `Service` di Goa. Il DSL arricchisce l'albero di design di Goa e viene elaborato durante `goa gen`.

### Risultato

Eseguire `goa gen` produce:

- Package degli agenti (`gen/<service>/agents/<agent>`) con definizioni di workflow, attività del planner e helper di registrazione
- Codec/spec dei tool con struct payload/result tipizzate e codec JSON
- Handler delle attività per i loop plan/execute/resume
- Helper di registrazione che collegano il design al runtime

Un `AGENTS_QUICKSTART.md` contestuale viene scritto nella root del modulo a meno che non sia disabilitato tramite `DisableAgentDocs()`.

## Esempio Quickstart

```go
package design

import (
	. "goa.design/goa/v3/dsl"
	. "goa.design/goa-ai/dsl"
)

var DocsToolset = Toolset("docs.search", func() {
	Tool("search", "Cerca nella documentazione indicizzata", func() {
		Args(func() {
			Attribute("query", String, "Frase di ricerca")
			Attribute("limit", Int, "Risultati massimi", func() { Default(5) })
			Required("query")
		})
		Return(func() {
			Attribute("documents", ArrayOf(String), "Snippet corrispondenti")
			Required("documents")
		})
		Tags("docs", "search")
	})
})

var AssistantSuite = MCPToolset("assistant", "assistant-mcp")

var _ = Service("orchestrator", func() {
	Description("Porta d'ingresso umana per l'agente di conoscenza.")

	Agent("chat", "Runner conversazionale", func() {
		Use(DocsToolset)
		Use(AssistantSuite)
		Export("chat.tools", func() {
			Tool("summarize_status", "Produce riassunti pronti per l'operatore", func() {
				Args(func() {
					Attribute("prompt", String, "Istruzioni utente")
					Required("prompt")
				})
				Return(func() {
					Attribute("summary", String, "Risposta dell'assistente")
					Required("summary")
				})
				Tags("chat")
			})
		})
		RunPolicy(func() {
			DefaultCaps(
				MaxToolCalls(8),
				MaxConsecutiveFailedToolCalls(3),
			)
			TimeBudget("2m")
		})
	})
})
```

Eseguire `goa gen example.com/assistant/design` produce:

- `gen/orchestrator/agents/chat`: workflow + attività del planner + registry dell'agente
- `gen/orchestrator/agents/chat/specs`: struct payload/result, codec JSON, schemi dei tool
- `gen/orchestrator/agents/chat/agenttools`: helper che espongono i tool esportati ad altri agenti
- Helper di registrazione MCP-aware quando un `MCPToolset` è referenziato tramite `Use`

## Identificatori Tool Tipizzati

Ogni package specs per-toolset definisce identificatori tool tipizzati (`tools.Ident`) per ogni tool generato:

```go
const (
    // ID tool tipizzati
    Search tools.Ident = "orchestrator.search.search"
)

var Specs = []tools.ToolSpec{
    { Name: Search, /* ... */ },
}
```

Usa queste costanti ovunque tu debba referenziare i tool, inclusi i toolset non esportati (non c'è bisogno di definire stringhe ad-hoc).

## Composizione Inline Cross-Process

Quando l'agente A dichiara che "usa" un toolset esportato dall'agente B, Goa-AI ha abbastanza informazioni per collegare automaticamente la composizione:

- Il package dell'esportatore (agente B) include helper `agenttools` generati che descrivono il toolset esportato (ID tool, spec, template) e costruiscono una `ToolsetRegistration` inline per l'esecuzione agent-as-tool.
- Il registry dell'agente consumatore (agente A) usa questi helper quando usi `Use(AgentToolset("service", "agent", "toolset"))`, registrando un toolset inline che esegue l'agente provider come un vero child run usando metadati di routing a contratto forte (nome workflow, attività, coda).
- La funzione `Execute` generata per il toolset inline costruisce messaggi planner annidati dal payload del tool, esegue l'agente provider come child workflow, e adatta il `RunOutput` dell'agente annidato in un `planner.ToolResult` (includendo un `RunLink` che identifica il child run).
- Payload e risultati rimangono JSON canonico attraverso i confini e vengono decodificati esattamente una volta al confine del tool provider.

Questo produce un singolo workflow deterministico **per agent run** e un albero di run collegati per la composizione: il run padre vede eventi `tool_start` / `tool_end` per la chiamata agent-as-tool più eventi link `agent_run_started` che puntano allo stream del child agent run.

## Prossimi Passi

- Impara le [Funzioni Agent](./2-agent-functions.md) per dichiarare agenti
- Esplora le [Funzioni Toolset](./3-toolset-functions.md) per definire toolset
- Leggi le [Funzioni Policy](./4-policy-functions.md) per configurare il comportamento runtime
- Vedi le [Funzioni MCP DSL](./5-mcp-functions.md) per l'integrazione con server MCP

