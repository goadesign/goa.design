---
title: "Cos'è Goa-AI?"
linkTitle: "Cos'è Goa-AI?"
weight: 1
description: "Scopri Goa-AI, un framework design-first per costruire sistemi agentici e tool-driven in Go."
---

Goa-AI è un framework design-first per costruire sistemi agentici e tool-driven in Go. Dichiari agenti, toolset e policy di esecuzione nel DSL di Goa; Goa-AI poi genera codice tipizzato, codec, workflow e helper di registry che si collegano a un runtime production-grade (in-memory per lo sviluppo, Temporal per la durabilità). I planner si concentrano sulla strategia; il runtime gestisce orchestrazione, policy, memoria, streaming, telemetria e integrazione MCP.

## Il Potere dello Sviluppo Design-First per Agenti

Proprio come Goa trasforma lo sviluppo API mettendo il design al primo posto, Goa-AI porta la stessa filosofia ai sistemi agentici. Descrivi l'intera architettura del tuo agente—agenti, toolset, policy e workflow—nell'espressivo DSL di Goa, e Goa-AI genera codice pronto per la produzione che gestisce tutta la complessa logica di orchestrazione.

{{< alert title="Elementi Chiave del Design" color="primary" >}}
**Agenti e Toolset**  
Definisci agenti che consumano o esportano toolset con sintassi pulita e leggibile. Ogni tool, ogni policy e ogni interazione è chiaramente specificata.

**Contratti Tool Tipizzati**  
Descrivi i payload e i risultati dei tuoi tool con precisione type-safe. Goa-AI assicura che i tuoi dati fluiscano esattamente come progettato, dalla validazione degli input alla formattazione delle risposte.

**Policy di Runtime**  
Specifica limiti di esecuzione, budget temporali e gestione delle interruzioni. Il runtime applica automaticamente queste policy ad ogni turno.
{{< /alert >}}

Da queste definizioni, Goa-AI genera codice pronto per la produzione che gestisce tutta la complessa logica dei workflow, permettendoti di concentrarti puramente sull'implementazione del tuo planner. Niente più tedioso boilerplate o traduzioni manuali soggette a errori tra il design del tuo agente e l'implementazione.

## Modello Mentale di Base

```
DSL → Codegen → Runtime → Engine + Features
```

- **DSL (`goa-ai/dsl`)**: Dichiara agenti dentro un `Service` Goa. Specifica toolset (nativi o MCP) e una `RunPolicy`.
- **Codegen (`codegen/agent`, `codegen/mcp`)**: Emette package agente sotto `gen/`, specifiche/codec tool, attività Temporal e helper di registry.
- **Runtime (`runtime/agent`, `runtime/mcp`)**: Loop plan/execute durevole con enforcement policy, store memoria/sessione, bus hook, telemetria, caller MCP.
- **Engine (`runtime/agent/engine`)**: Astrae il backend workflow (in-memory per sviluppo; adattatore Temporal per produzione).
- **Features (`features/*`)**: Moduli opzionali (memoria/sessione Mongo, sink stream Pulse, client modello Bedrock/OpenAI, engine policy).

Non modificare mai `gen/` a mano — rigenera sempre dopo modifiche al DSL.

## Quando Usare Goa-AI

- **Workflow LLM con tool**: Costruisci agenti che chiamano tool tipizzati con validazioni ed esempi, non JSON ad-hoc.
- **Orchestrazione durabile**: Serve esecuzioni di lunga durata, ripristinabili con retry, budget temporali e replay deterministici.
- **Composizione di agenti**: Tratta un agente come tool di un altro, anche tra processi (esecuzione inline, storia singola).
- **Schemi tipizzati ovunque**: Tipi payload/result generati e codec eliminano deriva degli schemi e encoding scritto a mano.
- **Stato transcript-first**: Lascia che Goa-AI costruisca e riutilizzi transcript completi (messaggi + chiamate/risultati tool) così non hai bisogno di strutture separate "tool history" o "messaggi precedenti" nei tuoi planner o UI.
- **Visibilità operativa**: Streamma eventi planner/tool/assistente; persisti transcript; instrumenta con log/metriche/trace.
- **Integrazione MCP**: Consuma suite di tool da server MCP attraverso wrapper e caller generati.

## Un Esempio Semplice

Ecco come appare progettare un agente con Goa-AI:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var DocsToolset = Toolset("docs.search", func() {
    Tool("search", "Cerca documentazione indicizzata", func() {
        Args(func() {
            Attribute("query", String, "Frase di ricerca")
            Attribute("limit", Int, "Max risultati", func() { Default(5) })
            Required("query")
        })
        Return(func() {
            Attribute("documents", ArrayOf(String), "Snippet corrispondenti")
            Required("documents")
        })
    })
})

var _ = Service("orchestrator", func() {
    Description("Porta d'ingresso umana per l'agente di conoscenza.")

    Agent("chat", "Runner conversazionale", func() {
        Use(DocsToolset)
        RunPolicy(func() {
            DefaultCaps(
                MaxToolCalls(8),
                MaxConsecutiveFailedToolCalls(3),
            )
            TimeBudget("2m")
        })
    })
})
```

Ed ecco tutto il codice che devi scrivere per eseguirlo:

```go
rt := runtime.New()
if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
    Planner: myPlanner,
}); err != nil {
    log.Fatal(err)
}

client := chat.NewClient(rt)
out, err := client.Run(ctx, []*model.Message{{
    Role:  model.ConversationRoleUser,
    Parts: []model.Part{model.TextPart{Text: "Cerca documentazione Go"}},
}}, runtime.WithSessionID("session-1"))
```

## Concetti Chiave

### Design-First: La Tua Unica Fonte di Verità

Smetti di destreggiarti tra multipli schemi tool, documentazione e file di implementazione. Con Goa-AI, il tuo design è il tuo contratto—una specifica chiara ed eseguibile che tiene tutti sulla stessa pagina. I team adorano questo approccio perché elimina per sempre le conversazioni "ma la specifica non diceva così".

### Architettura Pulita che Scala

Goa-AI genera codice che segue i principi di architettura pulita:
* **Layer Planner**: La tua logica di strategia LLM, pura e pulita
* **Layer Runtime**: Orchestrazione durabile con enforcement delle policy
* **Layer Engine**: Astrazione backend workflow (Temporal, in-memory o custom)

Questa non è solo teoria dell'architettura—è codice funzionante che rende i tuoi agenti più facili da testare, modificare e scalare man mano che le tue esigenze evolvono.

### Type Safety che Ti Protegge

Dimentica le sorprese a runtime. Goa-AI sfrutta il sistema di tipi di Go per catturare problemi a compile time:

```go
// Specifica tool generata - il tuo contratto
type SearchPayload struct {
    Query string `json:"query"`
    Limit *int   `json:"limit,omitempty"`
}

// Il tuo executor - pulito e focalizzato
func (e *executor) Execute(ctx context.Context, meta runtime.ToolCallMeta, call planner.ToolRequest) (planner.ToolResult, error) {
    args, _ := docsspecs.UnmarshalSearchPayload(call.Payload)
    // Usa direttamente gli argomenti tipizzati
    return planner.ToolResult{Payload: result}, nil
}
```

Se il tuo executor non corrisponde al design, lo saprai prima che il tuo codice arrivi in produzione.

## Prossimi Passi

* Segui la guida [Per Iniziare](../2-getting-started/) per costruire il tuo primo agente
* Esplora i [Concetti Fondamentali](../3-concepts/) per capire DSL, runtime e toolset
* Dai un'occhiata ai [Tutorial](../4-tutorials/) per esempi passo-passo
