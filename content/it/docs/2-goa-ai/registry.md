---
nav_group: reference
title: "Registro interno degli strumenti"
linkTitle: "Registro di sistema"
weight: 110
description: "Deploy a clustered gateway for cross-process toolset discovery and invocation."
llm_optimized: true
---

Il **Registro degli strumenti interni** è un servizio di gateway in cluster che consente di individuare e invocare i set di strumenti attraverso i confini dei processi. È progettato per scenari in cui i set di strumenti sono forniti da servizi separati che possono scalare indipendentemente dagli agenti che li utilizzano.

## Panoramica

Il registro funge sia da **catalogo** che da **gateway**:

- **Catalogo**: Gli agenti scoprono i set di strumenti disponibili, i loro schemi e il loro stato di salute
- **Gateway**: Le chiamate agli strumenti vengono instradate attraverso il registro ai fornitori tramite i flussi Pulse

Questo disaccoppia gli agenti dai fornitori di set di strumenti, consentendo di scalare, distribuire e gestire il ciclo di vita in modo indipendente.

### Tool Registry vs Prompt Registry

Sono sistemi distinti con responsabilita diverse:

- **Registro interno degli strumenti** (questa pagina): scoperta/invocazione cross-process di toolset e tool call.
- **Prompt Registry del runtime** (`runtime.PromptRegistry`): registrazione e rendering in-process delle prompt spec, opzionalmente con un prompt store (`runtime.WithPromptStore`).

Il registro strumenti non memorizza template di prompt e non risolve override di prompt.
Il rendering dei prompt resta nel layer runtime/planner ed emette eventi di osservabilita `prompt_rendered`.

{{< figure src="/images/diagrams/RegistryTopology.svg" alt="Agent-Registry-Provider Topology" >}}

## Clustering multi-nodo

Più nodi del registro possono partecipare allo stesso registro logico usando lo stesso `Name` nella loro configurazione e collegandosi alla stessa istanza di Redis.

I nodi con lo stesso nome si collegano automaticamente:

- **Condividono le registrazioni del toolset** tramite le mappe replicate di Pulse
- **Coordinano i ping di salute** con lease Redis a scadenza, acquisiti separatamente per ogni toolset
- **Condividere lo stato di salute del provider** tra tutti i nodi

Ciò consente la scalabilità orizzontale e l'alta disponibilità. I client possono connettersi a qualsiasi nodo e vedere lo stesso stato del registro.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## Avvio rapido

### Utilizzo della libreria

Crea ed esegui un nodo del registro da codice. `registry.New` inizializza
il catalogo e i record delle chiamate in Redis, i flussi Pulse e lo scheduler
di salute. `Run` avvia il server gRPC e attende l'arresto. L'esempio usa
indirizzi locali di sviluppo; configura le credenziali Redis e gRPC del tuo
deployment.

```go
package main

import (
    "context"
    "log"

    "github.com/redis/go-redis/v9"
    "goa.design/goa-ai/registry"
)

func main() {
    ctx := context.Background()

    // Connect to Redis
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    defer rdb.Close()

    // Create the registry
    reg, err := registry.New(ctx, registry.Config{
        Redis: rdb,
        Name:  "my-registry",  // Nodes with same name form a cluster
    })
    if err != nil {
        log.Fatal(err)
    }

    // Run the gRPC server (blocks until shutdown)
    log.Println("starting registry on :9090")
    if err := reg.Run(ctx, ":9090"); err != nil {
        log.Fatal(err)
    }
}
```

### Esempio di binario

Il pacchetto del registro include un binario di esempio per una rapida distribuzione. Tutti i nodi con lo stesso `REGISTRY_NAME` che puntano alla stessa istanza di Redis formano automaticamente un cluster: condividono le registrazioni del toolset e coordinano i controlli di salute senza ulteriori configurazioni.

