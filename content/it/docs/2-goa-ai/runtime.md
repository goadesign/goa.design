---
title: "Tempo di esecuzione"
linkTitle: "Tempo di esecuzione"
weight: 3
description: "Understand how the Goa-AI runtime orchestrates agents, enforces policies, and manages state."
llm_optimized: true
aliases:
---

## Panoramica dell'architettura

Il runtime Goa-AI orchestra il ciclo plan/execute/resume, applica le policy,
gestisce lo stato e coordina engine, planner, strumenti, memoria, hook e moduli
funzionali.

| Strato | Responsabilità |
| --- | --- |
| DSL + Codegen | Produrre i registri degli agenti, le specifiche/codici degli strumenti, i flussi di lavoro, gli adattatori MCP
| Runtime Core | Orchestrano il ciclo di pianificazione/avvio/ripresa, l'applicazione delle politiche, gli hook, la memoria, lo streaming |
| Workflow Engine Adapter | L'adattatore temporale implementa `engine.Engine`; altri motori possono essere collegati |
| Archivio del runtime host | Salva insieme ambito della sessione, stato dell’esecuzione, checkpoint e record immutabili |
| Moduli di funzionalità | Integrazioni opzionali (MCP, Pulse, negozi Mongo, fornitori di modelli) |

---

## Architettura agenziale di alto livello

In fase di esecuzione, Goa-AI organizza il sistema attorno a un piccolo insieme di costrutti componibili:

- **Agenti**: Orchestratori di lunga durata identificati da `agent.Ident` (ad esempio, `service.chat`). Ogni agente possiede un pianificatore, una politica di esecuzione, flussi di lavoro generati e registrazioni di strumenti.

- **Esecuzioni**: Una singola esecuzione di un agente. Le esecuzioni sono identificate da un `RunID` e tracciate tramite `run.Context` e `run.Handle`. Le esecuzioni con sessione sono raggruppate da `SessionID` e `TurnID` per formare conversazioni; le esecuzioni one-shot sono esplicitamente senza sessione.

- **Toolsets e strumenti**: Raccolte nominate di funzionalità, identificate da `tools.Ident` (`service.toolset.tool`). Gli insiemi di strumenti supportati da servizi chiamano le API; gli insiemi di strumenti supportati da agenti eseguono altri agenti come strumenti.

- **Completion**: contratti tipizzati di proprietà del servizio per l'output
  finale diretto dell'assistente, generati in `gen/<service>/completions`. Gli
  helper collegano lo structured output imposto dal provider alle richieste
  unary e di streaming diretto, quindi decodificano il payload canonico con i
  codec generati.

- **Planner**: il livello strategico guidato dall'LLM che implementa
  `PlanStart` / `PlanResume`. I planner decidono quando chiamare strumenti o
  rispondere direttamente; il runtime applica limiti e budget temporali.

- **Albero di esecuzione e agente come strumento**: Quando un agente chiama un altro agente come strumento, il runtime avvia una vera e propria esecuzione figlia con il proprio `RunID`. Il genitore `ToolResult` porta un `RunLink` (`*run.Handle`) che punta al figlio e viene emesso un evento di streaming `child_run_linked` per correlare la chiamata dello strumento genitore con il `RunID` figlio.

- **Flussi e profili**: Goa-AI pubblica valori `stream.Event` tipizzati in uno **stream di proprietà della sessione** (`session/<session_id>`). Gli eventi includono `RunID` e `SessionID` e il runtime emette `run_stream_end` come marcatore esplicito per chiudere SSE/WebSocket senza timer. `stream.StreamProfile` seleziona quali tipi di eventi sono visibili per un determinato pubblico (chat UI, debug, metriche).

---

## Avvio rapido

```go
package main

import (
    "context"
    "time"

    chat "example.com/assistant/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/runtime"
    storageinmem "goa.design/goa-ai/runtime/agent/storage/inmem"
)

func main() {
    // In-memory engine is the default; pass WithEngine for Temporal or custom engines.
    store := storageinmem.New()
    rt := runtime.New(store)
    ctx := context.Background()
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: newChatPlanner()})
    if err != nil {
        panic(err)
    }

    // Sessions are first-class: create a session before starting runs under it.
    if _, err := store.CreateSession(ctx, "session-1", time.Now().UTC()); err != nil {
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

## Completion dirette tipizzate

Non tutte le interazioni strutturate devono essere modellate come chiamate a
strumenti. Quando un servizio richiede una risposta finale tipizzata
dell'assistente, dichiarare `Completion(...)` nel DSL e rigenerare.

`goa gen` emette `gen/<service>/completions` con tipi di risultato e unioni,
schemi e codec privati, helper `Complete<Name>(ctx, client, req)`, helper
`StreamComplete<Name>(ctx, client, req)` e `<Name>Example()` quando il
risultato radice ha un `Example(...)` dichiarato. Un servizio può dichiarare
completion senza dichiarare alcun `Agent(...)`.

Gli helper clonano la richiesta, allegano metadati neutrali rispetto al
provider, chiamano il `model.Client` e decodificano il payload tipizzato:

```go
resp, err := taskcompletion.CompleteDraftFromTranscript(ctx, modelClient, &model.Request{
    Messages: []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Create a startup investigation task."}},
    }},
})
if err != nil {
    panic(err)
}

fmt.Println(resp.Value.Name)
```

Ogni `model.StructuredOutput` di basso livello richiede un nome non vuoto. Gli
helper generati lo derivano dal DSL validato. Una completion unary effettua
esattamente una chiamata al modello. Un JSON non valido restituisce
`planner.OutputContractError`, non riprovabile, e una risposta nil; non avvia
mai una richiesta di correzione. In caso di successo,
`resp.ModelResponse` contiene la risposta esatta del provider e l'uso dei
token.

Le completion in streaming restituiscono `completion.Streamer[T]`. `Recv`
espone frammenti di anteprima; `Value()` resta indisponibile finché lo stream
non termina e la risposta terminale non concorda con la completion finale:

```go
stream, err := taskcompletion.StreamCompleteDraftFromTranscript(ctx, modelClient, &model.Request{
    Messages: []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Create a startup investigation task."}},
    }},
})
if err != nil {
    panic(err)
}
defer stream.Close()

