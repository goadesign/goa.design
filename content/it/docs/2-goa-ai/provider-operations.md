---
nav_group: guides
title: "Operazioni eseguite dal provider"
weight: 35
description: "Invocare operazioni di agenti e strumenti registrati senza importarne l’implementazione."
llm_optimized: true
---

Invocare operazioni di agenti e strumenti registrati senza importarne l’implementazione.

## Avviare un’operazione

L’host autorizza il chiamante e invia la dichiarazione generata e gli argomenti
originali. `StartOperation` usa una sessione esistente dell’host;
`StartOneShotOperation` non crea sessioni. Il worker del provider convalida la propria
esportazione e prepara la configurazione immutabile selezionata. Il consumer non
richiede la definizione privata dell’agente né `WithAgentExecutors`.

```go
handle, err := rt.StartOneShotOperation(
    ctx, runID, operation, arguments, labels, nil,
)
if err != nil {
    return err
}
output, err := handle.Wait(ctx)
if err != nil {
    return err
}
```

Usa `StartToolOperation` o `StartOneShotToolOperation` con la selezione Registry esatta
conservata e il suo `RegisteredInvocation`. Configura la stessa fonte Registry e il
client generato. Gli agenti nativi usano workflow e coda dichiarati. I servizi usano
`WithToolWorkflowQueue` e un worker che chiama `RegisterToolWorkflow`, senza agente,
pianificatore, modello o conversazione. Registrazioni ed etichette non concedono
accesso.

Per avviare e attendere un'operazione in modo idempotente dopo l'interruzione del
processo di avvio, usa `EnsureOperationCompletion`,
`EnsureOneShotOperationCompletion`, `EnsureToolOperationCompletion` o
`EnsureOneShotToolOperationCompletion`. Passa `runtime.WithTextOnly(true)` quando
l'operazione deve restituire il testo diretto dell'assistente senza chiamare strumenti.

Usa `runtime.WithRootExecutionTarget(target)` quando il lavoro iniziale deve indicare
una versione esatta del worker. Il motore concreto `temporal.Engine` possiede il
metodo di ricerca `temporalEngine.CurrentWorkflowTarget(ctx, queue)`. I nuovi workflow
di risposta e di pulizia ordinaria omettono la destinazione esplicita: Temporal
sceglie la versione corrente all'assegnazione e il comportamento di versionamento
configurato del worker controlla l'esecuzione successiva. Il ripristino mantiene
le impostazioni pubblicate esatte, comprese le precedenti destinazioni esplicite.

Quando un worker provider deve servire un contratto di operazione attraverso modifiche
di revisione compatibili, registrare il contratto di proprietà della revisione con
`rt.RegisterAgentOperationProvider` prima di sigillare il runtime.

## Selezionare esplicitamente la cronologia

Registra `AgentToolResolver` sul worker del provider prima di sigillare il runtime o
inviare lavoro. La firma è `func(context.Context, genregistry.ExecutionInvocation,
string, *runtime.ToolCall) (*runtime.AgentToolConfiguration, error)`. Riceve invocazione
originale, riferimento immutabile e chiamata convalidata. Restituisce `History`
obbligatorio, etichette, policy e metadati e riferimenti ai prompt facoltativi.

```go
configuration := &runtime.AgentToolConfiguration{
    History: runtime.LiteralAgentHistory(messages),
    Labels: labels,
    Policy: policy,
}
```

Per un turno successivo usa `runtime.NextTurnAgentHistory(completedRunID,
systemMessages, freshMessages)`. La fonte deve essere un’esecuzione riuscita dello
stesso agente e sessione. I messaggi nuovi non contengono messaggi di sistema.
`WithoutPriorReasoning()` esclude il ragionamento fornito ed ereditato; l’esclusione
persiste nei turni successivi. Le operazioni senza sessione non ereditano un’altra
sessione. Una ripetizione esatta riusa la preparazione accettata.

## Risultati, input e annullamento

Il motore prende in carico il lavoro accettato prima della preparazione. Ripetere la
richiesta esatta osserva l’esecuzione originale; modificarla crea un conflitto. Un
errore o annullamento prima del primo record del runtime conserva un esito terminale nel
motore. Osserva il lavoro accettato prima di dedurre che un record assente significhi
che nulla è iniziato.

Input, output, record e snapshot comuni richiedono `Subject` generato: l’identificatore
reale dell’agente oppure la fonte Registry e il nome qualificato dello strumento di
servizio. Un servizio non ha un agente inventato né una sessione nascosta. Client e
cronologia degli agenti richiedono ancora l’identità dell’agente.

