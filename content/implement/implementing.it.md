+++
date = "2021-12-05T11:01:06-05:00"
title = "Implementare un servizio Goa"
weight = 1

[menu.main]
name = "Implementare un servizio Goa"
parent = "implement"
+++

## Panoramica

Una volta che il [design](/design/overview) del servizio è completato, occorre far girare il tool `goa` per autogenerare il codice:

```bash
goa gen <import path del design package>
```

Il tool `goa` crea una cartella  `gen` contenente tutto il codice generato e la sua
documentazione. Il codice generato segue il principio della Clean Architecture, e
crea ogni servizio in un package separato. Oltre a questo la cartella `gen` contiene
sotto-cartelle per ogni protocollo di trasporto (`http` e/o `grpc`):

```bash
gen
├── service1
│   ├── client.go       # Service client struct
│   ├── endpoints.go    # Endpoints agnostici al protocollo di trasporto
│   └── service.go      # interfaccia del Service
├── service2
│   ├── client.go
│   ├── endpoints.go
│   └── service.go
├── ...
├── grpc
│   ├── service1
│   │   ├── client      # Codice del client gRPC
│   │   ├── pb          # gRPC protobuf files autogenerati
│   │   └── server      # Codice del server gRPC
│   ├── service2
│   └── ...
│   ├── ...
│   └── cli
└── http
    ├── service1
    │   ├── client      # Codice del client HTTP 
    │   └── server      # Codice del server HTTP
    ├── service2
    │   └── ...
    ├── ...
    ├── cli
    │   └── calc
    │       └── cli.go
    ├── openapi.json    # Specifiche OpenAPI 2 (anche dette "swagger")
    ├── openapi.yaml
    ├── openapi3.json   # Specifiche OpenAPI 3
    └── openapi3.yaml
```

# Clean Architecture Layers

Prima di tuffarci nei dettagli implementativi occorre capire i livelli coinvolti
nel pattern Clean Architecture. Per ogni servizio Goa crea un transport, un endpoint
e un service layer.

## Transport Layer

Il livello di trasporto si occupa della codifica e decodifica di request e responses
e ne valida il contenuto. Nel caso di HTTP il codice generato da Goa fa leva su 
encoder e decoder differenti che sono forniti a runtime, rendendo possibile l'uso
di diversi encoders e decoders per servizi diversi e addirittura per metodi diversi.
Vedi la sezione [HTTP Encoding](/implement/encoding) per più informazioni. Questo layer
è implementato dai package sotto le cartelle `http` e `grpc`.

## Endpoint Layer

Il livello endpoint è il collante fra trasporto e servizio. Rappresenta ogni metodo
del servizio usando funzioni Go con una firma comune, permettendo di implementare
un comportamento ortogonale che si applica a tutti i metodi (ciò si definisce anche
transport agnostic middleware). La firma di ogni metodo è:

```go
func (s *Service) Method(ctx context.Context, payload interface{}) (response interface{}, err error)
```

L'endpoint layer è implementato nel file `endpoints.go` dentro la cartella di ogni servizio.

## Service Layer

Infine, il service layer è dove vive la logica di business. Goa genera l'interfaccia
per ogni servizio e l'utente ne fornisce l'implementazione.

il service layers è implementato nel file `service.go` sotto ogni servizio.
 
## Riassumendo

Le request ricevute dall'implementazione HTTP o gRPC sono decodificate dai 
rispettivi transport layer e sono passate agli endpoint layer, che a loro volta
chiamano il service layer per eseguire la logica di business. Il service layer infine
ritorna la response all'endpoint layer che è codificato dal transport layer
e mandato al client.

```
             TRANSPORT             ENDPOINT            SERVICE

           +-------------+       +--------------+
  Request  | Decodifica  |       |  Middleware  |
---------->|    e        +------>|      e       +----------+
           | Validazione |       | Type casting |          v
           +-------------+       +--------------+   +-----------+
                                                    | Logica di |
                                                    |  Business |
           +-----------+       +--------------+     +----+------+
  Response |           |       |  Middleware  |          |
<----------+ Codifica  |<------+      e       |<---------+
           |           |       | Type casting |
           +-----------+       +--------------+
```

> Nota: il transport layers può aggiungere altri middleware al flusso della request,
> non rappresentato nel seguente diagramma.

# Implementazione dei Servizi

