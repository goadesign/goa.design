---
title: "Toolset"
linkTitle: "Toolset"
weight: 3
description: "Impara i tipi di toolset, i modelli di esecuzione e i pattern di composizione."
---

I toolset sono collezioni di tool che gli agenti possono usare. Goa-AI supporta diversi tipi di toolset, ciascuno con diversi modelli di esecuzione e casi d'uso.

## Tipi di Toolset

### Toolset Service-Owned (Method-Backed)

Dichiarati tramite `Toolset("name", func() { ... })`; i tool possono `BindTo` metodi di servizio Goa o essere implementati da executor custom.

- Il codegen emette spec/tipi/codec per-toolset sotto `gen/<service>/tools/<toolset>/`
- Gli agenti che `Use` questi toolset importano le spec del provider e ottengono call builder ed executor factory tipizzati
- Le applicazioni registrano executor che decodificano arg tipizzati (tramite codec forniti dal runtime), usano opzionalmente trasformazioni, chiamano client del servizio e restituiscono `ToolResult`

### Toolset Agent-Implemented (Agent-as-Tool)

Definiti in un blocco `Export` dell'agente, e opzionalmente `Use`ati da altri agenti.

- La proprietà resta al servizio; l'agente è l'implementazione
- Il codegen emette helper `agenttools/<toolset>` lato provider con `NewRegistration` e call builder tipizzati
- Gli helper lato consumer negli agenti che `Use` il toolset esportato delegano agli helper del provider mantenendo i metadati di routing centralizzati
- L'esecuzione avviene inline; i payload vengono passati come JSON canonico e decodificati solo al confine se necessario per i prompt

### Toolset MCP

Dichiarati tramite `MCPToolset(service, suite)` e referenziati tramite `Use(MCPToolset(...))`.

- La registrazione generata imposta `DecodeInExecutor=true` così il JSON raw viene passato all'executor MCP
- L'executor MCP decodifica usando i propri codec
- I wrapper generati gestiscono schemi/encoder JSON e trasporti (HTTP/SSE/stdio) con retry e tracing

## Modelli di Esecuzione

### Esecuzione Basata su Attività (Default)

I toolset service-backed eseguono tramite attività Temporal (o equivalente in altri engine):

1. Il planner restituisce chiamate tool in `PlanResult` (il payload è `json.RawMessage`)
2. Il runtime schedula `ExecuteToolActivity` per ogni chiamata tool
3. L'attività decodifica il payload tramite codec generato per validazione/hint
4. Chiama `Execute(ctx, planner.ToolRequest)` della registrazione del toolset con JSON canonico
5. Re-codifica il risultato con il codec del risultato generato

### Esecuzione Inline (Agent-as-Tool)

I toolset agent-as-tool eseguono inline dalla prospettiva del planner mentre il runtime esegue l'agente provider come un vero child run:

1. Il runtime rileva `Inline=true` sulla registrazione del toolset.
2. Inietta il `engine.WorkflowContext` in `ctx` così la funzione `Execute` del toolset può avviare l'agente provider come child workflow con il proprio `RunID`.
3. Chiama `Execute(ctx, call)` del toolset con payload JSON canonico e metadati del tool (inclusi `RunID` e `ToolCallID` del padre).
4. L'executor agent-tool generato costruisce messaggi agente annidati (system + user) dal payload del tool ed esegue l'agente provider come child run usando helper del runtime.
5. L'agente annidato esegue un loop plan/execute/resume completo nel proprio run; il suo `RunOutput` e gli eventi tool vengono aggregati in un `planner.ToolResult` padre che porta il payload risultato, telemetria aggregata, `ChildrenCount` del child, e un `RunLink` che punta al child run.
6. I subscriber dello stream emettono sia `tool_start` / `tool_end` per la chiamata tool padre che un evento link `agent_run_started` così UI e debugger possono agganciarsi allo stream del child run su richiesta.

## Modello Executor-First

I toolset di servizio generati espongono un singolo costruttore generico:

```go
New<Agent><Toolset>ToolsetRegistration(exec runtime.ToolCallExecutor)
```

Le applicazioni registrano un'implementazione executor per ogni toolset consumato. L'executor decide come eseguire il tool (client del servizio, MCP, agente annidato, ecc.) e riceve metadati espliciti per-call tramite `ToolCallMeta`.

### Esempio Executor

```go
func Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (planner.ToolResult, error) {
    switch call.Name {
    case "orchestrator.profiles.upsert":
        args, err := profilesspecs.UnmarshalUpsertPayload(call.Payload)
        if err != nil {
            return planner.ToolResult{
                Error: planner.NewToolError("invalid payload"),
            }, nil
        }
        
        // Trasformazioni opzionali se emesse dal codegen
        mp, _ := profilesspecs.ToMethodPayload_Upsert(args)
        methodRes, err := client.Upsert(ctx, mp)
        if err != nil {
            return planner.ToolResult{
                Error: planner.ToolErrorFromError(err),
            }, nil
        }
        tr, _ := profilesspecs.ToToolReturn_Upsert(methodRes)
        return planner.ToolResult{Payload: tr}, nil
        
    default:
        return planner.ToolResult{
            Error: planner.NewToolError("unknown tool"),
        }, nil
    }
}
```

## Trasformazioni

Quando un tool è legato a un metodo Goa tramite `BindTo`, la generazione del codice analizza l'Arg/Return del tool e il Payload/Result del metodo. Se le forme sono compatibili, Goa emette helper di trasformazione type-safe:

- `ToMethodPayload_<Tool>(in <ToolArgs>) (<MethodPayload>, error)`
- `ToToolReturn_<Tool>(in <MethodResult>) (<ToolReturn>, error)`

Le trasformazioni vengono emesse sotto `gen/<service>/agents/<agent>/specs/<toolset>/transforms.go` e usano GoTransform di Goa per mappare i campi in sicurezza. Se una trasformazione non viene emessa, scrivi un mapper esplicito nell'executor.

## Identità del Tool

Ogni toolset definisce identificatori tool tipizzati (`tools.Ident`) per tutti i tool generati—inclusi i toolset non esportati. Preferisci queste costanti a stringhe ad-hoc:

```go
import chattools "example.com/assistant/gen/orchestrator/agents/chat/agenttools/search"

// Usa una costante generata invece di stringhe/cast ad-hoc
spec, _ := rt.ToolSpec(chattools.Search)
schemas, _ := rt.ToolSchema(chattools.Search)
```

Per i toolset esportati (agent-as-tool), Goa-AI genera anche package **agenttools** con:

- costanti ID tool tipizzate,
- tipi alias payload/result,
- codec,
- e helper builder come `New<Search>Call`.

Usa questi helper nei planner e nel codice runtime/introspezione per evitare ID tipizzati a stringa e mantenere i tuoi riferimenti tool allineati con il design.

## Semantiche di Decode & Validazione

Goa-AI usa un contratto **JSON canonico** per i payload dei tool:

- **Planner**: Passano sempre `json.RawMessage` in `ToolRequest.Payload`. I planner non hanno bisogno di decodificare gli argomenti tool in struct tipizzate.
- **Runtime**: Gestisce tutta la decodifica schema-aware. Decodifica payload JSON in struct tipizzate per validazione, retry hint e rendering prompt agent-as-tool.
- **Executor**: Ricevono il JSON canonico. Possono usare codec generati per decodificare in struct tipizzate per la logica di implementazione.

La validazione stretta resta al confine del servizio (servizio Goa). Gli errori di validazione restituiti dai servizi possono essere mappati a `RetryHint` se scegli di mostrare guide recuperabili ai planner.

## Prossimi Passi

- Impara l'[Integrazione MCP](../4-mcp-integration.md) per suite di tool esterni
- Esplora la [Composizione Agenti](../../4-tutorials/2-agent-composition/) per pattern agent-as-tool
- Leggi i [Concetti Runtime](../2-runtime/) per capire il flusso di esecuzione dei tool

