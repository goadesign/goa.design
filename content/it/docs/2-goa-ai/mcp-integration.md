---
nav_group: guides
title: Integrazione MCP
weight: 50
description: "Crea server e client MCP tipizzati con autorizzazione, input utente, lavori durevoli, Apps e Skills."
llm_optimized: true
aliases:
---

Goa-AI permette sia di **creare server MCP** sia di **usare tool MCP esterni**. Aggiungi dichiarazioni MCP a un servizio Goa per esporre metodi come tool, pubblicare risorse e fornire template di prompt. Il generatore produce gestione del protocollo JSON-RPC e adapter dei servizi. Ospitare un server MCP non richiede l’esecuzione di un agente Goa-AI.

I caller HTTP e stdio inviano richieste autonome con i metadati del protocollo. Non esistono handshake di inizializzazione o sessioni del protocollo. L’interfaccia `Caller` invoca i tool; `Listen` riceve notifiche di modifica. I client JSON-RPC generati da Goa espongono anche le operazioni su risorse, prompt, scoperta e completamento dichiarate dal servizio.

I server HTTP generati accettano anche client MCP di base `2025-11-25` sullo stesso URL POST. Rigenera il server; interfacce dei servizi e costruttori restano invariati. `initialize` risponde con `2025-11-25`, poi le chiamate inviano `MCP-Protocol-Version: 2025-11-25` senza ID di sessione. Tool, risorse, prompt e completamento degli argomenti mantengono autenticazione, autorizzazione, middleware e validazione tipizzata. I risultati oggetto conservano la loro forma; scalari, array e unioni senza etichetta usano `{"value": ...}` e uno schema oggetto corrispondente. I risultati strutturati sono inclusi anche come contenuto testuale. Questo percorso precedente non offre Tasks, sottoscrizioni alle modifiche o richieste di input aggiuntivo al client. I caller integrati continuano a usare `2026-07-28`.

Un solo design definisce schemi dei tool, decodifica tipizzata, validazione, adapter del server e client. Gli endpoint Goa configurati conservano autenticazione, autorizzazione, middleware e comportamento applicativo. Sviluppatori e agenti di programmazione modificano il contratto e il codice applicativo; `goa gen` mantiene coerenti le interfacce derivate. I server MCP generati usano HTTP. I client per sottoprocessi restano disponibili; la generazione di server stdio è rimandata.

Prima di generare questo server, installa la versione di sviluppo verificata e la dipendenza Goa corrispondente seguendo la [configurazione del modulo nella guida rapida](../quickstart/).

| Esigenza | Dichiarazione o composizione |
|---|---|
| Tool, risorse, prompt e suggerimenti | `Tool`, `Resource`, `ResourceReader`, `Prompt`, `PromptCompletion`, `ResourceCompletion` |
| Cataloghi autorizzati e notifiche | `ToolCatalog`, `PromptCatalog`, `ResourceCatalog`, `ResourceTemplateCatalog`, `SubscriptionSource` |
| Moduli utente o consenso ad aprire un URL | `InputExchange` su un metodo Goa esistente |
| Lavori asincroni e risposte successive dell’host | `TaskExchange` con metodi di creazione, lettura, risposta e annullamento |
| Interfacce nel browser dell’host MCP | `ToolUI`, `ToolVisibility`, `ToolMetadata` e risorse ordinarie |
| Istruzioni e file di supporto | `SkillCatalog`, `SkillLookup`, `ResourceDirectory` facoltativo e caricamento gestito dall’host |

Inizia dal server qui sotto e aggiungi le funzionalità necessarie.

## Panoramica

L'integrazione MCP segue questo flusso di lavoro:

1. **Progettazione del servizio**: Dichiarare il server MCP tramite il DSL MCP di Goa
2. **Progettazione dell'agente**: Fare riferimento alla suite con un toolset dichiarato tramite `FromMCP(...)` o `FromExternalMCP(...)`
3. **Generazione del codice**: Produce il server MCP JSON-RPC (quando è generato da Goa), oltre agli helper di registrazione a runtime e alle specs/codecs di proprietà del toolset (suite)
4. **Cablaggio runtime**: Istanziare un `mcpruntime.Caller` HTTP o stdio. Il caller HTTP accetta una risposta JSON o uno stream di eventi HTTP. Gli helper generati registrano il toolset e adattano gli errori JSON-RPC in valori `planner.ToolFailure`
5. **Esecuzione del planner**: I planner costruiscono le chiamate con i descrittori tipizzati generati; il runtime inoltra il JSON canonico al chiamante MCP, registra i risultati ed espone telemetria strutturata

---

## Dichiarazione degli insiemi di strumenti MCP

### In Service Design

Innanzitutto, dichiarare il server MCP nel progetto del servizio Goa:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })
    
    StaticPrompt("find-docs", "Help a user find documentation",
        "user", "Find relevant documentation for the user's question.")

    Method("readme", func() {
        Result(String)
        Resource("readme", "file:///docs/README.md", "text/markdown")
    })

    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
        })
        Tool("search", "Search documents by query")
    })
})
```

### Nella progettazione dell'agente

Fare quindi riferimento alla suite MCP nel proprio agente:

```go
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Server MCP esterni con schemi in linea

Per i server MCP esterni (non supportati da Goa), dichiarare gli strumenti con schemi in linea:

```go
var RemoteSearch = Toolset("remote-search", FromExternalMCP("remote", "search"), func() {
    Tool("web_search", "Search the web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

---

## Valori URL e attributi mappati

Usa la notazione Goa `Param("payload_field:url_name")` per distinguere un campo del payload da un parametro URL:

```go
JSONRPC(func() {
    POST("/organizations/{organization}/mcp")
    Param("organization_id:organization")
})
```

L’URL fornisce `organization_id`. Gli argomenti di strumenti e prompt, gli schemi, gli esempi e i codec generati escludono questo campo. Un campo di dominio indipendente chiamato `organization` rimane un argomento. Ogni metodo conserva il tipo, il nome del campo Go e la validazione dichiarati. I valori URL non validi vengono rifiutati prima di eseguire l’endpoint configurato. I percorsi completi dell’API e del servizio padre vengono conservati.

I client di protocollo generati trasportano questi valori fuori dai parametri JSON-RPC. Il `NewCaller` generato li riceve nell’ordine del percorso dopo la politica di tentativi; per questo percorso, passa `"blue"` come ultimo argomento. Il chiamante conserva lo stesso indirizzo per ogni chiamata. `NewHTTPCaller` riceve l’URL completo, per esempio `https://example.com/organizations/blue/mcp`. Rigenera insieme client, server e contratti degli agenti.

---

## Ospitare il server generato

Passare gli endpoint Goa originali già configurati a `NewMCPAdapter`, poi costruire il server HTTP generato. Passare le origini del browser consentite come ultimi argomenti stringa del costruttore `New`, ad esempio `"https://app.example.com"`. Senza origini, vengono accettate le richieste senza header `Origin` e rifiutate quelle che lo includono.

Usare `Server.Use` per installare il middleware HTTP prima delle richieste. `Mount(mux)` e le chiamate dirette a `ServeHTTP` condividono i controlli di origini, metodi HTTP, header MCP e metadati prima del middleware o del servizio. La lista delle origini viene copiata durante la costruzione. Sostituire `MountWithOrigins` con gli argomenti del costruttore e usare `ServeHTTP` al posto del campo interno `Handler`, che viene rimosso. Rigenerare i server e aggiornare insieme i loro chiamanti.

Se un plugin del generatore dichiara dipendenze obbligatorie del server nel piano di costruzione di Goa, passare i loro valori tipizzati prima degli argomenti finali delle origini. L’avvio dell’esempio nativo chiama le corrispondenti funzioni di costruzione dell’applicazione. Configurare queste funzioni prima di avviare il server di esempio.