for {
    chunk, err := stream.Recv()
    if errors.Is(err, io.EOF) {
        break
    }
    if err != nil {
        panic(err)
    }
    // Render preview completion_delta chunks here when useful.
    _ = chunk
}
value, ok := stream.Value()
if !ok {
    panic("completion stream ended without a typed value")
}
fmt.Println(value.Name)
```

I nomi delle completion sono validati al confine DSL: 1-64 caratteri ASCII,
solo lettere, cifre, `_` e `-`, con inizio alfanumerico. Gli helper rifiutano
richieste con strumenti o `StructuredOutput` fornito dal chiamante. Il wrapper
espone `Value()` solo dopo fine stream pulita e validazione completa. I
provider senza structured output restituiscono
`model.ErrStructuredOutputUnsupported`.

---

## Solo client vs. Lavoratore

Due ruoli utilizzano il runtime:

- **Solo cliente** (invia le esecuzioni): Costruisce un runtime con un motore compatibile con i client e non registra agenti. Usa il generato `<agent>.NewClient(rt)` che trasporta il percorso (flusso di lavoro + coda) registrato dai lavoratori remoti.
- **Worker** (esegue esecuzioni): Costruisce un runtime con un motore capace di lavorare, registra gli agenti (con pianificatori reali) e lascia che il motore esegua il polling e i flussi di lavoro/attività.

### Esempio solo client

```go
rt := runtime.New(runtimeStore, runtime.WithEngine(temporalClient)) // engine client

// The host session service has already created "s1".
// No agent registration is needed in a caller-only process.
client := chat.NewClient(rt)
out, err := client.Run(ctx, "s1", msgs)
```

### Run one-shot senza sessione

Usa `StartOneShot` e `OneShotRun` quando vuoi lavoro durevole che non sia associato a una sessione esistente.

- `Start` / `Run` sono con sessione: richiedono un `SessionID` concreto, partecipano al lifecycle della sessione ed emettono eventi di stream con scope di sessione.
- `StartOneShot` / `OneShotRun` sono senza sessione: non accettano `SessionID`, non ne creano uno e aggiungono solo eventi canonici al run log per l'ispezione tramite `RunID`.
- L’applicazione host crea le sessioni prima del lavoro; i runtime degli agenti non creano, terminano o eliminano sessioni.
- Il motore accetta un workflow radice prima che la prima activity registri l’esecuzione. Nessuno stato `pending` viene creato prima dell’ammissione.
- Gli avvii radice, figlio e one-shot sono operazioni distinte. L’avvio figlio salva il collegamento al padre; one-shot salva metadati completi senza sessione.
- Il motivo di annullamento è write-once. Una ripetizione identica riesce; un motivo diverso produce un conflitto.
- Sospensione e termine salvano il nuovo stato insieme al record immutabile corrispondente.
- `StartOneShot` restituisce subito un `engine.WorkflowHandle`. `OneShotRun` è il wrapper bloccante che chiama `handle.Wait(ctx)` per te.

```go
client := chat.NewClient(rt)

handle, err := client.StartOneShot(ctx, msgs,
    runtime.WithRunID("run-123"),
    runtime.WithLabels(map[string]string{"tenant": "acme"}),
)
if err != nil {
    panic(err)
}

out, err := handle.Wait(ctx)
if err != nil {
    panic(err)
}

fmt.Println(out.RunID)
```

## Esempio di worker

```go
eng, err := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{HostPort: "temporal:7233", Namespace: "default"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "orchestrator.chat"},
})
if err != nil {
    panic(err)
}
defer eng.Close()

rt := runtime.New(runtimeStore, runtime.WithEngine(eng))
if err := chat.RegisterUsedToolsets(ctx, rt /* executors... */); err != nil {
    panic(err)
}
if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner}); err != nil {
    panic(err)
}
if err := rt.Seal(ctx); err != nil {
    panic(err)
}
```

---

## Ciclo Pianifica → Esegui → Riprendi

1. Il motore accetta un workflow per l'agente, in memoria o in Temporal.
2. La prima activity salva l'identità e il primo record permanente tramite
   `StartRootRun`, `StartChildRun`, `StartOneShotRun` o
   `StartOneShotChildRun`. Ogni workflow accettato salva `RunStarted`.
3. Il runtime chiama `PlanStart` con i messaggi e un `run.Context` contenente
   `RunID`, `SessionID`, `TurnID`, etichette e limiti di policy.
4. Pianifica le chiamate agli strumenti usando i codec generati.
5. Chiama `PlanResume` con gli output che restano visibili al planner. Gli
   strumenti con budget sono visibili per impostazione predefinita. Un errore
   di uno strumento di bookkeeping pianifica un altro turno secondo
   `ToolFailure.Recovery.Action`: correzione, nuova pianificazione senza quello
   strumento oppure finalizzazione. Il ciclo continua finché il planner
   restituisce una risposta finale, un risultato finale oppure uno strumento
   `TerminalRun` riesce. Se limiti o deadline impongono la finalizzazione, il
   planner può chiudere tramite strumenti terminali di bookkeeping.
6. I ganci e i sottoscrittori del flusso emettono eventi (pensieri del pianificatore, avvio/aggiornamento/fine dello strumento, attese, utilizzo, flusso di lavoro, collegamenti tra agenti e corse) e, se configurati, persistono le voci di trascrizione e i metadati della corsa.

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

- **Status** (`running`, `suspended`, `completed`, `failed`, `canceled`) è lo stato del ciclo di vita a grana grossa memorizzato nei metadati durevoli dell'esecuzione. Non esiste uno stato `pending` prima dell’ammissione.
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

**Identità terminale**

`RunCompleted` include `Labels`: le etichette con ambito di run fornite
all'avvio della run (`RunInput.Labels`, impostate con
`runtime.WithLabels(...)`), nil quando la run non ne aveva. I sottoscrittori di
completamento possono attribuire l'esito terminale — success, failed o
canceled — senza mantenere una propria mappa da run-ID a identità. Le stesse
etichette sono esposte su `run.Snapshot.Labels` per i lettori in polling,
ricostruite dal record durevole `RunStarted`, così l'identità della run
sopravvive ai riavvii del processo su entrambi gli engine. Le etichette unite
dalle decisioni di policy a metà run non sono incluse; restano osservabili
tramite gli eventi `PolicyDecision`.

---

## Politiche, cappucci ed etichette

## Politica di esecuzione in tempo di progettazione

In fase di progettazione, si configurano le politiche per agente con `RunPolicy`:

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxRecoveryTurns(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
    })
})
```

Questo diventa un `runtime.RunPolicy` allegato alla registrazione dell'agente:

