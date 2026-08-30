---
title: Memoria y sesiones
weight: 7
description: "Manage state with transcripts, memory stores, sessions, and runs in Goa-AI."
llm_optimized: true
aliases:
---

Esta guía cubre el modelo de transcripción de Goa-AI, la persistencia de la memoria y cómo modelar conversaciones de varios turnos y flujos de trabajo de larga duración.

## Por qué son importantes las transcripciones
Goa-AI trata la **transcripción** como la fuente de verdad de la conversación visible para el modelo: una secuencia ordenada de mensajes e interacciones con herramientas suficiente para:

- Reconstruir los payloads del proveedor (Bedrock/OpenAI) para cada llamada al modelo
- Dirigir los planners, incluidos reintentos y reparación de herramientas
- Alimentar las interfaces de usuario con un historial exacto

Como la transcripción es autoritativa para la entrada del modelo, no necesitas gestionar manualmente:

- Listas separadas de llamadas y resultados anteriores
- Estructuras ad hoc de estado de conversación
- Copias por turno de mensajes anteriores

Para el historial de conversación persistes y pasas **solo la transcripción**; Goa-AI y sus adaptadores reconstruyen de ella la entrada del proveedor. El estado de la ejecución, la cancelación, los checkpoints de continuación y los registros inmutables pertenecen al almacén separado del runtime descrito más abajo.

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

## Reproducción de la transcripción del runtime

El runtime guarda cambios canónicos de `model.Message` en los registros
ordenados de la ejecución. `transcript_messages_seeded` contiene los mensajes
que ya existían antes de comenzar la ejecución;
`transcript_messages_appended` contiene los mensajes aceptados mientras se
ejecutaba. Los registros iniciales reconstruyen la entrada del modelo, pero no
se publican como una nueva respuesta del asistente.

Usa la función pública de reproducción cuando la recuperación o la inspección
necesite la secuencia exacta de mensajes preparada para el proveedor:

```go
import "goa.design/goa-ai/runtime/agent/transcript"

messages, err := transcript.BuildMessagesFromRunLog(ctx, runtimeStore, runID)
if err != nil {
    return err
}
```

`BuildMessagesFromRunLog` pagina mediante
`storage.Store.ListRunRecords` y reproduce solo los registros canónicos de
transcripción en el orden guardado. Si los registros ya están cargados,
`ReplayRunLogEvents` realiza la misma proyección. Los adaptadores de proveedor
conservan el orden de las partes; `ValidatePlannerTranscript` y
`ValidateBedrock` permiten validar una transcripción en el límite adecuado.

