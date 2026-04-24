---
title: "Marco Goa-AI"
linkTitle: "Goa-AI"
weight: 2
description: "Marco basado en diseño para construir sistemas agénticos y orientados a herramientas en Go."
llm_optimized: true
content_scope: "Documentación completa de Goa-AI"
aliases:
---

## Resumen

Goa-AI extiende la filosofía de diseño primero de Goa a los sistemas agénticos. Define agentes, conjuntos de herramientas, completions propiedad del servicio y políticas en un DSL; genera código listo para producción con contratos tipados, flujos de trabajo duraderos y eventos de streaming.

---

## ¿Por qué Goa-AI?

### Agentes Design-First {#design-first-agents}

**Deja de escribir código de agente frágil. Empieza por los contratos.**

La mayoría de los marcos de agentes te obligan a conectar imperativamente prompts, herramientas y llamadas a la API. Cuando las cosas se rompen —y se romperán— estás depurando código disperso sin una fuente clara de verdad.

Goa-AI le da la vuelta a esto: **define las capacidades de tu agente en un DSL tipado** y luego genera la implementación. Tu diseño *es* tu documentación. Tus contratos *son* tu validación. Los cambios se propagan automáticamente.

```go
Agent("assistant", "A helpful coding assistant", func() {
    Use("code_tools", func() {
        Tool("analyze", "Analyze code for issues", func() {
            Args(func() {
                Attribute("code", String, "Source code to analyze", func() {
                    MinLength(1)           // Can't be empty
                    MaxLength(100000)      // Reasonable size limit
                })
                Attribute("language", String, "Programming language", func() {
                    Enum("go", "python", "javascript", "typescript", "rust", "java")
                })
                Required("code", "language")
            })
            Return(AnalysisResult)
        })
    })
})
```

Cuando un planner llama a esta herramienta con argumentos inválidos —por ejemplo, una cadena `code` vacía o `language: "cobol"`— Goa-AI rechaza la llamada en el límite tipado y devuelve una pista de reintento estructurada. Tu planner puede usar esa pista para hacer una pregunta de seguimiento precisa o reintentar con argumentos corregidos. No se requiere análisis ad-hoc de cadenas ni esquemas JSON mantenidos a mano.

**Ventajas:**
- **Una única fuente de verdad** — El DSL define el comportamiento, los tipos y la documentación
- **Seguridad en tiempo de compilación** — Detecta payloads no coincidentes antes del tiempo de ejecución
- **Clientes generados automáticamente** — Invocaciones de herramientas con seguridad de tipos sin cableado manual
- **Patrones consistentes** — Todos los agentes siguen la misma estructura
- **Llamadas de herramienta reparables** — Los errores de validación producen pistas de reintento estructuradas con retroalimentación

→ Más información en [DSL Reference](dsl-reference/) y [Quickstart](quickstart/)

---

### Completions Directas Tipadas {#typed-direct-completions}

**No toda interacción estructurada debe ser una llamada de herramienta.**

A veces el contrato correcto es una respuesta final tipada del asistente: sin invocar herramientas, sin analizar JSON a mano, sin una definición de esquema paralela escondida en el texto del prompt.

Goa-AI modela eso explícitamente con `Completion(...)` en un servicio:

```go
var TaskDraft = Type("TaskDraft", func() {
    Attribute("name", String, "Task name")
    Attribute("goal", String, "Outcome-style goal")
    Required("name", "goal")
})

var _ = Service("tasks", func() {
    Completion("draft_from_transcript", "Produce a task draft directly", func() {
        Return(TaskDraft)
    })
})
```

Los nombres de completion forman parte del contrato de structured output. Deben tener entre 1 y 64 caracteres ASCII, pueden contener letras, dígitos, `_` y `-`, y deben empezar por una letra o un dígito.

Codegen genera `gen/<service>/completions/` con el esquema JSON, codecs tipados y helpers generados que solicitan structured output forzado por el provider y decodifican la respuesta final del asistente con el codec generado. Los helpers de streaming permanecen en la superficie raw de `model.Streamer`: los chunks `completion_delta` son solo vistas previas, exactamente un chunk final `completion` es canónico, y los helpers generados `Decode<Name>Chunk(...)` decodifican solo ese payload final. Los providers que no implementan structured output fallan explícitamente con `model.ErrStructuredOutputUnsupported`.

**Ventajas:**
- **Una única superficie de contrato** — Reutiliza tipos Goa, validaciones y `OneOf` para la salida directa del asistente
- **Sin JSON analizado a mano** — Los codecs generados se encargan de la codificación, decodificación y validación
- **Structured output neutral respecto del provider** — El helper oculta el cableado específico del provider detrás de una API tipada