- **Limiti**: `MaxToolCalls` limita il numero totale di chiamate agli strumenti con budget per ogni esecuzione. `MaxRecoveryTurns` limita le nuove chiamate al pianificatore dopo il rifiuto del risultato di uno strumento o di una risposta del modello. Una chiamata riuscita a uno strumento con budget reimposta questo limite. Gli strumenti `Bookkeeping()` non consumano nessuno dei due budget.
- **Bilancio di tempo**: `TimeBudget` - budget di tempo per la corsa. `FinalizerGrace` (solo per la corsa) - finestra riservata opzionale per la finalizzazione.
- **Interruzioni**: `InterruptsAllowed` - opt-in per pausa/ripresa.
- **Completamento terminale del run**: gli strumenti dichiarati `TerminalRun()` diventano automaticamente bookkeeping e chiudono il run dopo una chiamata riuscita, senza un turno `PlanResume` successivo. Un commit terminale può quindi essere ammesso senza budget di retrieval residuo. Durante la finalizzazione forzata, il runtime ammette solo chiamate terminali di bookkeeping, le esegue nella finestra restante dell'hard deadline e chiude il run solo se ogni effetto terminale riesce. Prima dell'esecuzione, il runtime scrive l'esatto `planner.TerminationReason` in `runtime.FinalizationReasonLabel` (`goa-ai.finalization_reason`). Etichette del run o della policy e output del planner o del modello non possono scegliere né sostituire questo valore; le chiamate ordinarie non lo ricevono.

  I consumer di chiamate terminali dovute a limiti fissi o scelte dal planner,
  incluso `tool_failure`, usano `runtime.FinalizationReasonLabel`. Distribuire
  insieme consumer e worker quando cambia questo contratto di esecuzione.
- **Comportamento dei campi mancanti**: `OnMissingFields` - regola cosa succede quando la validazione indica campi mancanti.

### Sovrascritture dei criteri di runtime

