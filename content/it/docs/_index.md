---
title: "Documentazione"
linkTitle: "Documentazione"
weight: 20
description: >
  LLM-optimized documentation for Goa and Goa-AI frameworks. Consolidated pages designed for easy copying into LLM contexts.
llm_optimized: true
content_scope: "Complete Documentation"
aliases:
---

{{< section-llm-info >}}
**📋 Documentazione ottimizzata per LLM** - Questa documentazione è stata progettata per essere facilmente copiata in contesti LLM. Usare il pulsante "Copia pagina" su qualsiasi pagina per copiare il contenuto come Markdown o testo normale.
{{< /section-llm-info >}}

## Sezioni della documentazione

Questa documentazione è organizzata in pagine consolidate e autonome, ottimizzate per il consumo di LLM. Ogni pagina può essere copiata per intero per fornire un contesto completo.

### Struttura Goa

Sviluppo di API orientato alla progettazione con generazione automatica di codice per microservizi Go.

| Guida | Descrizione | ~Tokens |
|-------|-------------|---------|
| [Quickstart](1-goa/quickstart/) | Installate Goa e costruite il vostro primo servizio | ~1.100 |
| [DSL Reference](1-goa/dsl-reference/) | Riferimento completo per il linguaggio di progettazione di Goa | ~2.900 |
| [Code Generation](1-goa/code-generation/) | Comprendere il processo di generazione del codice di Goa | ~2.100 |
| [Guida HTTP](1-goa/http-guide/) | Caratteristiche del trasporto HTTP, routing e pattern | ~1.700 |
| [Guida gRPC](1-goa/grpc-guide/) | Caratteristiche del trasporto gRPC e streaming | ~1,800 |
| [Gestione degli errori](1-goa/error-handling/) | Definizione e gestione degli errori | ~1.800 |
| [Intercettatori](1-goa/interceptors/) | Intercettatori e modelli di middleware | ~1.400 |
| [Produzione](1-goa/production/) | Osservabilità, sicurezza e distribuzione | ~1.300 |

**Totale sezione Goa:** ~14.500 gettoni

### Struttura Goa-AI

Framework orientato alla progettazione per la costruzione di sistemi agici e guidati da strumenti in Go.

| Guida | Descrizione | ~Tokens |
|-------|-------------|---------|
| [Quickstart](2-goa-ai/quickstart/) | Installazione e primo agente | ~2,700 |
| [DSL Reference](2-goa-ai/dsl-reference/) | DSL completo: agenti, toolset, policy, MCP | ~3.600 |
| [Runtime](2-goa-ai/runtime/) | Architettura del runtime, ciclo di pianificazione/esecuzione, motori | ~2,400 |
| [Toolsets](2-goa-ai/toolsets/) | Tipi di toolset, modelli di esecuzione, trasformazioni | ~2,300 |
| [Agent Composition](2-goa-ai/agent-composition/) | Agent-as-tool, alberi di esecuzione, topologia di streaming | ~1.400 |
| [Integrazione MCP](2-goa-ai/mcp-integration/) | Server MCP, trasporti, wrapper generati | ~1.200 |
| [Memoria e sessioni](2-goa-ai/memory-sessions/) | Trascrizioni, archivi di memoria, sessioni, esecuzioni | ~1.600 |
| [Produzione](2-goa-ai/production/) | Impostazione temporale, UI in streaming, integrazione del modello | ~2.200 |

**Totale sezione Goa-AI:** ~17.600 gettoni

## Utilizzo di questa documentazione con gli LLM

### Funzione di copia della pagina

Ogni pagina di documentazione include un pulsante "Copia pagina" con due opzioni:

- **Copia come Markdown** - Conserva la formattazione, le annotazioni linguistiche dei blocchi di codice e la gerarchia delle intestazioni
- **Copia come testo normale** - Testo pulito senza sintassi markdown, adatto a qualsiasi contesto

### Flusso di lavoro consigliato

1. **Iniziare con il Quickstart** - Copiare la guida rapida per dare un contesto di base al proprio LLM
2. **Aggiungi guide specifiche** - Copia le guide pertinenti in base alla tua attività (ad esempio, la guida HTTP per le API REST)
3. **Includere il riferimento al DSL** - Per le domande di progettazione, includere il riferimento al DSL completo

### Suggerimenti per il budget dei token

- Ogni guida è progettata per adattarsi alle finestre di contesto tipiche di un LLM
- La documentazione completa di Goa (~14,5k tokens) si adatta facilmente alla maggior parte degli LLM moderni
- La documentazione completa di Goa-AI (~17,6k tokens) è altrettanto compatta
- Entrambi i framework insieme (~32k tokens) funzionano bene con modelli di contesto più grandi

## Concetti chiave

### Sviluppo orientato al design

Sia Goa che Goa-AI seguono una filosofia design-first:

1. **Definire la propria API/Agent** utilizzando un potente DSL
2. **Generare codice** automaticamente dal progetto
3. **Implementare la logica di business** in interfacce pulite e sicure dal punto di vista tipologico
4. **La documentazione rimane sincronizzata** perché proviene dalla stessa fonte

### Sicurezza dei tipi

Il codice generato offre una sicurezza di tipo end-to-end:

```go
// Generated interface - your contract
type Service interface {
    Add(context.Context, *AddPayload) (int, error)
}

// Your implementation - clean and focused
func (s *service) Add(ctx context.Context, p *calc.AddPayload) (int, error) {
    return p.A + p.B, nil
}
```

## Comunità

- [Gophers Slack](https://gophers.slack.com/messages/goa) - Canale #goa
- [Discussioni GitHub](https://github.com/goadesign/goa/discussions) - Domande e idee
- [Bluesky](https://goadesign.bsky.social) - Aggiornamenti e annunci

## Contribuire

Volete migliorare la documentazione? Consulta la [Guida al contributo](contributing/) per le linee guida sulle case canoniche, i modelli di collegamento incrociato e la strategia dei contenuti.
