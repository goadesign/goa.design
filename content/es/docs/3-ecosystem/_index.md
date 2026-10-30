---
title: "Ecosistema y herramientas"
linkTitle: "Ecosistema"
weight: 3
description: "Bibliotecas y herramientas complementarias que amplían Goa: diagramas de arquitectura, eventos distribuidos, observabilidad y coordinación multiagente."
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

## Resumen

El ecosistema Goa incluye bibliotecas y herramientas complementarias que cubren necesidades comunes en el desarrollo de servicios y sistemas con agentes. Estos proyectos están diseñados para funcionar de forma integrada con Goa y Goa-AI, pero también se pueden utilizar de manera independiente.

## Bibliotecas y herramientas complementarias

| Proyecto | Propósito | Características Clave |
|---------|---------|--------------|
| [Model](model/) | Diagramas de Arquitectura | Diagramas C4 como código, control de versiones, editor interactivo |
| [Pulse](pulse/) | Eventos distribuidos | Flujo de eventos, grupos de trabajadores, mapas replicados |
| [Clue](clue/) | Observabilidad | Rastreo, registro, métricas, comprobaciones de salud |
| [Chorus](chorus/) | Coordinación multiagente | `#channels` compartidos, mensajes directos `@agent`, cursores en el servidor, CLI `chorus watch` |

## Modelo - Diagramas de Arquitectura como Código

Model proporciona un Go DSL para describir la arquitectura del software usando el [C4 model](https://c4model.com). En lugar de dibujar diagramas en herramientas gráficas, usted define su arquitectura en código:

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

**Ventajas
- Documentación de la arquitectura controlada por versiones
- Generación automática de diagramas (SVG, JSON)
- Editor gráfico interactivo para posicionamiento
- Plugin Goa para diseños combinados de API + arquitectura

**Más información:** [Documentación del modelo](model/)

## Pulse - Infraestructura de eventos distribuidos

Pulse proporciona primitivas para construir sistemas distribuidos basados en eventos. Es independiente del transporte y funciona con o sin servicios Goa:

- **Streaming**: Enrutamiento de eventos pub/sub a través de microservicios
- **Pools de trabajadores**: Trabajadores dedicados con hashing consistente para el envío de trabajos
- **Mapas replicados**: Estado compartido consistente en el tiempo entre nodos

```go
// Publish events to a stream
stream.Add(ctx, "user.created", userEvent)

// Subscribe to events
reader.Subscribe(ctx, func(event *Event) error {
    return processEvent(event)
})
```

**Casos de uso
- Procesamiento asíncrono de eventos
- Colas de trabajo en segundo plano
- Almacenamiento en caché distribuido
- Notificaciones en tiempo real

**Más información:** [Documentación de Pulse](pulse/)

## Pista - Observabilidad de microservicios

Clue proporciona instrumentación para servicios Goa construidos sobre OpenTelemetry. Cubre los tres pilares de la observabilidad:

```go
// Configure OpenTelemetry
cfg := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter)
clue.ConfigureOpenTelemetry(ctx, cfg)

// Context-based logging
log.Info(ctx, "processing request", log.KV{"user_id", userID})

// Health checks
checker := health.NewChecker(health.NewPinger("db", dbAddr))
```

**Características
- Rastreo distribuido con propagación automática de tramos
- Registro estructurado con almacenamiento en búfer inteligente
- Recopilación y exportación de métricas
- Puntos finales de comprobación de estado
- Puntos finales de depuración para la resolución de problemas en tiempo de ejecución

**Más información:** [Documentación de Clue](clue/)

## Chorus - Coordinación multiagente sobre MCP

Chorus es un servidor MCP construido con [Goa-AI](/es/docs/2-goa-ai/) y [Pulse](pulse/) que permite coordinar varios agentes de programación entre terminales y familias de modelos mediante `#channels` y mensajes directos `@agent`:

```bash
# Instalar Chorus, registrar http://localhost:9440/mcp e iniciar el servicio en segundo plano
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh

# O instalar la skill del agente mediante la CLI de Skills
npx skills add goadesign/chorus --skill chorus
```

**Características:**
- Cinco herramientas MCP (`who`, `join`, `leave`, `send`, `read`) en un único punto final `POST /mcp`
- Cursores de lectura por agente en `pulse/rmap` y registros de mensajes acotados en `pulse/streaming`
- Entrega acumulada de no leídos en `send` y respuestas compactas en texto plano
- Escucha del sistema operativo en segundo plano (`chorus watch`) que bloquea hasta que llega un mensaje directo, mención o respuesta

**Más información:** [Documentación de Chorus](chorus/)

## Guías de documentación

| Guía | Descripción | ~Tokens |
|-------|-------------|---------|
| [Model](model/) | Diagramas C4, referencia DSL, mdl CLI | ~2.500 |
| [Pulse](pulse/) | Streaming, pools de trabajadores, mapas replicados | ~2.200 |
| [Clue](clue/) | Registro, rastreo, métricas, comprobaciones de salud | ~2.800 |
| [Chorus](chorus/) | Coordinación MCP multiagente, CLI y arquitectura Goa-AI + Pulse | ~1.100 |

**Sección total:** ~8.600 tokens

## Comenzando

Elija la biblioteca o herramienta que se ajuste a sus necesidades:

- **¿Necesita documentación de arquitectura?** Empiece con [Model](model/)
- **¿Construir sistemas basados en eventos?** Empiece con [Pulse](pulse/)
- **¿Añadir observabilidad a los servicios Goa?** Empiece con [Clue](clue/)
- **¿Coordinar varios agentes de programación?** Empiece con [Chorus](chorus/)

Todas las bibliotecas y herramientas están disponibles a través de `go get` / `go install`:

```bash
go get goa.design/model
go get goa.design/pulse
go get goa.design/clue
go install github.com/goadesign/chorus/cmd/chorus@latest
```
