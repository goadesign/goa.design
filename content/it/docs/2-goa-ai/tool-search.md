---
nav_group: guides
title: "Ricerca degli strumenti e cataloghi dinamici"
linkTitle: "Ricerca degli strumenti e cataloghi dinamici"
weight: 25
description: "Generare le scelte di caricamento e consumare cataloghi variabili senza un archivio separato degli strumenti caricati."
llm_optimized: true
---

La ricerca carica le definizioni quando servono al modello. Un registro permette ai provider di cambiare gli strumenti disponibili senza ricompilare il consumer. Sono scelte indipendenti: gli strumenti statici possono usare la ricerca e quelli dinamici possono essere presentati subito.

## Scegliere quali strumenti caricare tramite ricerca

Supponiamo che il toolset compilato `Records` definisca `lookup`, `search` e `analyze`. Mantieni subito disponibile `lookup`, usato di frequente, differendo solo gli altri due:

```go
Agent("assistant", "Find and analyze records.", func() {
    Use(Records, func() {
        Deferred("search", "analyze")
    })
})
```

Solo `search` e `analyze` vengono caricati tramite ricerca; `lookup` viene presentato subito. Questo cambia il caricamento delle definizioni, non i permessi né l’esecuzione. La scelta appartiene al `Use` del consumer, mai a una definizione condivisa di `Toolset` o a un `Export`. Provider condivisi, esportazioni e altri consumer restano invariati.

I nomi devono corrispondere esattamente ai nomi locali dichiarati nel toolset compilato: `"search"`, non `"records.search"` né un nome Go generato. La selezione per nome supporta strumenti locali, agenti esposti come strumenti, strumenti MCP esterni con schemi dichiarati e strumenti MCP basati su Goa.

- `Deferred()` seleziona tutti gli strumenti di quel `Use`; ripeterlo è valido.
- Più dichiarazioni con nomi combinano le selezioni: `Deferred("search")` seguito da `Deferred("analyze")` seleziona entrambi.
- I nomi vuoti o duplicati vengono rifiutati, anche tra dichiarazioni diverse. La generazione del codice rifiuta i nomi sconosciuti dopo aver raccolto l’elenco completo degli strumenti compilati.
- Combinare `Deferred()` con una selezione per nome nello stesso `Use` viene rifiutato.

## Consumare un catalogo variabile

Per un catalogo variabile, usa `Registry`. Sia i toolset `FromRegistry` sia i registri interi rifiutano le selezioni per nome di `Deferred`, perché i loro strumenti vengono risolti durante l’esecuzione:

```go
var Company = Registry("company", func() {
    URL("https://registry.example")
})
var Records = Toolset(FromRegistry(Company, "records"))

var _ = Service("assistant", func() {
    Agent("reader", "Read records.", func() {
        Use(Records, func() { Deferred() })
    })
    Agent("generalist", "Use the company catalog.", func() {
        Use(Company, func() { Deferred() })
    })
})
```

Il lettore risolve un toolset obbligatorio; il generalista risolve tutti quelli attualmente elencati. Rimuovere `Deferred()` presenta subito lo stesso catalogo. Una fonte nominata può richiedere `Version("1.2.3")`: verifica la versione pubblicata, senza selezionarne una archiviata.

Fonti duplicate o sovrapposte, strumenti definiti inline su riferimenti al registro ed esportazione di questi riferimenti sono rifiutati. Il provider possiede le definizioni; la policy di esecuzione filtra il catalogo prima di inviarlo al modello.

I riferimenti al registro rifiutano anche `Tags(...)` e `PublishTo(...)` del consumer. I tag appartengono al provider; il consumer li filtra tramite la policy di esecuzione.

## Connessione e pubblicazione

Costruisci il client di servizio generato del registro distribuito (`registry/gen/registry.Client`) e il client Pulse per i risultati all’avvio dell’applicazione. Connettili prima delle esecuzioni:

```go
if err := rt.RegisterRegistry("company", registryClient, pulseClient); err != nil {
    return err
}
if err := genreader.RegisterReaderAgent(ctx, rt, genreader.ReaderAgentConfig{
    Planner: myPlanner,
}); err != nil {
    return err
}
client := genreader.NewClient(rt)
```

`Definition()` e `NewClient(rt)` non richiedono cataloghi e non fanno chiamate di rete. Registra gli strumenti compilati con i consueti helper generati. Il runtime esegue quelli del registro senza callback di discovery o executor dinamici personalizzati. I client HTTP del catalogo sono un trasporto separato per server HTTP corrispondenti.

I provider pubblicano `ToolSchemas()` generato con l’impronta dello schema e il ciclo di registrazione esistente. `ConsumerContract` include termini di ricerca, metadati dei campi, etichette obbligatorie, conferma, paginazione e dati riservati al server. Gli strumenti dinamici di servizio supportano queste funzioni; quelli di agenti figli e controllo restano compilati. Registrazioni con soli schemi e tipi di esecuzione non supportati falliscono esplicitamente.

## Chi esegue la ricerca?

