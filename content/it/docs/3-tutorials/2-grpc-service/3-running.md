---
title: "Eseguire il Servizio"
linkTitle: "Esecuzione"
weight: 3
description: "Impara a eseguire e testare il tuo servizio gRPC Goa utilizzando vari strumenti come gRPC CLI, gRPCurl e client Go personalizzati, con esempi pratici e pattern di utilizzo comuni."
---

Dopo aver progettato e implementato il tuo servizio Goa basato su gRPC, vorrai
**eseguirlo** localmente e confermare che funzioni come previsto. In questo tutorial:

1. **Avvieremo** il server gRPC.
2. **Testeremo** il servizio usando strumenti gRPC.
3. **Esamineremo** i prossimi passi comuni per l'uso nel mondo reale.

## 1. Avviare il Server

Dalla radice del tuo progetto (es. `grpcgreeter/`), esegui il `main.go` che hai creato nella
cartella `cmd/greeter/`:

```bash
go run grpcgreeter/cmd/greeter
```

Se tutto è configurato correttamente, il servizio **ascolta** sulla porta `8090` (come
specificato in `main.go`).

Dovresti vedere un messaggio di log come:

```
Servizio greeter gRPC in ascolto su :8090
```

Questo indica che il servizio è attivo e **pronto** a ricevere richieste gRPC.

## 2. Testare il Servizio

### gRPC CLI

Se hai installato lo strumento CLI ufficiale gRPC (`brew install grpc` su MacOS),
puoi semplicemente testare il tuo servizio con:

```bash
grpc_cli call localhost:8090 SayHello "name: 'Alice'"
```

Questo invia un RPC al metodo `SayHello` con il campo `name` impostato a `"Alice"`.
Questo funziona perché il servizio è configurato per abilitare la reflection del server.

### gRPCurl

[gRPCurl](https://github.com/fullstorydev/grpcurl) (`brew install grpcurl` su
MacOS) è un altro strumento popolare che può essere usato per testare servizi gRPC:

```bash
grpcurl -plaintext -d '{"name": "Alice"}' localhost:8090 greeter.Greeter/SayHello
```

### Client Personalizzato

Puoi anche scrivere un **piccolo client Go** usando il codice client generato. Per
esempio:

```go
package main

import (
	"context"
	"fmt"
	"log"

	gengreeter "grpcgreeter/gen/greeter"
	genclient "grpcgreeter/gen/grpc/greeter/client"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	// Configura una connessione al server
	conn, err := grpc.Dial("localhost:8090", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Impossibile connettersi: %v", err)
	}
	defer conn.Close()

	// Crea un client gRPC usando il codice generato da Goa
	grpcc := genclient.NewClient(conn)
	c := gengreeter.NewClient(grpcc.SayHello())

	// Effettua la chiamata RPC
	res, err := c.SayHello(context.Background(), &gengreeter.SayHelloPayload{"Alice"})
	if err != nil {
		log.Fatalf("Errore nella chiamata a SayHello: %v", err)
	}

	// Stampa la risposta
	fmt.Printf("Risposta del server: %s\n", res.Greeting)
}
```

Compila ed esegui questo client, e dovrebbe stampare il saluto restituito dal tuo
servizio.

---

Ecco fatto! Ora hai un **servizio gRPC in esecuzione** costruito con Goa, testato sia
tramite la CLI ufficiale gRPC che un client Go personalizzato. Continua a esplorare il DSL per
aggiungere più funzionalità—come **streaming**, **interceptor di autenticazione**, o
**generazione automatica del codice** per ambienti multipli. Sei sulla buona
strada per un'architettura di microservizi **robusta** basata su Go con boilerplate minimo! 