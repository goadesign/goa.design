---
title: "Registro interno degli strumenti"
linkTitle: "Registro di sistema"
weight: 9
description: "Deploy a clustered gateway for cross-process toolset discovery and invocation."
llm_optimized: true
---

Il **Registro degli strumenti interni** è un servizio di gateway in cluster che consente di individuare e invocare i set di strumenti attraverso i confini dei processi. È progettato per scenari in cui i set di strumenti sono forniti da servizi separati che possono scalare indipendentemente dagli agenti che li utilizzano.

## Panoramica

Il registro funge sia da **catalogo** che da **gateway**:

- **Catalogo**: Gli agenti scoprono i set di strumenti disponibili, i loro schemi e il loro stato di salute
- **Gateway**: Le chiamate agli strumenti vengono instradate attraverso il registro ai fornitori tramite i flussi Pulse

Questo disaccoppia gli agenti dai fornitori di set di strumenti, consentendo di scalare, distribuire e gestire il ciclo di vita in modo indipendente.

{{< figure src="/images/diagrams/RegistryTopology.svg" alt="Agent-Registry-Provider Topology" >}}

## Clustering multi-nodo

Più nodi del registro possono partecipare allo stesso registro logico usando lo stesso `Name` nella loro configurazione e collegandosi alla stessa istanza di Redis.

I nodi con lo stesso nome si collegano automaticamente:

- **Condividono le registrazioni del toolset** tramite le mappe replicate di Pulse
- **Coordinare i ping di controllo dello stato di salute** tramite ticker distribuiti (solo un nodo esegue il ping alla volta)
- **Condividere lo stato di salute del provider** tra tutti i nodi

Ciò consente la scalabilità orizzontale e l'alta disponibilità. I client possono connettersi a qualsiasi nodo e vedere lo stesso stato del registro.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## Avvio rapido

### Utilizzo della libreria

Creare ed eseguire un nodo di registro in modo programmatico. Quando viene chiamato `New()`, il registro si connette a Redis e inizializza diversi componenti di Pulse: un nodo pool per il coordinamento distribuito, due mappe replicate per lo stato di salute e il tracciamento del set di strumenti e i gestori di flussi per l'instradamento delle chiamate agli strumenti. Il metodo `Run()` avvia il server gRPC e lo blocca fino all'arresto, gestendo automaticamente la terminazione aggravata.

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
| **Store** | Strato di persistenza per i metadati del toolset (memoria o MongoDB) |
| **Health Tracker** | Monitora l'efficienza del provider tramite ping/pong |
| **Stream Manager** | Gestisce i flussi Pulse per l'instradamento delle chiamate agli strumenti |
| **Result Stream Manager** | Gestisce la consegna dei risultati degli strumenti |

### Flusso delle chiamate agli strumenti

Quando viene invocato `CallTool`, il registro esegue i seguenti passaggi in sequenza:

1. **Convalida dello schema**: Il payload viene convalidato rispetto allo schema JSON dello strumento utilizzando un validatore di schemi compilato
2. **Controllo della salute**: Il registro controlla se il set di strumenti ha risposto a ping recenti. I set di strumenti non sani restituiscono immediatamente `service_unavailable`
3. **Creazione del flusso di risultati**: Viene creato un flusso temporaneo di impulsi con un `tool_use_id` univoco e la mappatura viene memorizzata in Redis per la consegna dei risultati tra i nodi
4. **Pubblicazione della richiesta**: La chiamata allo strumento viene pubblicata nel flusso di richieste del toolset (`toolset:<name>:requests`)
5. **Attendere il risultato**: Il gateway si iscrive al flusso di risultati e si blocca finché il provider non risponde o finché non scade il timeout di 30 secondi

Questo design assicura che le chiamate agli strumenti falliscano rapidamente quando i provider sono malsani, invece di aspettare i timeout.

## Integrazione del provider (lato servizio)

L'instradamento tramite registro è solo metà della storia: i **provider devono eseguire un loop di esecuzione degli strumenti** all'interno del processo del servizio proprietario del toolset.

Per i toolset di proprietà del servizio e supportati da metodi (strumenti dichiarati con `BindTo(...)`), la generazione del codice emette un adattatore provider in:

- `gen/<service>/toolsets/<toolset>/provider.go`

Il provider generato:

- Decodifica il JSON del payload in ingresso usando il codec del payload generato
- Costruisce il payload del metodo Goa usando le trasformazioni generate
- Chiama il metodo del servizio collegato
- Codifica il JSON del risultato (e gli artifacts/sidecars opzionali) usando il codec del risultato generato

Per servire le chiamate dal gateway del registro, collega il provider generato al loop provider del runtime:

