---
title: "Marco Goa-AI"
linkTitle: "Goa-AI"
weight: 2
description: "Design-first framework for building agentic, tool-driven systems in Go."
llm_optimized: true
content_scope: "Complete Goa-AI Documentation"
aliases:
---

## Resumen

Goa-AI extiende la filosofía de diseño de Goa a los sistemas agénticos. Define agentes, conjuntos de herramientas y políticas en un DSL; genera código listo para la producción con contratos tipados, flujos de trabajo duraderos y eventos de streaming.

---

## ¿Por qué Goa-AI?

### Design-First Agents {#design-first-agents}

**Stop writing brittle agent code. Empieza con contratos.**

La mayoría de los marcos de agentes le obligan a conectar imperativamente avisos, herramientas y llamadas a la API. Cuando las cosas se rompen -y lo harán- estás depurando código disperso sin una fuente clara de verdad.

Goa-AI le da la vuelta a esto: **Define las capacidades de tu agente en un DSL tipado**, luego genera la implementación. Tu diseño *es* tu documentación. Tus contratos *son* tu validación. Los cambios se propagan automáticamente.

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

Cuando el LLM llama a esta herramienta con argumentos inválidos - por ejemplo, una cadena vacía `code` o `language: "cobol"` - Goa-AI **reintenta automáticamente** con un mensaje de error de validación. El LLM ve exactamente lo que salió mal y se corrige a sí mismo. No se requiere código manual de manejo de errores.

**Ventajas
- **Una única fuente de verdad** - El DSL define el comportamiento, los tipos y la documentación
- **Seguridad en tiempo de compilación** - Captura de cargas no coincidentes antes del tiempo de ejecución
- **Clientes generados automáticamente** - Invocaciones a herramientas seguras sin cableado manual
- **Patrones coherentes** - Todos los agentes siguen la misma estructura
- **Agentes autorregenerables** - Los errores de validación provocan reintentos automáticos con retroalimentación

→ Más información en [DSL Reference](dsl-reference/) y [Quickstart](quickstart/)

---

### Ejecutar árboles {#run-trees-composition}

**Construye sistemas complejos a partir de piezas simples y observables.**

Las aplicaciones de IA del mundo real no son agentes individuales, son flujos de trabajo orquestados en los que los agentes delegan en otros agentes, las herramientas generan subtareas y es necesario rastrearlo todo.

El **modelo de árbol de ejecución** de Goa-AI te proporciona una ejecución jerárquica con total observabilidad. Cada ejecución de agente tiene un ID único. Las ejecuciones hijas se enlazan con las madres. Los eventos fluyen en tiempo real. Depure cualquier fallo recorriendo el árbol.

{{< figure src="/images/diagrams/RunTree.svg" alt="Hierarchical agent execution with run trees showing parent-child relationships" class="img-fluid" >}}

**Ventajas
- **Cualquier agente puede ser invocado como herramienta por otro agente
- **Rastreo jerárquico** - Seguimiento de la ejecución a través de los límites de los agentes
- **Fallos aislados** - Las ejecuciones secundarias fallan independientemente; las principales pueden reintentarse o recuperarse
- **Topología de flujo** - Los eventos fluyen por el árbol para las interfaces de usuario en tiempo real

→ Profundización en [Agent Composition](agent-composition/) y [Runtime](runtime/)

---

### Streaming estructurado {#structured-streaming}

**Visibilidad en tiempo real de cada decisión que toman sus agentes.**

Los agentes de caja negra son un lastre. Cuando su agente llama a una herramienta, empieza a pensar o se encuentra con un error, usted necesita saberlo *inmediatamente*, no después de que se agote el tiempo de espera de la solicitud.

Goa-AI emite **eventos tipados** a lo largo de la ejecución: `assistant_reply` para el flujo de texto, `tool_start`/`tool_end` para el ciclo de vida de la herramienta, `planner_thought` para la visibilidad del razonamiento, `usage` para el seguimiento de tokens. Los eventos fluyen a través de una sencilla interfaz **Sink** a cualquier transporte.

```go
// Wire a sink at startup — all events from all runs flow through it
rt := runtime.New(runtime.WithStream(mySink))

// Or subscribe to a specific run
stop, _ := rt.SubscribeRun(ctx, runID, connectionSink)
defer stop()
```

*los **perfiles de flujo** filtran los eventos para diferentes consumidores: `UserChatProfile()` para UIs de usuario final, `AgentDebugProfile()` para vistas de desarrollador, `MetricsProfile()` para pipelines de observabilidad. Los sumideros integrados para Pulse (Redis Streams) permiten la transmisión distribuida entre servicios.

