---
title: "Validazione Tool e Retry Hint"
linkTitle: "Validazione Tool e Retry Hint"
weight: 6
description: "Scopri come Goa-AI trasforma i fallimenti di validazione in valori ToolError e RetryHint strutturati che gli LLM possono usare per riparare le chiamate tool."
---

## Perché Questo È Importante

Goa-AI combina le **validazioni design-time di Goa** con un **modello di errore tool strutturato** per dare ai planner LLM un modo potente per **riparare automaticamente le chiamate tool invalide**.

Invece di:

- spargere validazione ad-hoc negli executor,
- indovinare quali campi mancano da stringhe di errore opache, o
- costringere gli utenti a correggere manualmente ogni chiamata sbagliata,

Goa-AI ti permette di:

- descrivere schemi payload precisi e validazioni nel design Goa,
- mostrare i fallimenti come valori `ToolError` + `RetryHint` strutturati, e
- insegnare al tuo planner a **ritentare con input migliori** basandosi su quegli hint.

Questo pattern è una delle migliori ragioni per usare Goa-AI per agenti che usano tool.

## Tipi Core: ToolError e RetryHint

A livello planner (`runtime/agent/planner`):

- **`ToolError`**  
  Alias per `runtime/agent/toolerrors.ToolError`:
  - `Message string` – riepilogo leggibile.
  - `Cause *ToolError` – causa annidata opzionale (preserva le catene attraverso retry e hop agent-as-tool).
  - Costruttori e helper:
    - `planner.NewToolError(msg string)`
    - `planner.NewToolErrorWithCause(msg string, cause error)`
    - `planner.ToolErrorFromError(err error)`
    - `planner.ToolErrorf(format, args...)`.

- **`RetryHint`**  
  Hint lato planner usato dal runtime e dal motore policy:

  ```go
  type RetryHint struct {
      Reason             RetryReason
      Tool               tools.Ident
      RestrictToTool     bool
      MissingFields      []string
      ExampleInput       map[string]any
      PriorInput         map[string]any
      ClarifyingQuestion string
      Message            string
  }
  ```

  Valori `RetryReason` comuni:

  - `invalid_arguments` – il payload ha fallito la validazione (schema/tipo).
  - `missing_fields` – mancano campi obbligatori.
  - `malformed_response` – il tool ha restituito dati che non possono essere decodificati.
  - `timeout`, `rate_limited`, `tool_unavailable` – problemi di esecuzione/infra.

Il runtime converte gli hint del planner in una forma runtime/policy (`policy.RetryHint`) con gli stessi campi; i motori policy e le UI possono quindi reagire (regolare cap, disabilitare tool, mostrare suggerimenti di riparazione).

## Da Dove Viene la Validazione

La validazione è **design-driven**:

- Nel tuo design Goa, descrivi i payload dei tool (`Args`) con:
  - tipi `Attribute`,
  - `Required(...)`,
  - vincoli (`MinLength`, `Maximum`, `Enum`, ecc.),
  - descrizioni ed esempi.
- Il codegen Goa-AI emette:
  - **struct payload/result tipizzate**, e
  - **validatori/codec** che applicano quelle regole al confine del tool.

Quando un payload tool fallisce la validazione (es., un campo obbligatorio mancante), il codice generato e il runtime possono:

- produrre un `ToolError` con un messaggio conciso, e
- allegare un `RetryHint` che dice al planner **esattamente come riparare** la chiamata.

Non hai bisogno di scrivere parser custom per stringhe di errore; il pattern è standardizzato.

## ToolResult: Trasportare Errori e Hint

Ogni invocazione tool emerge come `planner.ToolResult`:

```go
type ToolResult struct {
    Name          tools.Ident
    Result        any
    Error         *ToolError
    RetryHint     *RetryHint
    Telemetry     *telemetry.ToolTelemetry
    ToolCallID    string
    ChildrenCount int
    RunLink       *run.Handle
}
```

Punti chiave:

- In caso di successo:
  - `Result` contiene il risultato decodificato (o JSON raw come fallback).
  - `Error` e `RetryHint` sono nil.
- In caso di fallimento di validazione o esecuzione:
  - `Error` descrive cosa è andato storto in modo planner/UI-friendly.
  - `RetryHint` (quando presente) spiega **come riprovare**.

Il runtime:

- riceve un output tool logico dal tuo executor o attività,
- wrappa qualsiasi messaggio di fallimento in un `ToolError`,
- allega qualsiasi `RetryHint` prodotto al confine, e
- pubblica un `ToolResultReceivedEvent` (e corrispondente evento `stream.ToolEnd`) con un payload `toolerrors.ToolError` strutturato per le UI.

## Pattern: Auto-Riparazione di Chiamate Tool Invalide

Il pattern raccomandato è:

1. **Design tool con schemi payload forti** (design Goa).
2. **Lascia che executor/tool mostrino i fallimenti di validazione** come `ToolError` + `RetryHint` invece di fare panic o nascondere errori.
3. **Insegna al tuo planner** a:
   - ispezionare `ToolResult.Error` e `ToolResult.RetryHint`,
   - riparare il payload quando possibile (o chiedere all'utente), e
   - ritentare la chiamata tool se appropriato.

### Esempio Executor (Pseudo-Codice)

Executor concettuale per un tool che fa upsert di un record:

```go
func Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (*planner.ToolResult, error) {
    // Decodifica usando codec generato
    args, err := spec.UnmarshalUpsertPayload(call.Payload)
    if err != nil {
        // Errore di validazione/decode → ToolError + RetryHint strutturati
        return &planner.ToolResult{
            Name: call.Name,
            Error: planner.NewToolError("payload invalido"),
            RetryHint: &planner.RetryHint{
                Reason:        planner.RetryReasonInvalidArguments,
                Tool:          call.Name,
                RestrictToTool: true,
                Message:       "Il payload non corrisponde allo schema atteso.",
                // Opzionalmente: MissingFields, ExampleInput, ClarifyingQuestion...
            },
        }, nil
    }

    // Chiama il servizio sottostante
    res, err := client.Upsert(ctx, args)
    if err != nil {
        return &planner.ToolResult{
            Name:  call.Name,
            Error: planner.ToolErrorFromError(err),
        }, nil
    }

    // Successo: restituisci risultato come al solito
    return &planner.ToolResult{
        Name:   call.Name,
        Result: res,
    }, nil
}
```

### Esempio Logica Planner

In `PlanResume`, il tuo planner può ispezionare l'ultimo risultato tool:

```go
func (p *MyPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    if len(in.ToolResults) == 0 {
        // Nulla da fare
        return &planner.PlanResult{}, nil
    }

    last := in.ToolResults[len(in.ToolResults)-1]
    if last.Error != nil && last.RetryHint != nil {
        hint := last.RetryHint

        switch hint.Reason {
        case planner.RetryReasonMissingFields, planner.RetryReasonInvalidArguments:
            // Strategia 1: Chiedi all'utente chiarimenti (AwaitClarification)
            return &planner.PlanResult{
                Await: &planner.Await{
                    Clarification: &planner.AwaitClarification{
                        ID:               "fix-" + string(hint.Tool),
                        Question:         hint.ClarifyingQuestion,
                        MissingFields:    hint.MissingFields,
                        RestrictToTool:   hint.Tool,
                        ExampleInput:     hint.ExampleInput,
                        ClarifyingPrompt: hint.Message,
                    },
                },
            }, nil

        case planner.RetryReasonTimeout, planner.RetryReasonRateLimited:
            // Strategia 2: Backoff o cambia tool (specifico dell'implementazione)
        }
    }

    // Default: sintetizza una risposta finale dai risultati tool
    // ...
    return &planner.PlanResult{/* FinalResponse, prossime ToolCalls, ... */}, nil
}
```

Questo pattern permette all'LLM (tramite il tuo codice planner) di **riparare le chiamate tool** invece di fallire completamente il run.

## Come Goa-AI Usa Goa per Far Funzionare Questo

Goa-AI sfrutta il design e codegen di Goa in diversi modi:

- **Validazione design-time**  
  Il design Goa per il payload di un tool definisce:
  - campi obbligatori vs opzionali,
  - valori permessi, formati e range,
  - descrizioni ed esempi.

- **Validatori e codec generati**  
  Per ogni payload tool:
  - Goa-AI emette struct tipizzate e logica di validazione.
  - Gli errori di validazione al confine possono essere mappati in messaggi concisi e hint a livello di campo.

- **Costruzione hint runtime**  
  Il runtime e il layer attività:
  - catturano i fallimenti di validazione al **confine del tool** (prima di eseguire il servizio sottostante),
  - preservano le catene di errore come `ToolError`,
  - allegano qualsiasi `RetryHint` disponibile al `ToolResult`, e
  - evitano di interrompere l'intero workflow quando una singola chiamata tool è invalida.

Poiché design e runtime concordano sugli schemi, puoi fare affidamento su un **contratto errore/hint uniforme** per tutti i tool, che siano:

- service-backed,
- agent-backed (agent-as-tool),
- o MCP-backed.

## Best Practice

- **Metti le validazioni nel design, non nei planner**  
  Usa il DSL degli attributi di Goa (`Required`, `MinLength`, `Enum`, ecc.). Lascia che validatori e codec generati le applichino; mostra errori strutturati e hint al confine del tool.

- **Restituisci ToolError + RetryHint dagli executor**  
  Preferisci:

  ```go
  return &planner.ToolResult{
      Name:  call.Name,
      Error: planner.NewToolError("..."),
      RetryHint: &planner.RetryHint{ /* guida strutturata */ },
  }, nil
  ```

  rispetto a panic o return `error` semplici.

- **Mantieni gli hint concisi ma azionabili**  
  Concentrati su:
  - quali campi sono mancanti/invalidi,
  - una breve domanda chiarificatrice,
  - una piccola mappa `ExampleInput` con valori corretti.

- **Insegna ai planner a leggere gli hint**  
  Rendi la gestione di `RetryHint` una parte di prima classe del tuo planner:
  - ripara e riprova quando è sicuro,
  - chiedi all'utente tramite `AwaitClarification` quando necessario,
  - altrimenti fallback a risposte finali.

- **Evita ri-validazione dentro i servizi**  
  Goa-AI assume che la validazione avvenga al confine del tool; la logica interna del servizio dovrebbe fidarsi degli input validati e concentrarsi sul comportamento di dominio.

Per un approfondimento sui pattern di retry guidati dalla validazione e miglioramenti futuri (builder di hint schema-aware, issue di campo più ricchi), consulta i package runtime e planner di Goa-AI nel repo `goa-ai` (es., `runtime/agent/toolerrors` e `runtime/agent/planner`).