Per le route con parametri URL, registrare `ServeHTTP` nello stesso mux passato a `New`, oppure usare `Mount(mux)`. Il mux fornisce i valori del percorso ai decoder generati.

---

## Cablaggio in fase di esecuzione

In fase di esecuzione, istanziare un chiamante MCP e registrare il set di strumenti:

```go
import (
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    genchat "example.com/assistant/gen/orchestrator/agents/chat"
    genmcpexec "example.com/assistant/gen/orchestrator/agents/chat/assistant_mcp"
)

// Create an HTTP MCP caller.
caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
if err != nil {
    log.Fatal(err)
}

// Register the MCP toolset
if err := genchat.RegisterUsedToolsets(ctx, rt,
    genchat.WithAssistantMcpExecutor(genmcpexec.NewMCPExecutor(caller)),
); err != nil {
    log.Fatal(err)
}
```

---

## Tipi di chiamante MCP

Goa-AI supporta HTTP e stdio attraverso il pacchetto `runtime/mcp`. Entrambi i
chiamanti implementano l'interfaccia `Caller`:

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
    GetTask(ctx context.Context, taskID string) (Task, error)
    UpdateTask(ctx context.Context, taskID string, responses map[string]json.RawMessage) error
    CancelTask(ctx context.Context, taskID string) error
}
```

`CallRequest` contiene nome del tool, argomenti JSON e una continuazione facoltativa di proprietà dell’host. `CallResponse.Content` usa `content.Blocks` di `runtime/content`: valori ordinati di testo, immagine, audio, collegamento a risorsa o risorsa incorporata. Il JSON strutturato rimane separato in `StructuredContent`. `InputRequired` lascia incompleta l’operazione; l’host fornisce l’input richiesto prima di continuare.

### Chiamante HTTP

Per i server MCP accessibili tramite HTTP JSON-RPC:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    Client:   customHTTPClient,
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
```

Il costruttore verifica endpoint e identità dell’applicazione senza richieste di rete. Ogni operazione invia JSON-RPC tramite HTTP `POST` e accetta JSON o un flusso di eventi. Senza `Client`, usa `http.DefaultClient`; l’applicazione definisce le scadenze tramite il contesto e il client HTTP.

### Chiamante Stdio

Per i server MCP in esecuzione come sottoprocessi che comunicano tramite stdin/stdout:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
    Args:    []string{"--config", "config.json"},
    Env:     []string{"MCP_DEBUG=1"}, // Aggiunto all'ambiente corrente.
    Dir:     "/path/to/workdir",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
if err != nil {
    return err
}
defer func() {
    if err := caller.Close(shutdownContext); err != nil {
        log.Print(err)
    }
}()
```

Il caller stdio avvia un sottoprocesso e correla operazioni concorrenti tramite gli ID delle richieste. Ogni richiesta contiene i propri metadati. Chiudere il caller con un contesto di arresto definito dall’applicazione e gestire l’errore restituito.

### Caller personalizzati {#adattatore-callerfunc}

Un caller personalizzato implementa tutti e quattro i metodi dell’interfaccia. `CallerFunc` è stato rimosso: una sola funzione di invocazione non rappresenta lettura, risposte e annullamento dei Task. Gli stati incompleti restano fuori dalla cronologia dei risultati del modello.

### Chiamante JSON-RPC generato da Goa

Per i client MCP generati da Goa che avvolgono i metodi del servizio:

```go
import genmcpclient "example.com/assistant/gen/jsonrpc/mcp_assistant/client"