**Ventajas
- **Agnóstico de transporte** - Los mismos eventos funcionan a través de WebSocket, SSE, Pulse o backends personalizados
- **Contratos tipificados** - Sin análisis sintáctico de cadenas; los eventos están fuertemente tipificados con cargas útiles documentadas
- **Entrega selectiva** - Los perfiles de flujo filtran los eventos por consumidor
- **Preparado para múltiples usuarios** - Los eventos llevan `RunID` y `SessionID` para enrutamiento y filtrado

→ Detalles de implementación en [Streaming de producción](production/#streaming-ui)

---

### Durabilidad temporal {#temporal-durability}

**Ejecuciones de agentes que sobreviven a caídas, reinicios y fallos de red.**

Sin durabilidad, un proceso bloqueado pierde todo el progreso. Una llamada a la API de velocidad limitada falla toda la ejecución. Un fallo en la red durante la ejecución de la herramienta significa volver a ejecutar una inferencia costosa.

Goa-AI utiliza **Temporal** para una ejecución duradera. Las ejecuciones del agente se convierten en flujos de trabajo; las llamadas a las herramientas se convierten en actividades con reintentos configurables. Cada transición de estado es persistente. Una herramienta colapsada se reintenta automáticamente - *sin* reejecutar la llamada LLM que la produjo.

```go
// Development: in-memory (no dependencies)
rt := runtime.New()

// Production: Temporal for durability
eng, _ := temporal.New(temporal.Options{
    ClientOptions: &client.Options{HostPort: "localhost:7233"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "my-agents"},
})
rt := runtime.New(runtime.WithEngine(eng))
```

**Ventajas
- **No se desperdicia inferencia** - Las herramientas fallidas reintentan sin volver a llamar al LLM
- **Recuperación de fallos** - Reinicia los trabajadores en cualquier momento; las ejecuciones se reanudan desde el último punto de control
- **Gestión de límite de velocidad** - El backoff exponencial absorbe el estrangulamiento de la API
- **Despliegue seguro** - Los despliegues continuos no pierden el trabajo en vuelo

→ Guía de instalación y configuración de reintentos en [Producción](production/#temporal-setup)

---

### Registros de herramientas {#tool-registries}

**Descubra y consuma herramientas desde cualquier lugar: su clúster o la nube pública

A medida que crecen los ecosistemas de IA, las herramientas están en todas partes: servicios internos, API de terceros, registros MCP públicos. La codificación de definiciones de herramientas no es escalable. Necesita un descubrimiento dinámico.

Goa-AI proporciona un **registro interno agrupado** para sus propios conjuntos de herramientas y **federación** con registros externos como el catálogo MCP de Anthropic. Defina una vez, descubra en todas partes.

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

**Registro interno agrupado:**

Múltiples nodos de registro con el mismo nombre forman automáticamente un clúster a través de Redis. Estado compartido, comprobaciones de estado coordinadas, escalado horizontal: todo automático.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Agent-registry-provider topology showing gRPC and Pulse Streams connections" class="img-fluid" >}}

**Ventajas
- **Descubrimiento dinámico** - Los agentes encuentran las herramientas en tiempo de ejecución, no en tiempo de compilación
- **Escalado multi-clúster** - Los nodos del registro se coordinan automáticamente a través de Redis
- **Federación de registros públicos** - Importación de herramientas de Anthropic, OpenAI o cualquier registro MCP
- **Supervisión de la salud** - Comprobaciones automáticas de ping/pong con umbrales configurables
- **Importación selectiva** - Incluir/excluir patrones para un control granular

→ Más información en [Integración MCP](mcp-integration/) y [Producción](production/)

---

## Resumen de características principales

| Característica | Lo que obtienes |
|---------|--------------|
| [Design-First Agents](#design-first-agents) | Definir agentes en DSL, generar código de tipo seguro | | [Integración MCP](mcp-integration/) | Soporte nativo de Model Context Protocol
| [Integración MCP](mcp-integration/) | Soporte nativo de Protocolo de Contexto de Modelo | | [Registros de Herramientas](mcp-integration/)
| [Registros de herramientas](#tool-registries) | Descubrimiento en clúster + federación de registros públicos | | [Árboles de ejecución](mcp-integration/)
| [Run Trees](#run-trees-composition) | Agentes llamando a agentes con trazabilidad completa |
| [Structured Streaming](#structured-streaming) | Eventos tipificados en tiempo real para UIs y observabilidad | [Structured Streaming](#structured-streaming) | Eventos tipificados en tiempo real para UIs y observabilidad
| Durabilidad temporal](#temporal-durability) Ejecución tolerante a fallos que sobrevive a los fallos
| [Typed Contracts](dsl-reference/) | Seguridad de tipos de extremo a extremo para todas las operaciones de herramientas |

## Guías de documentación

| Guía | Descripción | ~Tokens |
|-------|-------------|---------|
| Instalación y primer agente
| [DSL Reference](dsl-reference/) | DSL completo: agentes, conjuntos de herramientas, políticas, MCP | ~3.600 | [Runtime](quickstart/)
| [Tiempo de ejecución](runtime/) | Arquitectura de tiempo de ejecución, bucle plan/ejecutar, motores | ~2.400 |
| [Toolsets](toolsets/) | Tipos de Toolsets, modelos de ejecución, transformaciones | ~2.300 | | [Agent Composition](toolsets/)
| [Composición de agentes](agent-composition/) | Agente como herramienta, árboles de ejecución, topología de transmisión | ~1.400 | [Integración MCP](toolsets/)
| [Integración MCP](mcp-integration/) | Servidores MCP, transportes, envoltorios generados | ~1.200 | [Memoria y Sesiones](mcp-integration/) | Memoria y Sesiones
| Memoria y sesiones](memory-sessions/) Transcripciones, almacenes de memoria, sesiones, ejecuciones | ~1.600
| [Producción](production/) | Configuración temporal, streaming UI, integración de modelos | ~2.200 | 
| [Pruebas y resolución de problemas](testing/) | Agentes de pruebas, planificadores, herramientas, errores comunes | ~2.000 |

**Sección total:** ~21.400 fichas

## Arquitectura

Goa-AI sigue un proceso de **definir → generar → ejecutar** que transforma los diseños declarativos en sistemas de agentes listos para la producción.

{{< figure src="/images/goa-ai-architecture.svg" alt="Goa-AI Architecture" class="img-fluid" >}}

**Descripción de capas:**

| Capa | Propósito |
|-------|---------|
| Declarar agentes, herramientas, políticas e integraciones externas en código Go controlado por versiones
**Codegen** Generar especificaciones seguras, codecs, definiciones de flujo de trabajo y clientes de registro, nunca editar `gen/`
| Ejecución del bucle plan/ejecución con aplicación de políticas, persistencia en memoria y transmisión de eventos
| Motor de ejecución: en memoria para desarrollo, temporal para producción
| **Características** | Enchufe proveedores de modelos (OpenAI, Anthropic, AWS Bedrock), persistencia (Mongo), streaming (Pulse) y registros | | **Funciones

**Puntos clave de integración:**

- **Clientes de modelos** - Proveedores LLM abstractos detrás de una interfaz unificada; cambiar entre OpenAI, Anthropic o Bedrock sin cambiar el código del agente
- **Registro** - Descubrir e invocar conjuntos de herramientas a través de los límites del proceso; agrupado a través de Redis para escalado horizontal
- **Pulse Streaming** - Bus de eventos en tiempo real para actualizaciones de la interfaz de usuario, conductos de observabilidad y comunicación entre servicios
- **Motor temporal**: ejecución duradera de flujos de trabajo con reintentos automáticos, repetición y recuperación de fallos

### Proveedores de modelos y extensibilidad {#model-providers}

Goa-AI incluye adaptadores de primera clase para tres proveedores LLM:

- **OpenAI** (`features/model/openai`)
- **Anthropic Claude** (`features/model/anthropic`)
- **AWS Bedrock** (`features/model/bedrock`)

Los tres implementan la misma interfaz `model.Client` utilizada por los planificadores. Las aplicaciones registran clientes modelo con el tiempo de ejecución utilizando `rt.RegisterModel("provider-id", client)` y se refieren a ellos por ID desde los planificadores y las configuraciones de agente generadas, por lo que el intercambio de proveedores es un cambio de configuración en lugar de un rediseño.

Añadir un nuevo proveedor sigue el mismo patrón:

1. Implementa `model.Client` para tu proveedor mapeando sus tipos SDK en `model.Request`, `model.Response`, y streaming `model.Chunk`s.
2. Opcionalmente, envuelva el cliente con middleware compartido (por ejemplo, `features/model/middleware.NewAdaptiveRateLimiter`) para la limitación de velocidad adaptativa y métricas.
3. Llame a `rt.RegisterModel("my-provider", client)` antes de registrar agentes, luego haga referencia a `"my-provider"` desde sus planificadores o configuraciones de agentes.

Debido a que los planificadores y el tiempo de ejecución sólo dependen de `model.Client`, los nuevos proveedores se conectan sin cambios en sus diseños Goa o en el código de agente generado.

## Ejemplo Rápido

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

Para una cobertura completa de DSL, consulta la [DSL Reference](dsl-reference/).

Para entender la arquitectura de ejecución, consulta la guía [Runtime](runtime/).
