---
title: "Ecosistema y herramientas"
linkTitle: "Ecosistema"
weight: 3
description: "Companion libraries that extend Goa: architecture diagrams, distributed events, and observability."
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

## Resumen

El ecosistema Goa incluye librerías complementarias que cubren necesidades comunes en el desarrollo de microservicios. Estas herramientas están diseñadas para funcionar a la perfección con Goa, pero también se pueden utilizar de forma independiente.

## Bibliotecas complementarias

| Librería | Propósito | Características Clave |
|---------|---------|--------------|
| [Model](model/) | Diagramas de Arquitectura | Diagramas C4 como código, control de versiones, editor interactivo | [Pulse](pulse/) | Eventos Distribuidos
| [Pulse](pulse/) | Eventos distribuidos | Flujo de eventos, grupos de trabajadores, mapas replicados | [Clue](pulse/) | Diagramas de arquitectura
| [Clue](clue/) | Observabilidad | Rastreo, registro, métricas, comprobaciones de salud |

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

## Guías de documentación

| Guía | Descripción | ~Tokens |
|-------|-------------|---------|
| Modelo](model/) Diagramas C4, referencia DSL, mdl CLI | ~2,500 | [Pulse](pulse/)
| [Pulse](pulse/) | Streaming, pools de trabajadores, mapas replicados | ~2.200 |
| [Clue](clue/) | Registro, rastreo, métricas, comprobaciones de salud | ~2.800 |

**Sección total:** ~7.500 tokens

## Comenzando

Elija la biblioteca que se ajuste a sus necesidades:

- **¿Necesita documentación de arquitectura?** Empiece con [Model](model/)
- **¿Construir sistemas basados en eventos? Empieza con [Pulse](pulse/)
- **¿Añadir observabilidad a los servicios Goa?** Empezar con [Clue](clue/)

Todas las bibliotecas están disponibles a través de `go get`:

```bash
go get goa.design/model
go get goa.design/pulse
go get goa.design/clue
```
