---
title: Composizione dell'agente
weight: 5
description: "Learn how to compose agents using agent-as-tool patterns, run trees, and streaming topology."
llm_optimized: true
aliases:
---

Questa guida mostra come comporre gli agenti trattando un agente come uno strumento di un altro e spiega come Goa-AI modella le esecuzioni degli agenti come un albero con proiezioni in streaming per diversi destinatari.

## Cosa costruirete

- Un agente di pianificazione che esporta strumenti di pianificazione
- Un agente orchestratore che utilizza gli strumenti dell'agente di pianificazione
- Composizione tra processi con esecuzione in linea

---

## Progettazione di agenti composti

Creare `design/design.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("orchestrator", func() {})

var PlanRequest = Type("PlanRequest", func() {
    Attribute("goal", String, "Goal to plan for")
    Required("goal")
})

var PlanResult = Type("PlanResult", func() {
    Attribute("plan", String, "Generated plan")
    Required("plan")
})

var _ = Service("orchestrator", func() {
    // Planning agent that exports tools
    Agent("planner", "Planning agent", func() {
        Export("planning.tools", func() {
            Tool("create_plan", "Create a plan", func() {
                Args(PlanRequest)
                Return(PlanResult)
            })
        })
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(5))
            TimeBudget("1m")
        })
    })
    
    // Orchestrator agent that uses planning tools
    Agent("orchestrator", "Orchestration agent", func() {
        Use(AgentToolset("orchestrator", "planner", "planning.tools"))
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

Generare il codice:

```bash
goa gen example.com/tutorial/design
```

---

## Implementazione dei pianificatori

Il codice generato fornisce gli helper per entrambi gli agenti. Collegarli insieme:

```go
package main

