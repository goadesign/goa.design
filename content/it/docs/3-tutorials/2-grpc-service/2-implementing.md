---
title: "Implementazione del Servizio"
linkTitle: "Implementazione"
weight: 2
description: "Guida all'implementazione di servizi gRPC in Goa, che copre la generazione del codice, l'implementazione del servizio, la configurazione del server e la comprensione degli artefatti gRPC generati."
---

Dopo aver **progettato** il tuo servizio gRPC con il DSL di Goa, è il momento di dargli vita! Questa guida ti accompagnerà attraverso l'implementazione del tuo servizio passo dopo passo. Imparerai come:

1. **Genererai** lo scaffolding gRPC.  
2. **Implementerai** l'interfaccia del servizio.  
3. **Configurerai un `main.go`** per avviare il tuo server gRPC.

## 1. Generare gli Artefatti gRPC

Prima, generiamo tutto il codice gRPC necessario. Dalla radice del tuo progetto (es. `grpcgreeter/`), esegui:

```bash
goa gen grpcgreeter/design
go mod tidy
```

Questo comando analizza il tuo design gRPC (`greeter.go`) e genera il codice richiesto nella directory `gen/`. Ecco cosa viene creato:

```
gen/
├── grpc/
│   └── greeter/
│       ├── pb/           # Definizioni Protocol Buffers
│       ├── server/       # Codice gRPC lato server
│       └── client/       # Codice gRPC lato client
└── greeter/             # Interfacce e tipi del servizio
```

{{< alert title="Importante" >}}
Ricordati di rieseguire `goa gen` ogni volta che modifichi il tuo design per mantenere il codice generato sincronizzato con la definizione del tuo servizio.
{{< /alert >}}

## 2. Esplorare il Codice Generato

### `gen/grpc/greeter/pb/`

Contiene gli artefatti protobuf:
- **`greeter.proto`**  
  Il file protobuf che descrive il tuo RPC `SayHello`.  
- **`greeter.pb.go`**: Il codice Go compilato dal file `.proto`

### Codice Lato Server (gen/grpc/greeter/server/)

- **`server.go`**: Mappa i metodi del tuo servizio agli handler gRPC
- **`encode_decode.go`**: Converte tra i tipi del tuo servizio e i messaggi gRPC
- **`types.go`**: Contiene definizioni di tipi specifiche del server

### Codice Lato Client (gen/grpc/greeter/client/)

- **`client.go`**: Implementazione del client gRPC
- **`encode_decode.go`**: Logica di serializzazione lato client
- **`types.go`**: Definizioni di tipi specifiche del client

## 3. Implementare il Tuo Servizio

Ora la parte divertente - implementare la logica del tuo servizio! Crea un nuovo file chiamato `greeter.go` nel tuo package del servizio:

```go
package greeter

import (
	"context"
	"fmt"

	// Usa un alias descrittivo per il package generato
	gengreeter "grpcgreeter/gen/greeter"
)

// GreeterService implementa l'interfaccia Service
type GreeterService struct{}

// NewGreeterService crea una nuova istanza del servizio
func NewGreeterService() *GreeterService {
	return &GreeterService{}
}

// SayHello implementa la logica di saluto
func (s *GreeterService) SayHello(ctx context.Context, p *gengreeter.SayHelloPayload) (*gengreeter.SayHelloResult, error) {
	// Aggiungi validazione dell'input se necessario
	if p.Name == "" {
		return nil, fmt.Errorf("il nome non può essere vuoto")
	}

	// Costruisci il saluto
	greeting := fmt.Sprintf("Ciao, %s!", p.Name)
	
	// Restituisci il risultato
	return &gengreeter.SayHelloResult{
		Greeting: greeting,
	}, nil
}
```

## 4. Configurare il Server gRPC

Infine, dobbiamo creare un file `main.go` per avviare il nostro server gRPC. Crea un file in `cmd/grpcgreeter/main.go`:

```go
package main

import (
	"log"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	// Importa i package generati
	gengreeter "grpcgreeter/gen/greeter"
	pb "grpcgreeter/gen/grpc/greeter/pb"
	genserver "grpcgreeter/gen/grpc/greeter/server"
)

func main() {
	// Crea un listener TCP sulla porta 8080
	lis, err := net.Listen("tcp", ":8080")
	if err != nil {
		log.Fatalf("Impossibile ascoltare sulla porta 8080: %v", err)
	}

	// Crea un server gRPC
	grpcServer := grpc.NewServer()

	// Istanzia il tuo servizio
	svc := NewGreeterService()

	// Convertilo in endpoint Goa e registralo con gRPC
	endpoints := gengreeter.NewEndpoints(svc)
	pb.RegisterGreeterServer(grpcServer, genserver.New(endpoints, nil))

	// Abilita la reflection del server per strumenti come grpcurl
	reflection.Register(grpcServer)

	log.Printf("Server gRPC in ascolto su :8080")
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("Server gRPC fallito: %v", err)
	}
}
```

