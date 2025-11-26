---
title: "Goa-AI"
linkTitle: "Goa-AI"
weight: 8
description: >
  Framework design-first per costruire sistemi agentici e tool-driven in Go. Estendi il DSL di Goa per dichiarare agenti, toolset e policy, poi lascia che Goa-AI generi codice tipizzato, workflow e integrazioni runtime.
menu:
  main:
    weight: 8
---

## Trasforma lo Sviluppo dei Tuoi Agenti

Goa-AI estende il workflow design-first di Goa in un framework completo per costruire **sistemi agentici e tool-driven** in Go. Descrivi i tuoi agenti, toolset, policy e workflow una sola volta nel DSL di Goa, poi lascia che Goa-AI generi tutto ciò di cui hai bisogno: payload tipizzati per i tool, workflow Temporal, registry runtime e loop di esecuzione durevoli.

## Cosa Rende Goa-AI Diverso?

Goa-AI si distingue trattando il design del tuo agente come un contratto vivente, proprio come fa Goa per le API:

* **Tool type-safe**: Struct payload/result generate più codec JSON—niente più schemi scritti a mano
* **Orchestrazione durabile**: Workflow e attività pronti per Temporal con retry/timeout integrati
* **Composizione di agenti**: Tratta un agente come tool di un altro, anche tra processi
* **Visibilità operativa**: Streamma eventi planner/tool/assistente; persisti transcript; instrumenta con log/metriche/trace
* **Integrazione MCP**: Consuma suite di tool da server MCP attraverso wrapper generati

## Come Funziona Goa-AI

```
DSL → Codegen → Runtime → Engine + Features
```

Da un singolo file di design, Goa-AI genera:

1. **Package degli Agenti** - Definizioni workflow, attività planner e helper di registrazione
2. **Specifiche Tool** - Struct payload/result tipizzate, codec JSON e definizioni JSON Schema
3. **Integrazione Runtime** - Loop plan/execute durevole con enforcement delle policy, persistenza memoria e hook di streaming
4. **Adattatori MCP** - Wrapper generati che collegano server MCP al runtime

Il risultato è un'architettura coesa dove i planner si concentrano sulla logica di business mentre Goa-AI fornisce l'infrastruttura per Temporal, memoria Mongo-backed, stream Pulse, integrazione MCP e provider di modelli.

## Prossimi Passi

* Segui la guida [Per Iniziare](./2-getting-started/) per costruire il tuo primo agente
* Esplora i [Concetti Fondamentali](./3-concepts/) per capire DSL, runtime e toolset
* Dai un'occhiata ai [Tutorial](./4-tutorials/) per esempi passo-passo
* Scopri i [Pattern del Mondo Reale](./5-real-world/) per deployment in produzione