In alcuni ambienti si può desiderare di rendere più rigide o meno rigide le politiche senza modificare il progetto. L'API `rt.OverridePolicy` consente di modificare i criteri a livello locale:

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxRecoveryTurns: 1,
    InterruptsAllowed:             true,
})
```

**Ambito di applicazione**: Le sovrascritte sono locali all'istanza del runtime corrente e hanno effetto solo sulle esecuzioni successive. Non persistono nei riavvii del processo e non si propagano ad altri worker.

**Campi sovrascrivibili**:

| Campo | Descrizione |
| --- | --- |
| `MaxToolCalls` | Chiamate massime agli strumenti *con budget* per esecuzione (gli strumenti `Bookkeeping()` sono esenti) |
| `MaxRecoveryTurns` | Nuove chiamate al pianificatore dopo un output rifiutato |
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

Goa-AI si integra con motori di policy collegabili tramite `policy.Engine`. Le
policy ricevono i metadati degli strumenti (ID, tag), il contesto di esecuzione
(`SessionID`, `TurnID`, etichette) e il `ToolFailure` strutturato dopo
un'esecuzione fallita.

Le etichette confluiscono in:
- `run.Context.Labels` - disponibili per i pianificatori durante una sessione
- input dell'attività di tool (`api.ToolInput.Labels`) – clonato nelle
  esecuzioni inviate; le chiamate di finalizzazione ricevono anche il motivo
  di proprietà del runtime in `runtime.FinalizationReasonLabel`
- **L’archivio del runtime** (`storage.Store`) aggiunge record immutabili per `RunID`. I metodi del ciclo di vita salvano stato, checkpoint o annullamento insieme al record corrispondente.
- completamento terminale e snapshot - le etichette iniziali riemergono alla fine della run su `hooks.RunCompletedEvent.Labels` e `run.Snapshot.Labels`, così gli hook di completamento e i lettori di `GetRunSnapshot` recuperano l'identità della run senza tracciamento fuori banda

Usa `WithRestrictToTool` quando un flusso di correzione deve esporre esattamente
uno strumento:

```go
out, err := client.Run(ctx, "session-1", messages,
    runtime.WithRestrictToTool(searchspecs.Search),
)
```

Questa policy dell'applicazione vale per l'intera esecuzione. Gli errori degli
strumenti usano un contratto distinto: `ToolFailure.Recovery.Action` sceglie la
correzione, una nuova pianificazione o la conclusione, e il runtime impone il
catalogo risultante nel turno successivo.

---

## Esecuzione dello strumento

- **Set di strumenti nativi**: L'utente scrive le implementazioni; il runtime gestisce la decodifica degli argomenti digitati utilizzando i codec generati
- **Agent-as-tool**: Gli strumenti agent-tool generati eseguono gli agenti provider come esecuzioni figlio (in linea dal punto di vista del pianificatore) e adattano il loro `RunOutput` in un `planner.ToolResult` con un handle `RunLink` all'esecuzione figlio
- **Mcp toolsets**: Il runtime inoltra il JSON canonico ai chiamanti generati; i chiamanti gestiscono il trasporto

### Tool payload defaults

Tool payload decoding follows Goa’s **decode-body → transform** pattern and applies Goa-style defaults deterministically for tool payloads.

See **[Tool Payload Defaults](tool-payload-defaults/)** for the contract and codegen invariants.

### Risultati degli strumenti delimitati

Gli strumenti paginati dichiarano `BoundedResult(...)`. Il provider imposta il
proprio cursor privato in `Bounds.NextCursor`; il runtime espone al modello un
riferimento breve legato a run, sessione e strumento. La chiamata successiva
contiene solo quel riferimento nel campo cursor. Il runtime ne verifica validità
e ambito, ripristina gli argomenti originali e inserisce il cursor privato prima
dell'esecuzione. Il riferimento non può essere riutilizzato né spostato su
un'altra sessione o un altro strumento.

## Contratti runtime dei prompt

La gestione dei prompt e nativa del runtime e versionata:

- `runtime.PromptRegistry` conserva registrazioni immutabili delle prompt spec baseline (`prompt.PromptSpec`).
- `runtime.WithPromptStore(prompt.Store)` abilita la risoluzione degli override con scope (`session` -> `facility` -> `org` -> global).
- I planner chiamano `PlannerContext.RenderPrompt(ctx, id, data)` per risolvere e rendere il contenuto.
- Il contenuto renderizzato include metadati `prompt.PromptRef` per provenance; i planner possono allegarli a `model.Request.PromptRefs`.

```go
content, err := input.Agent.RenderPrompt(ctx, "assistant.system", map[string]any{
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

`PromptRefs` indica quali versioni renderizzate dei prompt hanno influenzato una richiesta; non fa parte del payload del provider. Il runtime lo deriva dai record `prompt_rendered` e dai collegamenti padre-figlio, senza mantenere una seconda lista che possa divergere.

Il rendering non scrive mai nello storage del runtime. Tutti i percorsi usano
`prompt.RenderRecorder` per creare lo stesso `prompt.RenderEvent` con ID,
versione e ambito del prompt risolto:

- il codice dell’applicazione che renderizza i messaggi iniziali passa
  `recorder.Events()` tramite `runtime.WithRenderedPrompts` insieme a quei
  messaggi;
- le activity del pianificatore restituiscono i propri eventi con il risultato;
- la preparazione del prompt di un agente figlio avviene in una activity e
  restituisce il testo renderizzato e i suoi eventi nell’input del figlio;
- `RunOneShot` registra i rendering eseguiti dal proprio callback.

Il workflow salva ogni evento accettato come lo stesso record
`PromptRendered`. Il percorso iniziale non applica una regola di rendering
diversa: consegna soltanto un evento creato prima dell’avvio del workflow. La
preparazione del figlio avviene in una activity così il replay di Temporal
riutilizza testo ed eventi già presenti nella cronologia, senza leggere una
versione più recente del prompt.
`RenderRecorder.Events` restituisce i rendering completati in un ordine stabile
per ID del prompt, versione, sessione e ambito. L’ordine di completamento di
rendering concorrenti non può quindi cambiare la richiesta esatta di avvio del
workflow.

---

## Memoria, flusso, telemetria

- **Hook bus** pubblica eventi strutturati per l'intero ciclo di vita: avvio e completamento del run, cambi di fase, `prompt_rendered`, pianificazione/risultati/aggiornamenti degli strumenti, note e thinking del planner, attese, direttive di recupero `ToolFailure` e collegamenti agent-as-tool.

- i **Memory Store** (`memory.Store`) sottoscrivono e aggiungono eventi di memoria durevoli (messaggi di utenti/assistenti, chiamate agli strumenti, risultati degli strumenti, note del pianificatore, riflessioni) per `(agentID, RunID)`.

- i **Run event stores** (`storage.Store`) aggiungono il log canonico degli eventi hook per `RunID` per UI audit/debug e introspezione.

- gli **Stream sinks** (`stream.Sink`, ad esempio Pulse o SSE/WebSocket personalizzati) ricevono i valori `stream.Event` tipizzati prodotti dallo `stream.Subscriber`. Un `StreamProfile` controlla quali tipi di eventi vengono emessi.

- **Telemetria**: La registrazione, le metriche e la tracciabilità dei flussi di lavoro e delle attività da un capo all'altro di OTEL.

### Suggerimenti per le chiamate ai tool (DisplayHint)

Le chiamate ai tool possono includere un `DisplayHint` rivolto all'utente (ad esempio per UI).

Contratto:

- I costruttori di hook non renderizzano suggerimenti. Gli eventi di pianificazione dei tool hanno `DisplayHint==""` per impostazione predefinita.
- Il runtime arricchisce e persiste un suggerimento di chiamata **duraturo** al momento della pubblicazione a partire dal template tipizzato quando la decodifica del payload riesce.
- La registrazione dei tool richiede un titolo di metadati non vuoto. Se la decodifica tipizzata fallisce o non è registrato alcun template, il runtime usa quel titolo come display hint. I payload malformati continuano a fallire al confine del tool; il titolo di metadati serve solo a mantenere renderizzabile il lavoro tentato. I suggerimenti non vengono mai renderizzati a partire da JSON grezzo.
- Se un producer imposta esplicitamente `DisplayHint` (non vuoto) prima di pubblicare l'evento hook, il runtime lo considera autorevole e non lo sovrascrive.
- Per variazioni per-consumer (ad esempio testo UI), configurare `runtime.WithHintOverrides` sul runtime. Gli override hanno la precedenza sui template DSL per gli eventi `tool_start` streammati.

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
- **Temporal**: esecuzione durevole, replay, retry delle activity, segnali e worker; gli adattatori collegano le activity e propagano il contesto

I workflow degli agenti Goa-AI hanno un solo tentativo. Il runtime ritenta le
singole activity quando il loro contratto lo permette, ma non riavvia mai un
intero workflow dell’agente dopo un errore. Un riavvio completo potrebbe
ripetere gli effetti dei tool o entrare in conflitto con il record finale già
salvato dal primo tentativo.

### Temporizzazione semantica vs liveness di Temporal

Goa-AI mantiene il contratto pubblico del runtime indipendente dal motore:

- `RunPolicy.Timing.Plan` e `RunPolicy.Timing.Tools` sono budget semantici per tentativo
- `runtime.WithTiming(...)` sostituisce tali budget semantici per una run
- I client generati usano la coda predefinita dell'agente. Passa
  `runtime.WithTaskQueue("orchestrator.chat")` a una chiamata `Start` o `Run`
  quando una singola esecuzione deve usare un'altra coda

Se si usa l'adattatore Temporal e occorre regolare l'attesa in coda o la
liveness, queste impostazioni vanno configurate direttamente sul motore
Temporal:

```go
eng, err := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "temporal:7233",
        Namespace: "default",
    },
    WorkerOptions: temporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
    ActivityDefaults: temporal.ActivityDefaults{
        Planner: temporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 30 * time.Second,
            LivenessTimeout:  20 * time.Second,
        },
        Tool: temporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 2 * time.Minute,
            LivenessTimeout:  20 * time.Second,
        },
    },
})
if err != nil {
    panic(err)
}
```

Questa separazione tiene la meccanica del workflow dietro il confine di
Temporal, mentre il runtime generico resta coerente sia con Temporal sia con il
motore in memoria.

### Contratti dell’adattatore di storage e completamento

Il runtime registra una sola activity tipizzata chiamata `runtime.store`. Ogni
`StorageActivityCommand` imposta esattamente uno tra `Append`, `RootStart`,
`ChildStart`, `OneShotStart`, `OneShotChildStart`, `Cancellation`, `Suspension`
e `Terminal`. Il
`StorageActivityResult` restituito imposta esattamente il campo corrispondente e
nessun altro. Uno storage personalizzato restituisce `storage.ContractError`
quando ripetere lo stesso comando non può riuscire. Gli errori temporanei del
database o della rete restano errori normali e possono essere ritentati.
`runtime.WithStorageActivityTimeout` imposta il timeout Start-to-Close
dell’activity e richiede un valore maggiore di zero.

`Engine.QueryRunCompletion` restituisce lo `Status` corrente dell’esecuzione.
Dopo la chiusura dell’esecuzione, lo stesso risultato contiene anche l’istante
stabile `CompletedAt` e l’`Output` finale o il `WorkflowError`. La riparazione
usa quell’istante, quindi ogni nuovo tentativo invia lo stesso timestamp.
L’errore separato del metodo indica che il motore non ha potuto recuperare
queste informazioni. Non esiste una query separata per lo stato.

La preparazione del prompt di un figlio restituisce esattamente un `Success` o
un `Failure`. Il successo contiene soltanto i messaggi e i dati dei prompt
renderizzati. Il workflow ricava l’identità dell’esecuzione figlia, della
sessione, del padre, dello strumento e delle etichette dalla chiamata originale
già registrata. Il motore in memoria copia e limita input e output e applica la
stessa politica di retry di Temporal.

---

## Contratti di esecuzione

- `SessionID` è richiesto per gli avvii con sessione. `Start` e `Run` falliscono rapidamente quando `SessionID` è vuoto o contiene solo spazi
- `StartOneShot` e `OneShotRun` sono esplicitamente senza sessione. Non richiedono né creano una sessione e non emettono eventi di stream con scope di sessione
- L’host crea le sessioni prima di inviare lavoro con sessione. I runtime degli agenti non creano, terminano o eliminano sessioni
- Il motore accetta un workflow radice prima che la prima activity salvi l’esecuzione. Il runtime non crea alcun record `pending` prima dell’accettazione
- Ripetere un avvio con lo stesso ID di esecuzione e la stessa richiesta
  restituisce il workflow accettato finché la sua cronologia resta
  interrogabile. Riutilizzare l’ID con input diverso viene rifiutato. Dopo la
  conservazione della cronologia, l’identità permanente del comando appartiene
  al servizio del prodotto, non a Goa-AI
- Gli avvii radice, figlio e one-shot usano operazioni distinte. L’avvio figlio salva il collegamento al padre; l’avvio one-shot salva metadati completi senza sessione
- Il primo motivo di annullamento non cambia. Un retry esatto riesce e un motivo diverso per la stessa esecuzione produce un conflitto
- La sospensione e il completamento salvano il nuovo stato insieme al record corrispondente, che non può più essere modificato
- Gli agenti devono essere registrati prima della prima esecuzione. Il runtime rifiuta la registrazione dopo l'invio della prima esecuzione con `ErrRegistrationClosed` per mantenere i lavoratori del motore deterministici
- Gli esecutori degli strumenti ricevono metadati espliciti per chiamata (`ToolCallMeta`) piuttosto che pescare valori da `context.Context`
- Non fare affidamento su fallback impliciti; tutti gli identificatori di dominio (esecuzione, sessione, turno, correlazione) devono essere passati esplicitamente

### Riparare un record finale mancante

I workflow normali ritentano le scritture di sospensione e completamento finché
lo storage del runtime non le accetta. Se la cronologia del motore è già chiusa
ma l’esecuzione salvata risulta ancora attiva, un operatore può chiamare
`Runtime.RepairRunCompletion(ctx, runID)`. Il comando verifica lo stato finale
del motore e invia la sospensione o il record finale mancante a un’operazione
di riparazione: `RepairRunSuspension` o `RepairRunTerminal`. Lo storage lo
scrive solo se l’esecuzione è ancora attiva; se
il workflow ha già salvato un altro record finale, quel record resta
autorevole.

I metodi di elenco e snapshot sono di sola lettura e non eseguono mai questa
riparazione. Il motore restituisce output ed errore del workflow separatamente
da un errore nel recupero del risultato. Gli errori di recupero vengono
restituiti all’operatore e non vengono mai salvati come errore finale del
workflow. Ripetere una riparazione già riuscita non modifica il risultato.

---

## Input esterno e continuazioni dei workflow

Ogni input utente accettato avvia un solo workflow principale per quel turno.
Il workflow termina con il risultato finale del turno oppure con una
sospensione per input esterno. Gli agenti annidati continuano a essere
workflow figli collegati.

Chiarimenti, domande strutturate, risultati di strumenti esterni e conferme
concludono con successo il workflow corrente. Il `RunOutput.Suspension`
restituito contiene la richiesta cui deve rispondere la UI o il sistema
esterno. Nessun workflow Temporal resta aperto mentre una persona decide.

Prima di terminare, Goa-AI salva il checkpoint privato sotto l'ID del run
completato. L'applicazione deve accettare atomicamente una sola risposta, quindi
avvia un nuovo workflow con l'ID del run precedente, un nuovo run ID, un nuovo
turn ID e una sola risposta tipizzata:

Se l'accettazione della risposta deve essere salvata insieme a dati del
prodotto, chiamare prima `PrepareContinuation`, confermare atomicamente entrambe
le modifiche e passare esattamente il valore preparato a `StartContinuation`.
Usare `Continue` solo quando non vi è una scrittura applicativa tra convalida e
invio al motore.

```go
next, err := client.Continue(
    ctx,
    "session-1",
    previous.RunID,
    "run-124",
    "turn-2",
    &api.PendingInputResponse{
        Clarification: &api.ClarificationAnswer{
            ID:     "clarify-device",
            Answer: "Device ID is ABC-123",
        },
    },
    nil, // impostazioni workflow facoltative per la nuova esecuzione
)
```

L’applicazione passa soltanto l’ID dell’esecuzione completata e la risposta
tipizzata. Goa-AI carica il checkpoint, ne convalida la versione e la richiesta
in attesa, ripristina i payload salvati con i codec generati correnti e riprende
la pianificazione. Il checkpoint resta privato nello storage del runtime.

L’unico formato accettato è `goa-ai.run-suspension.v7`. Goa-AI rifiuta tutte le
versioni precedenti invece di tentare di tradurle. Prima di accettare
continuazioni con il nuovo runtime, l’host deve migrare o rimuovere le
esecuzioni sospese che usano un formato precedente.

Quando una risposta completa una chiamata a un tool creata dal modello nel
workflow precedente, il nuovo evento `tool_end` contiene due identità:

- il normale ID di esecuzione identifica il nuovo workflow che ha ricevuto la
  risposta;
- `call_run_id` identifica il workflow precedente che ha emesso `tool_start`.

I consumer dello stream devono associare questi eventi con `call_run_id` e l’ID
della chiamata. Non devono cercare esecuzioni precedenti né supporre che la
chiamata e il risultato appartengano allo stesso workflow.

---

## Conferma dello strumento

Goa-AI supporta gate di conferma **forzati a tempo di esecuzione** per gli strumenti sensibili (scritture, cancellazioni, comandi).

È possibile abilitare la conferma in due modi:

- **Design-time (caso comune):** dichiarare `Confirmation(...)` all'interno del DSL dello strumento. Codegen memorizza
  il criterio in `tools.ToolSpec.Confirmation`.
- **Runtime (sovrascrittura/dinamica):** passare `runtime.WithToolConfirmation(...)` quando si costruisce il runtime
  per richiedere la conferma di strumenti aggiuntivi o per sovrascrivere il comportamento in fase di progettazione.

Durante l'esecuzione, il workflow emette una richiesta di conferma e termina
con una sospensione. La decisione accettata avvia un nuovo workflow. La
continuazione esegue lo strumento soltanto se approvato; in caso di rifiuto il
runtime sintetizza un risultato conforme allo schema, così trascrizione e
planner restano deterministici.

### Protocollo di conferma

In fase di runtime, la conferma è implementata come un protocollo di attesa/decisione dedicato:

- **Carico di attesa** (trasmesso come `await_confirmation`):

  ```json
  {
    "id": "...",
    "title": "...",
    "prompt": "...",
  "tool_name": "facility.commands.change_setpoint",
    "tool_call_id": "toolcall-1",
    "payload": { "...": "canonical tool arguments (JSON)" }
  }
  ```

Contratto:

- `payload` contiene sempre gli argomenti JSON canonici del tool per la chiamata in attesa. Se la chiamata viene approvata, sono questi gli argomenti che il runtime esegue.
- Le override di conferma possono personalizzare il prompt e il rendering del risultato negato, ma non introducono un canale separato di display payload e non cambiano il significato di `payload`.
- I prodotti che hanno bisogno di una UI di conferma più ricca devono materializzarla nel layer applicativo a partire dal payload canonico e da letture possedute dall’applicazione.

- **Risposta di continuazione**:

  ```go
  response := &api.PendingInputResponse{
      Confirmation: &api.ConfirmationDecision{
          ID:          "await-1",
          Approved:    true, // or false
          RequestedBy: "user:123",
          Labels:      map[string]string{"source": "front-ui"},
          Metadata:    map[string]any{"ticket_id": "INC-42"},
      },
  }
  ```

### Eventi di autorizzazione dello strumento

Quando viene fornita una decisione, il runtime emette un evento di autorizzazione di primo ordine:

- **Hook event**: `hooks.ToolAuthorization`
- **Stream event type**: `tool_authorization`

Questo evento è il record canonico “chi/quando/cosa” per una chiamata tool confermata:

- `tool_name`, `tool_call_id`
- `approved` (true/false)
- `summary` (riepilogo deterministico renderizzato dal runtime)
- `approved_by` (copiato da `api.ConfirmationDecision.RequestedBy`, identificatore di principal stabile)

L’evento viene emesso immediatamente dopo la ricezione della decisione (prima dell’esecuzione del tool se approvato e prima della sintesi del risultato negato se rifiutato).

Note:

- I consumatori devono trattare la conferma come un protocollo di runtime:
  - Visualizzare il primo elemento in attesa quando il suo tipo è
    `confirmation`, quindi inviare la decisione con `AgentClient.Continue`.
  - Non associare il comportamento dell'interfaccia utente a un nome specifico di strumento di conferma; trattarlo come un dettaglio di trasporto interno.
- I modelli di conferma (`PromptTemplate` e `DeniedResultTemplate`) sono stringhe Go `text/template`
  eseguite con `missingkey=error`. Oltre alle funzioni standard dei template (ad esempio `printf`),
  Goa-AI fornisce:
  - `json v` → codifica JSON `v` (utile per i campi opzionali dei puntatori o per incorporare valori strutturati).
  - `quote s` → restituisce una stringa quotata Go-escaped (come `fmt.Sprintf("%q", s)`).

### Convalida in fase di esecuzione

Il runtime convalida le interazioni di conferma al confine:

- La conferma `ID` corrisponde all'identificatore dell'elemento in attesa.
- La continuazione contiene esattamente una variante di risposta e una
  decisione ben formata.

---

## Contratto del pianificatore

I pianificatori attuano:

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` contiene chiamate agli strumenti, risposta finale, risultato finale
dello strumento, annotazioni e la transizione selezionata dopo gli strumenti.
`PlanResumeInput` indica al planner perché viene chiamato.

Le richieste create dal planner contengono soltanto l'intento di dominio. Usare
`planner.NewToolRequest(typedTool, payload)` per codificarne una. Quando si
inoltra una chiamata validata del provider, usare
`planner.ToolRequestFromModelCall(call)`: conserva l'ID di correlazione del
provider senza trasformarlo nell'ID di esecuzione del runtime. Il runtime valida
l'intero piano prima di assegnare gli ID di esecuzione o pubblicare eventi.

Questi contratti sono distinti:

| Contratto | Ambito | Significato |
| --- | --- | --- |
| `ToolSpec.Tags` | Uno strumento, per ogni run | Etichette piatte disponibili al filtro generico di policy e interfaccia utente. |
| `ToolSpec.Meta` | Uno strumento, per ogni run | Annotazioni generate e inerti la cui semantica appartiene al consumer denominato; i metadati da soli non cambiano il runtime. |
| `ToolSpec.Bookkeeping` | Uno strumento, per ogni run | La chiamata è un record di controllo durevole il cui successo non richiede un altro turno del planner. Non consuma budget di retrieval o di errori consecutivi. |
| `ToolSpec.TerminalRun` | Uno strumento, per ogni run | Il successo termina direttamente il run e implica automaticamente bookkeeping. |
| `ToolFailure.Recovery.Action` | Un risultato fallito | Sceglie la correzione sullo stesso strumento, una nuova pianificazione senza lo strumento fallito oppure la finalizzazione. |
| `PlanResult.SynthesizeAfterTools` | Un batch selezionato | Se il batch non contiene errori recuperabili, il turno successivo del planner deve rispondere. |
| `PlanResumeInput.SynthesisOnly` | Un'attività del planner | Restituire una risposta finale; le chiamate agli strumenti non sono valide. |
| `PlanResumeInput.Finalize` | Terminazione forzata dal runtime | Un limite o una deadline impedisce il lavoro normale. |

Il runtime sceglie il prossimo stato in quest'ordine:

| Passo completato | Stato successivo |
| --- | --- |
| Un limite o una deadline richiede la finalizzazione | Turno `Finalize` |
| Uno strumento `TerminalRun` è riuscito | Termine immediato |
| Un risultato fallito ha `AllowsToolTurn() == true` | Normale turno di riparazione |
| `SynthesizeAfterTools` è true | Turno `SynthesisOnly` |
| Altrimenti | Normale turno di continuazione |

In questo modo l'intento del planner non diventa una seconda policy di retry.
Un errore recuperabile viene riparato per primo; un batch finale riuscito o con
errore terminale passa alla sintesi. Il runtime rifiuta chiamate agli strumenti
restituite da un turno `SynthesisOnly`.

Ogni `ToolFailure` recuperabile seleziona anche una `Recovery.Action`:

- `correct_call` mantiene disponibile lo strumento che ha fallito e fornisce al
  turno successivo del planner l'input rifiutato, i problemi di validazione
  generati, le indicazioni sui campi e un esempio. Non richiede una chiamata
  sostitutiva per ogni errore. Il planner può combinare il lavoro, effettuare un
  numero qualsiasi di chiamate valide agli strumenti annunciati, attendere un
  input o rispondere usando le prove già raccolte.
- `replan` rimuove lo strumento che ha fallito dal turno successivo. Il planner
  può usare un altro strumento annunciato, attendere un input o rispondere.
- `finish` rimuove tutti gli strumenti e richiede una risposta finale basata
  sulle prove disponibili.

Il workflow possiede le prove di correzione mostrate al modello. Prima di
salvare l'errore nella cronologia, sostituisce input ed esempi forniti
dall'executor con la chiamata originale del provider e la specifica registrata.
Una continuazione creata dal runtime non ha input prodotto dal modello e non
può richiedere `correct_call`: in questo modo cursor privati e campi iniettati
non entrano in richieste successive. Le trascrizioni del modello correlano i
risultati con `ModelToolCallID`; attività, retry e record di esecuzione usano il
distinto `ToolCallID` del runtime.

Il runtime registra il catalogo esatto mostrato durante un turno di recupero e
rifiuta ogni chiamata eseguibile che non ne faccia parte, incluse le chiamate
incorporate in una richiesta di input utente o esterno. I codec generati
continuano a validare ogni payload e i limiti di strumenti, errori e tempo del
run continuano a interrompere il lavoro non valido ripetuto. Se un turno di
recupero attende un input, le prove dell'errore restano disponibili alla
ripresa; la scelta di una chiamata o di una risposta finale le elimina.

Gli input delle attività di recupero e il catalogo annunciato fanno parte della
cronologia durevole del workflow. Un deployment che modifica questo contratto
deve drenare o arrestare i vecchi worker e i workflow in esecuzione prima di
avviare il nuovo gruppo di worker. Non è sicuro combinare versioni diverse dei
worker attraverso questo limite.

Quando `PlanResumeInput.Finalize` è impostato, i planner possono restituire
strumenti terminali di bookkeeping; queste chiamate non vengono riprodotte in
un turno successivo e devono completare durevolmente la finalizzazione.

I pianificatori ricevono anche un `PlannerContext` tramite `input.Agent` che espone i servizi del runtime:
- `AdvertisedToolDefinitions()` - ottenere le definizioni degli strumenti filtrate dal runtime e visibili al modello in questo turno
- `ModelClient(id string)` - ottenere un client di modello grezzo indipendente dal provider
- `PlannerModelClient(id string)` - ottenere un client di modello con ambito planner e emissione degli eventi gestita dal runtime
- `RenderPrompt(ctx, id, data)` - risolvere e renderizzare il contenuto prompt per lo scope corrente della run
- `AddReminder(r reminder.Reminder)` - registrare promemoria di sistema di runscope
- `RemoveReminder(id string)` - cancellare i promemoria quando le precondizioni non sono più valide
- `Memory()` - accedere alla cronologia delle conversazioni

---

## Moduli funzionali

- `runtime/agent/storage/inmem` – archivio integrato in memoria per esempi e test

- `runtime/mcp` - chiamanti MCP per HTTP e stdio; HTTP accetta risposte JSON e flussi di eventi
- `features/memory/mongo` - archivio di memoria durevole
- `features/prompt/mongo` - prompt store Mongo per override dei prompt
- `features/stream/pulse` - Aiutanti di Pulse sink/subscriber
- `features/model/{anthropic,bedrock,openai}` - adattatori client di modelli per pianificatori
- `features/model/middleware` - middleware condivisi `model.Client` (ad esempio, limitazione della velocità adattiva)
- `features/policy/basic` - semplice motore di policy con elenchi allow/block e gestione di `ToolFailure`

### Modellare il throughput del cliente e il rate limiting

Goa-AI fornisce un limitatore di velocità adattivo indipendente dal provider in
`features/model/middleware`. Avvolge qualsiasi `model.Client`, richiede il
conteggio esatto dei token di input, accoda i chiamanti e regola il budget
effettivo di token al minuto tramite AIMD quando il provider segnala il
throttling. Non stima token e non misura le quote di output.

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/features/model/bedrock"
    mdlmw "goa.design/goa-ai/features/model/middleware"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
bed, err := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "us.anthropic.claude-4-5-sonnet-20251120-v1:0",
})
if err != nil {
    panic(err)
}

rl := mdlmw.NewAdaptiveRateLimiter(
    ctx,
    throughputMap,       // *rmap.Map joined earlier (nil for process-local)
    "bedrock:sonnet",    // key for this model family
    80_000,              // initial TPM
    1_000_000,           // max TPM
)
limited, err := rl.Middleware()(bed)
if err != nil {
    panic(err)
}

rt := runtime.New(runtimeStore)
if err := rt.RegisterModel("bedrock", limited); err != nil {
    panic(err)
}
```

La costruzione del middleware non verifica il supporto del conteggio. Se il
provider o la richiesta non possono essere contati esattamente, la prima
chiamata `Complete` o `Stream` restituisce
`model.ErrTokenCountingUnsupported` prima dell'inferenza. Vertex Gemini
supporta il conteggio esatto; Bedrock supporta solo le richieste e i modelli
accettati da Runtime `CountTokens`, mentre OpenAI non ha un contatore nativo.

---

## Integrazione LLM

I pianificatori Goa-AI interagiscono con i modelli linguistici di grandi dimensioni attraverso un'interfaccia **agnostica rispetto ai provider**. Questo design consente di cambiare i provider - Bedrock di AWS, OpenAI, Google Vertex AI (Gemini e Claude-on-Vertex) o endpoint personalizzati - senza modificare il codice del pianificatore.

### Il client del modello validato

Tutte le interazioni del planner passano attraverso un `model.Client` opaco:

```go
resp, err := client.Complete(ctx, req)
stream, err := client.Stream(ctx, req) // *model.ValidatedStream
```

Le integrazioni implementano `model.Provider`, che produce risposte e chunk
grezzi del trasporto. Goa-AI costruisce `model.Client` con
`model.NewClient(provider)` e valida richieste e risposte complete attorno al
provider. I package esterni non possono implementare `model.Client` né esporre
chunk grezzi al planner.

Prima della chiamata, il client valida nomi e schemi degli strumenti, parti dei
messaggi, opzioni di thinking, metadati dello structured output e valori
dinamici. Richieste e risposte unary sono limitate a 16 MiB e 100.000 valori
visitati; i metadati annidati hanno profondità massima 64. Lo streaming applica
un solo budget cumulativo ai chunk e alla risposta terminale. Questi limiti
rifiutano l'intera operazione: Goa-AI non tronca, ripara o converte i dati del
modello.

`ValidatedStream` deve essere consumato fino a `io.EOF`; solo allora
`Response()` restituisce la risposta canonica accettata. Uno stream incompleto,
malformato o contraddittorio restituisce un errore e nessuna risposta accettata.

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
})
```

**OpenAI**

```go
import (
    "os"

    "goa.design/goa-ai/runtime/agent/runtime"
)

