---
title: Valutazioni generate
weight: 10
description: "Definisci scenari nel design Goa, genera hook tipizzati e produci report affidabili."
llm_optimized: true
---

Le valutazioni Goa-AI consentono di definire scenari stabili nel design e di
implementare il lavoro specifico del prodotto in normale codice Go. Goa-AI
gestisce generazione, selezione degli scenari, concorrenza limitata, giudizio
semantico e report. L'applicazione gestisce il sistema chiamato, il target, i
fatti esatti da verificare e gli artefatti diagnostici da conservare.

## Definire gli scenari

Aggiungi il DSL di valutazione a un package di design di un'applicazione che usa
già il DSL Goa v3:

```go
package design

import . "goa.design/goa-ai/eval/dsl"

var _ = Suite("chat", func() {
    Description("Valuta risultati Chat completi.")
    Timeout("2m")

    Scenario("alarm_inventory", func() {
        Description("Recupera tutta la cronologia degli allarmi.")
        Input("Elenca tutti gli allarmi nella finestra richiesta.")
        Tags("production", "alarm")
        Timeout("3m")
    })
})
```

L'applicazione deve contenere anche il normale design del servizio Goa. La CLI
Goa usa quel design per identificare la versione di Goa prima di caricare DSL
aggiuntivi.

Gli ID di suite, scenari e tag usano `lower_snake_case`. Descrizioni, input e un
timeout positivo della suite sono obbligatori. Il timeout di uno scenario
sostituisce quello della suite per quello scenario.

`goa gen` genera `gen/evals/<suite>/suite.go`:

```go
type Hooks interface {
    AlarmInventory(context.Context, string) (eval.Result, error)
}

func New(hooks Hooks) eval.Suite
```

Ogni scenario ha un metodo. Aggiungere uno scenario obbliga quindi
l'applicazione che esegue la suite a implementarlo, e il compilatore verifica
tale obbligo. Il codice generato contiene nomi, input, tag e timeout definitivi;
non usa reflection o registri a runtime.

## Implementare controlli e claim

Un hook esegue lo scenario e restituisce un `eval.Result`. Un `Check` confronta
prove tipizzate con un fatto che l'applicazione può conoscere esattamente. Un
`Claim` esprime un significato che deve essere sostenuto dalla risposta del
modello.

Usa i controlli per nomi di tool, ID, conteggi, stati e altri valori esatti. Usa
i claim solo quando serve leggere e interpretare la risposta. Restituisci i
guasti dell'infrastruttura o del protocollo come errori. Ogni controllo fallito
deve includere una diagnosi.

Il runner rifiuta risultati vuoti, ID duplicati, claim senza risposta, artefatti
non validi e risposte incomplete del giudice.

## Creare ed eseguire un runner

La concorrenza è esplicita e limitata:

```go
runner, err := eval.NewRunner(
    judge.New(modelClient),
    eval.RunnerConfig{MaxConcurrency: 5},
)
if err != nil {
    return err
}
suite := genevals.New(hooks)
report, err := runner.Run(ctx, suite)
```

`MaxConcurrency` è obbligatorio e positivo. Al massimo quel numero di scenari
viene eseguito contemporaneamente. Il fallimento di uno scenario non ferma gli
altri. Il report conserva sempre l'ordine di dichiarazione della suite. Gli hook
e il giudice semantico devono quindi supportare chiamate simultanee fino a tale
limite.

Se tutti gli hook restituiscono solo controlli deterministici e nessun claim
semantico, passa un giudice nil:

```go
runner, err := eval.NewRunner(nil, eval.RunnerConfig{MaxConcurrency: 2})
```

## Selezionare gli scenari

Il runner convalida la selezione prima di chiamare il prodotto o il modello:

```go
report, err := runner.Run(ctx, suite)
report, err := runner.RunScenarios(ctx, suite, "alarm_inventory", "solar_analysis")
report, err := runner.RunTags(ctx, suite, "smoke", "alarm")
```

`RunScenarios` esegue ID esatti. `RunTags` esegue ogni scenario con almeno uno
dei tag richiesti. Entrambi rifiutano selezioni vuote, valori vuoti, duplicati e
ID o tag sconosciuti.

## Giudizio semantico

Prima degli scenari, il runner verifica il giudice con quattro esempi gestiti dal
framework: `entailed` (la risposta dimostra il claim), `contradicted` (dimostra
il contrario), `not_addressed` (parla d'altro) e `indeterminate` (informazioni
in conflitto impediscono una conclusione).

Tutti e quattro i risultati devono essere corretti. In questo modo, un giudice
che risponde sempre `entailed` non può far passare l'intera suite. Un errore di
calibrazione ferma la suite prima della chiamata all'applicazione. Negli scenari
passa solo `entailed`; il giudice non ritenta né ripara il proprio output.

## Leggere il report

La durata di uno scenario include la chiamata all'applicazione, la convalida del
risultato e il giudizio semantico. Gli errori di selezione e calibrazione sono
errori della suite. Gli errori di hook, convalida, timeout o giudizio vengono
registrati sul relativo scenario e gli altri scenari continuano.

Se non esiste un errore della suite, controlla `report.Passed`; un valore false
deve far fallire il test o il comando CI che ha avviato la valutazione.