caller, err := genmcpclient.NewCaller(client, mcpruntime.ClientInfo{
    Name: "my-agent", Version: "1.0.0",
}, mcpruntime.InputSupport{}, mcpruntime.HTTPRetryPolicy{})
if err != nil {
    return err
}
```

## Avanzamento e modifiche delle risorse

Usare `WithProgress(ctx, handler)` per ricevere l’avanzamento prima del risultato finale. Il servizio chiama `ReportProgress`; il trasporto fornisce gli identificatori di correlazione. Un errore del callback interrompe l’operazione e deve essere gestito.

```go
err := caller.Listen(ctx, mcpruntime.SubscriptionFilter{
    ResourceSubscriptions: []string{"file:///docs/README.md"},
}, func(ctx context.Context, event mcpruntime.SubscriptionEvent) error {
    return handleResourceChange(ctx, event)
})
if err != nil {
    return err
}
```

Usare `Listen` per ricevere una conferma seguita dalle modifiche accettate. Verificare il filtro confermato: i tipi non supportati possono essere omessi. L’applicazione implementa `handleResourceChange`, ricarica i dati interessati e rispetta l’annullamento. La perdita della connessione restituisce un errore; il caller non si riconnette automaticamente.

Per un client JSON-RPC generato, usare `WithSubscriptionEvents(ctx, handler)` e chiamare l’endpoint tipizzato `SubscriptionsListen`. L’endpoint restituisce il risultato finale e l’handler riceve eventi validati. Senza handler, la chiamata fallisce prima dell’invio.

### Dichiarare una fonte di modifiche

`SubscriptionSource()` seleziona un metodo di streaming server per modifiche autorizzate a risorse, Task e cataloghi. L’input `resources` seleziona URI; i campi facoltativi `tasks` selezionano identificatori di lavori sotto i nomi dei metodi che li creano. L’unione obbligatoria `change` inizia con `acknowledged`, poi identifica le modifiche. Usa `Format(FormatURI)` per gli URI.

Il metodo originale possiede autorizzazione e rilevamento delle modifiche. Il codice generato legge i lavori modificati tramite gli endpoint di osservazione configurati e invia snapshot completi. Il trasporto condiviso ordina gli eventi e correla le richieste. `ToolCatalog`, `PromptCatalog`, `ResourceCatalog` e `ResourceTemplateCatalog` collegano pagine autorizzate a metodi ordinari. La stessa fonte emette modifiche ai loro elenchi; i cataloghi fissi non ricevono notifiche. Sostituisci `ResourceSubscription()` con `SubscriptionSource()` e rigenera: non esiste un alias compatibile.

### Risorse, prompt e contenuti multimediali

`ResourceTemplate` collega un URI parametrizzato a un metodo di lettura tipizzato. `Prompt` collega un metodo che restituisce messaggi. `ResourceCompletion` e `PromptCompletion` collegano suggerimenti di argomenti tipizzati. `ToolContent` seleziona un campo di contenuti multimediali accanto al risultato strutturato. Questi contratti seguono lo stesso processo di progettazione e generazione Goa dei metodi ordinari.

### Ripetere una risposta di tool interrotta

HTTP esegue un tentativo per impostazione predefinita. L’host può configurare `HTTPRetryPolicy` per un endpoint affidabile. Una risposta interrotta viene ripetuta solo se il tool dichiara comportamento di sola lettura o idempotente e la politica si fida delle dichiarazioni. Il nuovo tentativo usa un altro ID e può eseguire nuovamente il tool. Errori, risposte non valide, errori dei callback e interruzioni delle sottoscrizioni non autorizzano nuovi tentativi.

Un errore nella preparazione locale della richiesta non implica che il tool sia stato eseguito. Un annullamento rilevato prima dell’invio impedisce la richiesta. Dopo che un tentativo raggiunge il client HTTP, perdere la risposta lascia l’esito sconosciuto. Sia gli errori locali del client sia gli esiti sconosciuti interrompono il recupero dell’agente.

## Autorizzazione OAuth {#autorizzazione-con-segreto-client}

Proteggi i metodi MCP con la sicurezza nativa di Goa. Costruisci il verificatore obbligatorio con `NewJWTResourceServer` per token firmati o `NewIntrospectionResourceServer` per token opachi e passalo al costruttore del server generato. Emittente fidato, destinatario, chiavi e credenziali provengono dalla configurazione applicativa. Credenziali mancanti o non valide ricevono 401, scope insufficienti 403 e indisponibilità del verificatore 503. Gli errori applicativi dopo l’invio non diventano challenge di autorizzazione.

I client condividono il normale trasporto HTTP: `NewAuthorizationCodeHTTPTransport` gestisce consenso nel browser, stato, verifica dell’emittente e PKCE S256; `NewClientCredentialsHTTPTransport` ottiene grant per applicazioni riservate; `NewEnterpriseHTTPTransport` scambia credenziali single sign-on validate dall’host. La registrazione sceglie esplicitamente client pubblico, HTTP Basic, segreto nel POST o asserzione firmata. Client preregistrati e documenti di metadati HTTPS hanno costruttori espliciti; la registrazione dinamica deprecata è rimossa.

L’host possiede accesso, emittenti fidati e un `AuthorizationStore` per utente o applicazione. L’autorizzazione durevole richiede persistenza cifrata e serializzazione tra istanze; lo store in memoria dura un processo. Scoperta e challenge vincolano le credenziali all’emittente e al destinatario esatti, anche se l’URL interno di consegna è diverso. Una richiesta iniziale senza credenziali ottiene gli scope prima del consenso. Nuovi scope pubblicizzati non riaprono da soli il consenso. Il client browser o enterprise può recuperare una volta da un rifiuto esplicito precedente all’esecuzione; il rifiuto di un grant macchina è definitivo. Non si ripete un tool dall’esito incerto. Vedi la [guida all’autorizzazione](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#mcp-resource-servers).

## Input aggiuntivo e Task asincroni {#additional-input-and-asynchronous-tasks}

`InputExchange(continuationField, outcomeField)` collega la continuazione facoltativa di un metodo alla sua unione obbligatoria di risultato completo o input richiesto. Le richieste tipizzate descrivono moduli o consenso ad aprire URL; il generatore ricava schemi e decodifica delle risposte dalle espressioni Goa. Solo il ramo completo fornisce il risultato pubblicizzato. Autenticazione e validazione si applicano a ogni passaggio. Stato e risposte dell’host restano fuori dagli argomenti del modello. Il consenso a un URL non prova il completamento dell’interazione esterna: lo verifica l’applicazione.

La stessa dichiarazione funziona tramite MCP, `BindTo` locale e provider del registro. L’agente si sospende e riprende la chiamata incompleta esatta dopo una risposta tipizzata. Usa interazioni URL esterne per dati sensibili, non moduli visibili al modello.

`TaskExchange(read, answer, cancel)` collega metodi di lavori durevoli. La creazione assume durevolmente il lavoro prima di restituire l’identificatore. La lettura restituisce stato in corso, input richiesto, completo, fallito o annullato; risposta e annullamento confermano l’intento, letture successive ne stabiliscono l’effetto. Il servizio possiede persistenza e completamento; l’adapter genera metadati e conversioni senza un secondo archivio di lavori.

Un client diretto usa `WithTaskSupport(ctx)` solo se conserva e osserva `CallResponse.Task`; `GetTask`, `UpdateTask` e `CancelTask` usano lo stesso caller. L’esecuzione generata conserva l’identità, osserva notifiche o legge il lavoro e gestisce input e annullamento attraverso il motore configurato. In produzione servono Temporal e storage applicativo; il motore in memoria dura un processo. Vedi [input e lavori nativi](https://github.com/goadesign/goa-ai/blob/main/docs/dsl.md#native-job-tools) e [client Task](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#mcp-task-clients).

## MCP Apps {#mcp-apps}

Servi una risorsa HTML `text/html;profile=mcp-app` tramite i metodi ordinari. `ToolUI("ui://...")` la collega al risultato di un tool dello stesso server. `ToolVisibility("model")`, `ToolVisibility("app")` o entrambi scelgono chi può invocarlo; l’omissione permette entrambi. I tool riservati all’app restano fuori dai cataloghi del modello. `ToolMetadata` seleziona dati tipizzati dell’host separati da contenuto e risultati del modello. Anche gli host senza browser ricevono risultati ordinari utili.

L’host possiede isolamento del browser e permessi. L’[esempio mantenuto](https://github.com/goadesign/goa-ai/tree/main/integration_tests/apps) combina endpoint Goa generati, SDK browser ufficiale, frame su origine separata e permessi espliciti. Verifica la visibilità corrente e mantiene i risultati privati fuori dai messaggi del modello.

## MCP Skills {#mcp-skills}

`SkillCatalog()` e `SkillLookup()` dichiarano pagine e ricerca per URI insieme a `ResourceReader()`. Ogni voce conserva URI, tutti i campi di frontmatter e un manifesto stabile di file oppure la dichiarazione `dynamic`. I file stabili hanno URI esatto, dimensione in byte e SHA-256. `ResourceDirectory()` facoltativo elenca i figli immediati, senza attivare istruzioni o ampliare il manifesto conservato.

L’host assegna l’identità del server e conserva la voce completa con il contesto del modello. Prima dell’uso, `mcp.VerifySkillFile(ctx, retainedEntryJSON, uri, bytes)` verifica appartenenza, dimensione e digest, anche per file in cache. Per lo `SKILL.md` della voce confronta ogni campo YAML con la scoperta, inclusi campi futuri e numeri esatti. Le voci dinamiche non superano questa verifica stabile.

Le Skills sono istruzioni non fidate, non messaggi di sistema o permessi per i tool. Uno `SKILL.md` annidato letto come supporto richiede scoperta e consenso propri per essere attivato. L’esecuzione locale richiede consenso esplicito per server, Skill e manifesto completo; un manifesto cambiato revoca il consenso. L’[host di riferimento](https://github.com/goadesign/goa-ai/tree/main/codegen/mcp/testdata/skills_host) combina letture differite e conferma nativa. Contesto e approvazioni durano un processo; applicazioni con persistenza devono conservare le voci e gestire la durata del consenso. Vedi il [contratto completo](https://github.com/goadesign/goa-ai/blob/main/docs/mcp_skills.md).

## Aggiornamento incompatibile {#breaking-upgrade}

Rigenera insieme server, client, executor e provider del registro. Rimuovi inizializzazione, sessioni, selezione del protocollo e decoder di risultati JSON testuali. I caller personalizzati implementano i quattro metodi. Costruisci adapter con endpoint Goa configurati e server protetti con un verificatore. Sostituisci `ResourceSubscription` con `SubscriptionSource` e seleziona i rami completi o in attesa tramite i metodi delle unioni generate.

Peer vecchi e nuovi non possono condividere un endpoint. Completa o risolvi lavori accettati e run salvati incompatibili prima di aggiornare worker, registro e persistenza. Ripristinare una dipendenza non rende leggibili i nuovi dati salvati. Segui la [guida all’aggiornamento](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#preview-upgrade-guide).

---

## Flusso di esecuzione dello strumento

1. Il planner restituisce chiamate costruite dai descrittori MCP generati oppure inoltra chiamate validate con `planner.ToolRequestFromModelCall`
2. Il runtime valida l'intero risultato e assegna gli ID di esecuzione, producendo valori `runtime.ToolCall`
3. Il runtime rileva la registrazione del toolset MCP
4. Inoltra il payload JSON canonico della chiamata runtime al chiamante MCP
5. Il caller MCP usa HTTP o stdio e gestisce il protocollo JSON-RPC. Una risposta HTTP può essere JSON o uno stream di eventi
6. Decodifica il risultato utilizzando il codec generato
7. Restituisce `ToolResult` al pianificatore

---

## Gestione degli errori

Gli helper generati adattano gli errori JSON-RPC in valori `planner.ToolFailure`:

- **Errori di validazione** → errori di chiamata non valida con prove esatte per la correzione
- **Errori di rete** → errori di indisponibilità o timeout con un'azione esplicita di nuova pianificazione o finalizzazione
- **Errori del server** → cause strutturate conservate nell'errore

In questo modo MCP e toolset nativi condividono lo stesso contratto di recupero applicato dal runtime.

Gli errori restituiti da uno strumento diventano `ToolFailure`. Un risultato
finale non valido del planner diventa invece `OutputContractError`: viene
rifiutato senza un'altra richiesta al modello e non viene presentato come errore
dello strumento.

---

## Esempio completo

### Progettazione

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// MCP server service
var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })
    
    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
        })
        Tool("search", "Search documents by query")
    })
})

// Agent that uses MCP tools
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Tempo di esecuzione

Passare l’esecutore generato a `RegisterUsedToolsets` prima di registrare l’agente. L’esempio riceve un runtime già costruito e il proprio planner.

```go
package main