rt := runtime.New(runtimeStore) // storage del runtime fornito dall'host
modelClient, err := rt.NewOpenAIModelClient(runtime.OpenAIConfig{
    APIKey:       os.Getenv("OPENAI_API_KEY"),
    DefaultModel: "gpt-5-mini",
    HighModel:    "gpt-5",
    SmallModel:   "gpt-5-nano",
})
if err != nil {
    panic(err)
}
```

**Google Vertex AI (Gemini e Claude-on-Vertex)**

Il pacchetto `features/model/vertex` fornisce due costruttori che soddisfano
entrambi `model.Client`: un adattatore Gemini nativo e un helper di pura
costruzione che punta l'adattatore Anthropic ai modelli Claude ospitati su
Vertex.

```go
import "goa.design/goa-ai/runtime/agent/runtime"

// Gemini su Vertex, con Application Default Credentials.
geminiClient, err := rt.NewVertexGeminiModelClient(ctx, runtime.VertexConfig{
    ProjectID:      "my-gcp-project",
    Location:       "us-central1",
    DefaultModel:   "gemini-2.5-flash",
    HighModel:      "gemini-3-pro-preview",
    SmallModel:     "gemini-2.5-flash-lite",
    MaxTokens:      4096,
    ThinkingBudget: 10000,
})

