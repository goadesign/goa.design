---
title: "Composizione Agenti"
linkTitle: "Composizione Agenti"
weight: 2
description: "Costruisci sistemi multi-agente dove gli agenti usano altri agenti come tool."
---

Questo tutorial esplora come comporre più agenti in sistemi potenti. Goa-AI supporta **agent-as-tool**, permettendo a un agente di chiamare un altro agente come tool, abilitando specializzazione e delega.

## Capire la Composizione Agenti

In molti sistemi, un singolo agente tuttofare non è ideale. Invece, puoi avere agenti specializzati ognuno eccellente in un dominio specifico:

- Agente **Coordinatore**: comprende richieste e delega
- Agente **Esperto Dati**: gestisce database e analytics
- Agente **Diagnostica**: troubleshooting di sistemi

## Pattern di Design

```go
package design

import (
    . "goa.design/goa-ai/dsl"
    . "goa.design/goa/v3/dsl"
)

var _ = Service("assistant", func() {
    // Agente coordinatore primario
    Agent("coordinator", "Coordina richieste utente", func() {
        // Usa un altro agente come tool
        UseAgent("data_expert")
        UseToolset("general")
    })

    // Agente esperto dati specializzato
    Agent("data_expert", "Specializzato in retrieval e analisi dati", func() {
        UseToolset("data_tools")
    })
})
```

## Come Funziona

Quando dichiari `UseAgent`:

- Il runtime crea un **child run** per l'agente specializzato
- Il child run ha il suo ciclo plan/execute completo
- I risultati tornano al padre collegati tramite `run.Handle`
- Gli stream di eventi mantengono relazioni padre-figlio per tracciabilità

## Benefici Chiave

- **Separazione delle responsabilità**: Ogni agente si concentra su un singolo dominio
- **Planner indipendenti**: Gli agenti specializzati operano con il loro contesto
- **Tracciabilità**: L'albero run completo abilita debug e osservabilità
- **Riusabilità**: Gli agenti specializzati possono essere usati da più coordinatori

## Prossimi Passi

- Esplora come [Run Tree](../../3-concepts/8-run-trees-streaming-topology.md) collega gli eventi
- Impara a gestire run annidati con [Policy](../../3-concepts/9-policies-labels.md)