Implementare un servizio consiste nell'implementazione della corrispondente interfaccia
generata da Goa nel file `service.go`. Ad esempio, dato il seguente service design:

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("calc", func() {
    Method("Add", func() {
        Payload(func() {
            Attribute("a", Int, "Primo operando")
            Attribute("b", Int, "secondo operando")
        })
        Result(Int)
        HTTP(func() {
            GET("/add/{a}/{b}")
        })
        GRPC(func() {})
    })
})
```

E il seguente setup:

```bash
mkdir calc; cd calc
go mod init calc
mkdir design
# crea dal design/design.go col contenuto
# di cui sopra
goa gen calc/design
```

Goa genera la seguente interfaccia in `gen/calc/service.go`:

```go
type Service interface {
    Add(context.Context, *AddPayload) (res int, err error)
}
```

Una possibile implementazione può essere:

```go
type svc struct {}

func (s *svc) Add(ctx context.Context, p *calcsvc.AddPayload) (int, error) {
	return p.A + p.B, nil
}
```

La struct che implementa l'interfaccia può essere usata per istanziare i
service endpoints con la funzione `NewEndpoints`, generata in `endpoints.go`:

```go
func NewEndpoints(s Service) *Endpoints {
	return &Endpoints{
		Add: NewAddEndpoint(s),
	}
}
```

Questa funzione semplicemente wrappa l'interfaccia del service con gli endpoints
che possono essere forniti al trasport layer generato per esporre gli endpoints
stessi al protocollo di trasporto.

```go
s := &svc{}
endpoints := calc.NewEndpoints(s)
```

## Creazione di Server HTTP

Per HTTP questo si fa con la funzione `New` generata nel file `http/<servizio>/server/server.go`:

```go
func New(
	e *calc.Endpoints,
	mux goahttp.Muxer,
	decoder func(*http.Request) goahttp.Decoder,
	encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
	errhandler func(context.Context, http.ResponseWriter, error),
	formatter func(err error) goahttp.Statuser,
) *Server
```

Creare un server HTTP richiede sia i service endpoint che l'HTTP router, il decoder
e l'encoder HTTP. `errhandler` è la funzione chiamata dal codice generato quando
la codifica o la decodifica falliscono per qualche motivo. I `formatter` rende possibile 
sovrascrivere come Goa formatta gli errori ritornati dai service methods prima dell' encoding.
Possono essere entrambi `nil`, in questo caso il codice generato andrà in panic
in caso di errori di encoding (non può accadere con gli encoder di default di Goa) e gli altri errori
saranno formattati usando la struct [ServiceError](https://pkg.go.dev/goa.design/goa/v3/pkg#ServiceError).

Il [package http](https://pkg.go.dev/goa.design/goa/v3/http) di Goa contiene le implementazioni
di default per il router, l'encoder e il decoder, rendendolo molto conveniente per creare server HTTP.

```go
mux := goahttp.NewMuxer()
dec := goahttp.RequestDecoder
enc := goahttp.ResponseEncoder
svr := calcsvr.New(endpoints, mux, dec, enc, nil, nil)
```

L'ultimo step necessario per configurare il server HTTP consiste nel chiamare le 
funzioni `Mount` generate.

```go
func Mount(mux goahttp.Muxer, h *Server) {
	MountAddHandler(mux, h.Add)
}
```

L'oggetto mux è un handler HTTP standard che può essere usato per servire 
richieste HTTP:

```go
calcsvr.Mount(mux, svr)
s := &http.Server{Handler: mux}
s.ListenAndServe()
```

Il codice completo per creare un servizio HTTP è il seguente:

```go
package main

import (
	"context"
	"net/http"

	goahttp "goa.design/goa/v3/http"

	"calc/gen/calc"
	"calc/gen/http/calc/server"
)

type svc struct{}

func (s *svc) Add(ctx context.Context, p *calc.AddPayload) (int, error) {
	return p.A + p.B, nil
}

