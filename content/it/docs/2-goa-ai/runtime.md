---
title: "Tempo di esecuzione"
linkTitle: "Tempo di esecuzione"
weight: 3
description: "Understand how the Goa-AI runtime orchestrates agents, enforces policies, and manages state."
llm_optimized: true
aliases:
---

## Panoramica dell'architettura

Il runtime Goa-AI orchestra il ciclo di pianificazione/esecuzione/ripresa, applica le politiche, gestisce lo stato e si coordina con i motori, i pianificatori, gli strumenti, la memoria, gli hook e i moduli funzionali.

| Strato | Responsabilità |
| --- | --- |
| DSL + Codegen | Produrre i registri degli agenti, le specifiche/codici degli strumenti, i flussi di lavoro, gli adattatori MCP
| Runtime Core | Orchestrano il ciclo di pianificazione/avvio/ripresa, l'applicazione delle politiche, gli hook, la memoria, lo streaming |
| Workflow Engine Adapter | L'adattatore temporale implementa `engine.Engine`; altri motori possono essere collegati |
| Moduli di funzionalità | Integrazioni opzionali (MCP, Pulse, negozi Mongo, fornitori di modelli) |

---

## Architettura agenziale di alto livello

In fase di esecuzione, Goa-AI organizza il sistema attorno a un piccolo insieme di costrutti componibili:

- **Agenti**: Orchestratori di lunga durata identificati da `agent.Ident` (ad esempio, `service.chat`). Ogni agente possiede un pianificatore, una politica di esecuzione, flussi di lavoro generati e registrazioni di strumenti.

- **Esecuzioni**: Una singola esecuzione di un agente. Le esecuzioni sono identificate da un `RunID` e tracciate tramite `run.Context` e `run.Handle`, e sono raggruppate da `SessionID` e `TurnID` per formare conversazioni.

- **Toolsets e strumenti**: Raccolte nominate di funzionalità, identificate da `tools.Ident` (`service.toolset.tool`). Gli insiemi di strumenti supportati da servizi chiamano le API; gli insiemi di strumenti supportati da agenti eseguono altri agenti come strumenti.

- **Pianificatori**: Il vostro livello strategico guidato da LLM che implementa <x id="174"/ `PlanResume`. I pianificatori decidono quando chiamare gli strumenti piuttosto che rispondere direttamente; il runtime impone dei limiti e dei budget di tempo per queste decisioni.

- **Albero di esecuzione e agente come strumento**: Quando un agente chiama un altro agente come strumento, il runtime avvia una vera e propria esecuzione figlia con il proprio `RunID`. Il genitore `ToolResult` porta un `RunLink` (`*run.Handle`) che punta al figlio e viene emesso un evento di streaming `child_run_linked` per correlare la chiamata dello strumento genitore con il `RunID` figlio.

- **Flussi e profili**: Goa-AI pubblica valori `stream.Event` tipizzati in uno **stream di proprietà della sessione** (`session/<session_id>`). Gli eventi includono `RunID` e `SessionID` e il runtime emette `run_stream_end` come marcatore esplicito per chiudere SSE/WebSocket senza timer. `stream.StreamProfile` seleziona quali tipi di eventi sono visibili per un determinato pubblico (chat UI, debug, metriche).

---

## Avvio rapido

```go
package main

import (
    "context"

    chat "example.com/assistant/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    // In-memory engine is the default; pass WithEngine for Temporal or custom engines.
    rt := runtime.New()
    ctx := context.Background()
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: newChatPlanner()})
    if err != nil {
        panic(err)
    }

    // Sessions are first-class: create a session before starting runs under it.
    if _, err := rt.CreateSession(ctx, "session-1"); err != nil {
        panic(err)
    }

    client := chat.NewClient(rt)
    out, err := client.Run(ctx, "session-1", []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Summarize the latest status."}},
    }})
    if err != nil {
        panic(err)
    }
    // Use out.RunID, out.Final (the assistant message), etc.
}
```

---

## Solo client vs. Lavoratore

Due ruoli utilizzano il runtime:

- **Solo cliente** (invia le esecuzioni): Costruisce un runtime con un motore compatibile con i client e non registra agenti. Usa il generato `<agent>.NewClient(rt)` che trasporta il percorso (flusso di lavoro + coda) registrato dai lavoratori remoti.
- **Worker** (esegue esecuzioni): Costruisce un runtime con un motore capace di lavorare, registra gli agenti (con pianificatori reali) e lascia che il motore esegua il polling e i flussi di lavoro/attività.

### Esempio solo client

```go
rt := runtime.New(runtime.WithEngine(temporalClient)) // engine client

// No agent registration needed in a caller-only process
client := chat.NewClient(rt)
if _, err := rt.CreateSession(ctx, "s1"); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "s1", msgs)
```

## Esempio di lavoratore

```go
rt := runtime.New(runtime.WithEngine(temporalWorker)) // worker-enabled engine
err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner})
// Start engine worker loop per engine's integration (for example, Temporal worker.Run()).
```

---

## Pianifica → Esegui → Riprendi il ciclo

1. Il runtime avvia un flusso di lavoro per l'agente (in-memory o temporale) e registra un nuovo `run.Context` con `RunID`, `SessionID`, `TurnID`, etichette e cappucci di politica.
2. Richiama il `PlanStart` del pianificatore con i messaggi e il contesto di esecuzione correnti.
3. Pianifica le chiamate agli strumenti restituite dal pianificatore (il pianificatore passa payload JSON canonici; il runtime gestisce la codifica/decodifica utilizzando i codec generati).
4. Chiama `PlanResume` con i risultati dello strumento; il ciclo si ripete finché il pianificatore non restituisce una risposta finale o finché non vengono raggiunti i limiti di tempo. Man mano che l'esecuzione procede, la corsa avanza attraverso i valori di `run.Phase` (`prompted`, `planning`, `executing_tools`, `synthesizing`, fasi terminali).
5. I ganci e i sottoscrittori del flusso emettono eventi (pensieri del pianificatore, avvio/aggiornamento/fine dello strumento, attese, utilizzo, flusso di lavoro, collegamenti tra agenti e corse) e, se configurati, persistono le voci di trascrizione e i metadati della corsa.

---

## Fasi dell'esecuzione

Quando un'esecuzione avanza nel ciclo di pianificazione/esecuzione/ripresa, passa attraverso una serie di fasi del ciclo di vita. Queste fasi forniscono una visibilità a grana fine del punto in cui si trova un'esecuzione, consentendo alle interfacce utente di mostrare indicatori di avanzamento di alto livello.

### Valori delle fasi

| Fase | Descrizione |
| --- | --- |
| `prompted` | L'input è stato ricevuto e l'esecuzione sta per iniziare la pianificazione |
| `planning` | Il pianificatore sta decidendo se e come chiamare gli strumenti o rispondere direttamente |
| `executing_tools` | Gli strumenti (compresi gli agenti nidificati) sono attualmente in esecuzione |
| `synthesizing` | Il pianificatore sta sintetizzando una risposta finale senza programmare strumenti aggiuntivi |
| `completed` | L'esecuzione è stata completata con successo |
| `failed` | L'esecuzione è fallita |
| `canceled` | L'esecuzione è stata annullata |

### Transizioni di fase

Una tipica esecuzione di successo segue questa progressione:

```
prompted → planning → executing_tools → planning → synthesizing → completed
                          ↑__________________|
                          (loop while tools needed)
```

Il runtime emette eventi `RunPhaseChanged` per le fasi **non terminali** (ad esempio `planning`, `executing_tools`, `synthesizing`) così che gli abbonati allo stream possano seguire i progressi in tempo reale.

### Fase vs Stato

Le fasi sono distinte da `run.Status`:

- **Status** (`pending`, `running`, `completed`, `failed`, `canceled`, `paused`) è lo stato del ciclo di vita a grana grossa memorizzato in metadati di esecuzione durevoli
- **Phase** fornisce una visibilità a grana più fine del ciclo di esecuzione, destinata alle superfici di streaming/UX

### Eventi di ciclo di vita: cambi di fase vs completamento

Il runtime emette:

- **`RunPhaseChanged`** per transizioni di fase non terminali.
- **`RunCompleted`** una sola volta per run per lo stato terminale (success / failed / canceled).