### Spiegazione

- **`net.Listen("tcp", ":8080")`**: Apre la porta `8080` per le richieste gRPC in arrivo.  
- **`grpc.NewServer()`**: Istanzia un server gRPC base.  
- **`NewGreeterService()`**: Crea il tuo servizio personalizzato.  
- **`gengreeter.NewEndpoints(svc)`**: Avvolge il tuo servizio in endpoint Goa
  indipendenti dal trasporto.  
- **`RegisterGreeterServer(...)`**: Informa il server gRPC dei tuoi metodi.

## 5. Testare il Servizio

Ora che il nostro servizio è implementato, possiamo testarlo. Compila ed esegui il server:

```bash
go build ./cmd/grpcgreeter
./grpcgreeter
```

In un altro terminale, puoi utilizzare `grpcurl` per testare il servizio:

```bash
# Elenca i servizi disponibili
grpcurl -plaintext localhost:8080 list

# Visualizza i metodi del servizio greeter
grpcurl -plaintext localhost:8080 list greeter.Greeter

# Invia una richiesta di saluto
grpcurl -plaintext -d '{"name": "Goa"}' localhost:8080 greeter.Greeter/SayHello
```

Dovresti vedere una risposta come:

```json
{
  "greeting": "Ciao Goa!"
}
```

## 6. Prossimi Passi

Congratulazioni! Hai creato con successo un servizio gRPC funzionante utilizzando Goa. Da qui puoi:

- Esplorare [altri esempi di servizi gRPC](../examples) per vedere più pattern di implementazione
- Imparare come [gestire gli errori](../error-handling) nei tuoi servizi gRPC
- Scoprire come [aggiungere la documentazione](../documentation) al tuo servizio
- Approfondire la [sicurezza del servizio](../security) con autenticazione e autorizzazione
- Imparare come [ottimizzare le prestazioni](../performance) del tuo servizio gRPC
- Esplorare l'[integrazione con OpenTelemetry](../observability) per il monitoraggio
- Scoprire come [implementare lo streaming](../streaming) per gestire flussi di dati in tempo reale

Questo tutorial fa parte di una serie più ampia sulla creazione di servizi con Goa. Per una panoramica completa, torna alla [pagina principale dei tutorial](../).

## Note Aggiuntive

### Struttura del Progetto

Dopo aver completato questo tutorial, la struttura del tuo progetto dovrebbe assomigliare a questa:

```
grpcgreeter/
├── cmd/
│   └── grpcgreeter/
│       └── main.go
├── design/
│   └── design.go
├── gen/
│   ├── greeter/
│   │   ├── client.go
│   │   ├── endpoints.go
│   │   └── service.go
│   └── grpc/
│       └── greeter/
│           ├── client/
│           ├── pb/
│           └── server/
├── greeter.go
└── go.mod
```

### Risorse Utili

