---
title: Memoria y sesiones
weight: 7
description: "Manage state with transcripts, memory stores, sessions, and runs in Goa-AI."
llm_optimized: true
aliases:
---

Esta guía cubre el modelo de transcripción de Goa-AI, la persistencia de la memoria y cómo modelar conversaciones de varios turnos y flujos de trabajo de larga duración.

## Por qué son importantes las transcripciones

Goa-AI trata la **transcripción** como la única fuente de verdad para una ejecución: una secuencia ordenada de mensajes e interacciones de herramientas que es suficiente para:

- Reconstruir las cargas útiles del proveedor (Bedrock/OpenAI) para cada llamada al modelo
- Controlar los planificadores (incluidos los reintentos y la reparación de herramientas)
- Alimentar las interfaces de usuario con un historial preciso

Dado que la transcripción es fidedigna, no es necesario gestionarla manualmente:
- Listas separadas de llamadas y resultados de herramientas anteriores
- Estructuras ad hoc de "estado de la conversación
- Copias por turno de mensajes anteriores entre usuario y asistente

Usted persiste y pasa **sólo la transcripción**; Goa-AI y sus adaptadores de proveedor reconstruyen todo lo que necesitan a partir de eso.

---

## Mensajes y Partes

En el límite del modelo, Goa-AI utiliza valores `model.Message` para representar la transcripción. Cada mensaje tiene un rol (`user`, `assistant`) y una lista ordenada de **partes**:

| Tipo de parte | Descripción |
|-----------|-------------|
| Contenido del razonamiento del proveedor (texto sin formato + firma o bytes redactados). No está orientado al usuario; se utiliza para auditorías/repeticiones e interfaces de usuario opcionales. |
| `TextPart` | Texto visible mostrado al usuario (preguntas, respuestas, explicaciones). |
| `ImagePart` | Multimodal image content (bytes or URL/metadata) for providers that support images. |
| `DocumentPart` | Document content (text/bytes/URI/chunks) attached to messages for providers that support document parts. |
| `CitationsPart` | Structured citations metadata produced by providers (for UI display / audit). |
| `ToolUsePart` | Llamada a la herramienta iniciada por el asistente con `ID`, `Name` (ID canónico de la herramienta) y `Input` (carga útil JSON). |
| `ToolResultPart` | User/tool result correlated with a prior tool_use via `ToolUseID` and `Content` (JSON payload). |
| `CacheCheckpointPart` | Marker for prompt cache boundaries (provider-dependent, not user-facing). |

**El orden es sagrado:**
- Un mensaje de asistente de uso de herramienta suele tener el siguiente aspecto: `ThinkingPart` (si está presente), luego opcional `TextPart`, luego uno o más `ToolUsePart`s
- Un mensaje de resultado de usuario/herramienta suele contener uno o más `ToolResultPart`s que hacen referencia a IDs de uso de herramienta anteriores, además de contenido opcional del usuario (`TextPart`, `ImagePart`, `DocumentPart`)

Los adaptadores de proveedor de Goa-AI (por ejemplo, Bedrock Converse) recodifican estas partes en bloques específicos de proveedor **sin reordenación**.

---

## El contrato de transcripción

El contrato de transcripción de alto nivel en Goa-AI es:

1. La aplicación (o tiempo de ejecución) **persiste cada evento** de una ejecución en orden: pensamiento del asistente, texto, tool_use (ID + args), tool_result del usuario (tool_use_id + contenido), mensajes subsiguientes del asistente, etc
2. Antes de cada llamada al modelo, el autor de la llamada proporciona la transcripción completa de esa ejecución como `[]*model.Message`, siendo el último elemento el nuevo delta (texto del usuario o resultado_herramienta)
3. Goa-AI recodifica esa transcripción en el formato de chat del proveedor en el mismo orden

No hay **una API separada de "historial de herramientas "**; la transcripción es el historial.

### Cómo simplifica los planificadores y las interfaces de usuario

- **Planificadores**: Reciben la transcripción actual en `planner.PlanInput.Messages` y `planner.PlanResumeInput.Messages`. Pueden decidir qué hacer basándose puramente en los mensajes, sin enhebrar estado extra.
- **UIs**: Pueden renderizar el historial de chat, las cintas de herramientas y las tarjetas de agente a partir de la misma transcripción subyacente que persisten para el modelo. No se necesitan estructuras separadas de "registro de herramientas".
- **Adaptadores de proveedores: Nunca adivinan qué herramientas fueron llamadas o qué resultados pertenecen a dónde; simplemente mapean partes de transcripción → bloques de proveedor.