import (
    "context"

    genchat "example.com/assistant/gen/orchestrator/agents/chat"
    genmcpexec "example.com/assistant/gen/orchestrator/agents/chat/assistant_mcp"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
    mcpruntime "goa.design/goa-ai/runtime/mcp"
)

func registerChat(ctx context.Context, rt *runtime.Runtime, p planner.Planner) error {
    caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
        ClientInfo: mcpruntime.ClientInfo{Name: "my-agent", Version: "1.0.0"},
    })
    if err != nil {
        return err
    }
    if err := genchat.RegisterUsedToolsets(ctx, rt,
        genchat.WithAssistantMcpExecutor(genmcpexec.NewMCPExecutor(caller)),
    ); err != nil {
        return err
    }
    return genchat.RegisterChatAgent(ctx, rt, genchat.ChatAgentConfig{Planner: p})
}
```

### Pianificatore

Il pianificatore può fare riferimento agli strumenti MCP come ai set di strumenti nativi:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    call, err := planner.NewToolRequest(
        genmcpspecs.SearchTool(),
        &genmcpspecs.SearchPayload{Query: "golang tutorials"},
    )
    if err != nil {
        return nil, err
    }
    return &planner.PlanResult{ToolCalls: []planner.ToolRequest{call}}, nil
}
```