I subscriber di stream traducono entrambi in eventi `workflow` (`stream.WorkflowPayload`):

- **Aggiornamenti non terminali** (da `RunPhaseChanged`): solo `phase`.
- **Aggiornamento terminale** (da `RunCompleted`): `status` + `phase` terminale, con campi d'errore strutturati in caso di failure.

**Mapping dello status terminale**

- `status="success"` → `phase="completed"`
- `status="failed"` → `phase="failed"`
- `status="canceled"` → `phase="canceled"`

**La cancellazione non è un errore**

Per `status="canceled"`, il payload stream **non deve** includere un `error` user-facing. I consumer devono trattare la cancellazione come uno stato terminale non errore.

**Le failure sono strutturate**

Per `status="failed"`, il payload stream include:

- `error_kind`: classificatore stabile per UX/decisioni (kinds provider come `rate_limited`, `unavailable`, o kinds runtime come `timeout`/`internal`)
- `retryable`: se un retry può riuscire senza cambiare input
- `error`: messaggio **user-safe** (render diretto)
- `debug_error`: errore raw per log/diagnostica (non per UI)

---

## Politiche, cappucci ed etichette

## Politica di esecuzione in tempo di progettazione

In fase di progettazione, si configurano le politiche per agente con `RunPolicy`:

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxConsecutiveFailedToolCalls(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
    })
})
```

Questo diventa un `runtime.RunPolicy` allegato alla registrazione dell'agente:

- **Caps**: `MaxToolCalls` - chiamate totali allo strumento per esecuzione. `MaxConsecutiveFailedToolCalls` - fallimenti consecutivi prima dell'interruzione.
- **Bilancio di tempo**: `TimeBudget` - budget di tempo per la corsa. `FinalizerGrace` (solo per la corsa) - finestra riservata opzionale per la finalizzazione.
- **Interruzioni**: `InterruptsAllowed` - opt-in per pausa/ripresa.
- **Comportamento dei campi mancanti**: `OnMissingFields` - regola cosa succede quando la validazione indica campi mancanti.

### Sovrascritture dei criteri di runtime

In alcuni ambienti si può desiderare di rendere più rigide o meno rigide le politiche senza modificare il progetto. L'API `rt.OverridePolicy` consente di modificare i criteri a livello locale:

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxConsecutiveFailedToolCalls: 1,
    InterruptsAllowed:             true,
})
```

**Ambito di applicazione**: Le sovrascritte sono locali all'istanza del runtime corrente e hanno effetto solo sulle esecuzioni successive. Non persistono nei riavvii del processo e non si propagano ad altri worker.

**Campi sovrascrivibili**:

| Campo | Descrizione |
| --- | --- |
| `MaxToolCalls` | Chiamate totali massime allo strumento per esecuzione |
| `MaxConsecutiveFailedToolCalls` | Fallimenti consecutivi prima di interrompere l'esecuzione |
| `TimeBudget` | Budget del wall-clock per la corsa |
| `FinalizerGrace` | Finestra riservata per la finalizzazione |
| `InterruptsAllowed` | Abilita la funzionalità di pausa/ripresa |

Vengono applicati solo i campi non nulli (e `InterruptsAllowed` quando `true`). Ciò consente di sovrascrivere selettivamente i campi senza influire sulle altre impostazioni del criterio.

**Casi d'uso**:
- Arretramenti temporanei durante il throttling del provider
- Test A/B di diverse configurazioni di criteri
- Sviluppo/debug con vincoli rilassati
- Personalizzazione dei criteri per inquilino in fase di runtime

### Etichette e motori di policy

Goa-AI si integra con motori di policy collegabili tramite `policy.Engine`. Le policy ricevono i metadati degli strumenti (ID, tag), il contesto di esecuzione (SessionID, TurnID, etichette) e le informazioni `RetryHint` dopo i fallimenti degli strumenti.

Le etichette confluiscono in:
- `run.Context.Labels` - disponibili per i pianificatori durante una sessione
- eventi del log di esecuzione (`runlog.Store`) - persistiti con gli eventi di lifecycle per audit/ricerca/dashboard (quando indicizzati)

---

## Esecuzione dello strumento