func main() {
	s := &svc{}                                               // Crea il servizio
	endpoints := calc.NewEndpoints(s)                         // Crea gli endpoints
	mux := goahttp.NewMuxer()                                 // Crea il muxer HTTP
	dec := goahttp.RequestDecoder                             // Imposta il request decoder HTTP
	enc := goahttp.ResponseEncoder                            // Imposta response encoder HTTP
	svr := server.New(endpoints, mux, dec, enc, nil, nil)     // Crea il server HTTP di Goa
	server.Mount(mux, svr)                                    // Monta il server Goa sul mux
	httpsvr := &http.Server{                                  // Crea il server HTTP go
        Addr: "localhost:8081",                               // Configura l'indirizzo di ascolto del server
        Handler: mux,                                         // Set request handler
    }
	if err := httpsvr.ListenAndServe(); err != nil {          // Fai partire il server HTTP
		panic(err)
	}
}
```

> Nota: Il codice qui presente è pensato per aiutare a capire come interfacciarsi col codice generato
> e non va assolutamente usato così com'è. In particolare in un codice reale
> si sposterebbe probabilmente la logica di business nel suo package riservato e si implementerebbe una
> gestione degli errori adeguata.

## Creare dei server gRPC

La creazione di server gRPC seguen un pattern simile ai server HTTP. La funzione
`New` generata nel file `gen/grpc/<service>/server/server.go` crea il server:

```go
func New(e *calc.Endpoints, uh goagrpc.UnaryHandler) *Server {
	return &Server{
		AddH: NewAddHandler(e.Add, uh),
	}
}
```

Tale funzione accetta gli endpoints e un handler gRPC opzionale che permetter di
configurare il gRPC. L'implementazione di default usa le seguenti opzioni gRPC:

```go
func NewAddHandler(endpoint goa.Endpoint, h goagrpc.UnaryHandler) goagrpc.UnaryHandler {
	if h == nil {
		h = goagrpc.NewUnaryHandler(endpoint, DecodeAddRequest, EncodeAddResponse)
	}
	return h
}
```

Una volta creato, il gRPC server di Goa è registrato come un server gRPC qualsiasi usando
la funzione `Register<Service>Server` generata:

```go
svr := server.New(endpoints, nil)
grpcsrv := grpc.NewServer()
calcpb.RegisterCalcServer(grpcsrv, svr)
```

L'avvio del server gRPC è fatto nella solita maniera, per esempio:

```go
lis, err := net.Listen("tcp", "localhost:8082")
if err != nil {
    panic(err)
}
if err :=  srv.Serve(lis); err != nil {
    panic(err)
}
```

Il codice completo per creare un servizio gRPC di esempio è il seguente:

```go
package main

import (
	"context"
	"net"

	"google.golang.org/grpc"

	"calc/gen/calc"
	calcpb "ca/gen/grpc/calc/pb"
	"calc/gen/grpc/calc/server"
)

type svc struct{}

func (s *svc) Add(ctx context.Context, p *calc.AddPayload) (int, error) {
	return p.A + p.B, nil
}

func main() {
	s := &svc{}
	endpoints := calc.NewEndpoints(s)
	svr := server.New(endpoints, nil)
	grpcsrv := grpc.NewServer()
	calcpb.RegisterCalcServer(grpcsrv, svr)
	lis, err := net.Listen("tcp", "localhost:8082")
	if err != nil {
		panic(err)
	}
	if err := grpcsrv.Serve(lis); err != nil {
		panic(err)
	}
}
```

Un singolo servizio Goa può esporre sia endpoint HTTP che gRPC nello stesso momento.
In questo caso la struct degli endpoints è creata una sola volta e condivisa fra i
server HTTP e gRPC.

## Sovrascrivere i default

Una delle cose da capire sul codice generato è che è progettato per essere completamente
sovrascrivibile. Il package del servizio generato fornisce funzioni che rendono possibile
la creazione di endpoint individuali, per esempio:

`gen/calc/endpoints.go`

```go
func NewAddEndpoint(s Service) goa.Endpoint {
	return func(ctx context.Context, req interface{}) (interface{}, error) {
		p := req.(*AddPayload)
		return s.Add(ctx, p)
	}
}
```

La funziona generata `NewEndpoints` semplicemente chiama la creazione di ogni
singolo endpointe e ritorna una struct che contiene ogni riferimento agli endpoints.
Il codice dell'utente può sovrascrivere ogni endpoint, dato che tutti i campi della
struct sono pubblici:

```go
type Endpoints struct {
	Add goa.Endpoint
}
```

In maniera simile sia i server HTTP che gRPC espongono dei campi pubblici che contengono
i rispettivi handlers:

HTTP (`gen/http/calc/server/server.go`):

```go
type Server struct {
	Add http.Handler
    // ...
}
```

gRPC (`gen/grpc/calc/server/server.go`):

```go
type Server struct {
	AddH goagrpc.UnaryHandler
	// ...
}
```

Il codice dell'utente può quindi sovrascrivere gli handler, dato che i campi sono pubblici.
La funzione `New` che crea i server semplicemente delega alle funzioni specifiche degli endpoint
che sono pubbliche e possono essere chiamate individualmente:

HTTP (`gen/http/calc/server/server.go`):

```go
func NewAddHandler(
	endpoint goa.Endpoint,
	mux goahttp.Muxer,
	decoder func(*http.Request) goahttp.Decoder,
	encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
	errhandler func(context.Context, http.ResponseWriter, error),
	formatter func(err error) goahttp.Statuser,
) http.Handler
```

gRPC (`gen/grpc/calc/server/server.go`):

```go
func NewAddHandler(endpoint goa.Endpoint, h goagrpc.UnaryHandler) goagrpc.UnaryHandler
```

Oltretutto con HTTP si può anche sovrascrivere l'encoder, il decoder o perfino il muxer
sostituendo l'implementazione di default con la propria.