```go
handler := toolsetpkg.NewProvider(serviceImpl)
go func() {
    err := toolprovider.Serve(ctx, pulseClient, toolsetID, handler, toolprovider.Options{
        Pong: func(ctx context.Context, pingID string) error {
            return registryClient.Pong(ctx, &registry.PongPayload{
                PingID:  pingID,
                Toolset: toolsetID,
            })
        },
    })
    if err != nil {
        panic(err)
    }
}()
```

Gli ID degli stream sono deterministici:

- Chiamate: `toolset:<toolsetID>:requests`
- Risultati: `result:<toolUseID>`

## Configurazione

### Struttura di configurazione

Il campo `Name` è particolarmente importante: determina i nomi delle risorse Pulse utilizzate per il coordinamento. Il pool si chiama `<name>`, la mappa della salute `<name>:health` e la mappa del registro `<name>:toolsets`. I nodi con nomi corrispondenti e le connessioni Redis si scoprono automaticamente.

```go
type Config struct {
    // Redis is the Redis client for Pulse operations. Required.
    Redis *redis.Client

    // Store is the persistence layer for toolset metadata.
    // Defaults to an in-memory store if not provided.
    Store store.Store

    // Name is the registry cluster name.
    // Nodes with the same Name and Redis connection form a cluster.
    // Defaults to "registry" if not provided.
    Name string

    // PingInterval is the interval between health check pings.
    // Defaults to 10 seconds if not provided.
    PingInterval time.Duration

    // MissedPingThreshold is the number of consecutive missed pings
    // before marking a toolset as unhealthy.
    // Defaults to 3 if not provided.
    MissedPingThreshold int

    // ResultStreamMappingTTL is the TTL for tool_use_id to stream_id mappings.
    // Defaults to 5 minutes if not provided.
    ResultStreamMappingTTL time.Duration

    // PoolNodeOptions are additional options for the Pulse pool node.
    PoolNodeOptions []pool.NodeOption
}
```

### Implementazioni del negozio

Il registro supporta backend di archiviazione collegabili. L'archivio conserva i metadati degli strumenti (nome, descrizione, versione, tag e schemi degli strumenti). Si noti che lo stato di salute e il coordinamento dei flussi sono sempre gestiti tramite Redis/Pulse, indipendentemente dallo store scelto; lo store influisce solo sulla persistenza dei metadati del toolset.

```go
import (
    "goa.design/goa-ai/registry/store/memory"
    "goa.design/goa-ai/registry/store/mongo"
)

// In-memory store (default, for development)
reg, _ := registry.New(ctx, registry.Config{
    Redis: rdb,
    // Store defaults to memory.New()
})

// MongoDB store (for production persistence)
mongoStore, _ := mongo.New(mongoClient, "registry", "toolsets")
reg, _ := registry.New(ctx, registry.Config{
    Redis: rdb,
    Store: mongoStore,
})
```

## Monitoraggio dello stato di salute

Il registro monitora automaticamente lo stato di salute del provider utilizzando messaggi ping/pong su flussi Pulse.

### Come funziona

1. Il registro invia messaggi periodici `ping` allo stream di ciascun toolset registrato
2. I provider rispondono con messaggi `pong` attraverso il metodo `Pong` gRPC
3. Se un provider non riceve `MissedPingThreshold` ping consecutivi, viene contrassegnato come non sano
4. I set di strumenti non sani vengono esclusi dall'instradamento `CallTool`

L'health tracker utilizza una soglia di staleness calcolata come `(MissedPingThreshold + 1) × PingInterval`. Con le impostazioni predefinite (3 ping mancati, intervallo di 10 secondi), un set di strumenti diventa non sano dopo 40 secondi senza pong. Questo dà ai provider abbastanza tempo per rispondere, pur rilevando i guasti in modo ragionevolmente rapido.

### Coordinamento distribuito

In un cluster a più nodi, i ping di controllo dello stato di salute sono coordinati tramite i ticker distribuiti di Pulse. Il ticker assicura che esattamente un nodo invii i ping in qualsiasi momento. Se questo nodo si blocca, un altro nodo subentra automaticamente entro un intervallo di ping.

Tutti i nodi condividono lo stato di salute tramite una mappa replicata Pulse. Quando un nodo riceve un ping, aggiorna la mappa condivisa con il timestamp corrente. Quando un nodo controlla lo stato di salute, legge da questa mappa condivisa, in modo che tutti i nodi abbiano una visione coerente dello stato di salute del provider.

## Integrazione del client

