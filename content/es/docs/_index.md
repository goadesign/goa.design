---
title: "Documentación"
linkTitle: "Documentación"
weight: 20
description: >
  LLM-optimized documentation for Goa and Goa-AI frameworks. Consolidated pages designed for easy copying into LLM contexts.
llm_optimized: true
content_scope: "Complete Documentation"
aliases:
---

{{< section-llm-info >}}
**📋 Documentación optimizada para LLM** - Esta documentación está diseñada para facilitar su copia en contextos LLM. Utilice el botón "Copiar página" en cualquier página para copiar el contenido como Markdown o Texto sin formato.
{{< /section-llm-info >}}

## Secciones de la documentación

Esta documentación está organizada en páginas consolidadas y autocontenidas optimizadas para el consumo de LLM. Cada página puede copiarse en su totalidad para proporcionar un contexto completo.

### Marco Goa

Desarrollo de API basado en el diseño con generación automática de código para microservicios Go.

| Guía | Descripción | ~Tokens |
|-------|-------------|---------|
| Inicio rápido](1-goa/quickstart/) Instala Goa y crea tu primer servicio
| [DSL Reference](1-goa/dsl-reference/) | Referencia completa para el lenguaje de diseño de Goa | ~2,900 | [Code Generation](1-goa/quickstart/)
| [Generación de Código](1-goa/code-generation/) | Comprendiendo el proceso de generación de código de Goa | ~2,100 | [Guía HTTP](1-goa/dsl-reference/)
| Guía HTTP](1-goa/http-guide/) Características del transporte HTTP, enrutamiento y patrones
| [Guía gRPC](1-goa/grpc-guide/) | Características del transporte gRPC y streaming | ~1.800 | [Gestión de errores](1-goa/http-guide/)
| Tratamiento de errores](1-goa/error-handling/) Definición y tratamiento de errores
| Interceptores](1-goa/interceptors/) Interceptores y patrones de middleware | ~1.400
| [Producción](1-goa/production/) | Observabilidad, seguridad y despliegue | ~1.300 |

**Total de la sección Goa:** ~14.500 tokens

### Goa-AI Framework

Framework de diseño para la construcción de sistemas basados en herramientas en Go.

| Guía | Descripción | ~Tokens |
|-------|-------------|---------|
| Inicio rápido](2-goa-ai/quickstart/) Instalación y primer agente
| [DSL Reference](2-goa-ai/dsl-reference/) | DSL completo: agentes, herramientas, políticas, MCP | ~3,600 | [Runtime](2-goa-ai/quickstart/)
| [Tiempo de ejecución](2-goa-ai/runtime/) | Arquitectura del tiempo de ejecución, bucle plan/ejecutar, motores | ~2.400 |
| [Toolsets](2-goa-ai/toolsets/) | Tipos de Toolsets, modelos de ejecución, transformaciones | ~2.300 | | [Agent Composition](2-goa-ai/toolsets/)
| [Composición de agentes](2-goa-ai/agent-composition/) | Agente como herramienta, árboles de ejecución, topología de streaming | ~1.400 | [Integración MCP](2-goa-ai/toolsets/)
| [Integración MCP](2-goa-ai/mcp-integration/) | Servidores MCP, transportes, envoltorios generados | ~1.200 | [Memoria y Sesiones](2-goa-ai/mcp-integration/) | Memoria y Sesiones
| Memoria y sesiones](2-goa-ai/memory-sessions/) Transcripciones, almacenes de memoria, sesiones, ejecuciones | ~1.600
| [Producción](2-goa-ai/production/) | Configuración temporal, streaming UI, integración de modelos | ~2.200 |

**Total de la sección Goa-AI:** ~17.600 tokens

## Uso de esta documentación con LLMs

### Función Copiar Página

Cada página de documentación incluye un botón "Copiar página" con dos opciones:

- **Copiar como Markdown** - Conserva el formato, las anotaciones de lenguaje de bloques de código y la jerarquía de encabezados
- **Copiar como texto sin formato** - Texto limpio sin sintaxis Markdown, adecuado para cualquier contexto

### Flujo de trabajo recomendado

1. **Comience con el inicio rápido** - Copie la guía de inicio rápido para dar a su LLM un contexto básico
2. **Añadir guías específicas** - Copie las guías relevantes basadas en su tarea (por ejemplo, Guía HTTP para APIs REST)
3. **Incluir referencia DSL** - Para cuestiones de diseño, incluye la referencia DSL completa

### Consejos para el presupuesto de tokens

- Cada guía está diseñada para encajar dentro de las ventanas de contexto típicas de un LLM
- La documentación completa de Goa (~14.5k tokens) cabe fácilmente en la mayoría de los LLMs modernos
- La documentación completa de Goa-AI (~17.6k tokens) es igualmente compacta
- Ambos marcos juntos (~32k tokens) funcionan bien con modelos de contexto más grandes

## Conceptos clave

### Desarrollo basado en el diseño

Tanto Goa como Goa-AI siguen una filosofía de "diseño primero":

1. **Define tu API/Agente** usando un potente DSL
2. **Genera código** automáticamente a partir de tu diseño
3. **Implementa la lógica de negocio** en interfaces limpias y seguras
4. **La documentación se mantiene sincronizada** porque procede de la misma fuente

### Seguridad de tipos

El código generado proporciona seguridad de tipos de extremo a extremo:

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

## Comunidad

- [Gophers Slack](https://gophers.slack.com/messages/goa) - Canal #goa
- [GitHub Discussions](https://github.com/goadesign/goa/discussions) - Preguntas e ideas
- [Bluesky](https://goadesign.bsky.social) - Actualizaciones y anuncios

## Contribuir

¿Quieres mejorar la documentación? Consulta la [Guía de contribución](contributing/) para obtener directrices sobre casas canónicas, patrones de enlaces cruzados y estrategia de contenidos.
