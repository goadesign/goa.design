---
title: Generazione del codice
weight: 3
description: "Complete guide to Goa's code generation - commands, process, generated code structure, and customization options."
llm_optimized: true
aliases:
---

La generazione di codice di Goa trasforma il progetto in codice pronto per la produzione. Piuttosto che una semplice impalcatura, Goa genera implementazioni di servizi complete ed eseguibili che seguono le best practice e mantengono la coerenza dell'intera API.



## Strumenti a riga di comando

### Installazione

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

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
    Attribute("id", String)
})
```

Crea:
```
gen/
└── types/
    └── common_type.go
```

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

Goa convalida i dati ai confini del sistema:
- **Lato server**: Convalida le richieste in entrata
- **Lato client**: Convalida le risposte in arrivo
- **Codice interno**: Fiducioso per mantenere gli invarianti

### Regole sui puntatori per i campi delle strutture

| Proprietà | Payload/Risultato | Corpo della richiesta (Server) | Corpo della risposta (Server) |
|------------|---------------|----------------------|---------------------|
| Richiesto O Predefinito | Diretto (-) | Puntatore (*) | Diretto (-) |
non richiesto, nessun valore predefinito | Puntatore (*) | Puntatore (*) | Puntatore (*) | Puntatore (*) |

Tipi speciali:
- **Oggetti (strutture)**: Usare sempre i puntatori
- **Array e mappe**: Non utilizzare mai i puntatori (sono già tipi di riferimento)

Esempio:
```go
type Person struct {
    Name     string             // required, direct value
    Age      *int               // optional, pointer
    Hobbies  []string           // array, no pointer
    Metadata map[string]string  // map, no pointer
}
```

### Gestione dei valori predefiniti

- **Marshaling**: I valori predefiniti inizializzano array/mappe nulli
- **Unmarshaling**: I valori predefiniti si applicano ai campi opzionali mancanti (non ai campi obbligatori mancanti)

---

## Viste e tipi di risultato

Le viste controllano il modo in cui i tipi di risultato sono resi nelle risposte.

### Come funzionano le viste

1. Il metodo del servizio include un parametro di vista
2. Un pacchetto di viste viene generato a livello di servizio
3. La validazione specifica della vista viene generata automaticamente

### Risposta lato server

1. Il tipo di risultato visualizzato è marshallizzato
2. Gli attributi Nil sono omessi
3. Il nome della vista viene passato nell'intestazione "Goa-View"

### Risposta lato client

1. La risposta è non marshallata
2. Trasformata nel tipo di risultato visualizzato
3. Nome della vista estratto dall'intestazione "Goa-View"
4. Esecuzione della validazione specifica della vista
5. Riconvertito in tipo di risultato del servizio

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

---

## Vedi anche

- [Riferimento DSL](dsl-reference/) - Riferimento DSL completo per i file di progetto
- [Guida HTTP](http-guide/) - Funzionalità e personalizzazione del trasporto HTTP
- [Guida gRPC](grpc-guide/) - Caratteristiche del trasporto gRPC e buffer di protocollo
- [Quickstart](quickstart/) - Per iniziare con la generazione di codice
