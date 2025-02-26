---
linkTitle: Servizi Multipli
title: Lavorare con Servizi Multipli in Goa
weight: 2
description: >
  Progetta e implementa architetture di microservizi scalabili con Goa
---

Nelle applicazioni del mondo reale, è comune avere più servizi che lavorano insieme
per formare un sistema completo. Goa rende facile progettare e implementare più
servizi all'interno di un singolo progetto. Questa guida ti accompagnerà attraverso il processo di
creazione e gestione efficace di servizi multipli.

## Comprendere i Servizi Multipli

Un servizio in Goa rappresenta un raggruppamento logico di endpoint correlati che forniscono
funzionalità specifiche. Mentre le applicazioni semplici potrebbero aver bisogno di un solo servizio,
le applicazioni più grandi spesso beneficiano della suddivisione delle funzionalità tra più
servizi. Questo approccio permette una migliore organizzazione degli endpoint API, una più chiara
separazione delle responsabilità, una manutenzione e test più facili, capacità di deployment
indipendenti e controlli di sicurezza granulari.

## Pattern di Architettura dei Servizi

Quando si progetta un sistema multi-servizio, i servizi tipicamente ricadono in due categorie:
servizi front-end e servizi back-end. Comprendere questi pattern aiuta nella progettazione
di un'architettura scalabile e manutenibile.

## Organizzazione dei Servizi

Goa offre flessibilità nel modo in cui organizzi i design dei tuoi servizi e il codice
generato. Esploriamo i due approcci principali: design unificato e design indipendente.

### Approccio di Design Unificato

L'approccio unificato porta tutti i servizi sotto una singola gerarchia di design mantenendo
implementazioni specifiche per servizio. Ecco come funziona:

```go
// design/design.go - File di design di alto livello
package design

import (
    _ "myapi/services/users/design"    // Ogni servizio ha il proprio design
    _ "myapi/services/products/design"
    . "goa.design/goa/v3/dsl"
)

var _ = API("myapi", func() {
    Title("La Mia API")
    Description("Esempio di API multi-servizio")
})
```

Ogni servizio mantiene il proprio file di design che contribuisce all'API complessiva:

```go
// services/users/design/design.go - Design specifico del servizio
package design

import (
    . "goa.design/goa/v3/dsl"
    "myapi/design/types"
)

var _ = Service("users", func() {
    // Design specifico del servizio
})
```

Questo approccio centralizza la generazione del codice e la condivisione dei tipi:
- Il codice generato risiede nella directory root `gen/`
- Un singolo comando `goa gen` genera il codice per tutti i servizi
- I tipi condivisi sono automaticamente disponibili tra i servizi
- Il sistema mantiene una specifica OpenAPI unificata
- I team possono facilmente mantenere la coerenza tra i servizi

### Approccio di Design Indipendente

L'approccio indipendente tratta ogni servizio come un'unità autonoma:

```go
// services/users/design/design.go - Design del servizio indipendente
package design

import (
    . "goa.design/goa/v3/dsl"
)

var _ = API("users", func() {
    Title("Servizio Utenti")
    Description("API di gestione utenti")
})

var _ = Service("users", func() {
    // Design specifico del servizio
})
```

Questo approccio massimizza l'indipendenza dei servizi:
- Ogni servizio mantiene la propria directory `gen/`
- I servizi possono essere generati e versionati indipendentemente
- Ogni servizio ha la propria specifica OpenAPI
- I servizi possono facilmente essere spostati in repository separati
- I team possono lavorare indipendentemente su diversi servizi

## Considerazioni sul Trasporto

La tua scelta del protocollo di trasporto impatta significativamente su come i servizi interagiscono.
Esaminiamo i benefici di ogni approccio:

### Servizi gRPC

gRPC eccelle nella comunicazione interna tra servizi attraverso:
- Trasmissione efficiente del protocollo binario
- Interfacce fortemente tipizzate tramite protocol buffers
- Service discovery e bilanciamento del carico integrati
- Capacità di streaming bidirezionale
- Integrazione HTTP/JSON attraverso gRPC gateway

### Servizi HTTP

HTTP serve bene i servizi rivolti all'esterno fornendo:
- Compatibilità universale con i client
- Ricco ecosistema di strumenti e middleware
- Pattern REST familiari
- Facile debug e testing
- Adatto naturalmente per applicazioni web

## Struttura del Repository

Un repository ben organizzato aiuta i team a navigare e mantenere il codice
efficacemente. Ecco una struttura raccomandata:

```
myapi/
├── README.md          # Panoramica del sistema e guida al setup
├── design/            # Elementi di design condivisi
│   ├── design.go      # Design di alto livello per approccio unificato
│   └── types/         # Definizioni di tipi condivisi
├── gen/               # Codice generato (approccio unificato)
│   ├── http/          # Codice del layer di trasporto HTTP
│   ├── grpc/          # Codice del layer di trasporto gRPC
│   └── types/         # Tipi generati condivisi
├── scripts/           # Script di sviluppo e deployment
└── services/          # Implementazioni dei servizi
    ├── users/         # Esempio: Servizio utenti
    │   ├── cmd/       # Eseguibili del servizio
    │   ├── design/    # Design specifico del servizio
    │   ├── gen/       # Codice generato (approccio indipendente)
    │   ├── handlers/  # Logica di business
    │   └── README.md  # Documentazione del servizio
    └── products/      # Esempio: Servizio prodotti
        └── ...
```

## Pattern di Comunicazione tra Servizi

Quando si progettano le interazioni tra servizi, considera questi pattern comuni:

### Servizi Front-end e Back-end

I servizi tipicamente ricadono in due categorie:

1. **Servizi Front-end**: Servizi rivolti al pubblico che:
   - Usano HTTP come trasporto per ampia compatibilità client
   - Si concentrano sull'orchestrazione delle richieste ai servizi back-end
   - Gestiscono autenticazione e autorizzazione delle richieste esterne
   - Iniziano contesti di osservabilità (tracce, metriche)
   - Definiscono API ampie con implementazioni superficiali

2. **Servizi Back-end**: Servizi interni che:
   - Spesso usano gRPC per benefici di performance
   - Implementano la logica di business core
   - Possono usare meccanismi di identità privati (es. spiffe)
   - Contribuiscono a contesti di osservabilità esistenti
   - Definiscono API focalizzate con implementazioni profonde

Un pattern di architettura comune è avere pochi servizi front-end (a volte solo uno)
che espongono le capacità della tua piattaforma ai client esterni, con multipli servizi
back-end che gestiscono l'effettiva logica di business. 