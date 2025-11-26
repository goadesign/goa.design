---
title: "Cataloghi Tool e Schemi"
linkTitle: "Cataloghi Tool e Schemi"
weight: 7
description: "Scopri tool, schemi e spec esportati dagli agenti Goa-AI, e impara come UI e planner possono consumarli."
---

## Perché i Cataloghi Tool Sono Importanti

Gli agenti Goa-AI generano un **catalogo di tool singolo e autoritativo** dai tuoi design Goa. Questo catalogo alimenta:

- pubblicità tool del planner (quali tool il modello può chiamare),
- discovery UI (liste tool, categorie, schemi),
- e orchestratori esterni (MCP, frontend custom) che necessitano di spec machine-readable.

Non dovresti mai mantenere manualmente una lista parallela di tool o JSON Schema ad-hoc.

## Spec Generate e `tool_schemas.json`

Per ogni agente, Goa-AI emette un **package spec** e un **catalogo JSON**:

- **Package Spec (`gen/<service>/agents/<agent>/specs/...`)**  
  - `types.go` – struct Go payload/result.
  - `codecs.go` – codec JSON (encode/decode payload/result tipizzati).
  - `specs.go` – entry `[]tools.ToolSpec` con ID tool canonico, schemi payload/result, hint.

- **Catalogo JSON (`tool_schemas.json`)**  
  - Posizione: `gen/<service>/agents/<agent>/specs/tool_schemas.json`
  - Contiene una entry per tool con ID, service, toolset, title, description, tags, schemi JSON payload/result.
  - Generato dallo stesso DSL delle spec/codec Go; se la generazione dello schema fallisce, `goa gen` fallisce così non spedisci mai un catalogo non allineato.

Questo file JSON è ideale per:

- alimentare schemi ai provider LLM (tool/function calling),
- costruire form/editor UI per payload tool,
- e strumenti di documentazione offline.

## API di Introspezione Runtime

A runtime, non hai bisogno di leggere `tool_schemas.json` da disco. Il runtime espone un'API di introspezione backed dalle stesse spec:

```go
agents   := rt.ListAgents()     // []agent.Ident
toolsets := rt.ListToolsets()   // []string

spec,   ok := rt.ToolSpec(toolID)              // singola ToolSpec
schemas, ok := rt.ToolSchema(toolID)           // schemi payload/result
specs   := rt.ToolSpecsForAgent(chat.AgentID)  // []ToolSpec per un agente
```

Questo è il modo preferito per:

- UI che scoprono tool per un dato agente,
- orchestratori che enumerano tool disponibili e leggono i loro schemi,
- strumenti ops che fanno introspezione dei metadati tool in un sistema in esecuzione.

## Scegliere tra Spec e JSON

Usa:

- **Spec & introspezione runtime** quando:
  - sei dentro codice Go (worker, servizi, tool admin),
  - vuoi tipizzazione forte e accesso diretto a codec/schemi.

- **`tool_schemas.json`** quando:
  - sei fuori da Go (frontend, orchestratori esterni),
  - vuoi un semplice catalogo JSON statico da caricare e cachare.

Entrambi sono derivati dallo **stesso design**; scegli quello più conveniente per il tuo consumatore.

## Prossimi Passi

- Impara i [Toolset](../3-toolsets/) per pattern di esecuzione tool in UI e planner
- Leggi [Run Tree e Streaming](../8-run-trees-streaming-topology.md) per architetture di streaming


