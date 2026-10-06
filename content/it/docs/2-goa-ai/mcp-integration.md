---
nav_group: guides
title: Integrazione MCP
weight: 50
description: "Crea server MCP con tool, risorse e prompt e usa tool MCP esterni."
llm_optimized: true
aliases:
---

Goa-AI permette sia di **creare server MCP** sia di **usare tool MCP esterni**. Aggiungi dichiarazioni MCP a un servizio Goa per esporre metodi come tool, pubblicare risorse e fornire template di prompt. Il generatore produce gestione del protocollo JSON-RPC e adapter dei servizi. Ospitare un server MCP non richiede l’esecuzione di un agente Goa-AI.

I caller HTTP e stdio inviano richieste autonome con i metadati del protocollo. Non esistono handshake di inizializzazione o sessioni del protocollo. L’interfaccia `Caller` invoca i tool; `Listen` riceve notifiche di modifica. I client JSON-RPC generati da Goa espongono anche le operazioni su risorse, prompt, scoperta e completamento dichiarate dal servizio.

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

### Adattatore CallerFunc

Per implementazioni o test di chiamanti personalizzati:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Adapt a function to the Caller interface
caller := mcpruntime.CallerFunc(func(ctx context.Context, req mcpruntime.CallRequest) (mcpruntime.CallResponse, error) {
    content, structured, err := myCustomMCPCall(ctx, req.Tool, req.Payload)
    if err != nil {
        return mcpruntime.CallResponse{}, err
    }
    return mcpruntime.CallResponse{
        Content:           content,
        StructuredContent: structured,
    }, nil
})
```

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

### Dichiarare una fonte di sottoscrizioni alle risorse

Un servizio MCP HTTP con risorse può marcare un metodo di streaming server con `ResourceSubscription()`. L’input facoltativo `resources` contiene URI. L’unione obbligatoria `change` contiene `acknowledged` con un array facoltativo `resources`, oppure `updated` con un `uri` obbligatorio. Dichiarare `Format(FormatURI)` per ogni URI. La fonte autorizza e conferma un sottoinsieme, poi invia modifiche fino al ritorno o all’annullamento.

Solo una fonte di risorse collegata pubblicizza le sottoscrizioni. La fonte possiede autorizzazione, rilevamento delle modifiche e selezione delle sottorisorse correlate. Il generatore conserva l’endpoint Goa configurato, incluse credenziali, scope, interceptor e middleware. Il trasporto condiviso possiede ordine e identificatori. I cataloghi fissi non emettono notifiche di modifica del catalogo.

### Risorse, prompt e contenuti multimediali

`ResourceTemplate` collega un URI parametrizzato a un metodo di lettura tipizzato. `Prompt` collega un metodo che restituisce messaggi. `ResourceCompletion` e `PromptCompletion` collegano suggerimenti di argomenti tipizzati. `ToolContent` seleziona un campo di contenuti multimediali accanto al risultato strutturato. Questi contratti seguono lo stesso processo di progettazione e generazione Goa dei metodi ordinari.

### Ripetere una risposta di tool interrotta

HTTP esegue un tentativo per impostazione predefinita. L’host può configurare `HTTPRetryPolicy` per un endpoint affidabile. Una risposta interrotta viene ripetuta solo se il tool dichiara comportamento di sola lettura o idempotente e la politica si fida delle dichiarazioni. Il nuovo tentativo usa un altro ID e può eseguire nuovamente il tool. Errori, risposte non valide, errori dei callback e interruzioni delle sottoscrizioni non autorizzano nuovi tentativi.

Un errore nella preparazione locale della richiesta non implica che il tool sia stato eseguito. Un annullamento rilevato prima dell’invio impedisce la richiesta. Dopo che un tentativo raggiunge il client HTTP, perdere la risposta lascia l’esito sconosciuto. Sia gli errori locali del client sia gli esiti sconosciuti interrompono il recupero dell’agente.

### Autorizzazione con segreto client

`NewClientCredentialsHTTPTransport` ottiene un token tramite identificativo client e segreto preregistrati per una risorsa HTTPS e un emittente precisi, prima di inviare richieste MCP. Passa questo trasporto al client HTTP generato o a `HTTPOptions.Client`: entrambi usano lo stesso percorso di autorizzazione. Il segreto resta nel modulo POST inviato all’endpoint dei token; solo il token Bearer opaco raggiunge l’header di autorizzazione MCP. L’emittente deve dichiarare `client_credentials`, `client_secret_post` e `client_secret_basic`. Questo primo profilo rifiuta i reindirizzamenti e non ripete le risposte 401/403. URL delle challenge, consenso, PKCE, modifiche delle autorizzazioni e verifica dei token sul server restano da implementare: il supporto OAuth non è completo.

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