```bash
# Single node (development)
REDIS_URL=localhost:6379 go run ./registry/cmd/registry

# Multi-node cluster (production)
REGISTRY_NAME=prod REGISTRY_ADDR=:9090 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9091 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9092 REDIS_URL=redis:6379 ./registry
```

### Variabili d'ambiente

| Variabile | Descrizione | Predefinito |
|----------|-------------|---------|
| `REGISTRY_ADDR` | Indirizzo di ascolto di gRPC | `:9090` |
| `REGISTRY_NAME` | Nome del cluster del registro | `registry` |
| `REDIS_URL` | URL di connessione a Redis | `localhost:6379` |
| `REDIS_PASSWORD` | Password di Redis | (nessuno) |
| `PING_INTERVAL` | Intervallo di ping per il controllo dello stato di salute | `10s` |
| `MISSED_PING_THRESHOLD` | Ping mancati prima dell'insalubrità | `3` |

## Architettura

{{< figure src="/images/diagrams/RegistryArchitecture.svg" alt="Registry Internal Architecture" >}}

### Componenti

| Componente | Descrizione |
|-----------|-------------|
| **Servizio** | Gestori gRPC per la scoperta e l'invocazione |
| **Catalogo** | Schemi degli strumenti, identità di ammissione, lease dei provider e cronologia dei ritiri conservati in Redis |
| **Health Tracker** | Monitora l'efficienza del provider tramite ping/pong |
| **Stream Manager** | Gestisce i flussi Pulse per l'instradamento delle chiamate agli strumenti |
| **Record delle chiamate** | Conservano identità della richiesta, provider assegnato, scadenze, stato di pubblicazione e risultato finale canonico |

### Flusso delle chiamate agli strumenti

Quando viene invocato `CallTool`, il registro esegue i seguenti passaggi in sequenza:

1. **Convalida dell'identità e dello schema**: Il registro convalida il payload
   e ricava un `tool_use_id` univoco nell'esecuzione. Un nuovo tentativo identico
   si collega allo stesso record conservato.
2. **Attesa di un provider**: Una chiamata non ancora pubblicata attende che il
   toolset attivo abbia un provider sano, entro la scadenza di esecuzione già
   prevista per la chiamata.
3. **Pubblicazione atomica**: Un'operazione Redis verifica che il provider
   selezionato sia ancora quello corrente e accetti nuove chiamate, poi aggiunge
   la richiesta esattamente una volta. Se un deployment ha cambiato provider
   dopo il controllo di salute, la chiamata non ancora pubblicata seleziona il
   sostituto e riprova entro la stessa scadenza.
4. **Esecuzione immutabile**: La pubblicazione fissa l'assegnazione al provider.
   La chiamata non può più essere spostata perché potrebbe essere già iniziato
   un effetto esterno.
5. **Consegna del risultato**: `CallTool` restituisce il token esatto del
   provider, l'identità del flusso dei risultati e le scadenze di esecuzione e
   conservazione. L'esecutore legge quel flusso finché il provider restituisce
   un risultato finale o la scadenza di esecuzione determina l'esito della
   chiamata.

Se la scadenza di esecuzione arriva prima della pubblicazione, il registro
memorizza `call_not_admitted`, consentendo all'esecutore di scegliere un altro
piano. Una chiamata pubblicata con esito incerto restituisce `outcome_unknown`
e non può essere sostituita.

## Integrazione del provider (lato servizio)

L'instradamento tramite registro è solo metà della storia: i **provider devono eseguire un loop di esecuzione degli strumenti** all'interno del processo del servizio proprietario del toolset.
Prima di invocare un gestore, il provider chiama `ClaimToolCall` usando il
contesto del ciclo di vita del proprio worker e il timeout limitato già previsto
per questa richiesta, indipendentemente dalla scadenza di esecuzione del
messaggio. Il registro stabilisce se la chiamata è scaduta, ha già un risultato
finale o se un'altra consegna detiene il diritto di esecuzione. In questi casi, il
provider conferma la ricezione del messaggio senza invocare il gestore né arrestare il
loop di esecuzione. Solo dopo una decisione `execute` invoca il gestore con la
scadenza di esecuzione originale del messaggio, senza prolungarla.