import (
    "context"
    
    planner "example.com/tutorial/gen/orchestrator/agents/planner"
    orchestrator "example.com/tutorial/gen/orchestrator/agents/orchestrator"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    ctx := context.Background()
    
    // Register planning agent
    if err := planner.RegisterPlannerAgent(ctx, rt, planner.PlannerAgentConfig{
        Planner: &PlanningPlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Register orchestrator agent (automatically uses planning tools)
    if err := orchestrator.RegisterOrchestratorAgent(ctx, rt, orchestrator.OrchestratorAgentConfig{
        Planner: &OrchestratorPlanner{},
    }); err != nil {
        panic(err)
    }
    
    // Use orchestrator agent
    client := orchestrator.NewClient(rt)
    // ... run agent ...
}
```

**Concetti chiave:**

- **Esportazione**: Dichiara set di strumenti che altri agenti possono utilizzare
- **AgentToolset**: Fa riferimento a un set di strumenti esportato da un altro agente
- **Esecuzione in linea**: Dal punto di vista del chiamante, un agent-as-tool si comporta come una normale chiamata di strumento; il runtime esegue l'agente provider come esecuzione figlia e aggrega il suo output in un singolo `ToolResult` (con un `RunLink` di ritorno all'esecuzione figlia)
- **Cross-Process**: Gli agenti possono essere eseguiti su worker diversi, pur mantenendo un albero di esecuzione coerente; gli eventi e gli handle delle esecuzioni `AgentRunStarted` collegano le chiamate allo strumento genitore alle esecuzioni degli agenti figli per lo streaming e l'osservabilità

---

## Passthrough: Inoltro deterministico degli strumenti

Per gli strumenti esportati che devono bypassare completamente il pianificatore e inoltrare direttamente a un metodo di servizio, utilizzare `Passthrough`. Questo è utile quando:

- Si desidera un comportamento deterministico e prevedibile (nessun processo decisionale LLM)
- Lo strumento è un semplice wrapper attorno a un metodo di servizio esistente
- Si ha bisogno di una latenza garantita senza l'overhead del pianificatore

### Quando usare il Passthrough rispetto all'esecuzione normale

| Scenario | Utilizzare Passthrough | Utilizzare l'esecuzione normale
|----------|-----------------|----------------------|
| Operazioni CRUD semplici | ✓ | |
strumenti di registrazione/audit | ✓ | | |
| Strumenti che richiedono un ragionamento LLM | ✓ | ✓ |
| Flussi di lavoro in più fasi | | ✓ |
| Strumenti che possono necessitare di tentativi con suggerimenti | ✓ | ✓ |

### Dichiarazione DSL

```go
Export("logging-tools", func() {
    Tool("log_message", "Log a message", func() {
        Args(func() {
            Attribute("level", String, "Log level", func() {
                Enum("debug", "info", "warn", "error")
            })
            Attribute("message", String, "Message to log")
            Required("level", "message")
        })
        Return(func() {
            Attribute("logged", Boolean, "Whether the message was logged")
            Required("logged")
        })
        // Bypass planner, forward directly to LoggingService.LogMessage
        Passthrough("log_message", "LoggingService", "LogMessage")
    })
})
```

## Comportamento in fase di esecuzione

Quando un agente consumatore chiama uno strumento passante:

1. Il runtime riceve la chiamata allo strumento dal pianificatore del consumatore
2. Invece di invocare il pianificatore dell'agente fornitore, chiama direttamente il metodo del servizio target
3. Il risultato viene restituito al consumatore senza alcuna elaborazione LLM

Questo fornisce:
- **Latenza prevedibile**: Nessun ritardo di inferenza LLM
- **Comportamento deterministico**: Lo stesso input produce sempre lo stesso output
- **Efficienza dei costi**: Nessun utilizzo di token per operazioni semplici

---

## Eseguire alberi e sessioni

Goa-AI modella l'esecuzione come un **albero di esecuzioni e strumenti**:

{{< figure src="/images/diagrams/RunTree.svg" alt="Hierarchical agent execution with run trees" >}}

- **Esecuzione** - un'esecuzione di un agente:
  - Identificato da un `RunID`
  - Descritta da `run.Context` (RunID, SessionID, TurnID, label, caps)
  - Tracciato in modo duraturo tramite `runlog.Store` (log append-only; paginazione per cursor)

- **Sessione** - una conversazione o un flusso di lavoro che comprende una o più sessioni:
  - `SessionID` raggruppa le sessioni correlate (ad esempio, chat a più turni)
  - Le interfacce utente in genere eseguono il rendering di una sessione alla volta

- **Albero delle sessioni** - relazioni padre/figlio tra sessioni e strumenti:
  - Esecuzione agente di livello superiore (ad esempio, `chat`)
  - Esecuzioni di agenti figlio (agent-as-tool, ad esempio, `ada`, `diagnostics`)
  - Strumenti di servizio sotto questi agenti

Il runtime mantiene questa struttura ad albero utilizzando:

- `run.Handle` - un handle leggero con `RunID`, `AgentID`, `ParentRunID`, `ParentToolCallID`
- Aiutanti Agent-as-tool e registrazioni di toolset che **creano sempre vere esecuzioni figlio** per gli agenti annidati (nessun hack nascosto in linea)

---

## Agente come strumento e RunLink

Quando un agente utilizza un altro agente come strumento:

1. Il runtime avvia un'esecuzione **figlio** per l'agente fornitore con il proprio `RunID`
2. Tiene traccia dei collegamenti genitore/figlio in `run.Context`
3. Esegue un ciclo completo di pianificazione/esecuzione/ripresa nell'esecuzione figlio

Il risultato dello strumento genitore (`planner.ToolResult`) porta con sé:

```go
RunLink *run.Handle
```

Questo `RunLink` permette a:
- Ai pianificatori di ragionare sull'esecuzione figlia (ad esempio, per l'audit/la registrazione)
- Alle interfacce utente di creare "schede agente" nidificate che possono sottoscrivere il flusso del ciclo figlio
- Strumenti esterni per navigare da un ciclo genitore ai suoi figli senza indovinare

---

## Flussi per esecuzione

Ogni corsa ha il suo **proprio flusso** di valori `stream.Event`:

- `AssistantReply`, `PlannerThought`, `ToolStart`, `ToolUpdate`, `ToolUpdate`
- `ToolStart`, `ToolUpdate`, `ToolEnd`
- `AwaitClarification`, `AwaitExternalTools`
- `Usage`, `Workflow`
- `AgentRunStarted` (collegamento dallo strumento padre → esecuzione figlio)

I consumatori si iscrivono per ogni sessione:

```go
sink := &MySink{}
stop, err := rt.SubscribeRun(ctx, runID, sink)
if err != nil { /* handle */ }
defer stop()
```

In questo modo si evitano le firehose globali e si lasciano le UI:
- Collegare una connessione per run (ad esempio, per sessione di chat)
- Decidere quando "entrare" negli agenti figlio sottoscrivendo le loro esecuzioni tramite i metadati `AgentRunStarted` (`ChildRunID`, `ChildAgentID`)

---

## Profili di flusso e politiche per i bambini

`stream.StreamProfile` descrive ciò che un pubblico vede. Ogni profilo controlla:

- Quali tipi di eventi sono inclusi (`Assistant`, `Thoughts`, `ToolStart`, `ToolUpdate`, `ToolEnd`, `AwaitClarification`, `AwaitExternalTools`, `Usage`, `Workflow`, `AgentRuns`)
- Come vengono proiettate le corse figlio tramite `ChildStreamPolicy`

### Struttura del profilo del flusso

```go
type StreamProfile struct {
    Assistant          bool              // Assistant reply events
    Thoughts           bool              // Planner thinking/reasoning events
    ToolStart          bool              // Tool invocation start events
    ToolUpdate         bool              // Tool progress update events
    ToolEnd            bool              // Tool completion events
    AwaitClarification bool              // Human clarification requests
    AwaitExternalTools bool              // External tool execution requests
    Usage              bool              // Token usage events
    Workflow           bool              // Run lifecycle events
    AgentRuns          bool              // Agent-as-tool link events
    ChildPolicy        ChildStreamPolicy // How child runs are projected
}
```

### Opzioni ChildStreamPolicy

L'opzione `ChildStreamPolicy` controlla il modo in cui le esecuzioni annidate degli agenti appaiono nello stream:

| Politica | Costante | Comportamento |
|--------|----------|----------|
| **Off** | `ChildStreamPolicyOff` Le esecuzioni figlio sono nascoste a questo pubblico; sono visibili solo le chiamate allo strumento padre e i risultati. Ideale per le pipeline di metriche che non necessitano di dettagli annidati. |
| **Flatten** | `ChildStreamPolicyFlatten` | Gli eventi figlio vengono proiettati nel flusso dell'esecuzione padre, creando una vista "firehose" in stile debug. Utile per il debug operativo, quando si vogliono tutti gli eventi in un unico flusso. |
| **Linked** | `ChildStreamPolicyLinked` | Il genitore emette eventi di collegamento `AgentRunStarted`; gli eventi figli rimangono nei propri flussi. Le interfacce utente possono sottoscrivere i flussi figli su richiesta. Ideale per le interfacce di chat strutturate. |

### Profili integrati

Goa-AI fornisce tre profili integrati per i casi d'uso più comuni:

**`stream.UserChatProfile()`** - Interfacce di chat per l'utente finale

```go
// Returns a profile suitable for end-user chat views
func UserChatProfile() StreamProfile {
    return StreamProfile{
        Assistant:          true,
        Thoughts:           true,
        ToolStart:          true,
        ToolUpdate:         true,
        ToolEnd:            true,
        AwaitClarification: true,
        AwaitExternalTools: true,
        Usage:              true,
        Workflow:           true,
        AgentRuns:          true,
        ChildPolicy:        ChildStreamPolicyLinked,
    }
}
```

- Emette tutti i tipi di eventi per un rendering ricco dell'interfaccia utente
- Utilizza la politica dei figli **collegati**, in modo che le interfacce utente possano eseguire il rendering di "schede agente" annidate e sottoscrivere i flussi figli su richiesta
- Mantiene pulita la corsia principale della chat, consentendo al contempo il drill-down negli agenti nidificati

**`stream.AgentDebugProfile()`** - Debug operativo

```go
// Returns a verbose profile for debugging views
func AgentDebugProfile() StreamProfile {
    p := DefaultProfile()
    p.ChildPolicy = ChildStreamPolicyFlatten
    return p
}
```

- Emette tutti i tipi di evento come `UserChatProfile`
- Utilizza la politica dei figli **Flatten** per proiettare tutti gli eventi figli nel flusso genitore
- Emette ancora collegamenti `AgentRunStarted` per la correlazione
- Ideale per console di debug e strumenti di risoluzione dei problemi

**`stream.MetricsProfile()`** - Pipeline di telemetria

```go
// Returns a profile for metrics/telemetry pipelines
func MetricsProfile() StreamProfile {
    return StreamProfile{
        Usage:       true,
        Workflow:    true,
        ChildPolicy: ChildStreamPolicyOff,
    }
}
```

- Emette solo eventi `Usage` e `Workflow`
- Utilizza il criterio figlio **Off** per nascondere completamente le esecuzioni annidate
- Minimo overhead per il monitoraggio dei costi e delle prestazioni

### Cablaggio dei profili ai sottoscrittori

Applicare i profili quando si creano gli abbonati al flusso:

```go
import "goa.design/goa-ai/runtime/agent/stream"

// Create a subscriber with the user chat profile
chatSub, err := stream.NewSubscriberWithProfile(chatSink, stream.UserChatProfile())
if err != nil {
    return err
}

// Create a subscriber with the debug profile
debugSub, err := stream.NewSubscriberWithProfile(debugSink, stream.AgentDebugProfile())
if err != nil {
    return err
}

// Create a subscriber with the metrics profile
metricsSub, err := stream.NewSubscriberWithProfile(metricsSink, stream.MetricsProfile())
if err != nil {
    return err
}
```

### Creazione di profili personalizzati

Per esigenze specifiche, è possibile creare profili personalizzati impostando singoli campi:

```go
// Custom profile: tools and workflow only, no thoughts or assistant replies
toolsOnlyProfile := stream.StreamProfile{
    ToolStart:   true,
    ToolUpdate:  true,
    ToolEnd:     true,
    Workflow:    true,
    ChildPolicy: stream.ChildStreamPolicyLinked,
}

// Custom profile: everything except usage (for privacy-sensitive contexts)
noUsageProfile := stream.DefaultProfile()
noUsageProfile.Usage = false

// Custom profile: flatten child runs but skip thoughts
flatNoThoughts := stream.StreamProfile{
    Assistant:          true,
    ToolStart:          true,
    ToolUpdate:         true,
    ToolEnd:            true,
    AwaitClarification: true,
    AwaitExternalTools: true,
    Usage:              true,
    Workflow:           true,
    AgentRuns:          true,
    ChildPolicy:        stream.ChildStreamPolicyFlatten,
}

sub, err := stream.NewSubscriberWithProfile(sink, toolsOnlyProfile)
```

### Linee guida per la selezione dei profili

| Pubblico | Profilo raccomandato | Motivazione |
|----------|---------------------|-----------|
| UI di chat per l'utente finale | `UserChatProfile()` | Struttura pulita con schede agente espandibili |
| Console di amministrazione/debug | `AgentDebugProfile()` | Visibilità completa con eventi figlio appiattiti |
| Metriche/fatturazione | `MetricsProfile()` | Eventi minimi per l'aggregazione |
| Registrazione di audit | Personalizzato (tutti gli eventi, collegati) | Registrazione completa con gerarchia strutturata |
| Cruscotti in tempo reale | Personalizzati (flusso di lavoro + utilizzo) | Solo monitoraggio dello stato e dei costi |

Le applicazioni scelgono il profilo quando cablano i sink e i bridge (ad esempio, Pulse, SSE, WebSocket) in modo che:
- Le interfacce utente della chat rimangono pulite e strutturate (esecuzioni figlio collegate, schede agente)
- Le console di debug possono vedere tutti i flussi di eventi nidificati
- Le pipeline di metriche vedono solo quanto basta per aggregare l'utilizzo e gli stati

---

## Progettazione di interfacce utente con gli alberi di esecuzione

Dato il modello run tree + streaming, una tipica interfaccia utente di chat può:

1. Sottoscrivere il run di chat **radice** con un profilo di chat dell'utente
2. Rendering:
   - Risposte dell'assistente
   - Righe di strumenti per gli strumenti di livello superiore
   - eventi "Esecuzione agente avviata" come **Schede agente** annidate
3. Quando l'utente espande una scheda:
   - Sottoscrivere l'esecuzione figlia utilizzando `ChildRunID`
   - Renderizzare la timeline dell'agente (pensieri, strumenti, attese) all'interno della scheda
   - Mantenere pulita la corsia principale della chat

Gli strumenti di debug possono abbonarsi con un profilo di debug per vedere:
- Eventi figlio appiattiti
- Metadati espliciti genitore/figlio
- Alberi di esecuzione completi per la risoluzione dei problemi

L'idea chiave: **La topologia dell'esecuzione (albero di esecuzione) è sempre conservata** e lo streaming è solo un insieme di proiezioni su quell'albero per diversi destinatari.

---

## Prossimi passi

- **[Integrazione MCP](./mcp-integration.md)** - Connessione a server di strumenti esterni
- **[Memoria e sessioni](./memory-sessions.md)** - Gestire lo stato con le trascrizioni e gli archivi di memoria
- **[Produzione](./production.md)** - Distribuire con UI temporale e streaming