Estos registros permiten reproducir e inspeccionar workflows. No reemplazan la
transcripción propiedad del producto para el historial de chat, valoraciones,
búsqueda, retención o eliminación de datos de clientes.

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
store := storageinmem.New()
if _, err := store.CreateSession(ctx, "chat-session-123", time.Now().UTC()); err != nil {
    panic(err)
}
rt := runtime.New(store)
client := chat.NewClient(rt)
out, err := client.Run(ctx, "chat-session-123", messages,
    runtime.WithTurnID("turn-1"), // optional but recommended for chat
)
```

- `SessionID`: Agrupa todas las ejecuciones de una conversación; a menudo se utiliza como clave de búsqueda en logs de ejecución y cuadros de mando
- `TurnID`: Agrupa los eventos de un único usuario → interacción del asistente; opcional pero útil para interfaces de usuario y registros

Las sesiones se terminan explícitamente (por ejemplo, cuando se elimina una conversación). Una vez finalizada una sesión, no deben iniciarse nuevas ejecuciones bajo ella.

---

## Memoria del producto y almacenamiento del runtime

Goa-AI separa dos tipos de datos duraderos porque tienen propietarios distintos:

- **La memoria del producto** contiene la transcripción y los datos de la aplicación derivados de ella. El producto decide qué conserva, muestra, busca o elimina.
- **El almacenamiento del runtime** contiene el estado que Goa-AI necesita para ejecutar y continuar las ejecuciones: estado de la sesión, metadatos de ejecución, checkpoints privados y registros inmutables.

Por ejemplo, un servicio de chat puede guardar la conversación completa, las valoraciones y los campos de búsqueda en su propia base de datos. El almacén del runtime registra que `run-42` comenzó, qué ejecución hija inició, si se solicitó su cancelación y cómo terminó. No se convierte en la base de datos de transcripciones del chat.

### Almacén de memoria (`memory.Store`)

Conserva el historial de eventos de cada ejecución:

- mensajes del usuario y del asistente
- llamadas a herramientas y sus resultados
- notas y razonamiento del planificador

Estos eventos se convierten de nuevo en un `model.Transcript` y en los mensajes que recibe el proveedor. El producto es propietario de esta información visible para el modelo.

### Almacén del runtime (`storage.Store`)

El host proporciona una implementación de `storage.Store`. Esa única implementación es propietaria de todas las escrituras de runtime:

- el alcance de la sesión y si está activa, terminada o eliminada permanentemente
- la identidad de la ejecución, sus relaciones padre-hijo, etiquetas, decisión inicial y estado actual
- los bytes privados necesarios para continuar una ejecución suspendida
- los registros ordenados e inmutables usados para inspección y para identificar las versiones de prompts que influyeron en la ejecución

El runtime requiere esta dependencia:

```go
store := newRuntimeStore()
rt := runtime.New(store, runtime.WithEngine(eng))
```

En una aplicación de un solo proceso, `store` puede ser un adaptador de base de datos local. En una aplicación distribuida, un único servicio debe ser propietario de la base de datos y exponer métodos tipados; los workers implementan `storage.Store` llamando a ese servicio. Servicios distintos no escriben directamente en las mismas colecciones.

---

## Cambios de ciclo de vida y registros en una sola operación

Cada método de ciclo de vida guarda el estado y el registro que lo demuestra en la misma operación:

- `StartRootRun` guarda los metadatos de una ejecución raíz y su primer registro.
- `StartChildRun` guarda el vínculo con el padre, los metadatos del hijo y su primer registro.
- `StartOneShotRun` guarda una ejecución sin sesión y su primer registro.
- `RecordRunCancellation` guarda el primer motivo de cancelación y su registro.
- `RecordRunSuspension` guarda el checkpoint privado, el estado suspendido y su registro.
- `RecordRunTerminal` guarda el estado final y su registro.

Así no puede quedar una ejecución marcada como completa sin su registro de finalización, ni un checkpoint guardado mientras la ejecución aún aparece activa.

Los registros ordinarios que no cambian el ciclo de vida usan `AppendRunRecord`. `ListRunRecords` y `ListSessionRunRecords` los leen. El cursor es una posición creada por el almacén que el cliente devuelve sin modificar para obtener la página siguiente.

### Reintentos exactos

Las activities de un workflow pueden ejecutarse más de una vez. Por eso, una repetición exacta tiene éxito y devuelve el identificador del registro original. Debe repetir exactamente identidad, fecha, etiquetas, clave y payload del evento, checkpoint, estado y motivo de cancelación.

Para cada inicio, cancelación, suspensión y finalización, el almacén también
recuerda el registro exacto elegido por la primera escritura correcta. Repetir
el cambio de ciclo de vida con otro registro produce un conflicto, aunque
coincidan el estado y los demás campos del ciclo de vida.

Si cambia cualquier valor fijado por la primera escritura, el almacén devuelve un conflicto. No adivina qué valor es más reciente ni sobrescribe el primero. El primer motivo de cancelación también es permanente: una repetición exacta tiene éxito y un motivo diferente produce un conflicto.

### Orden de inicio

Para una ejecución raíz, el motor acepta el workflow antes de escribir en el almacén. No existe un registro `pending` anterior a esa aceptación. La primera activity duradera llama a `StartRootRun`:

- si la sesión está activa, guarda una ejecución en curso y continúa;
- si la sesión terminó después de que el motor aceptara el workflow, guarda una ejecución cancelada y se detiene antes del planificador y las herramientas.

Los workflows hijos usan `StartChildRun`, de modo que el vínculo con el padre y el inicio sean visibles juntos. El trabajo sin sesión usa `StartOneShotRun`: conserva metadatos y registros normales, pero no crea ni se une a una sesión.

El resultado del inicio devuelve la decisión original, no el estado actual. Repetir el inicio después de que la ejecución haya terminado devuelve la misma decisión inicial.

---

## Ciclo de vida y eliminación de sesiones

La administración de sesiones pertenece a la aplicación host, no a los workers. El host crea la sesión antes de enviar trabajo con sesión, la termina cuando ya no debe empezar trabajo nuevo y la elimina permanentemente solo cuando todas sus ejecuciones han llegado a un estado final.

Terminar y eliminar son operaciones distintas:

- **Terminar** impide nuevo trabajo de planificador o herramientas, pero permite que las ejecuciones existentes guarden sus registros finales.
- **Purgar** elimina la sesión, ejecuciones, checkpoints y registros cuando todas han terminado. El identificador eliminado no se puede reutilizar, para que un reintento tardío no recree datos antiguos.

La implementación en memoria de `runtime/agent/storage/inmem` ofrece `CreateSession`, `EndSession` y `PurgeSession` para ejemplos y pruebas. En producción, estas operaciones las implementa el servicio propietario de la base de datos del runtime.

Las versiones de prompts se derivan de los registros `prompt_rendered` y de vínculo padre-hijo. El almacén no mantiene otra lista de referencias o identificadores hijos que pueda contradecir el historial.

---

## Migración desde almacenes separados

Este contrato rompe la API anterior. Se eliminan:

- `session.Store` y `runlog.Store`
- `runtime.WithSessionStore` y `runtime.WithRunEventStore`
- los métodos de administración de sesiones del runtime, como `CreateSession`, `EndSession` y `PurgeSession`
- los paquetes integrados `features/session/mongo` y `features/runlog/mongo`

Implementa un único `runtime/agent/storage.Store` y pásalo como primer argumento de `runtime.New`. Mueve la creación, finalización y eliminación de sesiones al servicio host propietario de los datos. Si los workers viven en otros servicios, deben llamar al propietario mediante una API tipada y no importar su adaptador de base de datos.

Antes de que el nuevo runtime escriba, los datos existentes deben cumplir el
contrato del almacenamiento integrado. Los metadatos, checkpoints y registros
deben admitir las operaciones de ciclo de vida anteriores, y los escritores
antiguos de almacenes separados no deben solaparse con los nuevos. La aplicación
host elige el procedimiento de conversión y recuperación para su base de datos y
su entorno, y despliega juntos al propietario y a todos sus workers.

## Patrones comunes

### Sesiones de chat

- Utilizar un `SessionID` por sesión de chat
- Iniciar una nueva ejecución por turno de usuario o por "tarea"
- Mantener la transcripción del producto en el servicio de chat; usar los registros del runtime para el estado, la continuación y la inspección

### Flujos de trabajo de larga duración

- Usar una ejecución por cada workflow aceptado por el motor
- Cuando una ejecución solicita entrada externa, su workflow termina; la respuesta inicia una nueva ejecución en la misma sesión a partir del checkpoint guardado
- Utilizar `SessionID` para agrupar flujos de trabajo relacionados (por ejemplo, por ticket o incidente)
- Confíe en los eventos `run.Phase` y `RunCompleted` para el seguimiento del estado

### Búsqueda y cuadros de mando

- Paginar `storage.Store` por `RunID` para UI de auditoría/debug
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