// Claude su Vertex. Questa è pura costruzione: crea un client Anthropic SDK
// sul trasporto Vertex dell'SDK e lo passa a features/model/anthropic, che
// possiede la traduzione dei Messages e la classificazione degli errori
// HTTP per ogni adattatore ospitato da Anthropic (API diretta e Vertex)
// — nessun livello di traduzione separato.
claudeOnVertexClient, err := rt.NewVertexAnthropicModelClient(ctx, runtime.VertexConfig{
    ProjectID:    "my-gcp-project",
    Location:     "us-east5",
    DefaultModel: "claude-sonnet-4-5@20250929",
})
```

I modelli di classe Gemini 3 allegano una **thought signature** opaca alle
parti `functionCall` (non solo alle parti thought/thinking) per autenticare la
catena di ragionamento dietro una chiamata a strumento. L'adattatore Vertex fa
il round-trip di questa firma tramite `model.ToolCall.ThoughtSignature` /
`model.ToolUsePart.ThoughtSignature` usando la stessa convenzione base64 di
`ThinkingPart.Signature`. Il runtime cattura questa firma al confine del
model-client — prima che uno dei due stili di integrazione qui sotto produca
mai un `planner.ToolRequest` — e la ricollega tramite l'ID della chiamata a
strumento quando ricostruisce il transcript per il provider.
`planner.ToolRequest` non ha alcun campo firma; il codice del pianificatore
non ha bisogno di sapere che le firme esistono.

Gli errori sentinella comuni includono
`model.ErrStructuredOutputUnsupported`,
`model.ErrTokenCountingUnsupported`, `model.ErrEmptyStream` e
`model.ErrRateLimited`. `*planner.OutputContractError` è invece un errore
strutturato: rilevarlo con `errors.As` e ispezionarne l'origine per distinguere
output non valido del modello, del planner o dello strumento. Non è riprovabile,
perché una nuova richiesta non deve nascondere una violazione del contratto.

### Metadati canonici e replay delle citazioni

`model.Message.Meta` contiene i dati prodotti dal provider necessari per
riprodurre esattamente una risposta. I confini che persistono o trasportano i
metadati devono usare `model.MarshalMetadata` e `model.UnmarshalMetadata`.
Questi codec richiedono un singolo oggetto JSON, conservano i numeri decodificati
come `json.Number`, rifiutano dati successivi e canonicalizzano nil o un oggetto
vuoto a nil.

Il replay delle citazioni è specifico del provider e non deve mai appiattire le
citazioni in testo ordinario. L'adattatore Bedrock può riprodurre i valori
`CitationsPart` dell'assistente come blocchi di citazione nativi, preservando
l'identità della fonte, gli estratti e le posizioni nel documento per caratteri,
chunk o pagine. Le citazioni di sistema Bedrock restano non supportate perché
la relativa unione di contenuto non prevede citazioni. Anthropic e Vertex
rifiutano il replay quando la parte canonica non contiene i campi richiesti dal
protocollo del provider.

### Utilizzo dei client modello nei pianificatori

I pianificatori ottengono i client di modello tramite il `PlannerContext` del
runtime. Ora esistono due stili di integrazione espliciti:

- `PlannerModelClient(id)` per lo streaming con ambito planner e l'emissione degli eventi gestita dal runtime
- `ModelClient(id)` quando serve accesso grezzo al trasporto e lo si abbinerà a `planner.ConsumeStream` oppure si emetteranno `PlannerEvents` manualmente

#### PlannerModelClient (Consigliato)

`PlannerContext.PlannerModelClient(id)` restituisce un client con ambito planner
che si occupa dell'emissione di `AssistantChunk`, `PlannerThinkingBlock` e
`UsageDelta`. Il suo metodo `Stream(...)` drena il flusso del provider
sottostante e restituisce un `planner.StreamSummary`:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    mc, ok := input.Agent.PlannerModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    if !ok {
        return nil, errors.New("model not configured")
    }

    req := &model.Request{
        Messages: input.Messages,
        Tools:    input.Agent.AdvertisedToolDefinitions(),
        Stream:   true,
    }

    sum, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    if len(sum.ToolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: sum.ToolCalls}, nil
    }
    final := sum.FinalResponse()
    if final == nil {
        return nil, errors.New("model stream ended without a canonical response")
    }
    return &planner.PlanResult{
        FinalResponse: final,
        Streamed: true, // Il testo dell'assistente è già stato trasmesso
    }, nil
}
```

