---
nav_group: reference
title: Generazione del codice
weight: 80
description: "Complete guide to Goa's code generation - commands, process, generated code structure, and customization options."
llm_optimized: true
aliases:
---

La generazione di codice di Goa trasforma il progetto in contratti di servizio,
trasporti, client e documentazione pronti per la produzione. `goa example` crea
il collegamento iniziale eseguibile, mentre l'applicazione fornisce la logica di
business.



## Strumenti a riga di comando

### Installazione

```bash
go get goa.design/goa/v3@v3.31.1
go install goa.design/goa/v3/cmd/goa@v3.31.1
```

{{< alert title="Aggiornare a v3.31.1" color="info" >}}
La versione preliminare del generatore è ora stabile. L'aggiornamento da v3.30.x
a v3.31.1 include modifiche incompatibili intenzionali; leggere la
[guida all'aggiornamento](https://github.com/goadesign/goa/blob/v3.31.1/UPGRADING.md)
prima di rigenerare un'applicazione esistente. Fissare il modulo e il comando Goa
alla stessa versione, rigenerare l'intera directory `gen/`, quindi compilare e
testare l'applicazione. Coordinare gli aggiornamenti di client e server per i
formati dei messaggi modificati indicati nella guida. Per tornare indietro,
ripristinare insieme dipendenze, codice generato e codice dell'applicazione.
{{< /alert >}}

### Comandi

Tutti i comandi si aspettano i percorsi di importazione dei pacchetti Go, non i percorsi del filesystem:

```bash
# ✅ Correct: using Go package import path
goa gen goa.design/examples/calc/design

# ❌ Incorrect: using filesystem path
goa gen ./design
```

#### Generare codice (`goa gen`)

```bash
goa gen <design-package-import-path> [-o <output-dir>]
```

È il comando principale per la generazione del codice:
- Elabora il pacchetto di progettazione e genera il codice di implementazione
- Ricrea ogni volta da zero l'intera directory `gen/`
- Viene eseguito dopo ogni modifica del progetto

#### Crea un esempio (`goa example`)

```bash
goa example <design-package-import-path> [-o <output-dir>]
```

Un comando di impalcatura:
- Crea un'implementazione di esempio una tantum
- Genera stub di gestori con la logica dell'esempio
- Viene eseguito una volta all'avvio di un nuovo progetto
- NON sovrascrive l'implementazione personalizzata esistente

#### Mostra la versione

```bash
goa version
```

### Flusso di lavoro dello sviluppo

1. Creare il progetto iniziale
2. Eseguire `goa gen` per generare il codice base
3. Eseguire `goa example` per creare stub di implementazione
4. Implementare la logica del servizio
5. Eseguire `goa gen` dopo ogni modifica alla progettazione

**Best Practice:** Impegnare il codice generato nel controllo di versione, anziché generarlo durante il CI/CD. Questo assicura build riproducibili e permette di tracciare le modifiche nel codice generato.

---

## Processo di generazione

Quando si esegue `goa gen`, Goa segue un processo sistematico:

### 1. Fase di bootstrap

Goa crea un `main.go` temporaneo che:
- Importa i pacchetti Goa e il pacchetto di progettazione
- Esegue la valutazione del DSL
- Genera il codice

### 2. Valutazione del progetto

- Le funzioni DSL vengono eseguite per creare oggetti espressione
- Le espressioni si combinano in un modello API completo
- Si stabiliscono le relazioni tra le espressioni
- Convalida delle regole e dei vincoli di progettazione

### 3. Generazione del codice

- Le espressioni convalidate passano ai generatori di codice
- I modelli eseguono il rendering per produrre i file di codice
- L'output viene scritto nella cartella `gen/`

Prima del rendering, Goa determina pacchetti, dichiarazioni, nomi, importazioni,
percorsi dei campi e rami noti a partire dal progetto completo e convalidato. I
modelli scrivono direttamente queste scelte. I programmi generati scelgono un
ramo solo in base ai valori ricevuti durante l'esecuzione.

---

## Struttura del codice generato

Un tipico progetto generato:

```
myservice/
├── cmd/                    # Generated example commands
│   └── calc/
│       ├── grpc.go
│       └── http.go
├── design/                 # Your design files
│   └── design.go
├── gen/                    # Generated code (don't edit)
│   ├── calc/               # Service-specific code
│   │   ├── client.go
│   │   ├── endpoints.go
│   │   └── service.go
│   ├── http/               # HTTP transport layer
│   │   ├── calc/
│   │   │   ├── client/
│   │   │   └── server/
│   │   └── openapi.json
│   └── grpc/               # gRPC transport layer
│       └── calc/
│           ├── client/
│           ├── server/
│           └── pb/
└── myservice.go            # Your service implementation
```

### Interfacce di servizio

Generato in `gen/<service>/service.go`:

```go
// Service interface defines the API contract
type Service interface {
    Add(context.Context, *AddPayload) (res int, err error)
    Multiply(context.Context, *MultiplyPayload) (res int, err error)
}

// Payload types
type AddPayload struct {
    A int32
    B int32
}

// Constants for observability
const ServiceName = "calc"
var MethodNames = [2]string{"add", "multiply"}
```

### Livello del punto finale

Generato in `gen/<service>/endpoints.go`:

```go
// Endpoints wraps service methods in transport-agnostic endpoints
type Endpoints struct {
    Add      goa.Endpoint
    Multiply goa.Endpoint
}

// NewEndpoints creates endpoints from service implementation
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        Add:      NewAddEndpoint(s),
        Multiply: NewMultiplyEndpoint(s),
    }
}

// Use applies middleware to all endpoints
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.Add = m(e.Add)
    e.Multiply = m(e.Multiply)
}
```

Esempio di middleware endpoint:

```go
func LoggingMiddleware(next goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req any) (res any, err error) {
        log.Printf("request: %v", req)
        res, err = next(ctx, req)
        log.Printf("response: %v", res)
        return
    }
}

endpoints.Use(LoggingMiddleware)
```

### Codice client

Generato in `gen/<service>/client.go`:

```go
// Client provides typed methods for service calls
type Client struct {
    AddEndpoint      goa.Endpoint
    MultiplyEndpoint goa.Endpoint
}

func NewClient(add, multiply goa.Endpoint) *Client {
    return &Client{
        AddEndpoint:      add,
        MultiplyEndpoint: multiply,
    }
}

func (c *Client) Add(ctx context.Context, p *AddPayload) (res int, err error) {
    ires, err := c.AddEndpoint(ctx, p)
    if err != nil {
        return
    }
    return ires.(int), nil
}
```

---

## Generazione del codice HTTP

### Implementazione del server

Generato in `gen/http/<service>/server/server.go`:

```go
func New(
    e *calc.Endpoints,
    mux goahttp.Muxer,
    decoder func(*http.Request) goahttp.Decoder,
    encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
    errhandler func(context.Context, http.ResponseWriter, error),
    formatter func(ctx context.Context, err error) goahttp.Statuser,
) *Server

// Server exposes handlers for modification
type Server struct {
    Mounts   []*MountPoint
    Add      http.Handler
    Multiply http.Handler
}

// Use applies HTTP middleware to all handlers
func (s *Server) Use(m func(http.Handler) http.Handler)
```

Configurazione completa del server:

```go
func main() {
    svc := calc.New()
    endpoints := gencalc.NewEndpoints(svc)
    mux := goahttp.NewMuxer()
    server := genhttp.New(
        endpoints,
        mux,
        goahttp.RequestDecoder,
        goahttp.ResponseEncoder,
        nil, nil)
    genhttp.Mount(mux, server)
    http.ListenAndServe(":8080", mux)
}
```

### Implementazione del client

Generato in `gen/http/<service>/client/client.go`:

```go
func NewClient(
    scheme string,
    host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restoreBody bool,
) *Client
```

Configurazione completa del client:

```go
func main() {
    httpClient := genclient.NewClient(
        "http",
        "localhost:8080",
        http.DefaultClient,
        goahttp.RequestEncoder,
        goahttp.ResponseDecoder,
        false,
    )

    client := gencalc.NewClient(
        httpClient.Add(),
        httpClient.Multiply(),
    )

    result, err := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
}
```

---

## Generazione del codice gRPC

### Definizione di protobuf

Generato in `gen/grpc/<service>/pb/`:

```protobuf
syntax = "proto3";
package calc;

service Calc {
    rpc Add (AddRequest) returns (AddResponse);
    rpc Multiply (MultiplyRequest) returns (MultiplyResponse);
}

message AddRequest {
    int64 a = 1;
    int64 b = 2;
}
```

### Implementazione del server

```go
func main() {
    svc := calc.New()
    endpoints := gencalc.NewEndpoints(svc)
    svr := grpc.NewServer()
    gensvr := gengrpc.New(endpoints, nil)
    genpb.RegisterCalcServer(svr, gensvr)
    lis, _ := net.Listen("tcp", ":8080")
    svr.Serve(lis)
}
```

### Implementazione del client

```go
func main() {
    conn, _ := grpc.Dial("localhost:8080",
        grpc.WithTransportCredentials(insecure.NewCredentials()))
    defer conn.Close()

    grpcClient := genclient.NewClient(conn)
    client := gencalc.NewClient(
        grpcClient.Add(),
        grpcClient.Multiply(),
    )

    result, _ := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
}
```

---

## Personalizzazione

### Controllo della generazione dei tipi

Forza la generazione di tipi non direttamente referenziati dai metodi:

```go
var MyType = Type("MyType", func() {
    // Force generation in specific services
    Meta("type:generate:force", "service1", "service2")
    
    // Or force generation in all services
    Meta("type:generate:force")
    
    Attribute("name", String)
})
```

### Organizzazione del pacchetto

Generare tipi in un pacchetto condiviso:

```go
var CommonType = Type("CommonType", func() {
    Meta("struct:pkg:path", "types")
    Meta("type:generate:force")
    Attribute("id", String)
})
```

Crea:
```
gen/
└── types/
    └── common_type.go
```

`struct:pkg:path` assegna al tipo definito nel progetto una sola dichiarazione
nel pacchetto generato selezionato, e ogni utilizzo generato importa tale
dichiarazione. Il nome del pacchetto Go è l'ultimo segmento del percorso in
minuscolo. Se il tipo spostato contiene un altro tipo definito nel progetto,
anche quella dipendenza deve dichiarare esplicitamente `struct:pkg:path`, in
genere con lo stesso pacchetto. I tipi annidati creati dal compilatore rimangono
accanto al tipo definito nel progetto a cui appartengono.

Una dichiarazione definita nel progetto viene riutilizzata tra servizi e tra
gli usi come payload, risultato ed errore. Quando quel tipo esatto è un errore
personalizzato, Goa aggiunge i metodi di errore accanto alla stessa dichiarazione
invece di generare un secondo tipo.

### Personalizzazione del campo

```go
var Message = Type("Message", func() {
    Attribute("id", String, func() {
        // Override field name
        Meta("struct:field:name", "ID")
        
        // Add custom struct tags
        Meta("struct:tag:json", "id,omitempty")
        Meta("struct:tag:msgpack", "id,omitempty")
        
        // Override type
        Meta("struct:field:type", "bson.ObjectId", "github.com/globalsign/mgo/bson", "bson")
    })
})
```

### Personalizzazione del buffer di protocollo

```go
var MyType = Type("MyType", func() {
    // Override protobuf message name
    Meta("struct:name:proto", "CustomProtoType")
    
    Field(1, "status", Int32, func() {
        // Override protobuf field type
        Meta("struct:field:proto", "int32")
    })

    // Use Google's timestamp type
    Field(2, "created_at", String, func() {
        Meta("struct:field:proto", 
            "google.protobuf.Timestamp",
            "google/protobuf/timestamp.proto",
            "Timestamp",
            "google.golang.org/protobuf/types/known/timestamppb")
    })
})

// Specify protoc include paths
var _ = API("calc", func() {
    Meta("protoc:include", "/usr/include", "/usr/local/include")
})
```

## Personalizzazione di OpenAPI

Per impostazione predefinita Goa genera documenti OpenAPI 2.0 e 3.0. Per
generare anche una descrizione OpenAPI 3.2.0, selezionala esplicitamente a
livello di API:

```go
var _ = API("MyAPI", func() {
    Meta("openapi:versions", "2.0", "3.0", "3.2")
    Meta("openapi:path:3.2", "docs/openapi")
})
```

Le versioni selezionate vengono scritte sia in JSON sia in YAML. L'esempio
precedente genera `gen/docs/openapi.json` e `gen/docs/openapi.yaml` per
OpenAPI 3.2; senza la sostituzione del percorso, Goa scrive
`gen/http/openapi3.2.json` e `gen/http/openapi3.2.yaml`. La selezione delle
versioni non modifica il codice di servizio generato.

```go
var _ = API("MyAPI", func() {
    // Control generation
    Meta("openapi:generate", "false")
    
    // Format JSON output
    Meta("openapi:json:prefix", "  ")
    Meta("openapi:json:indent", "  ")
    
    // Disable example generation
    Meta("openapi:example", "false")
})

var _ = Service("UserService", func() {
    // Add tags
    HTTP(func() {
        Meta("openapi:tag:Users")
        Meta("openapi:tag:Backend:desc", "Backend API Operations")
    })
    
    Method("CreateUser", func() {
        // Custom operation ID
        Meta("openapi:operationId", "{service}.{method}")
        
        // Custom summary
        Meta("openapi:summary", "Create a new user")
        
        HTTP(func() {
            // Add extensions
            Meta("openapi:extension:x-rate-limit", `{"rate": 100}`)
            POST("/users")
        })
    })
})

var User = Type("User", func() {
    // Override type name in OpenAPI spec
    Meta("openapi:typename", "CustomUser")
})
```

---

## Tipi e convalida

### Applicazione della convalida

I decoder di trasporto generati da Goa convalidano le richieste in ingresso sul server e le risposte in ingresso sul client. Il servizio mantiene poi gli invarianti dell’applicazione. Le chiamate dirette a un servizio o endpoint generato non passano da questa decodifica; i chiamanti devono fornire valori validi oppure convalidarli al proprio punto di ingresso.

### Regole sui puntatori per i campi delle strutture

I tipi di servizio rappresentano valori già convalidati. I tipi di trasporto
decodificati devono anche conservare l'assenza di un campo in ingresso.

Questa tabella descrive i comuni campi scalari e oggetto in Goa v3.31.1. Bytes, `Any` e le unioni hanno rappresentazioni proprie; consulta i tipi generati.

| Campo | Tipo di servizio | Body HTTP/JSON-RPC | Richiesta o risposta protobuf |
|---|---|---|---|
| Primitivo richiesto o con valore predefinito | Valore | Puntatore durante la decodifica per convalidare la presenza; valore durante la codifica | Puntatore per i campi singoli la cui presenza deve essere conservata |
| Primitivo facoltativo senza valore predefinito | Puntatore | Puntatore | Puntatore |
| Oggetto | Puntatore | Puntatore | Puntatore |
| Array o mappa | Valore | Valore | Valore |

Per HTTP e JSON-RPC, l'input decodificato è una richiesta sul server o una
risposta sul client. I campi scalari obbligatori o con valore predefinito usano valori nelle richieste codificate dal client e nelle risposte codificate dal server; gli scalari facoltativi senza valore predefinito restano puntatori. Negli struct protobuf, booleani, numeri, stringhe, enum
e relativi alias singoli richiesti sono puntatori sia nelle richieste sia nelle
risposte. La convalida distingue così un campo omesso da un valore zero
esplicito. Le slice di byte restano slice, i messaggi restano puntatori e gli
struct di servizio mantengono la propria struttura.

Esempio:
```go
type Person struct {
    Name     string             // required, direct value
    Age      *int               // optional, pointer
    Hobbies  []string           // array, no pointer
    Metadata map[string]string  // map, no pointer
}
```

`ArrayOfRequired` usa puntatori per elementi primitivi e alias primitivi solo
nei body HTTP e JSON-RPC in ingresso, per rifiutare `[null]`. Il servizio e le
risposte generate usano slice di valori.

### Presenza delle collezioni

`Required("items")` e `MinLength(1)` esprimono vincoli diversi. In JSON, una collezione obbligatoria deve essere presente e non null, ma `[]` o `{}` è valido se un vincolo di lunghezza non lo impedisce. I campi repeated e map di protobuf non distinguono assenza e vuoto dopo serializzazione e deserializzazione; la convalida generata controlla lunghezza e contenuto, non la presenza. Scalari singoli, messaggi e oneof obbligatori conservano i propri controlli di presenza.

Non usare collezioni Go nil rispetto a vuote per rappresentare operazioni di dominio. Modella un’operazione esplicita quando occorre distinguere «lascia invariato» da «sostituisci con una collezione vuota».

### Gestione dei valori predefiniti

I valori predefiniti appartengono al design e vengono applicati dalle conversioni di trasporto generate. Nella decodifica gRPC della versione preliminare, un valore assente riceve il valore predefinito dichiarato; uno `0`, `false` o valore vuoto esplicito viene conservato. La conversione dal servizio a protobuf conserva il valore fornito e non sostituisce gli zeri con valori predefiniti.

HTTP segue regole diverse: i costruttori dei body in ingresso applicano i valori predefiniti ai valori assenti, e quelli in uscita possono applicarli ai campi del servizio con valore zero. Consulta il costruttore e il decoder generati nella direzione pertinente quando zero o assenza hanno significato di dominio; non applicare un’unica regola a tutti i trasporti.

---

## Viste e tipi di risultato

Le viste controllano il modo in cui i tipi di risultato sono resi nelle risposte.

### Come funzionano le viste

1. Definisci gli attributi di ogni vista nel tipo di risultato.
2. Goa genera rappresentazioni, conversioni e validatori delle viste.
3. Un metodo può selezionare una vista fissa nel design. Per un risultato unario dinamico, il metodo generato restituisce il nome della vista insieme al risultato; le interfacce di streaming espongono l’operazione generata per selezionare la vista.

### Risposta lato server

Il codificatore generato seleziona la rappresentazione della vista scelta. Gli attributi esterni alla vista sono esclusi; gli attributi obbligatori inclusi restano parte del contratto. Le viste HTTP dinamiche trasmettono il nome nell’header `Goa-View`, mentre gRPC usa i metadati `goa-view`. Nella versione preliminare, JSON-RPC rappresenta una vista dinamica con `{ "view": ..., "body": ... }` dentro `result`; i risultati senza vista o con vista fissa non usano questa struttura.

### Risposta lato client

Il client generato legge la vista selezionata, decodifica la rappresentazione, ne convalida il contratto e la converte nel risultato del servizio. I client personalizzati devono seguire la rappresentazione del trasporto e della versione selezionati.

### Vista predefinita

Se non sono state definite viste, Goa aggiunge una vista "predefinita" che include tutti i campi di base.

---

## Sistema di plugin

Il sistema di plugin di Goa estende la generazione del codice. I plugin possono:

1. **Aggiungere nuovi DSL** - Costrutti aggiuntivi del linguaggio di progettazione
2. **Modificare il codice generato** - Ispezionare e modificare i file, aggiungere nuovi file

Esempio di utilizzo del plugin CORS:

```go
import (
    . "goa.design/goa/v3/dsl"
    cors "goa.design/plugins/v3/cors/dsl"
)

var _ = Service("calc", func() {
    cors.Origin("/.*localhost.*/", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
    })
})
```

Casi d'uso comuni dei plugin:
- Supporto del protocollo (CORS, ecc.)
- Formati di documentazione aggiuntivi
- Regole di validazione personalizzate
- Aspetti trasversali (registrazione, metriche)
- Generazione di file di configurazione

Le callback pubblicate restano adatte ai plugin che modificano valori o file
generati. Un plugin che dichiara un nome a livello di pacchetto deve usare la
fase di pianificazione della factory, così Goa può riservare quel nome insieme a
tutte le altre dichiarazioni prima del rendering. Consultare
[l'architettura della generazione di codice](https://github.com/goadesign/goa/blob/v3.31.1/codegen/ARCHITECTURE.md)
e la
[guida all'aggiornamento](https://github.com/goadesign/goa/blob/v3.31.1/UPGRADING.md)
per il contratto dettagliato dei plugin e i passaggi di migrazione.

---

## Vedi anche

- [Riferimento DSL](dsl-reference/) - Riferimento DSL completo per i file di progetto
- [Guida HTTP](http-guide/) - Funzionalità e personalizzazione del trasporto HTTP
- [Guida gRPC](grpc-guide/) - Caratteristiche del trasporto gRPC e buffer di protocollo
- [Quickstart](quickstart/) - Per iniziare con la generazione di codice
