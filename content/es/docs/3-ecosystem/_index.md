---
title: "Ecosistema y herramientas"
linkTitle: "Ecosistema"
weight: 3
description: "Bibliotecas Go complementarias y herramientas multiagente: diagramas de arquitectura C4, streams de eventos y pools de workers en Redis, observabilidad OpenTelemetry, coordinación MCP de agentes y verificación guiada por contratos."
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

{{< anchors "bibliotecas-y-herramientas-complementarias" >}}
## Resumen

Estas bibliotecas de código abierto y herramientas MCP amplían Goa y Goa-AI para el modelado de arquitectura, eventos distribuidos, observabilidad y desarrollo multiagente. Cada biblioteca funciona integrada con Goa o de forma independiente en cualquier servicio Go.

| Proyecto | Rol | Qué aporta |
|---------|------|------------|
| [Model](model/) | Arquitectura como código | DSL del modelo C4 en Go, exportación SVG/JSON, editor visual interactivo (`mdl`), plugin para Goa |
| [Pulse](pulse/) | Streams, pools y mapas en Redis | Streams de eventos acotados o ilimitados, pools de workers con hash consistente, mapas replicados en memoria |
| [Clue](clue/) | Observabilidad OpenTelemetry | Logs en búfer volcados ante errores, trazas y métricas OTLP, sondas `/healthz`, control de depuración en vivo |
| [Chorus](chorus/) | Coordinación entre agentes | `#channels` compartidos, mensajes directos `@agent`, cursores en el servidor, `chorus watch` a 0 tokens, `chorus ui` en vivo |
| [Highbay](highbay/) | Plano de control de contratos y verificación | `Story` + Change Cards, copias Git separadas para constructor y autor de pruebas, puertas `eval/`, fusión en navegador |

{{< anchors "modelo---diagramas-de-arquitectura-como-código" >}}
## Model: diagramas de arquitectura C4 en Go

[Model](model/) define [diagramas de arquitectura C4](https://c4model.com) en código Go junto a los contratos de tus servicios para mantener los diagramas bajo control de versiones y regenerarlos en CI:

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

Ejecuta `mdl serve` para ajustar la disposición de forma interactiva en el navegador o `mdl svg` para exportar SVGs sin interfaz gráfica en CI. Consulta la [guía de Model](model/).

{{< anchors "pulse---infraestructura-de-eventos-distribuidos" >}}
## Pulse: streams de eventos, pools de workers y mapas replicados en Redis

[Pulse](pulse/) construye tres primitivas distribuidas directamente sobre Redis (`*redis.Client`) sin necesitar un broker de mensajería aparte:

- **`streaming`**: Streams de eventos (límite exacto `MAXLEN` de `1.000` eventos por defecto, configurable con `options.WithStreamMaxLen` u `options.WithUnboundedStream`) con lectores `Reader` independientes en fan-out y colas compartidas `Sink` por grupo de consumidores.
- **`pool`**: Grupos de workers dedicados que enrutan trabajos por clave mediante jump consistent hashing con conmutación automática ante caída de workers.
- **`rmap`**: Mapas clave-valor de lectura local y consistencia eventual sincronizados mediante scripts Lua atómicos en Redis y notificaciones pub/sub.

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

Consulta la [guía de Pulse](pulse/).

{{< anchors "pista---observabilidad-de-microservicios" >}}
## Clue: trazas OpenTelemetry, logs en búfer y sondas de salud

[Clue](clue/) instrumenta servicios Go con trazas OpenTelemetry, métricas, sondas de salud y **logs contextuales volcados ante errores**, manteniendo silenciosas las peticiones exitosas sin traza y volcando todo el contexto de depuración de la petición cuando ocurre un fallo:

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

Consulta la [guía de Clue](clue/).

{{< anchors "chorus---coordinación-multiagente-sobre-mcp" >}}
## Chorus: coordinación multiagente sobre MCP

[Chorus](chorus/) es un servidor MCP local construido sobre [Goa-AI](/es/docs/2-goa-ai/) y [Pulse](pulse/) que conecta agentes de programación entre terminales, editores y familias de modelos (`Claude Code`, `Codex`, `Gemini CLI`, `Antigravity`, `Cursor`, `Windsurf`, `Copilot`, `VS Code`) mediante `#channels` compartidos, mensajes directos `@agent` y un tablero de tareas fijado:

```bash
brew install goadesign/tap/chorus && chorus up
```

Encontrarás instalaciones alternativas de un solo comando (`npx @goadesign/chorus up`, `curl` y `go install`) en la [guía de Chorus](chorus/) y en la [página de Chorus](/es/chorus/).

- **Cinco herramientas (`who`, `join`, `leave`, `send`, `read`)** en `http://localhost:9440/mcp` con respuestas compactas en texto plano mediante `ToolContent` (`~16–52 tokens/msj` estimados en la sesión guionizada de passkeys).
- **Cursores de lectura en el servidor** con `pulse/rmap`, entrega adjunta de no leídos en `send` y `0` tokens de modelo durante la espera en `chorus watch`.

{{< anchors "highbay---plano-de-control-multiagente-guiado-por-contratos" >}}
## Highbay: plano de control multiagente guiado por contratos

[Highbay](highbay/) estandariza la arquitectura de plataforma entre servicios, servidores MCP y agentes de IA, emparejando un agente constructor (`.highbay-build`) con otro agente autor de pruebas (`.highbay-tests`) en torno a un contrato confirmado antes de fusionar:

```bash
brew install goadesign/tap/highbay
highbay up
```

Las configuraciones alternativas con `npx @goadesign/highbay up` y `go install github.com/goadesign/highbay/cmd/highbay@latest` están detalladas en la [guía de Highbay](highbay/) y en la [página de Highbay](/es/highbay/).

- **`/highbay` (`$highbay` en Codex)** redacta una Change Card (`CP1`) y una vista previa de arquitectura C4 (`CP2`), iniciando las carpetas vacías a partir de una estructura limpia y neutral de Go y `eval/` (`highbay init -example` añade un ejemplo ejecutable).
- **La verificación independiente (`CP4`)** bloquea **Approve** y **Merge** en el navegador (`CP5`) hasta que los commits candidatos superan la suite de escenarios aceptada en `eval/`.

{{< anchors "guías-de-documentación" "comenzando" >}}
## Referencia de instalación

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
