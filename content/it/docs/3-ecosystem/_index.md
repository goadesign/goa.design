---
title: "Ecosistema e strumenti"
linkTitle: "Ecosistema"
weight: 3
description: "Librerie Go complementari e strumenti multi-agente: diagrammi di architettura C4, stream di eventi e worker pool su Redis, osservabilità OpenTelemetry, coordinamento MCP tra agenti e verifica guidata dai contratti."
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

{{< anchors "librerie-e-strumenti-complementari" >}}
## Panoramica

Queste librerie open source e strumenti MCP estendono Goa e Goa-AI per la modellazione dell'architettura, gli eventi distribuiti, l'osservabilità e lo sviluppo multi-agente. Ogni libreria funziona con Goa oppure in modo autonomo in qualsiasi servizio Go.

| Progetto | Ruolo | Cosa offre |
|---------|------|------------------|
| [Model](model/) | Architettura come codice | DSL C4 in Go, esportazione SVG/JSON, editor di layout interattivo (`mdl`), plugin Goa |
| [Pulse](pulse/) | Redis Streams, Pool e Mappe | Stream di eventi con limite o illimitati, worker pool con consistent hashing, mappe replicate in memoria |
| [Clue](clue/) | Osservabilità OpenTelemetry | Logging bufferizzato scaricato sugli errori, tracce e metriche OTLP, controlli `/healthz`, toggle di debug a runtime |
| [Chorus](chorus/) | Coordinamento tra agenti alla pari | `#channels` condivisi, DM `@agent`, watermark sul server, `chorus watch` a 0 token, `chorus ui` in tempo reale |
| [Highbay](highbay/) | Control plane per contratti e verifica | `Story` + Change Card, copie Git separate per builder e test writer, gate `eval/`, merge dal browser |

{{< anchors "modello---diagrammi-di-architettura-come-codice" >}}
## Model: diagrammi di architettura C4 in Go