Per i toolset di proprietà del servizio e supportati da metodi (strumenti dichiarati con `BindTo(...)`), la generazione del codice emette un adattatore provider in:

- `gen/<service>/toolsets/<toolset>/provider.go`

Il provider generato:

- Decodifica il JSON del payload in ingresso usando il codec del payload generato
- Costruisce il payload del metodo Goa usando le trasformazioni generate
- Chiama il metodo del servizio collegato
- Codifica il JSON del risultato insieme a qualsiasi server-data dichiarata (server-data opzionali per gli osservatori e server-data always-on lato server) usando il codec del risultato generato

L'esempio seguente usa il modulo `example.com/registry-provider`, il servizio
`catalog` e il relativo toolset `search`, collegato ai metodi e registrato come
`catalog.search`. Sostituisci i due percorsi di importazione dell'applicazione e
il nome del toolset con i valori generati per il tuo progetto. `NewProvider`,
`ToolSchemas` e `SchemaFingerprint` provengono dal package generato del toolset;
mantieni intatti gli schemi generati. I callback di registrazione seguono
l'esempio **Service-Side Tool Providers** nel file `AGENTS_QUICKSTART.md`
generato alla radice del modulo ([Avvio rapido](../quickstart/)).

Passa l'implementazione del servizio, un client Pulse creato con
`pulse.New(pulse.Options{Redis: rdb})` e una connessione gRPC al registro creata
con `grpc.NewClient` e le credenziali del deployment. Fornisci un `providerID`
stabile per questo processo e toolset, univoco tra le repliche attive, e il
valore obbligatorio `admissionRevision`, fornito dal deployment e condiviso
dalle repliche della stessa registrazione. `Serve` crea l'identificatore
dell'istanza e lo passa ai callback. I metodi di servizio collegati devono
rispettare l'annullamento del contesto. Esegui `serveTools` nel ciclo di vita
del servizio e attendine il ritorno prima di chiudere uno dei client.
All'arresto, il provider smette di accettare lavoro e finalizza le chiamate di
cui possiede l'esecuzione, i risultati e le conferme di ricezione entro
`Options.ShutdownTimeout`. Solo una finalizzazione riuscita consente di
rilasciare il lease esatto, con il limite di tempo separato
`Registration.ReleaseTimeout`. Se la finalizzazione fallisce, l'autorità
termina alla scadenza del lease. Conserva e segnala gli errori di
finalizzazione o rilascio anche quando l'errore restituito corrisponde anche a
`context.Canceled`. Tutti i callback di registrazione obbligatori sono
collegati qui sotto:

```go
package providers

import (
	"context"
	"encoding/json"
	"time"

	gencatalog "example.com/registry-provider/gen/catalog"
	gensearch "example.com/registry-provider/gen/catalog/toolsets/search"
	"goa.design/goa-ai/features/stream/pulse/clients/pulse"
	genregistrygrpc "goa.design/goa-ai/registry/gen/grpc/registry/client"
	genregistry "goa.design/goa-ai/registry/gen/registry"
	registrywire "goa.design/goa-ai/runtime/toolregistry"
	"goa.design/goa-ai/runtime/toolregistry/provider"
	"google.golang.org/grpc"
)

// serveTools runs the generated catalog provider until shutdown or a provider error.
// The caller owns the clients, service implementation, and deployment identifiers.
func serveTools(ctx context.Context, pulseClient pulse.Client, conn *grpc.ClientConn,
	serviceImpl gencatalog.Service, providerID, admissionRevision string) error {
	const toolsetID = "catalog.search"
	transport := genregistrygrpc.NewClient(conn, grpc.WaitForReady(true))
	registryClient := genregistry.NewClient(
		transport.Register(),
		transport.ReleaseProvider(),
		transport.DrainProvider(),
		transport.Unregister(),
		transport.Pong(),
		transport.ListToolsets(),
		transport.GetToolset(),
		transport.ResolveToolset(),
		transport.CheckAdmission(),
		transport.Search(),
		transport.CallTool(),
		transport.CallResolvedTool(),
		transport.RetryTool(),
		transport.CompleteToolCall(),
		transport.PublishToolOutputDelta(),
		transport.ReportToolCallOverload(),
		transport.ClaimToolCall(),
	)
	toolSchemas := gensearch.ToolSchemas()
	handler := gensearch.NewProvider(serviceImpl)
	return provider.Serve(ctx, pulseClient, toolsetID, handler,
		provider.Registration{
			AdmissionRevision: admissionRevision,
			Register: func(ctx context.Context, toolset, providerID, incarnationID, admissionRevision string) (provider.RegistrationLease, error) {
				schemaFingerprint, err := gensearch.SchemaFingerprint(toolset)
				if err != nil {
					return provider.RegistrationLease{}, err
				}
				result, err := registryClient.Register(ctx, &genregistry.RegisterPayload{
					Name:                  toolset,
					Tools:                 toolSchemas,
					ProviderID:            providerID,
					ProviderIncarnationID: incarnationID,
					AdmissionRevision:     admissionRevision,
					WireProtocolVersion:   registrywire.WireProtocolVersion,
					SchemaFingerprint:     schemaFingerprint,
				})
				if err != nil {
					return provider.RegistrationLease{}, err
				}
				return provider.RegistrationLease{
					RegistrationToken: result.RegistrationToken,
					Duration:          time.Duration(result.LeaseDurationMs) * time.Millisecond,
				}, nil
			},
			Drain: func(ctx context.Context, toolset, providerID, incarnationID, expectedToken string, settlementDuration time.Duration) error {
				return registryClient.DrainProvider(ctx, &genregistry.DrainProviderPayload{
					Name:                      toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ExpectedRegistrationToken: expectedToken,
					SettlementDurationMs:      settlementDuration.Milliseconds(),
				})
			},
			Release: func(ctx context.Context, toolset, providerID, incarnationID, expectedToken string) error {
				return registryClient.ReleaseProvider(ctx, &genregistry.ReleaseProviderPayload{
					Name:                      toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ExpectedRegistrationToken: expectedToken,
				})
			},
			Complete: func(ctx context.Context, toolset, providerID, incarnationID, providerToken, requestEventID string, result registrywire.ToolResultMessage) error {
				resultJSON, err := json.Marshal(result)
				if err != nil {
					return err
				}
				return registryClient.CompleteToolCall(ctx, &genregistry.CompleteToolCallPayload{
					Toolset:                   toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					RegistrationToken:         result.RegistrationToken,
					ToolUseID:                 result.ToolUseID,
					ResultJSON:                resultJSON,
					RequestEventID:            requestEventID,
					ProviderRegistrationToken: providerToken,
				})
			},
			PublishOutputDelta: func(ctx context.Context, toolset, providerID, incarnationID, providerToken, callToken, toolUseID, requestEventID, stream, delta string) error {
				return registryClient.PublishToolOutputDelta(ctx, &genregistry.PublishToolOutputDeltaPayload{
					Toolset:                   toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ProviderRegistrationToken: providerToken,
					CallRegistrationToken:     callToken,
					ToolUseID:                 toolUseID,
					RequestEventID:            requestEventID,
					Stream:                    stream,
					Delta:                     delta,
				})
			},
			ReportOverload: func(ctx context.Context, toolset, providerID, incarnationID, providerToken, callToken, toolUseID, requestEventID string) error {
				return registryClient.ReportToolCallOverload(ctx, &genregistry.ProviderToolCallClaimPayload{
					Toolset:                   toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ProviderRegistrationToken: providerToken,
					CallRegistrationToken:     callToken,
					ToolUseID:                 toolUseID,
					RequestEventID:            requestEventID,
				})
			},
			Claim: func(ctx context.Context, claim provider.ClaimRequest) (provider.ClaimDisposition, error) {
				result, err := registryClient.ClaimToolCall(ctx, &genregistry.ClaimToolCallPayload{
					Toolset:                   claim.Toolset,
					ProviderID:                claim.ProviderID,
					ProviderIncarnationID:     claim.ProviderIncarnationID,
					ProviderRegistrationToken: claim.ProviderRegistrationToken,
					CallRegistrationToken:     claim.CallRegistrationToken,
					ToolUseID:                 claim.ToolUseID,
					RequestEventID:            claim.RequestEventID,
					ClaimOperationID:          claim.OperationID,
				})
				if err != nil {
					return "", err
				}
				return provider.ClaimDisposition(result.Disposition), nil
			},
		},
		provider.Options{
			ProviderID: providerID,
			Pong: func(ctx context.Context, providerID, incarnationID, pingID string) error {
				return registryClient.Pong(ctx, &genregistry.PongPayload{
					PingID:                pingID,
					Toolset:               toolsetID,
					ProviderID:            providerID,
					ProviderIncarnationID: incarnationID,
				})
			},
		},
	)
}
```

