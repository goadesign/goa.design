---
title: "Ecosistema e strumenti"
linkTitle: "Ecosistema"
weight: 3
description: "Librerie e strumenti complementari che estendono Goa: diagrammi di architettura, eventi distribuiti, osservabilità e coordinamento multi-agente."
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

## Panoramica

L'ecosistema Goa comprende librerie e strumenti complementari che rispondono a esigenze comuni nello sviluppo di servizi e sistemi ad agenti. Questi progetti sono pensati per funzionare perfettamente con Goa e Goa-AI, ma possono essere utilizzati anche in modo indipendente.

## Librerie e strumenti complementari

| Progetto | Scopo | Caratteristiche principali |
|---------|---------|--------------|
| [Model](model/) | Diagrammi di architettura | Diagrammi C4 come codice, controllo di versione, editor interattivo |
| [Pulse](pulse/) | Eventi distribuiti | Streaming di eventi, pool di lavoratori, mappe replicate |
| [Clue](clue/) | Osservabilità | Tracing, logging, metriche, controlli di salute |
| [Chorus](chorus/) | Coordinamento multi-agente | `#channels` condivisi, DM `@agent`, watermark lato server, CLI `chorus watch` |
| [Surla](surla/) | Control plane e verificatore | `Story` + Change Card, copie separate di test e codice, verifica `eval/` e merge dal browser |

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

## Chorus - Coordinamento multi-agente via MCP

Chorus è un server MCP costruito con [Goa-AI](/it/docs/2-goa-ai/) e [Pulse](pulse/) che permette a più coding agent di coordinarsi tra terminali e famiglie di modelli tramite `#channels` e messaggi diretti `@agent`:

```bash
brew install goadesign/tap/chorus && chorus up
```

Oppure senza Homebrew (`curl` o `npx` con Node.js 18+):

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

```bash
npx @goadesign/chorus up
```

**Caratteristiche:**
- Cinque tool MCP (`who`, `join`, `leave`, `send`, `read`) su un singolo endpoint `POST /mcp`
- Watermark di lettura per agente in `pulse/rmap` e log di messaggi limitati in `pulse/streaming`
- Consegna aggregata dei messaggi non letti su `send` e risposte compatte in testo semplice
- Listener di sistema in background (`chorus watch`) che attende fino all'arrivo di un DM, una menzione o una risposta

**Per saperne di più:** [Documentazione Chorus](chorus/)

## Surla - Control plane multi-agente guidato dai contratti

Surla organizza i tuoi coding agent in ruoli separati di guide, test writer e builder attorno a un design compilato [Goa](/it/docs/1-goa/) e [Goa-AI](/it/docs/2-goa-ai/), verifica i commit candidati contro suite `eval/` accettate e unisce il lavoro approvato direttamente dal browser:

```bash
go install github.com/goadesign/surla/cmd/surla@latest
surla up
```

**Caratteristiche:**
- Skill `/surla` (`$surla` in Codex) con Change Card in linguaggio chiaro (`CP1`), anteprima C4 (`CP2`) e guscio Go / `eval/` pulito per impostazione predefinita (`surla init -example` per un esempio eseguibile)
- Copie di lavoro Git separate (`.surla-tests` e `.surla-build`) affinché l'agente che scrive i test non scriva l'implementazione
- Accettazione delle suite `eval/` controllata dal server, verifica deterministica su modello scriptato (`CP4`) e prova opzionale dei prompt live (`CP3`)
- Pannelli affiancati in Herdr con Chorus, oppure worker CLI in background, fino ad **Approve** e **Merge** nel browser (`CP5`)

**Per saperne di più:** [Documentazione Surla](surla/)

## Guide alla documentazione

| Guida | Descrizione | ~Tokens |
|-------|-------------|---------|
| [Model](model/) | Diagrammi C4, DSL di riferimento, mdl CLI | ~2.500 |
| [Pulse](pulse/) | Streaming, pool di lavoratori, mappe replicate | ~2.200 |
| [Clue](clue/) | Logging, tracing, metriche, controlli di salute | ~2.800 |
| [Chorus](chorus/) | Coordinamento MCP multi-agente, CLI e architettura Goa-AI + Pulse | ~1.100 |
| [Surla](surla/) | Sviluppo multi-agente guidato dai contratti, flussi Story, verifica indipendente e merge nel browser | ~1.400 |

**Sezione totale:** ~10.000 gettoni

## Iniziare

Scegliere la libreria o lo strumento che corrisponde alle proprie esigenze:

- **Necessitate di documentazione sull'architettura?** Iniziate con [Model](model/)
- **Costruire sistemi guidati dagli eventi?** Iniziate con [Pulse](pulse/)
- **Aggiungere l'osservabilità ai servizi Goa?** Iniziate con [Clue](clue/)
- **Coordinare più coding agent?** Iniziate con [Chorus](chorus/)
- **Sviluppare e verificare servizi con ruoli separati degli agenti?** Iniziate con [Surla](surla/)

Tutte le librerie e gli strumenti sono disponibili tramite `go get` / `go install`:

```bash
go get goa.design/model
go get goa.design/pulse
go get goa.design/clue
go install github.com/goadesign/chorus/cmd/chorus@latest
go install github.com/goadesign/surla/cmd/surla@latest
```
