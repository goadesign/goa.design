---
title: "Codice Server e Client gRPC Generato"
linkTitle: "Codice gRPC"
weight: 6
description: "Scopri il codice generato da Goa, incluse le interfacce dei servizi, gli endpoint e i livelli di trasporto."
---

La generazione del codice gRPC crea un'implementazione completa di client e server
che gestisce tutti gli aspetti a livello di trasporto. Goa genera una definizione
Protobuf per ogni servizio e chiama automaticamente `protoc` per generare il
codice di basso livello del server e del client. Goa genera anche codice che
sfrutta il codice generato da Protobuf per creare un'implementazione di alto
livello del server e del client gRPC.

## Definizione Protobuf

La definizione del servizio protobuf viene generata in
`gen/grpc/<nome del servizio>/pb/goagen_<nome dell'api>_<nome del servizio>.proto`:

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

message AddResponse {
    int64 result = 1;
}
// ...altri messaggi...
```

Questa definizione protobuf viene utilizzata per generare il codice gRPC di basso
livello tramite il compilatore `protoc`, che Goa invoca automaticamente durante
la generazione del codice.

## Implementazione del Server gRPC

Goa genera un'implementazione completa del server gRPC in
`gen/grpc/<nome del servizio>/server/server.go` che espone i metodi del servizio
utilizzando gRPC. Il server può essere istanziato utilizzando la funzione `New`
generata che accetta gli endpoint del servizio e un gestore unario opzionale. Se
non viene fornito alcun gestore unario, il server utilizzerà il gestore
predefinito fornito da Goa.

```go
// New istanzia la struttura del server con gli endpoint del servizio calc.
func New(e *calc.Endpoints, uh goagrpc.UnaryHandler) *Server {
	return &Server{
		AddH: NewAddHandler(e.Add, uh),
		MultiplyH: NewMultiplyHandler(e.Multiply, uh),
	}
}
```

Nel codice sopra `goagrpc` si riferisce al pacchetto Goa gRPC situato in
`goa.design/goa/v3/grpc`. Il tipo `UnaryHandler` è una funzione che prende un
contesto e una richiesta e restituisce una risposta e un errore. Se il servizio
espone metodi di streaming, `New` accetta anche un gestore di streaming.

La struttura `Server` espone campi che possono essere utilizzati per modificare
singoli gestori o applicare middleware a specifici endpoint:

```go
// Server elenca i gestori gRPC degli endpoint del servizio calc.
type Server struct {
    AddH      goagrpc.UnaryHandler
    MultiplyH goagrpc.UnaryHandler
    // ... Campi privati ...
}
```

Il resto del file del server implementa i gestori del server gRPC per ogni
metodo del servizio. Questi gestori sono responsabili della decodifica della
richiesta, della chiamata al metodo del servizio e della codifica della risposta
e dell'errore.

### Mettere Tutto Insieme

L'interfaccia del servizio e i livelli degli endpoint sono i blocchi fondamentali
del tuo servizio generato da Goa. Il tuo pacchetto main utilizzerà questi livelli
per creare le implementazioni specifiche del server e del client per il trasporto,
permettendoti di eseguire il tuo servizio e interagire con esso utilizzando gRPC:

```go
package main

import (
    "context"
    "log"
    "net"

    "google.golang.org/grpc"

    "github.com/<tuo username>/calc"
    gencalc "github.com/<tuo username>/calc/gen/calc"
    genpb "github.com/<tuo username>/calc/gen/grpc/calc/pb"
    gengrpc "github.com/<tuo username>/calc/gen/grpc/calc/server"
)

func main() {
    svc := calc.New()                        // La tua implementazione del servizio
    endpoints := gencalc.NewEndpoints(svc)   // Crea gli endpoint del servizio
    svr := grpc.NewServer(nil)               // Crea il server gRPC
    gensvr := gengrpc.New(endpoints, nil)    // Crea l'implementazione del server
    genpb.RegisterCalcServer(svr, genserver) // Registra il server con gRPC
    lis, _ := net.Listen("tcp", ":8080")     // Avvia il listener del server gRPC
    svr.Serve(lis)                           // Avvia il server gRPC
}
```

## Implementazione del Client gRPC

Goa genera un'implementazione completa del client gRPC in
`gen/grpc/<nome del servizio>/client/client.go`. Simile al client HTTP, fornisce
metodi che creano endpoint Goa per ogni metodo del servizio, che possono poi
essere avvolti in implementazioni client indipendenti dal trasporto.

### Creazione del Client

La funzione `NewClient` generata crea un oggetto che può essere utilizzato per
creare endpoint client indipendenti dal trasporto:

```go
// NewClient istanzia i client gRPC per tutti gli endpoint del servizio calc.
func NewClient(cc *grpc.ClientConn, opts ...grpc.CallOption) *Client {
    return &Client{
        grpccli: calcpb.NewCalcClient(cc),
        opts:    opts,
    }
}
```

La funzione richiede una connessione gRPC (`*grpc.ClientConn`) che viene
utilizzata per creare il client protobuf di basso livello. Accetta anche opzioni
di chiamata gRPC opzionali (`...grpc.CallOption`) che vengono utilizzate per
configurare il client gRPC.

### Client gRPC

La struttura `Client` istanziata espone metodi che costruiscono endpoint
indipendenti dal trasporto:

```go
// Add restituisce un endpoint che effettua richieste gRPC al server
// add del servizio calc.
func (c *Client) Add() goa.Endpoint

// Multiply restituisce un endpoint che effettua richieste gRPC al server
// multiply del servizio calc.
func (c *Client) Multiply() goa.Endpoint
```

### Mettere Tutto Insieme

Ecco un esempio di come creare e utilizzare il client gRPC per il servizio `calc`:

```go
package main

import (
    "context"
    "log"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    
    gencalc "github.com/<tuo username>/calc/gen/calc"
    genclient "github.com/<tuo username>/calc/gen/grpc/calc/client"
)

func main() {
    // Crea la connessione gRPC
    conn, err := grpc.Dial("localhost:8080",
        grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    // Crea il client gRPC
    grpcClient := genclient.NewClient(conn)

    // Crea il client endpoint
    client := gencalc.NewClient(
        grpcClient.Add(),          // Endpoint Add
        grpcClient.Multiply(),     // Endpoint Multiply
    )

    // Chiama i metodi del servizio
    result, err := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("1 + 2 = %d", result)
}
```

Questo esempio mostra come:
1. Creare una connessione gRPC
2. Creare un client gRPC utilizzando la connessione
3. Avvolgerlo in un client endpoint
4. Effettuare chiamate al servizio utilizzando il client

Il client gRPC gestisce tutti gli aspetti a livello di trasporto mentre il client
endpoint fornisce un'interfaccia pulita per effettuare chiamate al servizio.

### Conclusione

Il client gRPC generato fornisce un modo conveniente per interagire con il
servizio utilizzando gRPC. Il client gestisce tutte le complessità della
comunicazione gRPC fornendo un'interfaccia coerente che corrisponde ad altre
implementazioni di trasporto. 