→ Más información en [DSL Reference](dsl-reference/) y [Runtime](runtime/)

---

### Árboles de ejecución {#run-trees-composition}

**Construye sistemas complejos a partir de piezas simples y observables.**

Las aplicaciones de IA del mundo real no son agentes individuales: son flujos de trabajo orquestados en los que los agentes delegan en otros agentes, las herramientas generan subtareas y necesitas rastrearlo todo.

El **modelo de árbol de ejecución** de Goa-AI te proporciona ejecución jerárquica con observabilidad total. Cada ejecución de agente tiene un ID único. Las ejecuciones hijas se enlazan con las padres. Los eventos fluyen en tiempo real. Depura cualquier fallo recorriendo el árbol.

{{< figure src="/images/diagrams/RunTree.svg" alt="Hierarchical agent execution with run trees showing parent-child relationships" class="img-fluid" >}}

**Ventajas:**
- **Agente como herramienta** — Cualquier agente puede ser invocado como herramienta por otro agente
- **Trazado jerárquico** — Sigue la ejecución a través de los límites entre agentes
- **Fallos aislados** — Las ejecuciones hijas fallan independientemente; las padres pueden reintentarse o recuperarse
- **Topología de streaming** — Los eventos fluyen por el árbol hacia arriba para UIs en tiempo real

→ Profundización en [Agent Composition](agent-composition/) y [Runtime](runtime/)

---

### Streaming estructurado {#structured-streaming}

**Visibilidad en tiempo real de cada decisión que toman tus agentes.**

Los agentes de caja negra son un lastre. Cuando tu agente llama a una herramienta, empieza a pensar o se encuentra con un error, necesitas saberlo *inmediatamente*, no después de que se agote el tiempo de espera de la solicitud.

Goa-AI emite **eventos tipados** a lo largo de la ejecución: `assistant_reply` para el streaming de texto, `tool_start`/`tool_end` para el ciclo de vida de la herramienta, `planner_thought` para la visibilidad del razonamiento, `usage` para el seguimiento de tokens. Los eventos fluyen a través de una sencilla interfaz **Sink** hacia cualquier transporte y, en producción, las UIs consumen un único **stream propiedad de la sesión** (`session/<session_id>`) y se cierran al observar `run_stream_end` para la ejecución activa.

```go
// Wire a sink at startup — all events from all runs flow through it
rt := runtime.New(runtime.WithStream(mySink))
```

Los **perfiles de stream** filtran los eventos para distintos consumidores: `UserChatProfile()` para UIs de usuario final, `AgentDebugProfile()` para vistas de desarrollador, `MetricsProfile()` para pipelines de observabilidad. Los sinks integrados para Pulse (Redis Streams) permiten streaming distribuido entre servicios.

**Ventajas:**
- **Agnóstico del transporte** — Los mismos eventos funcionan sobre WebSocket, SSE, Pulse o backends personalizados
- **Contratos tipados** — Sin análisis de cadenas; los eventos están fuertemente tipados con payloads documentados
- **Entrega selectiva** — Los perfiles de stream filtran los eventos por consumidor
- **Listo para multitenancy** — Los eventos llevan `RunID` y `SessionID` para enrutamiento y filtrado