- **OpenAI Responses, diretto o Bedrock:** il modello emette ricerche native lato client. L’adattatore ordina nomi, titoli e descrizioni consentiti con BM25, un algoritmo di rilevanza basato sulle parole, e restituisce le definizioni corrispondenti. La prima richiesta contiene solo uno strumento di query, senza directory di nomi o descrizioni. Il catalogo differito rimane nell’applicazione.
- **Anthropic Messages, diretto o Bedrock:** si invia il catalogo consentito con flag di caricamento differito e ricerca ospitata di Claude. Il provider cerca ed espande le definizioni. Su Bedrock usa `NewAnthropic`, Messages e InvokeModel; Converse non implementa questa ricerca.
- **Altri adattatori:** il discovery non supportato restituisce `model.ErrToolSearchUnsupported`, senza ripiego sul caricamento immediato.

I planner passano `input.Agent.AdvertisedToolDefinitions()` e i messaggi attuali, specificando modello o classe. La ricerca resta nell’adattatore; il planner riceve chiamate ordinarie. OpenAI richiede `MaxTokens` positivo o `MaxCompletionTokens` nell’adattatore; i turni di ricerca condividono il budget di output dell’invocazione.

## Modifiche e cronologia

I risultati della ricerca OpenAI inseriscono ogni funzione selezionata in un namespace nativo con lo stesso nome usato dal provider. Bedrock restituisce così un’identità completa della chiamata per la riproduzione. Questa rappresentazione appartiene all’adattatore; non servono un DSL per i namespace, una mappatura applicativa o uno stato separato degli strumenti caricati. Gli strumenti caricati subito mantengono la rappresentazione esistente. Le cronologie Bedrock create con funzioni dinamiche prive di questo contenitore possono includere chiamate senza namespace che Bedrock rifiuta durante la riproduzione. Avvia una nuova conversazione o rimuovi deliberatamente l’intero scambio interessato; l’adattatore non inventa mai i campi mancanti del provider.

Ogni attività di pianificazione che può iniziare lavoro legge le fonti una volta e mantiene il catalogo durante l’inferenza. La successiva le rilegge, includendo nuovi provider. Le attività dedicate alla risposta finale e i finalizzatori espliciti non leggono il registro. Un registro completo vuoto è valido; fonti nominate assenti, versioni errate, identità duplicate, errori di lettura e rimozioni durante la risoluzione falliscono esplicitamente.

Una chiamata accettata conserva solo la definizione selezionata, l’eventuale partner fisso di paginazione e il token di registrazione esistente. Conferma, decodifica e ripristino usano quel contratto salvato senza leggere il catalogo attuale. `CallResolvedTool` controlla il token prima della pubblicazione; una sostituzione prima della pubblicazione registra `call_not_admitted`. I retry per sovraccarico conservano il token e restituiscono `admission_conflict` se quell’ammissione è stata sostituita. Le chiamate pubblicate mantengono assegnazione e risultato originali.

La ricerca nativa resta nei metadati dei messaggi. Preservali durante archiviazione e compattazione. Non esiste un database separato degli strumenti caricati. Le definizioni storiche spiegano vecchie chiamate; consumo e policy attuali autorizzano quelle nuove.

La cronologia di aggiunte/rimozioni di Claude richiede un modello compatibile. Una definizione modificata sotto un nome conservato non può essere riprodotta dal protocollo e viene rifiutata. Avvia una nuova conversazione o compatta deliberatamente per rimuovere quella definizione; l’adattatore non azzera silenziosamente la cronologia. La continuazione delle pause di Claude contenenti solo lavoro nativo non è implementata.

## Esempi e aggiornamento

Rigenera l’agente consumer dopo aver modificato la sua selezione `Deferred`. La generazione del codice prepara i conteggi delle parole di ricerca ed emette gli ID fissi esistenti degli strumenti selezionati tramite la stessa API del runtime. La selezione per nome non aggiunge API del provider, stato del provider o namespace.

Rigenera provider e consumer con Goa v3.31.1. Sostituisci `Discover`, gli input `RegistryToolsets` e gli executor dinamici con `RegisterRegistry`. Aggiorna il registro per esporre `ResolveToolset` e `CallResolvedTool`, poi pubblica `ToolSchemas()` completo prima di abilitare i consumer dinamici. Le vecchie registrazioni con soli schemi restano utilizzabili dalle integrazioni statiche, ma non da questa modalità dinamica.

I template di conferma usano nomi JSON come `{{ .key }}`, invece di campi Go come `{{ .Key }}`. Usa `{{ json .value }}` per valori JSON e `index` per proprietà opzionali.

Il quickstart goa-ai include `go run ./cmd/tool-search -provider openai -model YOUR_MODEL_ID`, oppure `-provider anthropic`, con la variabile d’ambiente della chiave API corrispondente. Il comando opzionale effettua chiamate a pagamento; il quickstart normale resta senza credenziali. L’helper restituisce l’esempio fisso di Tokyo. Il test SDK locale copre ricerca, esecuzione e replay. Un solo strumento non dimostra risparmio di token: misura qualità e utilizzo sul modello e catalogo reali.