`genmcpspecs` importa `example.com/assistant/gen/assistant/toolsets/assistant_mcp`. Usare `planner.ToolRequestFromModelCall` per mantenere l’ID di correlazione del provider quando si inoltra una chiamata validata del modello.

---

## Migliori pratiche

- **Lasciare che codegen gestisca la registrazione**: Usare l'helper generato per registrare i toolset MCP; evitare collegamenti scritti a mano, così codec e recupero strutturato dagli errori restano coerenti
- **Utilizzare chiamanti tipizzati**: Preferire i chiamanti JSON-RPC generati da Goa, quando disponibili, per la sicurezza dei tipi
- **Gestire gli errori in modo strutturato**: Mappare gli errori MCP in `ToolFailure` con l'azione di recupero appropriata
- **Monitorare la telemetria**: Le chiamate MCP emettono eventi di telemetria strutturati; usarli per l'osservabilità
- **Scegliere il trasporto giusto**: Utilizzare HTTP per i server remoti e stdio per i server avviati come sottoprocessi. Il chiamante HTTP accetta risposte JSON e flussi di eventi

---

## Prossimi passi

- **[Toolsets](./toolsets.md)** - Comprendere i modelli di esecuzione degli strumenti
- **[Memoria e sessioni](./memory-sessions.md)** - Gestire lo stato con le trascrizioni e gli archivi di memoria
- **[Produzione](./production.md)** - Distribuire con UI temporali e streaming
