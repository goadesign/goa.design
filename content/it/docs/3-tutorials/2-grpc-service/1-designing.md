---
title: "Progettazione di Servizi gRPC"
linkTitle: "Progettazione"
weight: 1
description: "Impara a progettare servizi gRPC con Goa, inclusi definizione del servizio, annotazioni dei metodi, generazione protobuf e mappature appropriate dei codici di stato gRPC."
---

In questo tutorial, **progetterai** un semplice servizio gRPC con Goa. Mentre Goa è
spesso usato per endpoint REST, ha anche supporto di prima classe per i trasporti
**gRPC**. Vedrai come:

- Definire un servizio e i metodi nel DSL di Goa.
- Annotarli per gRPC, assicurando che il codice generato produca file `.proto`.
- Validare i payload e mappare gli errori ai codici di stato gRPC.

## Cosa Costruiremo

Creeremo un servizio **`greeter`** che ha un singolo metodo chiamato `SayHello`.
Il metodo riceve un nome nel payload e restituisce un messaggio di saluto. Mostreremo
anche come **qualificare** le risposte gRPC con codici gRPC standard.

| Metodo   | RPC gRPC      | Descrizione                                 |
|----------|---------------|---------------------------------------------|
| SayHello | rpc SayHello  | Restituisce un saluto dato un nome fornito dall'utente |

## 1. Crea un Nuovo Modulo e Cartella

Crea un nuovo modulo Go per questo progetto `grpcgreeter`:

```bash
mkdir grpcgreeter
cd grpcgreeter
go mod init grpcgreeter
```

All'interno di questa cartella, configura una directory `design/` per contenere i tuoi file DSL:

```bash
mkdir design
```

## 2. Scrivi il Design del Servizio

Crea un file chiamato `design/greeter.go` con il seguente contenuto:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

// Definisci un servizio greeter basato su gRPC.
var _ = Service("greeter", func() {
    Description("Un semplice servizio gRPC che dice ciao.")

    Method("SayHello", func() {
        Description("Invia un saluto a un utente.")

        // Definisci il payload della richiesta (ciò che il client invia).
        Payload(func() {
            Field(1, "name", String, "Nome dell'utente da salutare", func() {
                Example("Alice")
                MinLength(1)
            })
            Required("name")
        })

        // Definisci il risultato (ciò che il server restituisce).
        Result(func() {
            Field(1, "greeting", String, "Un messaggio di saluto amichevole")
            Required("greeting")
        })

        // Indica che questo metodo dovrebbe essere esposto via gRPC.
        GRPC(func() {
            // Il codice predefinito per una risposta di successo è CodeOK (0).
            // Puoi anche definire mappature personalizzate se necessario:
            // Response(CodeOK)
        })
    })
})
```

### Punti Chiave

- Usiamo `Method("SayHello", ...)` per definire la chiamata di procedura remota.
- **Payload** specifica i campi di input. In termini gRPC, questo diventa il messaggio
  di richiesta.
- **Result** definisce i campi di output. In termini gRPC, questo diventa il messaggio
  di risposta.
- Aggiungere **`GRPC(func() {...})`** assicura che il codice generato includa definizioni
  `.proto` e stub per questo metodo.
- Usiamo `Field(1, "name", String, ...)` per definire i campi nei messaggi di richiesta e
  risposta. I numeri sono i tag nel file `.proto` generato.
  Nota che questo sostituisce l'uso di `Attribute` per definire i campi nei metodi
  HTTP. I metodi che supportano sia trasporti HTTP che gRPC possono usare `Field`
  per definire i campi (il tag viene ignorato per HTTP).

## 3. Prossimi Passi

Con il tuo **design del servizio gRPC** pronto, procedi al prossimo tutorial:

- [Implementazione del Servizio](./2-implementing.md):
  Genera il codice, collega la tua logica personalizzata e impara come eseguire un server gRPC in
  Goa.
- [Esecuzione del Servizio](./3-running.md):
  Esplora come usare la CLI ufficiale di gRPC o altri strumenti per chiamare i tuoi endpoint
  e assicurarti che tutto funzioni correttamente.

Hai ora **progettato** un servizio gRPC minimale usando Goa. L'approccio DSL ti fornisce
una **singola fonte di verità** per i tipi di richiesta/risposta, le validazioni e
le mappature dei codici di stato gRPC—rendendo il tuo servizio **facile da evolvere** e
**mantenere** nel tempo! 