---

## Libro de transcripciones

El **libro de transcripciones** es un registro preciso del proveedor que mantiene el historial de la conversación en el formato exacto requerido por los proveedores del modelo. Garantiza la repetición determinista y la fidelidad del proveedor sin filtrar tipos del SDK del proveedor al estado del flujo de trabajo.

### Fidelidad del proveedor

Los distintos proveedores de modelos (Bedrock, OpenAI, etc.) tienen requisitos estrictos sobre el orden y la estructura de los mensajes. El libro mayor hace cumplir estas restricciones:

| Requisito del Proveedor | Garantía del Ledger |
|---------------------|------------------|
| El pensamiento debe preceder al uso de la herramienta en los mensajes del asistente
| Los resultados de la herramienta deben seguir a su correspondiente uso de la herramienta
| Alternancia de mensajes (asistente → usuario → asistente)

Para Bedrock específicamente, cuando el pensamiento está habilitado:
- Los mensajes del asistente que contengan tool_use **deben** comenzar con un bloque de pensamiento
- Los mensajes de usuario con tool_result deben seguir inmediatamente al mensaje del asistente que declara el tool_use
- El número de resultados de la herramienta no puede superar el número de tool_use anteriores

### Requisitos de ordenación

El libro mayor almacena las piezas en el orden canónico requerido por los proveedores:

```
Assistant Message:
  1. ThinkingPart(s)  - provider reasoning (text + signature or redacted bytes)
  2. TextPart(s)      - visible assistant text
  3. ToolUsePart(s)   - tool invocations (ID, name, args)

User Message:
  1. ToolResultPart(s) - tool results correlated via ToolUseID
```

Este orden es **sagrado** - el ledger nunca reordena las partes, y los adaptadores de proveedor las recodifican en bloques específicos de proveedor en la misma secuencia.

### Mantenimiento automático del libro mayor

El runtime mantiene automáticamente el ledger de transcripciones. No es necesario gestionarlo manualmente:

1. **Captura de eventos**: A medida que avanza la ejecución, el tiempo de ejecución persiste los eventos de memoria (`EventThinking`, `EventAssistantMessage`, `EventToolCall`, `EventToolResult`) para

2. **Reconstrucción del libro mayor**: La función `BuildMessagesFromEvents` reconstruye los mensajes listos para el proveedor a partir de los eventos almacenados:

```go
// Reconstruct messages from persisted events
events := loadEventsFromStore(agentID, runID)
messages := transcript.BuildMessagesFromEvents(events)

// Messages are now in canonical provider order
// Ready to pass to model.Client.Complete() or Stream()
```

3. **Validación**: Antes de enviar a los proveedores, el tiempo de ejecución puede validar la estructura del mensaje:

```go
// Validate Bedrock constraints when thinking is enabled
if err := transcript.ValidateBedrock(messages, thinkingEnabled); err != nil {
    // Handle constraint violation
}
```

### Ledger API

Para casos de uso avanzados, puede interactuar con el libro mayor directamente. El libro mayor proporciona estos métodos clave:

| Método Descripción
|--------|-------------|
`NewLedger()` Crea un nuevo libro mayor vacío
| `AppendThinking(part)` | Añade una parte pensante al mensaje del asistente actual | | `AppendText(text)` | Crea un nuevo libro mayor vacío
| `AppendText(text)` | Añade texto visible al mensaje actual del asistente | `DeclareToolUse(id, name, args)` | Crea un nuevo libro mayor vacío
| `DeclareToolUse(id, name, args)` | Declara una invocación a una herramienta en el mensaje del asistente actual |
| `FlushAssistant()` | Finaliza el mensaje del asistente actual y se prepara para la entrada del usuario | `AppendUserToolResults(results)` | Declara una invocación a una herramienta en el mensaje del asistente actual
| `AppendUserToolResults(results)` | Añade los resultados de la herramienta como un mensaje de usuario |
| `BuildMessages()` | Devuelve la transcripción completa como `[]*model.Message` |

**Ejemplo de uso:**