→ Detalles de implementación en [Streaming en producción](production/#streaming-ui)

---

### Durabilidad con Temporal {#temporal-durability}

**Ejecuciones de agente que sobreviven a caídas, reinicios y fallos de red.**

Sin durabilidad, un proceso que se cae pierde todo su progreso. Una llamada a una API con rate limit hace fallar toda la ejecución. Un fallo de red durante la ejecución de una herramienta significa volver a ejecutar inferencia costosa.

Goa-AI usa **Temporal** para ejecución duradera. Las ejecuciones de agente se convierten en workflows; las llamadas a herramienta se convierten en activities con reintentos configurables. Cada transición de estado se persiste. Una herramienta que falla se reintenta automáticamente —*sin* volver a llamar al LLM que la produjo.

```go
// Development: in-memory (no dependencies)
rt := runtime.New()

// Production: Temporal for durability
eng, _ := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{HostPort: "localhost:7233"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "my-agents"},
})
rt := runtime.New(runtime.WithEngine(eng))
```

**Ventajas:**
- **Sin inferencia desperdiciada** — Las herramientas fallidas se reintentan sin volver a llamar al LLM
- **Recuperación ante caídas** — Reinicia los workers en cualquier momento; las ejecuciones se reanudan desde el último checkpoint
- **Manejo de rate limits** — El backoff exponencial absorbe el throttling de la API
- **Despliegue seguro** — Los despliegues continuos no pierden trabajo en vuelo

→ Guía de instalación y configuración de reintentos en [Producción](production/#temporal-setup)

---

### Registros de herramientas {#tool-registries}

**Descubre y consume herramientas desde cualquier sitio: tu clúster o la nube pública.**

A medida que crecen los ecosistemas de IA, las herramientas están en todas partes: servicios internos, APIs de terceros, registros MCP públicos. Codificar a mano las definiciones de herramientas no escala. Necesitas descubrimiento dinámico.

Goa-AI proporciona un **registro interno en clúster** para tus propios conjuntos de herramientas y **federación** con registros externos como el catálogo MCP de Anthropic. Define una vez, descubre en todas partes.

```go
// Connect to public registries
var AnthropicRegistry = Registry("anthropic", func() {
    Description("Anthropic MCP Registry")
    URL("https://registry.anthropic.com/v1")
    Security(AnthropicOAuth)
    Federation(func() {
        Include("web-search", "code-execution", "filesystem")
        Exclude("experimental/*")
    })
    SyncInterval("1h")
    CacheTTL("24h")
})

// Or run your own clustered registry
var CorpRegistry = Registry("corp", func() {
    Description("Internal tool registry")
    URL("https://registry.corp.internal")
    Security(CorpAPIKey)
    SyncInterval("5m")
})
```

**Clusterización del registro interno:**

Múltiples nodos de registro con el mismo nombre forman automáticamente un clúster a través de Redis. Estado compartido, comprobaciones de salud coordinadas, escalado horizontal: todo automático.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Agent-registry-provider topology showing gRPC and Pulse Streams connections" class="img-fluid" >}}

**Ventajas:**
- **Descubrimiento dinámico** — Los agentes encuentran las herramientas en tiempo de ejecución, no en tiempo de compilación
- **Escalado multi-clúster** — Los nodos del registro se autocoordinan a través de Redis
- **Federación con registros públicos** — Importa herramientas desde Anthropic, OpenAI o cualquier registro MCP
- **Monitorización de salud** — Comprobaciones automáticas de ping/pong con umbrales configurables
- **Importación selectiva** — Patrones include/exclude para control granular

→ Más información en [MCP Integration](mcp-integration/) y [Producción](production/)

---

## Resumen de características clave

| Característica | Lo que obtienes |
|---------|--------------|
| [Agentes Design-First](#design-first-agents) | Define agentes en DSL y genera código con seguridad de tipos |
| [Integración MCP](mcp-integration/) | Soporte nativo de Model Context Protocol |
| [Registros de herramientas](#tool-registries) | Descubrimiento en clúster + federación con registros públicos |
| [Árboles de ejecución](#run-trees-composition) | Agentes que llaman a agentes con trazabilidad completa |
| [Streaming estructurado](#structured-streaming) | Eventos tipados en tiempo real para UIs y observabilidad |
| [Durabilidad con Temporal](#temporal-durability) | Ejecución tolerante a fallos que sobrevive a las caídas |
| [Contratos tipados](dsl-reference/) | Seguridad de tipos de extremo a extremo para todas las operaciones de herramientas |
| [Completions Directas Tipadas](#typed-direct-completions) | Respuestas finales estructuradas del asistente con codecs y helpers generados |
| [Resultados acotados y datos del servidor](toolsets/#server-data) | Resultados del modelo eficientes en tokens más datos solo del servidor para UIs y auditoría |
| [Humano en el bucle](runtime/#pause--resume) | Pausa, reanudación, resultados externos de herramientas y confirmación obligada por el runtime |
| [Bookkeeping y herramientas terminales](dsl-reference/#bookkeeping) | Herramientas de progreso/estado que no consumen presupuesto de recuperación y que pueden cerrar ejecuciones de forma atómica |
| [Overrides de prompts](production/#prompt-overrides-with-mongo-store) | Specs de prompts base más overrides scoped respaldados por Mongo y procedencia |

## Guías de documentación

| Guía | Descripción | ~Tokens |
|-------|-------------|---------|
| [Quickstart](quickstart/) | Instalación y primer agente | ~2.700 |
| [DSL Reference](dsl-reference/) | DSL completo: agentes, toolsets, políticas y MCP | ~3.600 |
| [Runtime](runtime/) | Arquitectura del runtime, bucle plan/execute y motores | ~2.400 |
| [Toolsets](toolsets/) | Tipos de toolset, modelos de ejecución y transformaciones | ~2.300 |
| [Agent Composition](agent-composition/) | Agente como herramienta, árboles de ejecución y topología de streaming | ~1.400 |
| [MCP Integration](mcp-integration/) | Servidores MCP, transportes y wrappers generados | ~1.200 |
| [Memory & Sessions](memory-sessions/) | Transcripciones, almacenes de memoria, sesiones y ejecuciones | ~1.600 |
| [Producción](production/) | Configuración de Temporal, streaming de UI e integración de modelos | ~2.200 |
| [Pruebas y resolución de problemas](testing/) | Pruebas de agentes, planners, herramientas y errores comunes | ~2.000 |

**Total de la sección:** ~21.400 tokens

## Arquitectura

Goa-AI sigue un pipeline **definir → generar → ejecutar** que transforma diseños declarativos en sistemas de agentes listos para producción.

{{< figure src="/images/goa-ai-architecture.svg" alt="Goa-AI Architecture" class="img-fluid" >}}

**Descripción de capas:**

| Capa | Propósito |
|-------|---------|
| **DSL** | Declara agentes, herramientas, políticas e integraciones externas en código Go versionado |
| **Codegen** | Genera specs con seguridad de tipos, codecs, definiciones de workflow y clientes de registro; nunca edites `gen/` |
| **Runtime** | Ejecuta el bucle plan/execute con aplicación de políticas, persistencia de memoria y streaming de eventos |
| **Engine** | Intercambia backends de ejecución: en memoria para desarrollo, Temporal para durabilidad en producción |
| **Features** | Conecta proveedores de modelos (OpenAI, Anthropic, AWS Bedrock), persistencia (Mongo), streaming (Pulse) y registros |

**Puntos clave de integración:**

- **Clientes de modelos** — Abstraen los proveedores LLM detrás de una interfaz unificada; cambia entre OpenAI, Anthropic o Bedrock sin tocar el código del agente
- **Registry** — Descubre e invoca toolsets a través de los límites entre procesos; en clúster a través de Redis para escalado horizontal
- **Pulse Streaming** — Bus de eventos en tiempo real para actualizaciones de UI, pipelines de observabilidad y comunicación entre servicios
- **Temporal Engine** — Ejecución duradera de workflows con reintentos automáticos, replay y recuperación ante caídas

### Proveedores de modelos y extensibilidad {#model-providers}

Goa-AI incluye adaptadores de primera clase para tres proveedores LLM:

- **OpenAI** (`features/model/openai`)
- **Anthropic Claude** (`features/model/anthropic`)
- **AWS Bedrock** (`features/model/bedrock`)

Los tres implementan la misma interfaz `model.Client` que utilizan los planners. Las aplicaciones registran clientes de modelo con el runtime mediante `rt.RegisterModel("provider-id", client)` y los referencian por ID desde los planners y las configuraciones de agente generadas, de modo que cambiar de proveedor es un cambio de configuración y no un rediseño.

Añadir un nuevo proveedor sigue el mismo patrón:

1. Implementa `model.Client` para tu proveedor mapeando sus tipos del SDK sobre `model.Request`, `model.Response` y `model.Chunk`s de streaming.
2. Opcionalmente, envuelve el cliente con middleware compartido (por ejemplo, `features/model/middleware.NewAdaptiveRateLimiter`) para rate limiting adaptativo y métricas.
3. Llama a `rt.RegisterModel("my-provider", client)` antes de registrar agentes y luego referencia `"my-provider"` desde tus planners o configuraciones de agente.

Como los planners y el runtime dependen únicamente de `model.Client`, los nuevos proveedores se conectan sin cambios en tus diseños Goa ni en el código de agente generado.

## Ejemplo rápido

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("calculator", func() {
    Description("Calculator service with an AI assistant")
    
    // Define a service method that the tool will bind to
    Method("add", func() {
        Description("Add two numbers")
        Payload(func() {
            Attribute("a", Int, "First number")
            Attribute("b", Int, "Second number")
            Required("a", "b")
        })
        Result(Int)
    })
    
    // Define the agent within the service
    Agent("assistant", "A helpful assistant agent", func() {
        // Use a toolset with tools bound to service methods
        Use("calculator", func() {
            Tool("add", "Add two numbers", func() {
                Args(func() {
                    Attribute("a", Int, "First number")
                    Attribute("b", Int, "Second number")
                    Required("a", "b")
                })
                Return(Int)
                BindTo("add")  // Bind to the service method
            })
        })
        
        // Configure the agent's run policy
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(10))
            TimeBudget("5m")
        })
    })
})
```

## Cómo empezar

Empieza con la guía [Quickstart](quickstart/) para instalar Goa-AI y construir tu primer agente.

Para una cobertura completa del DSL, consulta la [DSL Reference](dsl-reference/).

Para entender la arquitectura del runtime, consulta la guía [Runtime](runtime/).