Gli ID degli stream sono deterministici:

- Chiamate: `toolset:<toolsetID>:requests`
- Risultati: `result:<toolUseID>`

## Configurazione

### Opzioni del registro {#struttura-di-configurazione}

L'[esempio della libreria](#utilizzo-della-libreria) mostra la configurazione
minima: passa il client Redis dell'applicazione in `Redis` e scegli un `Name`
condiviso per il cluster. I nodi con lo stesso nome e database Redis condividono
il catalogo, i record delle chiamate e il coordinamento dei controlli di salute.
Il catalogo usa la mappa replicata Pulse `<name>:toolsets`.

Consulta [registry.Config](https://pkg.go.dev/goa.design/goa-ai/registry#Config) per l'API completa e i valori predefiniti.
`PingInterval` e `MissedPingThreshold` controllano le verifiche di salute;
`ExecutionTimeout` limita le nuove esecuzioni ammesse; `ResultStreamTTL`
controlla la conservazione dei risultati; `ProviderLeaseDuration` controlla
il rinnovo della registrazione dei provider. `ExpectedToolsets` registra i
nomi richiesti del catalogo nella telemetria senza rifiutare registrazioni o
chiamate. `Logger` riceve gli errori di finalizzazione delle chiamate.
Configura queste opzioni durante la costruzione del registro.

### Persistenza in Redis {#implementazioni-del-negozio}

Redis conserva nel catalogo gli schemi degli strumenti, le identità di
ammissione, i lease dei provider, i timestamp di salute e la cronologia dei
ritiri. Anche i record delle chiamate e i flussi Pulse di richieste e risultati
usano Redis. Usa Redis con persistenza durevole affinché repliche e processi
riavviati osservino le stesse registrazioni e decisioni sulle chiamate.
L'applicazione possiede il client Redis e lo chiude dopo l'arresto del registro.

## Monitoraggio dello stato di salute

Il registro invia i ping di salute sui flussi Pulse. I provider rispondono tramite il metodo gRPC `Pong`.

### Come funziona

1. Lo scheduler di salute legge i toolset attivi dal catalogo condiviso.
2. Il nodo che possiede il lease di ping di un toolset invia un ping finché esiste un provider attivo che accetta chiamate.
3. `Pong` aggiorna il catalogo solo se la risposta corrisponde alla registrazione, al processo provider e all'identità del controllo di salute correnti.
4. L'instradamento richiede un lease provider non scaduto che accetti nuove chiamate e un pong accettato sufficientemente recente.

La salute è ricavata dal catalogo usando l'ora di Redis. L'età dell'ultimo
pong accettato non deve superare `(MissedPingThreshold + 1) × PingInterval`.
Una chiamata non ancora pubblicata attende un provider sano solo entro la
scadenza di esecuzione esistente.

### Coordinamento distribuito

Ogni nodo esegue uno scheduler locale e compete per un lease Redis a scadenza
per ciascun toolset. Il nodo che acquisisce il lease esegue quel controllo di
salute; dopo la scadenza, un altro nodo può acquisirlo. I nomi dei lease sono
specifici del cluster del registro.

I lease dei provider, l'identità corrente del controllo di salute e l'ultimo
pong accettato sono conservati insieme nel catalogo. Ogni nodo ricava la salute
da quel record, quindi una risposta tardiva di un vecchio provider non può
rendere sana la registrazione corrente.

## Integrazione del client

Usa il client di servizio generato del registro per le API dei provider e di
invocazione. Per esplorare il catalogo, `runtime/registry.NewClient` avvolge
quel client ed espone `ListToolsets`, `GetToolset` e `Search`, con i tipi di
risorse usati da `runtime/registry.Manager`.

L'esempio elenca il catalogo e recupera lo schema completo di un toolset per
nome. Passa una connessione creata con `grpc.NewClient` e le credenziali del
deployment; il chiamante conserva la proprietà della connessione. Tutti gli
endpoint del client generato sono collegati, come nell'esempio del provider
precedente.

```go
package discovery

import (
	"context"

	genregistrygrpc "goa.design/goa-ai/registry/gen/grpc/registry/client"
	genregistry "goa.design/goa-ai/registry/gen/registry"
	runtimeregistry "goa.design/goa-ai/runtime/registry"
	"google.golang.org/grpc"
)

// discoverTools lists the catalog and retrieves the schema of the named toolset.
// The caller creates the gRPC connection and keeps it open during discovery.
func discoverTools(ctx context.Context, conn *grpc.ClientConn, toolsetName string) (
	[]*runtimeregistry.ToolsetInfo, *runtimeregistry.ToolsetSchema, error,
) {
	transport := genregistrygrpc.NewClient(conn, grpc.WaitForReady(true))
	generated := genregistry.NewClient(
		transport.Register(),
		transport.ReleaseProvider(),
		transport.DrainProvider(),
		transport.Unregister(),
		transport.Pong(),
		transport.ListToolsets(),
		transport.GetToolset(),
		transport.ResolveToolset(),
		transport.CheckAdmission(),
		transport.Search(),
		transport.CallTool(),
		transport.CallResolvedTool(),
		transport.RetryTool(),
		transport.CompleteToolCall(),
		transport.PublishToolOutputDelta(),
		transport.ReportToolCallOverload(),
		transport.ClaimToolCall(),
	)
	client := runtimeregistry.NewClient(generated)
	toolsets, err := client.ListToolsets(ctx)
	if err != nil {
		return nil, nil, err
	}
	schema, err := client.GetToolset(ctx, toolsetName)
	if err != nil {
		return nil, nil, err
	}
	return toolsets, schema, nil
}
```

## API gRPC

Il registro espone i seguenti metodi gRPC:

### Operazioni del provider

| Metodo | Descrizione |
|--------|-------------|
| `Register` | Aggiunge o rinnova il lease di un provider per il contratto degli strumenti attivo. Un contratto diverso attende la scadenza dei lease precedenti. |
| `DrainProvider` | Rende il lease di un provider indisponibile per nuove chiamate, conservandone l'autorità di terminare quelle che già possiede. |
| `ReleaseProvider` | Rimuove un lease preciso dopo che il processo del provider ha completato il lavoro accettato. |
| `Unregister` | Ritira intenzionalmente l'ammissione attiva esatta. La rimuove dalla scoperta e dall'instradamento e impedisce definitivamente il ritorno dello stesso token di ammissione; non è un'operazione di deployment. |
| `Pong` | Registra lo stato di salute del provider per il lease corrente e l'epoca esatta del controllo di salute. |
| `ClaimToolCall` | Concede l'esecuzione di una richiesta pubblicata a un lease preciso del provider. |
| `CompleteToolCall` | Memorizza il risultato finale canonico della chiamata la cui esecuzione è stata assegnata e lo pubblica nel flusso dei risultati. |
| `PublishToolOutputDelta` | Pubblica un frammento di avanzamento limitato, senza garanzia di consegna, per una chiamata la cui esecuzione è stata assegnata. |
| `ReportToolCallOverload` | Registra un'istruzione di nuovo tentativo limitata prima che un provider esegua una chiamata che supera la sua capacità. |

### Operazioni di scoperta

| Metodo | Descrizione |
|--------|-------------|
| `ListToolsets` | Elenca tutti i set di strumenti registrati (con un filtro opzionale sui tag). Restituisce solo i metadati, non gli schemi completi. |
| `GetToolset` | Ottenere lo schema completo per uno specifico set di strumenti, compresi tutti gli schemi di input/output degli strumenti. |
| `Search` | Cerca i set di strumenti per parola chiave corrispondente al nome, alla descrizione o ai tag. |

### Operazioni di invocazione

| Metodo | Descrizione |
|--------|-------------|
| `CallTool` | Convalida e pubblica una chiamata identificata all'interno di un'esecuzione. Attende un provider sano entro la scadenza esistente, segue un eventuale sostituto solo prima della pubblicazione e restituisce il riferimento esatto e immutabile dell'esecuzione. |
| `RetryTool` | Ripubblica l'ammissione originale esatta dopo la registrazione di un sovraccarico del provider. Non sposta mai l'esecuzione a un provider sostitutivo. |

## Migliori pratiche

### Distribuzione

- **Usa lo stesso `Name`** per tutti i nodi di un cluster per condividere catalogo e chiamate e coordinare i controlli di salute
- **Puntare alla stessa istanza Redis** per il coordinamento dello stato
- **Dispiegare dietro un bilanciatore di carico** per le connessioni client - tutti i nodi servono lo stesso stato
- **Usa Redis con persistenza durevole** per il catalogo, i record delle chiamate e i flussi Pulse affinché repliche e processi riavviati osservino le stesse decisioni

### Monitoraggio dello stato di salute

- **Configura `PingInterval` e `MissedPingThreshold`** per la frequenza dei controlli e l'età del pong tollerata. Consulta `registry.Config` per i valori predefiniti.
- **Osserva la telemetria del catalogo e di salute** per distinguere i toolset assenti dai provider che non possono accettare chiamate in quel momento.
- **Mantieni la scadenza di esecuzione**: le chiamate non pubblicate attendono il ripristino del provider solo fino alla scadenza esistente.

### Scalare

- **Aggiungere nodi** per gestire un maggior numero di connessioni gRPC: ogni nodo può servire qualsiasi richiesta
- **I nodi coordinano i controlli di salute** con lease Redis a scadenza per ciascun toolset
- **Non sono necessarie sessioni appiccicose**: i flussi di risultati utilizzano Redis per la distribuzione tra i nodi, in modo che una chiamata allo strumento possa essere avviata su un nodo e completata su un altro

## Prossimi passi

- Imparare a conoscere [Toolsets](./toolsets/) per definire gli strumenti
- Esplorare [Production](./production/) per i modelli di distribuzione
- Leggere [Agent Composition](./agent-composition/) per la condivisione di strumenti tra agenti


Vedi [Ricerca degli strumenti e cataloghi dinamici](../tool-search/) per risoluzione attuale, contratti generati, provider e migrazione.