- **Set di strumenti nativi**: L'utente scrive le implementazioni; il runtime gestisce la decodifica degli argomenti digitati utilizzando i codec generati
- **Agent-as-tool**: Gli strumenti agent-tool generati eseguono gli agenti provider come esecuzioni figlio (in linea dal punto di vista del pianificatore) e adattano il loro `RunOutput` in un `planner.ToolResult` con un handle `RunLink` all'esecuzione figlio
- **Mcp toolsets**: Il runtime inoltra il JSON canonico ai chiamanti generati; i chiamanti gestiscono il trasporto

### Tool payload defaults

Tool payload decoding follows Goa’s **decode-body → transform** pattern and applies Goa-style defaults deterministically for tool payloads.

See **[Tool Payload Defaults](tool-payload-defaults/)** for the contract and codegen invariants.

## Contratti runtime dei prompt

La gestione dei prompt e nativa del runtime e versionata:

- `runtime.PromptRegistry` conserva registrazioni immutabili delle prompt spec baseline (`prompt.PromptSpec`).
- `runtime.WithPromptStore(prompt.Store)` abilita la risoluzione degli override con scope (`session` -> `facility` -> `org` -> global).
- I planner chiamano `PlannerContext.RenderPrompt(ctx, id, data)` per risolvere e rendere il contenuto.
- Il contenuto renderizzato include metadati `prompt.PromptRef` per provenance; i planner possono allegarli a `model.Request.PromptRefs`.

```go
content, err := input.Agent.RenderPrompt(ctx, "aura.chat.system", map[string]any{
    "AssistantName": "Ops Assistant",
})
if err != nil {
    return nil, err
}

resp, err := modelClient.Complete(ctx, &model.Request{
    RunID:      input.RunContext.RunID,
    Messages:   input.Messages,
    PromptRefs: []prompt.PromptRef{content.Ref},
})
```

`PromptRefs` sono metadati runtime per audit/provenance e non fanno parte del payload wire verso il provider.

---

## Memoria, flusso, telemetria

- **Hook bus** pubblica eventi hook strutturati per l'intero ciclo di vita dell'agente: avvio/completamento dell'esecuzione, cambiamenti di fase, `prompt_rendered`, programmazione/risultati/aggiornamenti dello strumento, note del pianificatore e blocchi di pensiero, attese, suggerimenti per il tentativo e collegamenti all'agente come strumento.

- i **Memory Store** (`memory.Store`) sottoscrivono e aggiungono eventi di memoria durevoli (messaggi di utenti/assistenti, chiamate agli strumenti, risultati degli strumenti, note del pianificatore, riflessioni) per `(agentID, RunID)`.

- i **Run event stores** (`runlog.Store`) aggiungono il log canonico degli eventi hook per `RunID` per UI audit/debug e introspezione.

- gli **Stream sinks** (`stream.Sink`, ad esempio Pulse o SSE/WebSocket personalizzati) ricevono i valori `stream.Event` tipizzati prodotti dallo `stream.Subscriber`. Un `StreamProfile` controlla quali tipi di eventi vengono emessi.

- **Telemetria**: La registrazione, le metriche e la tracciabilità dei flussi di lavoro e delle attività da un capo all'altro di OTEL.

### Consumare lo stream di sessione (Pulse)

In produzione, il pattern tipico è:

- consumare lo stream di sessione (`session/<session_id>`) da un bus condiviso (Pulse / Redis Streams)
- filtrare per `run_id` per costruire lane/card per esecuzione
- chiudere SSE/WebSocket quando si osserva `run_stream_end` per il `run_id` attivo

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

## Astrazione del motore

- **In-memory**: Ciclo di sviluppo veloce, nessun supporto esterno
- **Temporale**: Esecuzione durevole, replay, retry, segnali, worker; gli adattatori collegano le attività e la propagazione del contesto

---

## Contratti di esecuzione

