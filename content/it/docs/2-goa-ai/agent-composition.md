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
- **Cross-Process**: Gli agenti possono essere eseguiti su worker diversi, pur mantenendo un albero di esecuzione coerente; gli eventi e gli handle delle esecuzioni `ChildRunLinked` collegano le chiamate allo strumento genitore alle esecuzioni degli agenti figli per lo streaming e l'osservabilità

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
- Alle interfacce utente di creare "schede agente" nidificate e renderizzare gli eventi filtrando lo stream di sessione per `run_id`
- Strumenti esterni per navigare da un ciclo genitore ai suoi figli senza indovinare

---

## Stream di proprietà della sessione

Goa-AI pubblica gli eventi `stream.Event` in un unico **stream di proprietà della sessione**:

- `session/<session_id>`

Questo stream contiene eventi per tutte le run della sessione, incluse le run annidate degli agenti (agent-as-tool). Ogni evento include `run_id` e `session_id` e il runtime emette:

- `child_run_linked`: collega una chiamata allo strumento padre (`tool_call_id`) con la run figlia (`child_run_id`)
- `run_stream_end`: marcatore esplicito che significa “non appariranno altri eventi visibili per questa run”

I consumatori si iscrivono **una volta per sessione** e chiudono SSE/WebSocket quando osservano `run_stream_end` per il `run_id` attivo.

```go
import "goa.design/goa-ai/runtime/agent/stream"

events, errs, cancel, err := sub.Subscribe(ctx, "session/session-123")
if err != nil {
    panic(err)
}
defer cancel()

activeRunID := "run-123"
for {
    select {
    case evt, ok := <-events:
        if !ok {
            return
        }
        if evt.Type() == stream.EventRunStreamEnd && evt.RunID() == activeRunID {
            return
        }
    case err := <-errs:
        panic(err)
    }
}
```

---

## Profili di flusso

`stream.StreamProfile` descrive quali tipi di eventi vengono emessi per un pubblico.

### Struttura di StreamProfile

```go
type StreamProfile struct {
    Assistant          bool // assistant_reply
    Thoughts           bool // planner_thought
    ToolStart          bool // tool_start
    ToolUpdate         bool // tool_update
    ToolEnd            bool // tool_end
    AwaitClarification bool // await_clarification
    AwaitConfirmation  bool // await_confirmation
    AwaitQuestions     bool // await_questions
    AwaitExternalTools bool // await_external_tools
    ToolAuthorization  bool // tool_authorization
    Usage              bool // usage
    Workflow           bool // workflow
    ChildRuns          bool // child_run_linked (strumento padre → run figlia)
}
```

### Profili integrati

Goa-AI fornisce profili integrati per casi d'uso comuni:

- `stream.DefaultProfile()` emette tutti i tipi di eventi.
- `stream.UserChatProfile()` è adatto alle UI utente finali.
- `stream.AgentDebugProfile()` è adatto alle viste di debug/sviluppatore.
- `stream.MetricsProfile()` emette solo `Usage` e `Workflow`.

Nel modello di streaming di proprietà della sessione, non sono necessarie sottoscrizioni separate per le run figlie. `child_run_linked` serve a costruire l’albero di run e ad associare gli eventi alla scheda corretta consumando un unico stream `session/<session_id>`.

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
    ChildRuns:   true,
}

// Custom profile: everything except usage (for privacy-sensitive contexts)
noUsageProfile := stream.DefaultProfile()
noUsageProfile.Usage = false

sub, err := stream.NewSubscriberWithProfile(sink, toolsOnlyProfile)
```

### Linee guida per la selezione dei profili

| Pubblico | Profilo raccomandato | Motivazione |
|----------|---------------------|-----------|
| UI di chat per l'utente finale | `UserChatProfile()` | Struttura pulita con schede agente espandibili |
| Console di amministrazione/debug | `AgentDebugProfile()` | Visibilità completa di strumenti, attese e fasi |
| Metriche/fatturazione | `MetricsProfile()` | Eventi minimi per l'aggregazione |
| Registrazione di audit | `DefaultProfile()` | Registrazione completa con campi di correlazione per run |
| Cruscotti in tempo reale | Personalizzati (flusso di lavoro + utilizzo) | Solo monitoraggio dello stato e dei costi |

Le applicazioni scelgono il profilo quando cablano i sink e i bridge (ad esempio, Pulse, SSE, WebSocket) in modo che:
- Le interfacce utente della chat rimangono pulite e strutturate (schede annidate guidate da `child_run_linked`)
- Le console di debug possono vedere il dettaglio completo nello stesso stream di sessione
- Le pipeline di metriche vedono solo quanto basta per aggregare l'utilizzo e gli stati

---

## Progettazione di interfacce utente con gli alberi di esecuzione

Dato il modello run tree + streaming, una tipica interfaccia utente di chat può:

1. Sottoscrivere lo stream di sessione (`session/<session_id>`) con un profilo chat utente.
2. Tracciare la run attiva (`active_run_id`) e renderizzare:
   - Risposte dell'assistente (`assistant_reply`)
   - Ciclo di vita degli strumenti (`tool_start`/`tool_update`/`tool_end`)
   - Link a run figlie (`child_run_linked`) come **schede agente** annidate per `child_run_id`
3. Per ogni scheda, renderizzare la timeline della run figlia filtrando lo stesso stream di sessione per `run_id == child_run_id` (nessuna sottoscrizione aggiuntiva).
4. Chiudere SSE/WebSocket quando si osserva `run_stream_end` per `active_run_id`.

L'idea chiave: **la topologia di esecuzione (albero) è preservata tramite ID ed eventi di link**, e lo streaming è un unico log ordinato per sessione che proietti in corsie/schede filtrando per `run_id`.

---

## Prossimi passi

- **[Integrazione MCP](./mcp-integration.md)** - Connessione a server di strumenti esterni
- **[Memoria e sessioni](./memory-sessions.md)** - Gestire lo stato con le trascrizioni e gli archivi di memoria
- **[Produzione](./production.md)** - Distribuire con UI temporale e streaming
