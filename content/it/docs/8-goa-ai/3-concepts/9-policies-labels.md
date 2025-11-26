---
title: "Policy, Cap e Label"
linkTitle: "Policy e Label"
weight: 9
description: "Impara come Goa-AI applica cap, budget temporali e policy attorno ai run degli agenti usando RunPolicy design-time e override runtime."
---

## RunPolicy Design-Time

A design time, configuri policy per-agente con `RunPolicy`:

```go
Agent("chat", "Runner conversazionale", func() {
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

Questo diventa una `runtime.RunPolicy` attaccata alla registrazione dell'agente:

- **Cap**: `MaxToolCalls`, `MaxConsecutiveFailedToolCalls`
- **Budget temporale**: `TimeBudget`, `FinalizerGrace` (solo runtime)
- **Interrupt**: `InterruptsAllowed`
- **Comportamento campi mancanti**: `OnMissingFields`

Questi sono **default forti**: il runtime li applica su ogni run a meno che non vengano sovrascritti esplicitamente.

## Override Policy Runtime

In alcuni ambienti potresti voler stringere o rilassare le policy senza cambiare il design. Il runtime espone:

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxConsecutiveFailedToolCalls: 1,
    InterruptsAllowed:             true,
})
```

Solo i campi non-zero (e `InterruptsAllowed` quando true) vengono applicati; i campi non specificati mantengono i default design-time.

Linee guida:

- usa **RunPolicy design-time** per limiti stabili a livello contratto,
- usa **`OverridePolicy`** con parsimonia per esperimenti locali o cap di emergenza.

## Label e Motori Policy

Goa-AI si integra con motori policy pluggable tramite `policy.Engine`. Le policy ricevono:

- metadati tool (ID, tag),
- contesto run (SessionID, TurnID, label),
- e informazioni `RetryHint` dopo fallimenti tool.

Le decisioni policy possono:

- permettere/negare tool,
- regolare cap o budget temporali,
- o annotare run con label aggiuntive.

Le label fluiscono in:

- `run.Context.Labels` – disponibili ai planner durante un run,
- `run.Record.Labels` – persistite con i metadati del run (utili per ricerca/dashboard).

## Come Policy e RetryHint Lavorano Insieme

Quando un tool fallisce e restituisce un `RetryHint`, il runtime lo converte in `policy.RetryHint` e lo passa al motore policy prima di decidere come procedere:

- le policy possono: ridurre cap o disabilitare tool problematici per il resto del run, marcare run per review tramite label, o lasciare le decisioni interamente al planner.
- i planner possono: riparare e ritentare chiamate basandosi su `RetryHint`, escalare a `AwaitClarification`, o finalizzare con una risposta best-effort.