[Model](model/) definisce [diagrammi di architettura C4](https://c4model.com) in codice Go accanto ai contratti dei tuoi servizi, così i diagrammi restano sotto controllo di versione e si rigenerano in CI:

```go
var _ = Design("Catalog Platform", "Product catalog architecture", func() {
    var System = SoftwareSystem("Catalog Service", "Serves product lookups over HTTP, gRPC, and MCP")

    Person("Developer", "Calls catalog APIs and MCP tools", func() {
        Uses(System, "Queries products", "HTTPS / MCP")
    })

    Views(func() {
        SystemContextView(System, "Context", "System context diagram", func() {
            AddAll()
            AutoLayout(RankLeftRight)
        })
    })
})
```

Esegui `mdl serve` per regolare il layout in modo interattivo nel browser oppure `mdl svg` per esportare gli SVG in modalità headless in CI. Consulta la [guida di Model](model/).

{{< anchors "pulse---infrastruttura-di-eventi-distribuiti" >}}
## Pulse: Redis Event Streams, Worker Pool e Mappe Replicate

[Pulse](pulse/) costruisce tre primitive distribuite direttamente su Redis (`*redis.Client`) senza richiedere un message broker separato:

- **`streaming`**: Stream di eventi (limite predefinito esatto `MAXLEN` di `1.000` eventi, configurabile con `options.WithStreamMaxLen` o `options.WithUnboundedStream`) con `Reader` indipendenti in fan-out e `Sink` condivisi basati su consumer group.
- **`pool`**: Worker pool dedicati che instradano i job per chiave tramite jump consistent hashing e failover automatico dei worker inattivi.
- **`rmap`**: Mappe chiave-valore a lettura locale ed consistenza eventuale, sincronizzate tramite script Lua atomici su Redis e notifiche pub/sub.

```go
// Open a stream, subscribe a consumer-group sink, then publish
stream, err := streaming.NewStream("orders", rdb)
if err != nil {
    log.Fatal(err)
}
sink, err := stream.NewSink(ctx, "billing-workers")
if err != nil {
    log.Fatal(err)
}
defer sink.Close(ctx)
events := sink.Subscribe()

if _, err := stream.Add(ctx, "order.created", payload); err != nil {
    log.Fatal(err)
}

for event := range events {
    if err := handleOrder(event); err == nil {
        _ = sink.Ack(ctx, event)
    }
}
```

Consulta la [guida di Pulse](pulse/).

{{< anchors "indizio---osservabilità-dei-microservizi" >}}
## Clue: Tracing OpenTelemetry, Log Bufferizzati e Health Check

[Clue](clue/) strumenta i servizi Go con tracce OpenTelemetry, metriche, sonde di salute e **logging contestuale scaricato sugli errori** — mantenendo silenziose le richieste non tracciate andate a buon fine ed emettendo l'intero contesto di debug della richiesta ogni volta che si verifica un errore:

```go
// Configure OpenTelemetry trace and metric exporters
cfg, err := clue.NewConfig(ctx, "catalog", "1.0.0", metricExporter, spanExporter)
if err != nil {
    log.Fatal(ctx, err)
}
clue.ConfigureOpenTelemetry(ctx, cfg)

// Buffered structured log (flushed automatically if an error is logged or request is traced)
log.Info(ctx, log.KV{K: "msg", V: "looking up SKU"}, log.KV{K: "sku", V: sku})

// HTTP dependency health check (probes upstream /livez with an explicit timeout)
checker := health.NewChecker(
    health.NewPinger("inventory-api", inventoryAddr, health.WithTimeout(5*time.Second)),
)
```

Consulta la [guida di Clue](clue/).

{{< anchors "chorus---coordinamento-multi-agente-via-mcp" >}}
## Chorus: Coordinamento Multi-Agente via MCP

[Chorus](chorus/) è un server MCP locale costruito su [Goa-AI](/it/docs/2-goa-ai/) e [Pulse](pulse/) che collega i coding agent tra terminali, editor e famiglie di modelli (`Claude Code`, `Codex`, `Gemini CLI`, `Antigravity`, `Cursor`, `Windsurf`, `Copilot`, `VS Code`) attraverso `#channels` condivisi, messaggi diretti `@agent` e una bacheca dei task fissata:

```bash
brew install goadesign/tap/chorus && chorus up
```

Le installazioni alternative con un singolo comando (`npx @goadesign/chorus up`, `curl` e `go install`) sono descritte nella [guida di Chorus](chorus/) e nella [pagina di Chorus](/it/chorus/).

- **Cinque tool (`who`, `join`, `leave`, `send`, `read`)** su `http://localhost:9440/mcp` con risposte wire `ToolContent` compatte in testo semplice (`~16–52 token/msg` stimati nella sessione passkey sceneggiata).
- **Watermark di lettura mantenuti sul server** in `pulse/rmap`, consegna aggregata dei messaggi non letti su `send` e `0` token modello durante l'attesa in `chorus watch`.

{{< anchors "highbay---control-plane-multi-agente-guidato-dai-contratti" >}}
## Highbay: Control Plane Multi-Agente Guidato dai Contratti

[Highbay](highbay/) standardizza l'architettura della piattaforma tra servizi, server MCP e agenti IA — affiancando un coding agent builder (`.highbay-build`) a un coding agent test writer separato (`.highbay-tests`) attorno a un contratto confermato prima del merge:

```bash
brew install goadesign/tap/highbay
highbay up
```

Le configurazioni alternative con `npx @goadesign/highbay up` e `go install github.com/goadesign/highbay/cmd/highbay@latest` sono nella [guida di Highbay](highbay/) e nella [pagina di Highbay](/it/highbay/).

- **`/highbay` (`$highbay` in Codex)** prepara una Change Card (`CP1`) e un'anteprima dell'architettura C4 (`CP2`), inizializzando le cartelle vuote da un guscio Go ed `eval/` pulito e neutrale rispetto al dominio (`highbay init -example` aggiunge un esempio eseguibile).
- **Verifica indipendente (`CP4`)** vincola **Approve** e **Merge** nel browser (`CP5`) finché i commit candidati non superano la suite di scenari `eval/` accettata.

{{< anchors "guide-alla-documentazione" "iniziare" >}}
## Riferimento di installazione

```bash
# Go libraries
go get goa.design/model@latest
go get goa.design/pulse@latest
go get goa.design/clue@latest

# CLI & MCP tools
go install goa.design/model/cmd/mdl@latest
go install github.com/goadesign/chorus/cmd/chorus@latest
go install github.com/goadesign/highbay/cmd/highbay@latest
```
