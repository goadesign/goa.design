---
title: "Introduzione"
linkTitle: Introduzione
weight: 1
---

Lo streaming è una funzionalità potente che permette alle API di gestire grandi volumi di dati
e aggiornamenti in tempo reale in modo efficiente. In Goa, il supporto allo streaming ti permette di
definire endpoint che possono inviare o ricevere una sequenza di risultati, migliorando la
reattività e la scalabilità dei tuoi servizi.

## Perché lo Streaming è Importante

- **Efficienza:** Lo streaming riduce l'overhead di multiple richieste HTTP
  permettendo la trasmissione continua dei dati su una singola connessione.
- **Dati in Tempo Reale:** Abilita aggiornamenti di dati in tempo reale, che sono essenziali per
  applicazioni come feed live, notifiche e monitoraggio dei dati.
- **Scalabilità:** Gestisce dataset più grandi in modo più elegante processando i dati in
  blocchi invece di caricare interi dataset in memoria.
- **Migliore Esperienza Utente:** Fornisce un'esperienza più fluida e reattiva
  per gli utenti consegnando i dati in modo incrementale.

## Capacità di Streaming di Goa

Quando si lavora con file grandi o flussi di dati in tempo reale, caricare interi payload
in memoria prima di processarli non è sempre fattibile o desiderabile. Goa
fornisce molteplici approcci per gestire lo streaming dei dati:

Usando `StreamingPayload` e `StreamingResult` quando hai bisogno di:

- Fare streaming di dati strutturati con tipi conosciuti
- Sfruttare il sistema di tipi e la validazione di Goa
- Lavorare con lo streaming gRPC

Usando `SkipRequestBodyEncodeDecode` e `SkipResponseBodyEncodeDecode` quando hai
bisogno di:

- Fare streaming di dati binari raw o tipi di contenuto sconosciuti
- Implementare protocolli di streaming personalizzati
- Processare stream multimediali

Goa supporta lo streaming unidirezionale e bidirezionale su diversi protocolli
di trasporto, inclusi HTTP (usando WebSocket) e gRPC. Sfruttando il
Linguaggio Specifico di Dominio (DSL) di Goa, puoi definire endpoint di streaming che sono
indipendenti dal trasporto, permettendo un'integrazione e una flessibilità senza soluzione di continuità nella tua
architettura di servizio.

### Caratteristiche Chiave

- **Streaming Unidirezionale:** Permette al server o al client di inviare un flusso di dati.
- **Streaming Bidirezionale:** Permette sia al server che al client di inviare flussi di dati simultaneamente.
- **Indipendenza dal Trasporto:** Definisce logica di streaming che funziona su multipli protocolli di trasporto senza modifiche.
- **Interfacce di Stream Generate:** Genera automaticamente interfacce di stream server e client basate sulle tue definizioni di streaming.
- **Viste Personalizzate:** Supporta viste multiple per i risultati in streaming, fornendo flessibilità in come i dati sono presentati ai client.

## Panoramica dell'Esempio

Esploriamo un servizio `logger` che gestisce voci di log. Dimostreremo
diversi scenari di streaming che mostrano casi d'uso del mondo reale. Vedi la sezione
[Stream di dati binari raw su HTTP](./7-raw-binary) per un esempio di come
fare streaming di dati binari raw su HTTP.

### Esempio di Streaming Lato Server

```go
var _ = Service("logger", func() {
    // Il server fa streaming di voci di log per un topic specifico
    Method("subscribe", func() {
        Description("Stream di voci di log per un topic specifico")
        
        Payload(func() {
            Field(1, "topic", String, "Topic del log a cui sottoscriversi")
            Required("topic")
        })
        
        // Il server fa streaming di voci di log
        StreamingResult(func() {
            Field(1, "timestamp", String, "Tempo di lettura")
            Field(2, "message", String, "Messaggio di log")
            Required("timestamp", "message")
        })

        HTTP(func() {
            GET("/logs/{topic}/stream")
            Response(StatusOK)
        })
    })
})
```

### Esempio di Streaming Bidirezionale

```go
var _ = Service("logger", func() {
    // Gestione dell'inventario in tempo reale con streaming bidirezionale
    Method("subscribe", func() {
        Description("Stream bidirezionale per aggiornamenti di log in tempo reale e gestione dei topic")
        
        // Il client fa streaming di aggiornamenti dell'inventario
        StreamingPayload(func() {
            Field(1, "topic", String, "Topic del log a cui sottoscriversi")
            Required("topic")
        })
        
        // Il server fa streaming di stato dell'inventario e avvisi
        StreamingResult(func() {
            Field(1, "timestamp", String, "Tempo di lettura")
            Field(2, "message", String, "Messaggio di log")
            Required("timestamp", "message")
        })

        HTTP(func() {
            GET("/logs/{topic}/stream")
            Response(StatusOK)
        })
    })
})
```

Questi esempi dimostrano:

#### 1. Streaming Lato Server

Un pattern di streaming unidirezionale dove il server invia multiple risposte a una singola richiesta client.

#### Esempio: Monitoraggio dei Log
    Richiesta Client (una volta): "Monitora i log per 'errori database'"
    
    Risposte Server (continue):
    10:00:01 - Timeout connessione database
    10:00:05 - Esecuzione query fallita
    10:00:08 - Pool di connessioni esaurito
    (continua a inviare nuovi log mentre si verificano)

**Caratteristica Chiave:** Dopo la richiesta iniziale, i dati fluiscono solo dal server al client.

#### 2. Streaming Bidirezionale
Un pattern che permette a entrambi i lati di inviare multipli messaggi nel tempo.

#### Esempio: Gestione Interattiva dei Log
    Client: "Inizia a monitorare i log per 'database'"
    Server: *invia log relativi al database*
    Client: "Aggiorna il filtro per includere anche 'network'"
    Server: *invia log sia di database che di network*
    Client: "Rimuovi il filtro 'database'"
    Server: *invia solo log di network*
    (entrambi i lati continuano la comunicazione)

**Caratteristica Chiave:** Abilita una comunicazione continua bidirezionale, dove sia
  client che server possono inviare multipli messaggi durante la vita
  della connessione.

## Prossimi Passi

Con questa introduzione allo streaming in Goa, sei ora pronto per approfondire
la progettazione, l'implementazione e la gestione degli endpoint di streaming. Le sezioni
successive ti guideranno attraverso:

- [Progettare Endpoint di Streaming](./2-designing)
- [Streaming Lato Server](./3-server-side)
- [Streaming Lato Client](./4-client-side)
- [Streaming Bidirezionale](./5-bidirectional)
- [Gestire Viste Multiple](./6-views)
- [Stream di dati binari raw su HTTP](./7-raw-binary) 