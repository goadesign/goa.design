---
title: "Implementare il Servizio"
linkTitle: "Implementazione"
weight: 2
description: "Guida all'implementazione di servizi gRPC in Goa, che copre la generazione del codice, l'implementazione del servizio, la configurazione del server e la comprensione degli artefatti gRPC generati."
---

Dopo aver **progettato** il tuo servizio gRPC con il DSL di Goa, il prossimo passo è
**implementare** ed eseguire quel servizio. In questo tutorial:

1. **Genererai** lo scaffolding gRPC.  
2. **Implementerai** l'interfaccia del servizio.  
3. **Configurerai un `main.go`** per avviare il tuo server gRPC.

## 1. Generare gli Artefatti gRPC

Dalla radice del tuo progetto (es. `grpcgreeter/`), esegui:

```bash
goa gen grpcgreeter/design
go mod tidy
```

Questo comando analizza il tuo design gRPC (`greeter.go`) e crea una cartella `gen`
con codice **specifico per il trasporto** per gRPC. Vedrai file in queste directory:

- `gen/grpc/greeter/`  
  - `pb/` contenente il file `.proto` e il codice Go generato.  
  - `server/` contenente la logica lato server che **mappa** i tuoi metodi alle chiamate gRPC.  
  - `client/` contenente la logica lato client per chiamare il servizio.  

**Nota**: Se modifichi il tuo design (es. aggiungi o rimuovi campi), **riesegui**
questo comando per mantenere il codice generato sincronizzato.

## 2. Esplorare il Codice Generato

### `gen/grpc/greeter/pb/`

Contiene gli artefatti protobuf:
- **`greeter.proto`**  
  Il file protobuf che descrive il tuo RPC `SayHello`.  
- **`greeter.pb.go`**  
  Il codice Go compilato dal file `.proto`.

### `gen/grpc/greeter/server/`

Contiene gli stub di implementazione lato **server**:
- **`server.go`**: Collega le tue definizioni di metodo al servizio gRPC.  
- **`encode_decode.go`**: Gestisce la conversione di payload/risultati in messaggi gRPC.  

### `gen/grpc/greeter/client/`

Contiene il codice lato **client** per chiamare il servizio `greeter`:
- **`client.go`**: Crea un client gRPC per i tuoi metodi.
- **`encode_decode.go`**: Serializza/deserializza dati tra strutture Go e messaggi gRPC.

## 3. Implementare l'Interfaccia del Servizio

All'interno di `gen/greeter/service.go`, troverai l'**interfaccia del servizio** che Goa
si aspetta. Per il nostro esempio `SayHello`, appare così:

```go
 // Un semplice servizio gRPC che dice ciao.
 type Service interface {
     // Invia un saluto a un utente.
     SayHello(context.Context, *SayHelloPayload) (res *SayHelloResult, err error)
 }
```

### Creare un'Implementazione Proprietaria dell'Utente

Goa separa il codice **generato** dal codice **utente** per evitare di sovrascrivere la tua
logica durante la rigenerazione. Crea un file come `internal/greeter_service.go`:

```go
package internal

import (
	"context"
	gengreeter "grpcgreeter/gen/greeter"
)

// GreeterService implementa l'interfaccia Service trovata in server/interface.go
type GreeterService struct{}

// NewGreeterService restituisce una nuova istanza di GreeterService
func NewGreeterService() *GreeterService {
	return &GreeterService{}
}

// SayHello gestisce la chiamata RPC dal client.
func (s *GreeterService) SayHello(ctx context.Context, payload *gengreeter.SayHelloPayload) (*gengreeter.SayHelloResult, error) {
	// Costruisce un messaggio di saluto
	greeting := "Ciao, " + payload.Name + "!"
	return &gengreeter.SayHelloResult{Greeting: greeting}, nil
}
```

Questo soddisfa l'interfaccia del servizio di Goa per `SayHello`. Semplicemente appendiamo `payload.Name`
a una stringa. In scenari reali, aggiungeresti logica di dominio, persistenza o
validazione qui.

## 4. Creare il Tuo `main.go` per Avviare il Server gRPC

Se non usi `goa example`, hai bisogno del tuo `main.go` per **montare** il
servizio. Per esempio, crea `cmd/greeter/main.go`:

```go
package main

import (
    "fmt"
    "log"
    "net"
    
    gengreeter "grpcgreeter/gen/greeter"
    pb "grpcgreeter/gen/grpc/greeter/pb"
    genserver "grpcgreeter/gen/grpc/greeter/server"
    "grpcgreeter/internal"
    
    "google.golang.org/grpc"
    "google.golang.org/grpc/reflection"
)

func main() {
    // Crea un listener TCP sulla porta 8090
    lis, err := net.Listen("tcp", ":8090")
    if err != nil {
        log.Fatalf("Impossibile ascoltare sulla porta 8090: %v", err)
    }

    // Crea un server gRPC
    grpcServer := grpc.NewServer()

    // Istanzia il tuo servizio
    svc := internal.NewGreeterService()

    // Convertilo in endpoint Goa e registralo con gRPC
    endpoints := gengreeter.NewEndpoints(svc)
    pb.RegisterGreeterServer(grpcServer, genserver.New(endpoints, nil))
    
    // Abilita la reflection del server per strumenti come grpcurl
    reflection.Register(grpcServer)

    fmt.Println("Servizio greeter gRPC in ascolto su :8090")
    if err := grpcServer.Serve(lis); err != nil {
        log.Fatalf("Server gRPC fallito: %v", err)
    }
}
```

### Spiegazione

- **`net.Listen("tcp", ":8090")`**: Apre la porta `8090` per le richieste gRPC in arrivo.  
- **`grpc.NewServer()`**: Istanzia un server gRPC base.  
- **`internal.NewGreeterService()`**: Crea il tuo servizio personalizzato.  
- **`greeterserver.NewEndpoints(svc)`**: Avvolge il tuo servizio in endpoint Goa
  indipendenti dal trasporto.  
- **`RegisterGreeterServer(...)`**: Informa il server gRPC dei tuoi metodi.

## 5. Eseguire il Servizio gRPC

Semplicemente esegui il servizio `greeter`, dalla radice del progetto:

```bash
go mod tidy
go run grpcgreeter/cmd/greeter
```

Quando il servizio si avvia, ascolta le chiamate gRPC sulla porta 8090.

## 6. Prossimi Passi

Con il tuo **servizio gRPC in esecuzione**, puoi:

- **Testarlo** usando la CLI ufficiale gRPC o altre librerie client.  
- Aggiungere altri **metodi** al DSL e rieseguire `goa gen`.  
- Integrare funzionalità avanzate come **streaming** o **gestione degli errori** con codici
  di stato gRPC.

Continua con il tutorial [Esecuzione](./3-running.md) per imparare come chiamare il tuo nuovo
servizio e confermare che tutto funziona come previsto. 