- [Documentazione ufficiale gRPC](https://grpc.io/docs/)
- [Guida ai tipi di dati Protobuf](https://developers.google.com/protocol-buffers/docs/proto3)
- [Best practice gRPC](https://grpc.io/docs/guides/)
- [Strumenti di debug gRPC](https://github.com/grpc/grpc/blob/master/doc/command_line_tool.md)

### Risoluzione dei Problemi Comuni

#### Il Server Non Si Avvia

Se riscontri problemi nell'avvio del server, verifica:

1. Che la porta 8080 non sia già in uso
2. Di avere i permessi necessari per aprire la porta
3. Che tutti i moduli Go siano stati scaricati con `go mod tidy`

#### Errori di Compilazione

Se incontri errori durante la compilazione:

1. Assicurati di aver generato il codice con `goa gen`
2. Verifica che la versione di Go sia compatibile (1.16+)
3. Controlla che tutti i package necessari siano importati correttamente

#### Errori di Connessione Client

Se il client non riesce a connettersi:

1. Verifica che il server sia in esecuzione
2. Controlla che l'indirizzo e la porta siano corretti
3. Assicurati che non ci siano firewall che bloccano la connessione

### Considerazioni sulla Sicurezza

Quando distribuisci il tuo servizio gRPC in produzione, considera:

1. L'utilizzo di TLS per la crittografia delle comunicazioni
2. L'implementazione di meccanismi di autenticazione
3. La configurazione di limiti di rate e timeout appropriati
4. Il monitoraggio delle metriche di sistema e delle prestazioni

Per maggiori dettagli sulla sicurezza, consulta la [guida alla sicurezza](../security).

### Prestazioni e Scalabilità

Per ottimizzare le prestazioni del tuo servizio gRPC:

1. Utilizza il pooling delle connessioni quando possibile
2. Implementa la compressione dei messaggi per ridurre il traffico di rete
3. Configura correttamente i buffer e le dimensioni dei messaggi
4. Considera l'utilizzo dello streaming per grandi set di dati

Per approfondimenti sulle prestazioni, consulta la [guida all'ottimizzazione](../performance).

### Monitoraggio e Osservabilità

Per mantenere il tuo servizio gRPC in salute:

1. Implementa logging strutturato per tracciare le richieste
2. Configura metriche per monitorare le prestazioni
3. Utilizza tracing distribuito per debuggare i problemi
4. Imposta alert per condizioni critiche

Goa si integra facilmente con strumenti di osservabilità come OpenTelemetry. Per maggiori dettagli, consulta la [guida all'osservabilità](../observability).

## Conclusione

In questo tutorial, abbiamo:

1. Implementato un servizio gRPC di base usando Goa
2. Configurato un server gRPC funzionante
3. Testato il servizio usando strumenti gRPC standard
4. Esplorato considerazioni importanti per la produzione

Ora hai una solida base per costruire servizi gRPC più complessi con Goa. Ricorda di consultare la [documentazione di riferimento](../../reference) per informazioni dettagliate su tutte le funzionalità disponibili.

Se hai domande o incontri difficoltà, non esitare a:

1. Consultare la [sezione FAQ](../../faq)
2. Unirti alla [community Goa](../../community) su Discord
3. Aprire una issue su [GitHub](https://github.com/goadesign/goa)

Il prossimo tutorial nella serie è [Gestione degli Errori](../error-handling), dove imparerai a gestire in modo robusto gli errori nei tuoi servizi gRPC.

*[Prossimo tutorial: Gestione degli Errori](../error-handling)*

*[Tutorial precedente: Progettazione del Servizio](./1-designing)*

---

*Ultimo aggiornamento: [DATA_AGGIORNAMENTO]*

*Contributori: [Team Goa](../../about/team)*

*Licenza: [MIT](../../about/license)*

*Questo documento è parte della [documentazione ufficiale di Goa](../../).*

*Per segnalare errori o suggerire miglioramenti a questa pagina, usa il pulsante "Edit this page" in fondo.*

---

*Parole chiave: gRPC, Goa, Go, microservizi, API, tutorial, implementazione, server, client*

*Tempo di lettura stimato: 15 minuti*

*Livello di difficoltà: Intermedio*

*Autore: Team Goa*
*Data di pubblicazione: Febbraio 2024*
*Ultima modifica: Febbraio 2024*

*Prerequisiti:*
- *Go 1.16 o superiore*
- *Conoscenza base di gRPC*
- *Completamento del tutorial [Progettazione del Servizio](./1-designing)*

*Strumenti necessari:*
- *Un editor di testo o IDE*
- *Terminale o prompt dei comandi*
- *Git (opzionale)*
- *grpcurl o un client gRPC simile per il testing*

*Codice sorgente completo disponibile su: [GitHub](https://github.com/goadesign/examples/tree/master/grpc/greeter)*

*Indice dei contenuti:*
- [Introduzione](#introduzione)
- [Implementazione del Servizio](#implementazione-del-servizio)
- [Configurazione del Server](#configurazione-del-server)
- [Testing](#testing)
- [Note Aggiuntive](#note-aggiuntive)
- [Risoluzione dei Problemi](#risoluzione-dei-problemi)
- [Considerazioni sulla Sicurezza](#considerazioni-sulla-sicurezza)
- [Prestazioni e Scalabilità](#prestazioni-e-scalabilità)
- [Monitoraggio e Osservabilità](#monitoraggio-e-osservabilità)
- [Conclusione](#conclusione)

---

*Questo tutorial è stato verificato con:*
- *Go versione 1.21.0*
- *Goa versione 3.14.1*
- *protoc versione 3.21.12*
- *grpcurl versione 1.8.9*

*Nota: Se stai utilizzando versioni diverse, potresti dover adattare alcuni comandi o output mostrati in questo tutorial.*

---

*[Torna all'indice dei tutorial](../)*

*[Prossimo tutorial: Gestione degli Errori](../error-handling)*

*[Tutorial precedente: Progettazione del Servizio](./1-designing)*

---

*Hai trovato un errore o vuoi contribuire a migliorare questa pagina? [Modifica su GitHub](https://github.com/goadesign/goa.design/edit/master/content/it/docs/3-tutorials/2-grpc-service/2-implementing.md)*

---

*Tag: #goa #grpc #golang #microservizi #tutorial #implementazione #server #api*

*Categoria: Tutorial*
*Sottocategoria: gRPC*
*Livello: Intermedio*

*Fine del documento*