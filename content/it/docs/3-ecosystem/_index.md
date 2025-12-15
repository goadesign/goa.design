---
title: "Ecosistema e strumenti"
linkTitle: "Ecosistema"
weight: 3
description: "Companion libraries that extend Goa: architecture diagrams, distributed events, and observability."
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

## Panoramica

L'ecosistema Goa comprende librerie complementari che rispondono a esigenze comuni nello sviluppo di microservizi. Questi strumenti sono progettati per funzionare perfettamente con Goa, ma possono essere utilizzati anche in modo indipendente.

## Librerie complementari

| Libreria | Scopo | Caratteristiche principali |
|---------|---------|--------------|
| [Model](model/) | Diagrammi di architettura | Diagrammi C4 come codice, controllo di versione, editor interattivo |
| [Pulse](pulse/) | Eventi distribuiti | Streaming di eventi, pool di lavoratori, mappe replicate |
| [Clue](clue/) | Osservabilità | Tracing, logging, metriche, controlli di salute |

## Modello - Diagrammi di architettura come codice

Model fornisce un DSL Go per descrivere l'architettura del software utilizzando il [modello C4](https://c4model.com). Invece di disegnare diagrammi con strumenti grafici, si definisce l'architettura nel codice:

```go
var _ = Design("My System", "System description", func() {
    var System = SoftwareSystem("My System", "Does something useful")
    
    Person("User", "A user of the system", func() {
        Uses(System, "Uses")
    })
    
    Views(func() {
        SystemContextView(System, "Context", "System context diagram", func() {
            AddAll()
            AutoLayout(RankLeftRight)
        })
    })
})
```

**Benefici:**
- Documentazione dell'architettura a controllo di versione
- Generazione automatica di diagrammi (SVG, JSON)
- Editor grafico interattivo per il posizionamento
- Plugin Goa per progetti combinati di API e architettura

**Per saperne di più:** [Documentazione del modello](model/)

## Pulse - Infrastruttura di eventi distribuiti

Pulse fornisce primitive per la costruzione di sistemi distribuiti guidati dagli eventi. È indipendente dal trasporto e funziona con o senza servizi Goa:

- **Streaming**: Instradamento di eventi pub/sub tra microservizi
- **Pools di lavoratori**: Lavoratori dedicati con hashing coerente per l'invio di lavori
- **Mappe replicate**: Stato condiviso e coerente tra i nodi

```go
// Publish events to a stream
stream.Add(ctx, "user.created", userEvent)

// Subscribe to events
reader.Subscribe(ctx, func(event *Event) error {
    return processEvent(event)
})
```

**Casi d'uso
- Elaborazione asincrona di eventi
- Code di lavoro in background
- Caching distribuito
- Notifiche in tempo reale

**Per saperne di più:** [Documentazione Pulse](pulse/)

## Indizio - Osservabilità dei microservizi

Clue fornisce strumentazione per i servizi Goa costruiti su OpenTelemetry. Copre i tre pilastri dell'osservabilità:

```go
// Configure OpenTelemetry
cfg := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter)
clue.ConfigureOpenTelemetry(ctx, cfg)

// Context-based logging
log.Info(ctx, "processing request", log.KV{"user_id", userID})

// Health checks
checker := health.NewChecker(health.NewPinger("db", dbAddr))
```

**Caratteristiche:**
- Tracciamento distribuito con propagazione automatica dell'intervallo di tempo
- Registrazione strutturata con buffering intelligente
- Raccolta ed esportazione di metriche
- Endpoint di controllo dello stato di salute
- Endpoint di debug per la risoluzione dei problemi in fase di esecuzione

**Per saperne di più:** [Documentazione Clue](clue/)

## Guide alla documentazione

| Guida | Descrizione | ~Tokens |
|-------|-------------|---------|
| [Model](model/) | Diagrammi C4, DSL di riferimento, mdl CLI | ~2.500 |
| [Pulse](pulse/) | Streaming, pool di lavoratori, mappe replicate | ~2.200 |
| [Clue](clue/) | Logging, tracing, metriche, controlli di salute | ~2.800 |

**Sezione totale:** ~7.500 gettoni

## Iniziare

Scegliere la libreria che corrisponde alle proprie esigenze:

- **Necessitate di documentazione sull'architettura? ** Iniziate con [Model](model/)
- **Costruire sistemi guidati dagli eventi? ** Iniziare con [Pulse](pulse/)
- **Aggiungere l'osservabilità ai servizi Goa? ** Iniziare con [Clue](clue/)

Tutte le librerie sono disponibili tramite `go get`:

```bash
go get goa.design/model
go get goa.design/pulse
go get goa.design/clue
```