Questo è lo stile più semplice perché il client con ambito planner consuma e
riassume direttamente lo stream validato. Restituire `sum.FinalResponse()`
seleziona inoltre la risposta esatta del provider catturata per
quell'invocazione; ricostruire un messaggio di solo testo eliminerebbe
ragionamento, citazioni, firme, metadati e confini dei messaggi.

#### Client grezzo + ConsumeStream

Quando serve il `model.Client` grezzo, recuperarlo tramite
`PlannerContext.ModelClient` e abbinarlo a `planner.ConsumeStream`:

```go
mc, ok := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
if !ok {
    return nil, errors.New("model not configured")
}
req := &model.Request{
    Messages: input.Messages,
    Tools:    input.Agent.AdvertisedToolDefinitions(),
    Stream:   true,
}
stream, err := mc.Stream(ctx, req)
if err != nil {
    return nil, err
}
sum, err := planner.ConsumeStream(ctx, stream)
if err != nil {
    return nil, err
}
if len(sum.ToolCalls) > 0 {
    return &planner.PlanResult{ToolCalls: sum.ToolCalls}, nil
}
final := sum.FinalResponse()
if final == nil {
    return nil, errors.New("model stream ended without a canonical response")
}
return &planner.PlanResult{
    FinalResponse: final,
    Streamed:      true,
}, nil
```

Questo helper si limita a consumare lo stream e restituisce uno
`StreamSummary`; il journal delle invocazioni pubblica successivamente gli
eventi di presentazione e utilizzo accettati.

Usare il client diretto quando il planner deve ispezionare chunk di anteprima
validati o effettuare più chiamate al modello nello stesso turno. Consumare
ogni stream selezionato fino al risultato terminale: una chiusura anticipata
non produce una risposta accettata. Non mescolare
`PlannerModelClient.Stream(...)` con `planner.ConsumeStream`; scegliere un solo
proprietario del flusso per turno del planner.

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
