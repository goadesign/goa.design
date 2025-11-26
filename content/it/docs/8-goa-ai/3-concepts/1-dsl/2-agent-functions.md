---
title: "Funzioni Agent"
linkTitle: "Funzioni Agent"
weight: 2
description: "Funzioni per dichiarare agenti e il loro uso dei tool."
---

## Agent

`Agent(name, description, dsl)` dichiara un agente all'interno di un `Service`. Registra i metadati dell'agente a scope del servizio (nome, descrizione, servizio proprietario) e attacca toolset tramite `Use` ed `Export`.

**Posizione**: `dsl/agent.go`  
**Contesto**: Dentro `Service`  
**Scopo**: Dichiara un agente, il suo uso/export di tool e la policy di run.

Ogni agente diventa una registrazione runtime con:

- Una definizione di workflow e handler delle attività Temporal
- Attività PlanStart/PlanResume con opzioni retry/timeout derivate dal DSL
- Un helper `Register<Agent>` che registra workflow, attività e toolset su un `runtime.Runtime`

### Esempio

```go
var _ = Service("orchestrator", func() {
    Agent("chat", "Runner conversazionale", func() {
        Use(DocsToolset)
        Export("chat.tools", func() {
            // tool definiti qui
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

## Use

`Use(value, dsl)` dichiara che un agente consuma un toolset. Il toolset può essere:

- Una variabile `Toolset` di primo livello
- Un riferimento `MCPToolset`
- Una definizione di toolset inline (nome stringa + DSL)
- Un riferimento `AgentToolset` per la composizione agent-as-tool

Quando si referenzia un toolset provider, la funzione DSL opzionale può filtrare i tool per nome o aggiungere configurazione. Quando si usa un nome stringa, viene creato un toolset inline locale all'agente.

**Posizione**: `dsl/agent.go`  
**Contesto**: Dentro `Agent`  
**Scopo**: Dichiara che un agente consuma un toolset (inline o per riferimento).

### Esempio

```go
Agent("chat", "Runner conversazionale", func() {
    // Riferimento a un toolset di primo livello
    Use(DocsToolset)
    
    // Riferimento con sottoinsieme
    Use(CommonTools, func() {
        Tool("notify") // consuma solo questo tool da CommonTools
    })
    
    // Riferimento a un toolset MCP
    Use(MCPToolset("assistant", "assistant-mcp"))
    
    // Definizione toolset inline locale all'agente
    Use("helpers", func() {
        Tool("answer", "Risponde a una domanda", func() {
            // definizione del tool
        })
    })
    
    // Composizione agent-as-tool
    Use(AgentToolset("service", "agent", "toolset"))
})
```

## Export

`Export(value, dsl)` dichiara toolset esposti ad altri agenti o servizi. I toolset esportati possono essere consumati da altri agenti tramite `Use(AgentToolset(...))`.

Export può apparire in:
- Un'espressione `Agent` (esporta come proprietà dell'agente)
- Un'espressione `Service` (esporta come proprietà del servizio)

**Posizione**: `dsl/agent.go`  
**Contesto**: Dentro `Agent` o `Service`  
**Scopo**: Dichiara toolset esposti ad altri agenti o servizi.

### Esempio

```go
Agent("planner", "Agente di pianificazione", func() {
    Export("planning.tools", func() {
        Tool("create_plan", "Crea un piano", func() {
            Args(func() {
                Attribute("goal", String, "Obiettivo per cui pianificare")
                Required("goal")
            })
            Return(func() {
                Attribute("plan", String, "Piano generato")
                Required("plan")
            })
        })
    })
})
```

## AgentToolset

`AgentToolset(service, agent, toolset)` referenzia un toolset esportato da un altro agente. Questo abilita la composizione agent-as-tool dove un agente può usare i tool esportati di un altro agente.

Usa `AgentToolset` quando:
- Non hai un handle di espressione al toolset esportato
- Più agenti esportano toolset con lo stesso nome (ambiguità)
- Vuoi essere esplicito nel design per chiarezza

Quando hai un handle di espressione diretto (es., una variabile Toolset di primo livello), preferisci `Use(ToolsetExpr)` e lascia che Goa-AI inferisca automaticamente il provider.

**Posizione**: `dsl/toolset.go`  
**Contesto**: Argomento di `Use`  
**Scopo**: Referenzia un toolset esportato da un altro agente.

### Esempio

```go
// L'agente A esporta tool
Agent("planner", func() {
    Export("planning.tools", func() {
        // tools
    })
})

// L'agente B usa i tool dell'agente A
Agent("orchestrator", func() {
    Use(AgentToolset("service", "planner", "planning.tools"))
})
```

## Passthrough

`Passthrough(toolName, target, methodName)` definisce l'inoltro deterministico per un tool esportato verso un metodo di servizio Goa. Questo bypassa completamente il planner—quando il tool viene invocato, chiama direttamente il metodo di servizio specificato.

**Posizione**: `dsl/agent.go`  
**Contesto**: Dentro `Tool` annidato sotto `Export`  
**Scopo**: Instrada le chiamate tool direttamente ai metodi di servizio senza coinvolgimento del planner.

Passthrough accetta:
- `Passthrough(toolName, methodExpr)` - Usando un'espressione metodo Goa
- `Passthrough(toolName, serviceName, methodName)` - Usando nomi di servizio e metodo

### Esempio

```go
Export("logging-tools", func() {
    Tool("log_message", "Logga un messaggio", func() {
        Args(func() {
            Attribute("message", String, "Messaggio da loggare")
            Required("message")
        })
        Return(func() {
            Attribute("logged", Boolean, "Se il messaggio è stato loggato")
        })
        Passthrough("log_message", "LoggingService", "LogMessage")
    })
})
```

## UseAgentToolset

`UseAgentToolset(service, agent, toolset)` è una funzione di convenienza che combina `AgentToolset` e `Use`. Referenzia un toolset esportato da un altro agente e lo aggiunge immediatamente ai toolset usati dall'agente corrente.

**Posizione**: `dsl/toolset.go`  
**Contesto**: Dentro `Agent`  
**Scopo**: Abbreviazione per `Use(AgentToolset(...))`.

### Esempio

```go
Agent("orchestrator", func() {
    // Questi due sono equivalenti:
    Use(AgentToolset("service", "planner", "planning.tools"))
    UseAgentToolset("service", "planner", "planning.tools")
})
```

## DisableAgentDocs

`DisableAgentDocs()` disabilita la generazione di `AGENTS_QUICKSTART.md` nella root del modulo. Di default, Goa-AI genera una guida quickstart contestuale dopo la generazione del codice.

**Posizione**: `dsl/agent.go`  
**Contesto**: Dentro `API`  
**Scopo**: Disabilita la generazione di `AGENTS_QUICKSTART.md` nella root del modulo.

### Esempio

```go
var _ = API("orchestrator", func() {
    DisableAgentDocs()
})
```

## Prossimi Passi

- Impara le [Funzioni Toolset](./3-toolset-functions.md) per definire toolset e tool
- Leggi le [Funzioni Policy](./4-policy-functions.md) per configurare il comportamento runtime
