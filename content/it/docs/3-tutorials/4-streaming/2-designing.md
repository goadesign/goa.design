---
title: "Progettare Endpoint di Streaming"
linkTitle: Progettazione
weight: 2
---

Progettare endpoint di streaming in Goa coinvolge la definizione di metodi che possono gestire
la trasmissione di una sequenza di risultati. Che tu stia implementando
streaming lato server, lato client o bidirezionale, il DSL di Goa
fornisce un modo chiaro e conciso per specificare questi comportamenti.

## Usare il DSL `StreamingResult`

Il DSL `StreamingResult` è usato all'interno di una definizione di metodo per indicare che
il metodo farà streaming di una sequenza di risultati al client. È mutuamente
esclusivo con il DSL `Result`; puoi usarne solo uno all'interno di un dato metodo.

### Esempio

```go
var _ = Service("logger", func() {
    Method("subscribe", func() {
        // Istanze di LogEntry vengono inviate in streaming al client.
        StreamingResult(LogEntry)
    })
})
```

In questo esempio:

- **Metodo subscribe:** Definisce un endpoint di streaming che invia istanze di `LogEntry`.
- **LogEntry:** Il tipo dei risultati che verranno inviati in streaming al client.

Quando si definisce un metodo di streaming, è necessario specificare il tipo di dati che verranno
inviati in streaming. Questo viene fatto passando il tipo di risultato alla funzione `StreamingResult`.

### Vincoli e Considerazioni

- **Mutua Esclusività:** Un metodo può usare o `Result` o `StreamingResult`, ma non entrambi.
- **Tipo di Risultato Singolo:** Tutti i risultati in streaming devono essere istanze dello stesso tipo.
- **Indipendenza dal Trasporto:** Il design è agnostico rispetto al protocollo di trasporto, permettendo a Goa di generare codice appropriato specifico per il trasporto.

## Usare il DSL `StreamingPayload`

Il DSL `StreamingPayload` è usato all'interno di una definizione di metodo per indicare che
il metodo riceverà una sequenza di messaggi dal client. Quando usato con il
trasporto HTTP, lavora in congiunzione con il DSL `Payload` regolare per gestire
sia i parametri di connessione iniziali che i dati di streaming successivi.

### Esempio

```go
var _ = Service("logger", func() {
    Method("subscribe", func() {
        // Il client invia in streaming istanze di LogEntry
        StreamingPayload(LogEntry)

        // Risultato singolo restituito dopo l'elaborazione di tutti gli aggiornamenti
        Result(Summary)
    })
})
```

In questo esempio:

- **Metodo subscribe:** Definisce un endpoint che riceve uno stream di istanze di `LogEntry`.
- **LogEntry:** Il tipo del payload che verrà inviato in streaming dal client.
- **Summary:** Un risultato singolo restituito dopo l'elaborazione di tutti gli aggiornamenti.

Quando si definisce un metodo di streaming client, è necessario specificare il tipo di dati
che verranno ricevuti nello stream. Questo viene fatto passando il tipo di payload alla
funzione `StreamingPayload`.

### Vincoli e Considerazioni

- **Tipo di Payload Singolo:** Tutti i payload in streaming devono essere istanze dello stesso tipo.
- **Indipendenza dal Trasporto:** Il design è agnostico rispetto al protocollo di trasporto, permettendo a Goa di generare codice appropriato specifico per il trasporto.
- **Risultato Opzionale:** I metodi di streaming client possono restituire un singolo risultato o nessun risultato.
- **Comportamento del Trasporto:** In HTTP, lo stream viene stabilito dopo che la richiesta iniziale è stata elaborata e la connessione è stata aggiornata a WebSocket.

### Combinare con Payload Regolare

Per gli endpoint HTTP, spesso vorrai includere parametri di inizializzazione nella
richiesta iniziale prima dell'aggiornamento WebSocket. Questo si ottiene combinando
`StreamingPayload` con un `Payload` regolare:

```go
var _ = Service("logger", func() {
    Method("subscribe", func() {
        // Parametri di connessione iniziali
        Payload(func() {
            Field(1, "topic", String, "Topic del log a cui sottoscriversi")
            Field(2, "api_key", String, "Chiave API per l'autenticazione")
            Required("topic", "api_key")
        })

        // Stream di aggiornamenti dal client
        StreamingPayload(LogEntry)

        // Risultato finale dopo l'elaborazione di tutti gli aggiornamenti
        Result(Summary)

        HTTP(func() {
            GET("/logs/{topic}/stream")
            Param("api_key")
        })
    })
})
```

Questo pattern è particolarmente utile per:
- Autenticazione e autorizzazione prima di stabilire lo stream
- Fornire contesto o ambito per la sessione di streaming
- Impostare parametri iniziali che rimangono costanti durante tutto lo stream
- Validare la richiesta prima di aggiornare a una connessione WebSocket

Nel trasporto HTTP:
1. La richiesta GET iniziale include i parametri `topic` e `api_key`
2. Dopo la validazione, la connessione viene aggiornata a WebSocket
3. Il client inizia quindi a inviare in streaming messaggi `StreamingPayload`
4. Il server elabora lo stream e può restituire un risultato finale

## Riepilogo

Progettare endpoint di streaming in Goa è semplice con i DSL
`StreamingResult` e `StreamingPayload`. Definendo il tipo di dati
da inviare in streaming all'interno dei tuoi metodi di servizio, puoi sfruttare la potente
generazione di codice di Goa per gestire la logica di streaming sottostante specifica per il trasporto. Questo
assicura che i tuoi endpoint di streaming siano robusti, efficienti e manutenibili. 