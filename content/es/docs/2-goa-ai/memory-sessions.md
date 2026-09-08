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

- **Planificadores**: Obtienen la transcripción preparada llamando a `PrepareMessages()` en `planner.PlanInput` o `planner.PlanResumeInput` y comprobando el error antes de usarla. Pueden decidir qué hacer basándose en esos mensajes, sin mantener estado extra. Consulta el [ciclo de vida de los mensajes](../runtime/#preparing-conversation-messages).
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

`ValidatePlannerTranscript` exige que cada grupo de llamadas a herramientas
del asistente vaya seguido inmediatamente por un único mensaje de usuario con
exactamente un resultado para cada ID de llamada. Cuando el razonamiento está
habilitado, `ValidateBedrock` exige además que cada mensaje del asistente que
llame a una herramienta comience con un `ThinkingPart`. Ningún validador
modifica los mensajes.

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

## Memoria del producto y almacenamiento del runtime {#runtime-store}

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

## Cambios de ciclo de vida y registros en una sola operación {#store-lifecycle-changes-and-records-together}

Cada método de ciclo de vida guarda el estado y el registro que lo demuestra en la misma operación:

- `StartRootRun` guarda los metadatos de una ejecución raíz y su primer registro.
- `StartChildRun` guarda el vínculo con el padre, los metadatos del hijo y su primer registro. Un hijo nuevo requiere un padre activo; un reintento exacto ya aceptado sigue siendo válido después de que el padre se detenga.
- `StartOneShotRun` guarda una ejecución sin sesión y su primer registro.
- `StartOneShotChildRun` guarda juntos el vínculo con el padre sin sesión y el inicio del hijo. Aplica la misma regla de padre activo y reintento exacto.
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

### JSON de eventos duraderos {#durable-event-json}

El runtime decodifica los payloads de `RunStarted`, `RunSuspended`,
`RunCompleted` y `ChildRunLinked` como un único valor JSON tipado. Rechaza los
campos desconocidos y cualquier valor JSON adicional. Los registros existentes
deben ajustarse exactamente a estas formas para que el runtime pueda
reproducirlos o entregarlos; los datos guardados que no sean compatibles nunca
se ignoran.

### Procedencia de la cancelación {#cancellation-provenance}

El almacén del runtime distingue una solicitud de cancelación del motivo por
el que terminó una ejecución:

- Cuando un workflow activo acepta una llamada explícita a `CancelRun`, guarda
  en una sola operación el primer motivo en los metadatos de la ejecución y un
  registro del tipo `storage.CancellationRecordType`
  (`runtime.cancellation_intent`) con el mismo motivo. El registro
  `RunCompleted` cancelado que se escriba después debe contener ese mismo
  motivo.
- Si `StartRootRun` o `StartChildRun` encuentra que la sesión ya terminó, la
  operación de inicio guarda `session_ended` en los metadatos junto con
  `RunStarted` y el `RunCompleted` cancelado. No guarda un registro
  `storage.CancellationRecordType` porque no hubo una solicitud de cancelación
  separada.
- Si el motor de workflows cancela una ejecución sin una solicitud registrada
  previamente, el motivo de cancelación de los metadatos queda vacío y no hay
  ningún registro `storage.CancellationRecordType`. El `RunCompleted` cancelado
  contiene `engine_canceled`. En este caso, el campo vacío tiene un significado
  preciso; no indica que falten datos.

Estas son las tres combinaciones válidas entre los metadatos de la ejecución y
los registros de cancelación. Un almacén duradero debe conservar cada una sin
cambios.

### Inicio de una continuación

Una continuación requiere una ejecución predecesora existente con estado
`suspended`. El sucesor debe repetir la misma sesión, el mismo agente y la misma
ejecución padre. El almacén comprueba estos cuatro datos dentro de la misma
transacción que crearía el sucesor. Si alguno no coincide, rechaza la operación
antes de escribir el inicio del sucesor o un vínculo con el padre.

El registro `RunStarted` del sucesor guarda `PredecessorRunID`. `RunMeta` no
duplica esa relación. Los lectores reconstruyen el historial de continuaciones
a partir de los registros que lo establecieron.

### Orden de inicio

Para las ejecuciones raíz, el motor acepta el workflow antes de escribir en el
almacenamiento del runtime. No se crea un registro `pending` antes de que el
motor lo acepte. La primera activity duradera del workflow llama a
`StartRootRun`:

- si la sesión está activa, el almacén escribe `RunStarted`, marca la ejecución
  como activa y el workflow continúa;
- si la sesión terminó después de que el motor aceptara el workflow, el almacén
  escribe igualmente `RunStarted`, lo sigue de inmediato con un `RunCompleted`
  cancelado y el workflow se detiene antes de ejecutar el planificador o una
  herramienta.

Los workflows hijos usan `StartChildRun`. El almacén escribe `ChildRunLinked`
en el padre y después `RunStarted` en el hijo. Si la sesión ha terminado,
también escribe el `RunCompleted` cancelado del hijo. Por tanto, cada workflow
aceptado por el motor tiene un registro `RunStarted`, incluso si se detuvo
porque su sesión había terminado. Un hijo nuevo requiere un padre activo. Un
reintento exacto de un inicio de hijo que el almacén ya aceptó sigue siendo
válido después de que el padre se detenga; un reintento modificado o un hijo
nuevo se rechazan. Temporal termina un workflow hijo si su workflow padre se
cierra primero.

El trabajo raíz sin sesión usa `StartOneShotRun`: recibe los metadatos normales
de la ejecución y `RunStarted`, pero no crea ni se une a una sesión. Un agente
invocado como herramienta desde esa ejecución usa `StartOneShotChildRun`. En la
primera llamada, el padre debe existir, no tener sesión y seguir activo. El
almacén escribe `ChildRunLinked` en el padre y `RunStarted` en el hijo sin sesión
en una sola operación.

Un reintento exacto de `StartOneShotChildRun` tiene éxito aunque el padre haya
terminado después de la primera escritura, porque la relación con el hijo ya
fue aceptada. El reintento debe repetir la misma identidad del hijo y las claves
y contenidos de ambos registros. Un reintento modificado produce un conflicto,
y no se puede añadir un hijo nuevo después de que el padre haya terminado.

El resultado del inicio informa de la decisión original, no del estado actual
de la ejecución. Repetir un inicio después de que la ejecución haya terminado
devuelve por tanto la misma decisión tomada en la primera escritura.

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

Implementa un único `storage.Store` del paquete
`goa.design/goa-ai/runtime/agent/storage` y pásalo como primer argumento de
`runtime.New`. Mueve la creación, finalización y eliminación de sesiones al
servicio host propietario de los datos. Si los workers viven en otros
servicios, deben llamar al propietario mediante una API tipada y no importar
su adaptador de base de datos.

Antes de que el nuevo runtime escriba, los datos existentes deben cumplir el
contrato del almacenamiento integrado. Los metadatos, checkpoints y registros
deben admitir las operaciones de ciclo de vida anteriores, y los escritores
antiguos de almacenes separados no deben solaparse con los nuevos. La aplicación
host elige el procedimiento de conversión y recuperación para su base de datos y
su entorno, y despliega juntos al propietario y a todos sus workers.

Los comandos de entrega de finalización no requieren una migración del esquema
de la base de datos ni cambian un formato público. Sí cambian el contrato de
código Go. Actualiza el runtime y su implementación del almacén a la vez:

- sustituye cada llamada a `Runtime.RepairRunCompletion` por
  `Runtime.EnsureRunCompletion`;
- implementa `LoadSessionStatus` en cada `storage.Store` personalizado;
- configura `Runtime.WithStream` antes de llamar a cualquiera de los comandos
  de garantía para una sesión activa; y
- espera que el inicio de un hijo nuevo falle después de que su padre se
  detenga. Un reintento exacto de un inicio que el almacén ya aceptó sigue
  siendo válido.

Además, los registros duraderos existentes deben cumplir el contrato JSON
exacto descrito arriba.

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

- **Deje que el runtime gestione el estado**: Evite mantener arrays paralelos de "historial de herramientas" o slices de "mensajes anteriores" en su planificador. Llame a `PrepareMessages()`, compruebe el error y use los mensajes preparados; confíe en el runtime para añadir nuevas partes.

- **Persiste las transcripciones una vez, reutilízalas en todas partes**: Sea cual sea el almacén que elija, trate la transcripción como infraestructura reutilizable: la misma transcripción respalda las llamadas al modelo, la interfaz de usuario de chat, la interfaz de usuario de depuración y el análisis sin conexión

- **Campos de consulta frecuente**: ID de sesión, ID de ejecución, estado para consultas eficientes

- **Archivar transcripciones antiguas**: Reduzca los costes de almacenamiento archivando las ejecuciones finalizadas

---

## Próximos pasos

- **[Producción](./production.md)** - Despliegue con Temporal, streaming UI, e integración de modelos
- **[Tiempo de ejecución](./runtime.md)** - Comprender el bucle plan/ejecución
- **[Composición de agentes](./agent-composition.md)** - Construir grafos de agentes complejos
