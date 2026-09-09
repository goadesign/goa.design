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

Il runner rifiuta risultati senza controlli né claim, ID duplicati, artefatti
non validi e risposte incomplete del giudice. Se `Output` è vuoto, assegna
`not_addressed` a ogni claim senza chiamare il giudice.

## Creare ed eseguire un runner

La concorrenza è esplicita e limitata:

```go
grader, err := judge.New(modelClient, maxOutputTokens)
if err != nil {
    return err
}
runner, err := eval.NewRunner(
    grader,
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

L'applicazione deve passare un `maxOutputTokens` positivo a `judge.New` e
gestire l'errore restituito. Leggi il valore dalla configurazione
dell'applicazione prima di eseguire la suite. Zero e valori negativi fanno
fallire la costruzione senza chiamare il modello; non esiste un valore
predefinito.

Il valore è un limite inclusivo di token di output per **una risposta completa
del modello**, comprendente tutti i giudizi e la loro struttura JSON. Non è un
limite per claim né un budget totale per scenario o suite. Goa-AI invia lo
stesso valore nella richiesta iniziale e in ogni richiesta di correzione
consentita, indipendentemente dal numero di claim. Scegli un valore supportato
dal provider e dal modello configurati; i valori non supportati restano errori,
senza riduzioni silenziose del limite. Un limite finito non garantisce che la
risposta riesca a completarsi.

### Riferimento condiviso e migrazione del giudice

Inserisci il contesto fattuale condiviso da più claim nella stringa facoltativa
`Result.Reference`, invece di ripeterlo in ogni claim. Mantieni in `Output` la
risposta da valutare:

```go
result := eval.Result{
    Output:    answer,
    Reference: "Supported export formats: CSV and JSON.",
    Claims: []eval.Claim{{
        ID:   "export_formats",
        Text: "The answer lists the supported export formats.",
    }},
}
```

Il runner passa il riferimento separatamente, senza modificare la risposta. Il
giudice basato su un modello lo include una volta in ogni richiesta, comprese
quelle di correzione già previste. I fatti nel riferimento aiutano a verificare
l'accuratezza della risposta; non forniscono mai contenuti che la risposta omette.
In questo esempio, elencare i formati solo nel riferimento non soddisfa il claim.
Un `Output` vuoto continua a produrre `not_addressed` per ogni claim senza chiamare
il giudice, anche quando il riferimento contiene la risposta.

I giudici personalizzati implementano la nuova interfaccia a quattro argomenti:

```go
Judge(ctx context.Context, output string, claims []eval.Claim, reference string) ([]eval.Judgment, error)
```

Aggiorna le chiamate dirette a `grader.Judge(ctx, output, claims, reference)`.
Passa `""` quando non serve altro contesto; anche la calibrazione usa un riferimento
vuoto. Il runner conserva un riferimento non vuoto nel campo `reference` del
report JSON e omette il campo quando è vuoto. I report precedenti senza tale campo
continuano a indicare l'assenza di contesto aggiuntivo. I lettori esterni con
convalida rigorosa devono accettare il nuovo campo prima di leggere report che lo
includono. Non occorre migrare i report salvati né modificare le suite generate o
i contratti dei servizi del prodotto. Questa modifica non aggiunge chiamate al
modello e non cambia la scelta del modello, i limiti di token, le etichette o il
numero di correzioni.

### Etichette e convalida delle risposte

Prima degli scenari, il runner verifica il giudice con quattro esempi gestiti dal
framework: `entailed` (la risposta dimostra il claim), `contradicted` (dimostra
il contrario), `not_addressed` (parla d'altro) e `indeterminate` (informazioni
in conflitto impediscono una conclusione).

Tutti e quattro i risultati devono essere corretti. In questo modo, un giudice
che risponde sempre `entailed` non può far passare l'intera suite. Un errore di
calibrazione ferma la suite prima della chiamata all'applicazione. Negli scenari
passa solo `entailed`.

Applica le condizioni di ogni claim così come sono scritte. «Riporta il prezzo»
richiede un prezzo. «Ogni prezzo citato deve corrispondere al riferimento;
non citare prezzi soddisfa questo vincolo» consente l'omissione: una risposta
non vuota che non cita prezzi soddisfa quel vincolo (`entailed`, non
`not_addressed`) se rispetta gli altri requisiti. L'omissione non fornisce
contenuti obbligatori, non sostiene un'affermazione inclusa senza prove e non
risolve una condizione sconosciuta sul mondo.

Il modello interpreta queste condizioni; il framework non classifica i claim
tramite codice e non riscrive etichette o motivazioni. Un `Output` interamente
vuoto continua ad assegnare `not_addressed` a ogni claim e fa fallire lo scenario
senza chiamare il giudice.

Il prompt chiede di chiamare esattamente una volta lo strumento di valutazione
fornito, senza indicare un nome specifico del provider. Lo schema richiede una
proprietà con l'ID di ogni claim, contenente un'etichetta e una motivazione non
vuota. Il giudice restituisce i giudizi nell'ordine dei claim cercandoli per nome,
non ricostruendo le posizioni nella risposta. Nomi mancanti, sconosciuti o
duplicati, campi aggiuntivi ed etichette non valide vengono rifiutati.

I metadati strutturali permettono al validatore di spiegare errori indipendenti
nei campi, come un claim codificato come stringa quando è richiesto un oggetto.
Il testo completo dei claim resta nello schema e le prove di riferimento nella
richiesta; nessuno dei due viene copiato in questi metadati di correzione. Un
claim chiamato `requests` è valido se richiesto dallo schema. Il giudice non
fornisce verdetti di esempio.

Il meccanismo di correzione esistente e limitato può richiedere una risposta
sostitutiva, ma non ripara mai output non validi. Etichette, scelta del modello,
limiti di token e numero di correzioni restano invariati; istruzioni più chiare
non garantiscono che il modello le segua. Esaurite le correzioni, il chiamante
riceve un errore anziché giudizi inventati. Vedi il
[contratto del giudice del framework](https://github.com/goadesign/goa-ai/blob/main/docs/evals.md#how-judging-works).

## Migrare la costruzione del giudice

`judge.New(client, opts...) *Judge` è sostituito da
`judge.New(client, maxOutputTokens, opts...) (*Judge, error)`. Aggiorna ogni
chiamante per passare il limite positivo configurato e gestire l'errore prima
di creare il runner. Le opzioni esistenti, come `WithModelClass`, seguono il
limite obbligatorio e mantengono il loro significato.

Il precedente calcolo `256 × numero di claim` viene rimosso. Questa modifica
al codice sorgente Go richiede l'aggiornamento dei chiamanti per compilare con
la nuova versione. Non cambia la selezione del modello, il prompt, le
etichette, la convalida rigorosa delle risposte o il numero di correzioni. Non
è necessaria alcuna migrazione dei report salvati.

## Leggere il report

La durata di uno scenario include la chiamata all'applicazione, la convalida del
risultato e il giudizio semantico. Gli errori di selezione e calibrazione sono
errori della suite. Gli errori di hook, convalida, timeout o giudizio vengono
registrati sul relativo scenario e gli altri scenari continuano.

Se non esiste un errore della suite, controlla `report.Passed`; un valore false
deve far fallire il test o il comando CI che ha avviato la valutazione.