`planner.PlanInput.ParentTool` e `planner.PlanResumeInput.ParentTool` contengono il
contratto del risultato selezionato per delega e operazioni dirette. Il pianificatore
restituisce `planner.FinalToolResult` conforme al contratto; solo testo viene rifiutato.
Usa `FinalToolResult` per il risultato tipizzato e `Final` per il testo. Leggi eventi
paginati solo per la cronologia diagnostica.

Quando è richiesto un input, la continuazione ripristina l'operazione originale, preserva i
metadati del chiamante accettati (`Metadata`) e ammette un successore. Per gli strumenti di servizio,
l'host salva in modo duraturo predecessore, ID della run successiva e risposta tipizzata; il relativo
worker chiama `StartToolContinuation` e `EnsureToolContinuationCompletion` (passando qualsiasi memo
di workflow `memo map[string]any` come argomento finale). L'annullamento del padre segue le relazioni
figlie accettate e mantiene la pulizia non completata. Il completamento non deve dipendere da un nuovo
tentativo del client.

I workflow che osservano l'annullamento usano `AutoUpgrade` per le esecuzioni
attive e sospese. Osservano la pulizia mentre il lavoro di dominio mantiene la
propria esecuzione assegnata. Il ripristino conserva la destinazione esplicita e
l'impronta della richiesta di un osservatore già accettato.

## Contratti di input generati

Dentro `Use` di un toolset compilato, `BindInput("read", "scope")` rimuove un campo
obbligatorio di primo livello dall’input del modello di quel consumer. Installa l’helper
tipizzato generato per ogni attività di pianificazione per fornire il valore
dell’applicazione. Il provider riceve sempre l’input completo. Campi facoltativi,
iniettati, sconosciuti, ripetuti e percorsi annidati sono rifiutati; i contratti
Registry remoti richiedono una dichiarazione compilata.

I codec supportano `Any` o `Bytes` rappresentati esplicitamente da `json.RawMessage`,
conservando JSON e numeri esatti. Una mappa dichiarata con `Meta("struct:tag:json",
",embed")` accetta membri aggiuntivi secondo il contratto dei valori. Chiavi duplicate,
collisioni e valori invalidi sono rifiutati. Gli oggetti normali restano chiusi e i byte
normali usano base64.

## Aggiornamento e ripristino {#upgrade}

L’aggiornamento coordina codice, formati di scambio e dati salvati. Rigenera e ricompila
provider e consumer; sostituisci `Messages` del resolver con `History` obbligatorio e
registra il resolver nel provider. La cronologia esplicitamente vuota è
`runtime.LiteralAgentHistory(nil)`; un `AgentHistory` senza selezione è rifiutato. I
target nativi richiedono `Executor`, `Configuration`, `Workflow` e `Queue`. `SeedDeclaration`
non duplica più `Origin`; `RunSeed.Origin` viene ricavato direttamente dal parametro
`BeginRunPreparationOperation`. Convalida ogni gruppo di dichiarazioni conservato, comprese
le voci ritirate, prima dell'attivazione.

Le sospensioni usano `goa-ai.run-suspension.v14` e i risultati principali
`json/goa-ai-run-output-v3`. I vecchi formati sono rifiutati. Aggiorna Stores,
adattatori, record, consumer e trasporti per `Subject` obbligatorio. Inventaria avvii,
preparazioni, selezioni, checkpoint, cronologie padre con risultati figli, esportazioni
e copie dei risultati. Completa il lavoro con i vecchi worker oppure esegui una
conversione del proprietario verificata tramite replay. Non condividere una coda fra
preparazioni vecchie e nuove finché resta lavoro vecchio.

Coordina lettori e scrittori distribuiti separatamente. Il ripristino richiede dati,
dichiarazioni, richieste e worker compatibili; ripristinare solo un binario dopo nuove
scritture non è sicuro. Il framework non deduce gli esecutori mancanti né offre
compatibilità permanente.

Contratti dettagliati del framework:

- [Run subjects](https://github.com/goadesign/goa-ai/blob/main/docs/run-subjects.md)
- [Workflow results](https://github.com/goadesign/goa-ai/blob/main/docs/workflow-results.md)
- [Native declarations](https://github.com/goadesign/goa-ai/blob/main/docs/native-agent-declarations.md)
- [JSON codecs](https://github.com/goadesign/goa-ai/blob/main/docs/json_codecs.md)
