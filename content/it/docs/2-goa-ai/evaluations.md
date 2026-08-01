---
title: Valutazioni generate
weight: 10
description: "Definisci suite di valutazione in un DSL, genera hook tipizzati e giudica le risposte del modello con contratti semantici rigorosi."
llm_optimized: true
---

Le valutazioni Goa-AI mantengono nel design l'intento stabile del test e
lasciano all'applicazione l'esecuzione del prodotto e le prove. Il framework
possiede DSL, interfaccia hook generata, orchestrazione, giudice semantico e
report. L'applicazione possiede target reale, protocollo, controlli
deterministici, claim e artefatti diagnostici.

## Definire una suite

Importa `goa.design/goa-ai/eval/dsl` in un package di design Goa:

```go
var _ = Suite("chat", func() {
    Description("Valuta risultati Chat completi.")
    Timeout("2m")

    Scenario("alarm_inventory", func() {
        Description("Recupera la cronologia completa degli allarmi.")
        Input("Elenca tutti gli allarmi nella finestra richiesta.")
        Tags("production", "alarm")
        Timeout("3m")
    })

    Calibration("entailed", func() {
        Answer("Il compressore 1 è in funzione.")
        Claim("Il compressore 1 è in funzione.")
        Want(eval.Entailed)
    })
})
```

Gli identificatori usano `lower_snake_case`. Descrizioni, input e timeout
positivi sono obbligatori. Le calibrazioni usano `entailed`, `contradicted`,
`not_addressed` o `indeterminate`.

`goa gen` genera `gen/evals/<suite>/suite.go` con un'interfaccia diretta:

```go
type Hooks interface {
    AlarmInventory(context.Context, string) (eval.Result, error)
}

func New(hooks Hooks) eval.Suite
```

Non esistono registri di adapter né reflection. Ogni metodo generato è un
obbligo verificato dal compilatore; campi del receiver o closure catturano le
dipendenze e i target dell'applicazione.

## Produrre le prove ed eseguire

Ogni hook completa l'interazione e restituisce `eval.Result` con `Checks`
deterministici, `Claims` semantici, l'`Output` del modello e `Artifacts`
diagnostici. Gli errori di infrastruttura o protocollo sono restituiti come
errori. Il runner rifiuta risultati vuoti, ID duplicati, claim senza output e
risposte del giudice non biunivoche.

`eval/judge` usa un `model.Client` indipendente dal provider. Esegue una sola
richiesta strutturata e senza tool per batch; non ripara, ritenta o sostituisce
mai l'output del modello.

```go
suite := genevals.New(hooks)
runner := eval.NewRunner(judge.New(modelClient))
report, err := runner.Run(ctx, suite)
```

Il runner verifica tutte le calibrazioni prima di ogni scenario, quindi esegue
gli scenari in sequenza con i timeout generati. Uno scenario passa solo se ogni
check passa e ogni claim è `entailed`. I report hanno campi JSON stabili per CI
e conservazione degli artefatti.