- `SessionID` è richiesto all'avvio dell'esecuzione. `Start` fallisce rapidamente quando `SessionID` è vuoto o con spazi bianchi
- Gli agenti devono essere registrati prima della prima esecuzione. Il runtime rifiuta la registrazione dopo l'invio della prima esecuzione con `ErrRegistrationClosed` per mantenere i lavoratori del motore deterministici
- Gli esecutori degli strumenti ricevono metadati espliciti per chiamata (`ToolCallMeta`) piuttosto che pescare valori da `context.Context`
- Non fare affidamento su fallback impliciti; tutti gli identificatori di dominio (esecuzione, sessione, turno, correlazione) devono essere passati esplicitamente

---

## Pausa e ripresa

I flussi di lavoro human-in-loop possono sospendere e riprendere le esecuzioni utilizzando gli helper di interruzione del runtime:

```go
import "goa.design/goa-ai/runtime/agent/interrupt"

// Pause
if err := rt.PauseRun(ctx, interrupt.PauseRequest{
    RunID: "session-1-run-1",
    Reason: "human_review",
}); err != nil {
    panic(err)
}

// Resume
if err := rt.ResumeRun(ctx, interrupt.ResumeRequest{
    RunID: "session-1-run-1",
}); err != nil {
    panic(err)
}
```

Dietro le quinte, i segnali di pausa/ripresa aggiornano l'archivio delle esecuzioni ed emettono eventi di aggancio `run_paused`/`run_resumed`, in modo che i livelli dell'interfaccia utente rimangano sincronizzati.

---

## Conferma dello strumento

Goa-AI supporta gate di conferma **forzati a tempo di esecuzione** per gli strumenti sensibili (scritture, cancellazioni, comandi).

È possibile abilitare la conferma in due modi:

- **Design-time (caso comune):** dichiarare `Confirmation(...)` all'interno del DSL dello strumento. Codegen memorizza
  il criterio in `tools.ToolSpec.Confirmation`.
- **Runtime (sovrascrittura/dinamica):** passare `runtime.WithToolConfirmation(...)` quando si costruisce il runtime
  per richiedere la conferma di strumenti aggiuntivi o per sovrascrivere il comportamento in fase di progettazione.

Al momento dell'esecuzione, il flusso di lavoro emette una richiesta di conferma fuori banda ed esegue lo strumento solo dopo che è stata fornita un'approvazione
solo dopo aver ricevuto un'approvazione esplicita. In caso di rifiuto, il runtime sintetizza uno strumento conforme allo schema
di uno strumento conforme allo schema, in modo che la trascrizione rimanga valida e il pianificatore possa reagire in modo deterministico.

### Protocollo di conferma

In fase di runtime, la conferma è implementata come un protocollo di attesa/decisione dedicato:

- **Carico di attesa** (trasmesso come `await_confirmation`):

  ```json
  {
    "id": "...",
    "title": "...",
    "prompt": "...",
    "tool_name": "atlas.commands.change_setpoint",
    "tool_call_id": "toolcall-1",
    "payload": { "...": "canonical tool arguments (JSON)" }
  }
  ```

- **Provvedere alla decisione** (tramite `ProvideConfirmation` sul runtime):

  ```go
  err := rt.ProvideConfirmation(ctx, interrupt.ConfirmationDecision{
      RunID:       "run-123",
      ID:         "await-1",
      Approved:    true,              // or false
      RequestedBy: "user:123",
      Labels:      map[string]string{"source": "front-ui"},
      Metadata:    map[string]any{"ticket_id": "INC-42"},
  })
  ```

### Eventi di autorizzazione dello strumento

Quando viene fornita una decisione, il runtime emette un evento di autorizzazione di primo ordine:

- **Hook event**: `hooks.ToolAuthorization`
- **Stream event type**: `tool_authorization`

Questo evento è il record canonico “chi/quando/cosa” per una chiamata tool confermata:

- `tool_name`, `tool_call_id`
- `approved` (true/false)
- `summary` (riepilogo deterministico renderizzato dal runtime)
- `approved_by` (copiato da `interrupt.ConfirmationDecision.RequestedBy`, identificatore di principal stabile)

L’evento viene emesso immediatamente dopo la ricezione della decisione (prima dell’esecuzione del tool se approvato e prima della sintesi del risultato negato se rifiutato).

Note:

- I consumatori devono trattare la conferma come un protocollo di runtime:
  - Utilizzare il motivo che accompagna `RunPaused` (`await_confirmation`) per decidere quando visualizzare un'interfaccia utente di conferma.
  - Non associare il comportamento dell'interfaccia utente a un nome specifico di strumento di conferma; trattarlo come un dettaglio di trasporto interno.
- I modelli di conferma (`PromptTemplate` e `DeniedResultTemplate`) sono stringhe Go `text/template`
  eseguite con `missingkey=error`. Oltre alle funzioni standard dei template (ad esempio `printf`),
  Goa-AI fornisce:
  - `json v` → codifica JSON `v` (utile per i campi opzionali dei puntatori o per incorporare valori strutturati).
  - `quote s` → restituisce una stringa quotata Go-escaped (come `fmt.Sprintf("%q", s)`).

### Convalida in fase di esecuzione

Il runtime convalida le interazioni di conferma al confine:

- La conferma `ID` corrisponde all'identificatore dell'attesa, se fornito.
- L'oggetto decisione è ben formato (valore non vuoto `RunID`, booleano `Approved`).

---

## Contratto del pianificatore

I pianificatori attuano:

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` contiene le chiamate allo strumento, la risposta finale, le annotazioni e l'opzione `RetryHint`. Il runtime fa rispettare i tappi, pianifica le attività dello strumento e alimenta i risultati dello strumento in `PlanResume` finché non viene prodotta una risposta finale.

I pianificatori ricevono anche un `PlannerContext` tramite `input.Agent` che espone i servizi del runtime:
- `ModelClient(id string)` - ottenere un client di modello indipendente dal provider
- `RenderPrompt(ctx, id, data)` - risolvere e renderizzare il contenuto prompt per lo scope corrente della run
- `AddReminder(r reminder.Reminder)` - registrare promemoria di sistema di runscope
- `RemoveReminder(id string)` - cancellare i promemoria quando le precondizioni non sono più valide
- `Memory()` - accedere alla cronologia delle conversazioni

---

## Moduli funzionali

- `features/mcp/*` - Chiamate DSL/codegen/runtime della suite MCP (HTTP/SSE/stdio)
- `features/memory/mongo` - archivio di memoria durevole
- `features/prompt/mongo` - prompt store Mongo per override dei prompt
- `features/runlog/mongo` - archivio di eventi di esecuzione (append-only, paginazione per cursor)
- `features/session/mongo` - archivio dei metadati di sessione
- `features/stream/pulse` - Aiutanti di Pulse sink/subscriber
- `features/model/{anthropic,bedrock,openai}` - adattatori client di modelli per pianificatori
- `features/model/middleware` - middleware condivisi `model.Client` (ad esempio, limitazione della velocità adattiva)
- `features/policy/basic` - semplice motore di policy con elenchi di permessi/bloccati e gestione dei suggerimenti per i tentativi di risposta

### Modellare il throughput del cliente e il rate limiting

Goa-AI fornisce un limitatore di velocità adattivo indipendente dal provider sotto `features/model/middleware`. Esso avvolge qualsiasi `model.Client`, stima i token per richiesta, accoda i chiamanti utilizzando un bucket di token e regola il suo budget effettivo di token al minuto utilizzando una strategia di aumento/moltiplicazione/decremento (AIMD) quando i provider segnalano il throttling.

```go
import (
    "goa.design/goa-ai/features/model/bedrock"
    mdlmw "goa.design/goa-ai/features/model/middleware"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
bed, _ := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "us.anthropic.claude-4-5-sonnet-20251120-v1:0",
}, ledger)

rl := mdlmw.NewAdaptiveRateLimiter(
    ctx,
    throughputMap,       // *rmap.Map joined earlier (nil for process-local)
    "bedrock:sonnet",    // key for this model family
    80_000,              // initial TPM
    1_000_000,           // max TPM
)
limited := rl.Middleware()(bed)

rt := runtime.New(runtime.Options{
    // Register limited as the model client exposed to planners.
})
```

---

## Integrazione LLM

I pianificatori Goa-AI interagiscono con i modelli linguistici di grandi dimensioni attraverso un'interfaccia **agnostica rispetto ai provider**. Questo design consente di cambiare i provider - Bedrock di AWS, OpenAI o endpoint personalizzati - senza modificare il codice del pianificatore.

### L'interfaccia model.Client

Tutte le interazioni con LLM passano attraverso l'interfaccia `model.Client`:

```go
type Client interface {
    Complete(ctx context.Context, req *Request) (*Response, error)
    Stream(ctx context.Context, req *Request) (Streamer, error)
}
```

### Adattatori del provider

Goa-AI viene fornito con adattatori per i più diffusi provider LLM:

**AWS Bedrock**

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/features/model/bedrock"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
modelClient, err := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    HighModel:    "anthropic.claude-sonnet-4-20250514-v1:0",
    SmallModel:   "anthropic.claude-3-5-haiku-20241022-v1:0",
    MaxTokens:    4096,
    Temperature:  0.7,
}, ledger)
```

**OpenAI**

```go
import "goa.design/goa-ai/features/model/openai"

modelClient, err := openai.NewFromAPIKey(apiKey, "gpt-4o")
```

### Utilizzo dei client modello nei pianificatori

I pianificatori ottengono i client di modello attraverso il runtime `PlannerContext`:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    
    req := &model.Request{
        RunID:    input.Run.RunID,
        Messages: input.Messages,
        Tools:    input.Tools,
        Stream:   true,
    }
    
    streamer, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    defer streamer.Close()
    
    // Drain stream and build response...
}
```

Il runtime avvolge il sottostante `model.Client` con un client decorato da eventi che emette eventi del pianificatore (blocchi di pensiero, pezzi di assistente, utilizzo) mentre si legge dal flusso.

### Cattura automatica degli eventi

Il runtime cattura automaticamente gli eventi in streaming dai client del modello, eliminando la necessità per i pianificatori di emettere manualmente gli eventi. Quando si chiama `input.Agent.ModelClient(id)`, il runtime restituisce un client decorato che:

- Emette eventi `AssistantChunk` per il contenuto testuale durante la lettura dal flusso
- Emette eventi `PlannerThinkingBlock` per il contenuto di ragionamento e di pensiero
- Emette eventi `UsageDelta` per le metriche di utilizzo dei token

Questa decorazione avviene in modo trasparente:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    // ModelClient returns a decorated client that auto-emits events
    mc := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    
    streamer, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    defer streamer.Close()
    
    // Simply drain the stream - events are emitted automatically
    var text strings.Builder
    var toolCalls []model.ToolCall
    for {
        chunk, err := streamer.Recv()
        if errors.Is(err, io.EOF) {
            break
        }
        if err != nil {
            return nil, err
        }
        // Process chunk for your planner logic
        // Events are already emitted by the decorated client
    }
    // ...
}
```

**Importante**: Se è necessario usare `planner.ConsumeStream`, ottenere un `model.Client` grezzo, non avvolto dal runtime. Mescolando il client decorato con `ConsumeStream` si otterrà una doppia emissione di eventi.

### Convalida dell'ordinamento dei messaggi di Bedrock

Quando si usa AWS Bedrock con la modalità di pensiero abilitata, il runtime convalida i vincoli di ordine dei messaggi prima di inviare le richieste. Bedrock richiede:

1. Qualsiasi messaggio di assistenza contenente `tool_use` deve iniziare con un blocco di riflessione
2. Ogni messaggio utente contenente `tool_result` deve seguire immediatamente un messaggio assistente con blocchi corrispondenti `tool_use`
3. Il numero di blocchi `tool_result` non può superare il numero precedente `tool_use`

Il client Bedrock convalida questi vincoli in anticipo e restituisce un errore descrittivo se violati:

```
bedrock: invalid message ordering with thinking enabled (run=xxx, model=yyy): 
bedrock: assistant message with tool_use must start with thinking
```

Questa convalida assicura che la ricostruzione del libro mastro trascritto produca sequenze di messaggi conformi al fornitore.

---

## Passi successivi

- Conoscere [Toolsets](./toolsets/) per comprendere i modelli di esecuzione degli strumenti
- Esplorare [Agent Composition](./agent-composition/) per i modelli di agenti come strumenti
- Leggere [Memoria e sessioni](./memory-sessions/) per la persistenza delle trascrizioni