```go
import "goa.design/goa-ai/runtime/agent/transcript"

// Create a new ledger
l := transcript.NewLedger()

// Record assistant turn
l.AppendThinking(transcript.ThinkingPart{
    Text:      "Let me search for that...",
    Signature: "provider-sig",
    Index:     0,
    Final:     true,
})
l.AppendText("I'll search the database.")
l.DeclareToolUse("tu-1", "search_db", map[string]any{"query": "status"})
l.FlushAssistant()

// Record user tool results
l.AppendUserToolResults([]transcript.ToolResultSpec{{
    ToolUseID: "tu-1",
    Content:   map[string]any{"results": []string{"item1", "item2"}},
    IsError:   false,
}})

// Build provider-ready messages
messages := l.BuildMessages()
```

**Nota:** La mayoría de los usuarios no necesitan interactuar con el libro mayor directamente. El tiempo de ejecución mantiene automáticamente el libro mayor a través de la captura y reconstrucción de eventos. Utilice la API del libro mayor sólo para escenarios avanzados como planificadores personalizados o herramientas de depuración.

### Why This Matters

- **Reproducción determinista**: Los eventos almacenados pueden reconstruir la transcripción exacta para depuración, auditoría o reejecución de turnos fallidos
- **Almacenamiento independiente del proveedor**: El libro mayor almacena partes JSON-friendly sin dependencias del SDK del proveedor
- **Planificadores simplificados**: Los planificadores reciben mensajes correctamente ordenados sin gestionar las restricciones de los proveedores
- **Validación**: Captura las violaciones de orden antes de que lleguen al proveedor y causen errores crípticos

---

## Sesiones, ejecuciones y transcripciones

Goa-AI separa el estado de la conversación en tres capas:

- **Sesión** (`SessionID`) - una conversación o flujo de trabajo a lo largo del tiempo:
  - por ejemplo, una sesión de chat, un ticket de remediación, una tarea de investigación
  - Múltiples ejecuciones pueden pertenecer a la misma sesión

- **Run** (`RunID`) - una ejecución de un agente:
  - Cada llamada a un cliente agente (`Run`/`Start`) crea una ejecución
  - Las ejecuciones tienen estado, fases y etiquetas

- **Transcripción**: el historial completo de mensajes e interacciones con herramientas de una ejecución:
  - Representado como `[]*model.Message`
  - Persistente a través de `memory.Store` como eventos de memoria ordenados

### SessionID & TurnID en la práctica

Al llamar a un agente:

```go
client := chat.NewClient(rt)
out, err := client.Run(ctx, "chat-session-123", messages,
    runtime.WithTurnID("turn-1"), // optional but recommended for chat
)
```

- `SessionID`: Agrupa todas las ejecuciones de una conversación; a menudo se utiliza como clave de búsqueda en logs de ejecución y cuadros de mando
- `TurnID`: Agrupa los eventos de un único usuario → interacción del asistente; opcional pero útil para interfaces de usuario y registros

---

## Almacén de memoria vs Almacén de ejecución

Los módulos de funciones de Goa-AI proporcionan almacenes complementarios:

### Almacén de Memoria (`memory.Store`)

Persiste el historial de eventos por ejecución:
- Mensajes de usuario/asistente
- Llamadas a herramientas y resultados
- Notas y pensamientos del planificador

```go
type Store interface {
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}
```

Tipos clave:
- **`memory.Snapshot`** - vista inmutable del historial almacenado de una ejecución (`AgentID`, `RunID`, `Events []memory.Event`)
- `memory.Event`** - entrada única persistente con `Type` (`user_message`, `assistant_message`, `tool_call`, `tool_result`, `planner_note`, `thinking`), `Timestamp`, `Data` y `Labels`)

### Run Log (`runlog.Store`)

Persiste el **log canónico, append-only** de eventos de ejecución. El runtime añade eventos hook mientras se ejecuta el run, y los consumidores paginan con un cursor opaco para UI y diagnóstico.

```go
type Store interface {
    Append(ctx context.Context, e *runlog.Event) error
    List(ctx context.Context, runID string, cursor string, limit int) (runlog.Page, error)
}
```

`runlog.Page` contiene:
- `Events` (ordenados de más antiguo a más reciente)
- `NextCursor` (vacío cuando no hay más eventos)

---

## Wiring Stores

Con las implementaciones respaldadas por MongoDB:

```go
import (
    memorymongo "goa.design/goa-ai/features/memory/mongo"
    memorymongoclient "goa.design/goa-ai/features/memory/mongo/clients/mongo"
    runlogmongo "goa.design/goa-ai/features/runlog/mongo"
    runlogmongoclient "goa.design/goa-ai/features/runlog/mongo/clients/mongo"
    "goa.design/goa-ai/runtime/agent/runtime"
)

mongoClient := newMongoClient()

memClient, err := memorymongoclient.New(memorymongoclient.Options{
    Client:   mongoClient,
    Database: "goa_ai",
})
if err != nil {
    log.Fatal(err)
}

memStore, err := memorymongo.NewStore(memClient)
if err != nil {
    log.Fatal(err)
}

runlogClient, err := runlogmongoclient.New(runlogmongoclient.Options{
    Client:   mongoClient,
    Database: "goa_ai",
})
if err != nil {
    log.Fatal(err)
}

runEventStore, err := runlogmongo.NewStore(runlogClient)
if err != nil {
    log.Fatal(err)
}

rt := runtime.New(
    runtime.WithMemoryStore(memStore),
    runtime.WithRunEventStore(runEventStore),
)
```

Una vez configurado:
- Los suscriptores predeterminados persisten la memoria y los eventos de ejecución automáticamente
- Puede reconstruir transcripciones de `memory.Store` en cualquier momento para volver a llamar modelos, potenciar interfaces de usuario o ejecutar análisis sin conexión

---

## Almacenes personalizados

Implementar las interfaces `memory.Store` y `runlog.Store` para backends personalizados:

```go
// Memory store
type Store interface {
    LoadRun(ctx context.Context, agentID, runID string) (memory.Snapshot, error)
    AppendEvents(ctx context.Context, agentID, runID string, events ...memory.Event) error
}

// Run log store
type Store interface {
    Append(ctx context.Context, e *runlog.Event) error
    List(ctx context.Context, runID string, cursor string, limit int) (runlog.Page, error)
}
```

---

## Patrones comunes

### Sesiones de chat

- Utilizar un `SessionID` por sesión de chat
- Iniciar una nueva ejecución por turno de usuario o por "tarea"
- Persistir transcripciones por ejecución; utilizar metadatos de sesión para coser la conversación

### Flujos de trabajo de larga duración

- Utilizar una única ejecución por flujo de trabajo lógico (potencialmente con pausa/reanudación)
- Utilizar `SessionID` para agrupar flujos de trabajo relacionados (por ejemplo, por ticket o incidente)
- Confíe en los eventos `run.Phase` y `RunCompleted` para el seguimiento del estado

### Búsqueda y cuadros de mando

- Paginar `runlog.Store` por `RunID` para UI de auditoría/debug
- Carga de transcripciones de `memory.Store` a petición para ejecuciones seleccionadas

---

## Mejores prácticas

- **Correlacione siempre los resultados de las herramientas**: Asegúrese de que las implementaciones de herramientas y los planificadores conservan los identificadores tool_use y asignan los resultados de las herramientas a la `ToolUsePart` correcta a través de `ToolResultPart.ToolUseID`

- **Utilizar esquemas sólidos y descriptivos**: Los tipos, descripciones y ejemplos `Args` / `Return` en el diseño de Goa producen cargas útiles/resultados más claros en la transcripción

- **Deje que el tiempo de ejecución posea el estado**: Evite mantener matrices paralelas de "historial de herramientas" o rebanadas de "mensajes anteriores" en su planificador. Lea desde `PlanInput.Messages` / `PlanResumeInput.Messages` y confíe en el tiempo de ejecución para añadir nuevas partes

- **Persiste las transcripciones una vez, reutilízalas en todas partes**: Sea cual sea el almacén que elija, trate la transcripción como infraestructura reutilizable: la misma transcripción respalda las llamadas al modelo, la interfaz de usuario de chat, la interfaz de usuario de depuración y el análisis sin conexión

- **Campos de consulta frecuente**: ID de sesión, ID de ejecución, estado para consultas eficientes

- **Archivar transcripciones antiguas**: Reduzca los costes de almacenamiento archivando las ejecuciones finalizadas

---

## Próximos pasos

- **[Producción](./production.md)** - Despliegue con Temporal, streaming UI, e integración de modelos
- **[Tiempo de ejecución](./runtime.md)** - Comprender el bucle plan/ejecución
- **[Composición de agentes](./agent-composition.md)** - Construir grafos de agentes complejos