Gli agenti si connettono al registro utilizzando il client gRPC generato. L'elemento `GRPCClientAdapter` avvolge il client gRPC grezzo e fornisce un'interfaccia più pulita per la scoperta e l'invocazione. Poiché tutti i nodi del registro condividono lo stato, i client possono connettersi a qualsiasi nodo; utilizzare un bilanciatore di carico in produzione per il failover automatico.

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    
    registrypb "goa.design/goa-ai/registry/gen/grpc/registry/pb"
    runtimeregistry "goa.design/goa-ai/runtime/registry"
)

// Connect to the registry
conn, _ := grpc.NewClient("localhost:9090",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
defer conn.Close()

// Create the client adapter
client := runtimeregistry.NewGRPCClientAdapter(
    registrypb.NewRegistryClient(conn),
)

// Discover toolsets
toolsets, _ := client.ListToolsets(ctx)
for _, ts := range toolsets {
    fmt.Printf("Toolset: %s (%d tools)\n", ts.Name, ts.ToolCount)
}

// Get full schema for a toolset
schema, _ := client.GetToolset(ctx, "data-tools")
for _, tool := range schema.Tools {
    fmt.Printf("  Tool: %s - %s\n", tool.Name, tool.Description)
}
```

## API gRPC

Il registro espone i seguenti metodi gRPC:

### Operazioni del provider

| Metodo | Descrizione |
|--------|-------------|
| `Register` | Registra un set di strumenti nel registro. Convalida gli schemi degli strumenti, crea il flusso di richieste e avvia il monitoraggio della salute. Restituisce l'ID del flusso a cui il provider deve abbonarsi. |
| `Unregister` | Rimuovere un set di strumenti dal registro. Interrompe i ping di salute e rimuove i metadati, ma non distrugge il flusso sottostante. |
| `EmitToolResult` | Emettere il risultato dell'esecuzione di uno strumento. Cerca il flusso dei risultati da Redis (consentendo la consegna cross-node) e pubblica il risultato. |
| `Pong` | Risponde a un ping di controllo dello stato di salute. Aggiorna il timestamp dell'ultimo ping nella mappa di salute condivisa. |

### Operazioni di scoperta

| Metodo | Descrizione |
|--------|-------------|
| `ListToolsets` | Elenca tutti i set di strumenti registrati (con un filtro opzionale sui tag). Restituisce solo i metadati, non gli schemi completi. |
| `GetToolset` | Ottenere lo schema completo per uno specifico set di strumenti, compresi tutti gli schemi di input/output degli strumenti. |
| `Search` | Cerca i set di strumenti per parola chiave corrispondente al nome, alla descrizione o ai tag. |

### Operazioni di invocazione

| Metodo | Descrizione |
|--------|-------------|
| `CallTool` | Invoca uno strumento attraverso il gateway del registro. Convalida il payload, controlla lo stato di salute, indirizza al provider e attende i risultati (timeout di 30 secondi). |

## Migliori pratiche

### Distribuzione

- **Utilizzare lo stesso `Name`** per tutti i nodi di un cluster: questo determina i nomi delle risorse Pulse condivise
- **Puntare alla stessa istanza Redis** per il coordinamento dello stato
- **Dispiegare dietro un bilanciatore di carico** per le connessioni client - tutti i nodi servono lo stesso stato
- **Utilizzare un archivio MongoDB** in produzione per la persistenza tra i riavvii (l'archivio in-memory perde le registrazioni al riavvio)

### Monitoraggio dello stato di salute

- **Impostare un valore appropriato di `PingInterval`** in base ai requisiti di latenza (default: 10s). Valori più bassi rilevano i guasti più velocemente, ma aumentano il traffico di Redis.
- **Tarare `MissedPingThreshold`** per bilanciare i falsi positivi e la velocità di rilevamento (valore predefinito: 3). La soglia di staleness è `(threshold + 1) × interval`.
- **Monitorare lo stato di salute** tramite le metriche o i log: i set di strumenti non sani causano errori immediati `service_unavailable` anziché timeout

### Scalare

- **Aggiungere nodi** per gestire un maggior numero di connessioni gRPC: ogni nodo può servire qualsiasi richiesta
- **I nodi condividono il lavoro** tramite i ticker distribuiti di Pulse: solo un nodo esegue il ping di ogni set di strumenti alla volta
- **Non sono necessarie sessioni appiccicose**: i flussi di risultati utilizzano Redis per la distribuzione tra i nodi, in modo che una chiamata allo strumento possa essere avviata su un nodo e completata su un altro

## Prossimi passi

- Imparare a conoscere [Toolsets](./toolsets/) per definire gli strumenti
- Esplorare [Production](./production/) per i modelli di distribuzione
- Leggere [Agent Composition](./agent-composition/) per la condivisione di strumenti tra agenti
