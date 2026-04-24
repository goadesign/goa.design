---
title: Herramientas
weight: 4
description: "Aprende sobre los tipos de conjuntos de herramientas, modelos de ejecución, validación, sugerencias de reintento y catálogos de herramientas en Goa-AI."
llm_optimized: true
aliases:
---

Los conjuntos de herramientas son colecciones de herramientas que los agentes pueden utilizar. Goa-AI admite varios tipos de conjuntos de herramientas, cada uno con diferentes modelos de ejecución y casos de uso.

## Tipos de conjuntos de herramientas

### Conjuntos de herramientas propios del servicio (respaldados por métodos)

Declarados mediante `Toolset("name", func() { ... })`; las herramientas pueden usar `BindTo` con métodos de servicios Goa o ser implementadas por ejecutores personalizados.

- Codegen emite specs/types/codecs/transforms por conjunto de herramientas en `gen/<service>/toolsets/<toolset>/`
- Cuando se usa el Registro interno de herramientas, codegen también emite `gen/<service>/toolsets/<toolset>/provider.go` para la ejecución del lado del servicio enrutada por el registro
- Los agentes que usan `Use` con estos conjuntos de herramientas importan los specs del proveedor y obtienen constructores de llamadas tipadas y fábricas de ejecutores
- Las aplicaciones registran ejecutores que decodifican argumentos tipados (mediante codecs proporcionados en tiempo de ejecución), opcionalmente utilizan transforms, llaman a clientes de servicios y devuelven `ToolResult`

Si despliegas el Registro interno de herramientas para la invocación entre procesos, el servicio propietario ejecuta un bucle de proveedor que se suscribe a `toolset:<toolsetID>:requests` y publica los resultados en `result:<toolUseID>`. Consulta la [documentación del Registro]({{< ref "/docs/2-goa-ai/registry.md" >}}) para ver el fragmento de cableado del proveedor.

### Conjuntos de herramientas implementados por agentes (Agent-as-Tool)

Se definen en un bloque `Export` del agente, y opcionalmente se usan con `Use` desde otros agentes.

- La propiedad sigue siendo del servicio; el agente es la implementación
- Codegen emite paquetes de exportación del lado del proveedor en `gen/<service>/agents/<agent>/exports/<export>` con `NewRegistration` y constructores de llamadas tipadas
- Los helpers del lado del consumidor en los agentes que usan `Use` con el conjunto de herramientas exportado delegan en los helpers del proveedor, manteniendo centralizados los metadatos de enrutamiento
- La ejecución es en línea; las cargas se pasan como JSON canónico y se decodifican solo en el límite si se necesitan para los prompts

### Conjuntos de herramientas MCP

Se declaran mediante `Toolset(FromMCP(service, suite))` para suites MCP respaldadas por Goa, o
`Toolset("name", FromExternalMCP(service, suite), func() { ... })` para servidores MCP
externos con esquemas de herramientas en línea.

- El registro generado establece `DecodeInExecutor=true` para que el JSON crudo se pase tal cual al ejecutor MCP
- El ejecutor MCP decodifica usando sus propios codecs
- Los wrappers generados se encargan de los esquemas/codificadores JSON y los transportes (HTTP/SSE/stdio) con reintentos y trazado

### Cuándo usar BindTo frente a implementaciones en línea

**Usa `BindTo` cuando:**
- La herramienta debe llamar a un método de servicio Goa existente
- Deseas transforms generados entre los tipos de la herramienta y del método
- El método de servicio ya contiene la lógica de negocio que necesitas
- Deseas reutilizar la validación y el manejo de errores de la capa de servicio

```go
// Herramienta enlazada a un método de servicio existente
Tool("search", "Search documents", func() {
    Args(SearchPayload)
    Return(SearchResult)
    BindTo("Search")  // Llama al método Search del mismo servicio
})
```

**Usa implementaciones en línea cuando:**
- La herramienta tiene lógica personalizada no ligada a un método de servicio
- Necesitas orquestar múltiples llamadas a servicios
- La herramienta es puramente computacional (sin llamadas externas)
- Deseas un control total sobre el flujo de ejecución

```go
// Herramienta con implementación de ejecutor personalizado
Tool("summarize", "Summarize multiple documents", func() {
    Args(func() {
        Attribute("doc_ids", ArrayOf(String), "Document IDs to summarize")
        Required("doc_ids")
    })
    Return(func() {
        Attribute("summary", String, "Combined summary")
        Required("summary")
    })
    // Sin BindTo - se implementa en el ejecutor
})
```

Para las implementaciones en línea, escribes la lógica del ejecutor directamente:

```go
func (e *Executor) Execute(
    ctx context.Context,
    meta *runtime.ToolCallMeta,
    call *planner.ToolRequest,
) (*runtime.ToolExecutionResult, error) {
    switch call.Name {
    case specs.Summarize:
        args, _ := specs.UnmarshalSummarizePayload(call.Payload)
        // Lógica personalizada: obtener varios documentos, combinarlos y resumirlos
        summary := e.summarizeDocuments(ctx, args.DocIDs)
        return runtime.Executed(&planner.ToolResult{
            Name:   call.Name,
            Result: &specs.SummarizeResult{Summary: summary},
        }), nil
    }
    return runtime.Executed(&planner.ToolResult{
        Name:  call.Name,
        Error: planner.NewToolError("unknown tool"),
    }), nil
}

```

### Resultados de herramientas acotados

Algunas herramientas devuelven de forma natural listas grandes, grafos o ventanas de series temporales. Puedes marcarlas como **vistas acotadas** para que los servicios sigan siendo responsables del recorte mientras el runtime hace cumplir y expone el contrato.

#### El contrato agent.Bounds

El tipo `agent.Bounds` es un contrato pequeño y agnóstico al proveedor que describe cómo un resultado de herramienta ha sido acotado respecto al conjunto de datos completo subyacente:

```go
type Bounds struct {
    Returned       int    // Número de elementos en la vista acotada
    Total          *int   // Total aproximado antes del truncado (opcional)
    Truncated      bool   // Si se aplicó algún tope (longitud, ventana, profundidad)
    RefinementHint string // Orientación sobre cómo acotar la consulta cuando se truncó
}
```

| Campo | Descripción |
|-------|-------------|
| `Returned` | Número de elementos realmente presentes en el resultado |
| `Total` | Recuento aproximado del total de elementos antes del truncado (nil si se desconoce) |
| `Truncated` | Verdadero si se aplicó algún tope (paginación, límites de profundidad, límites de tamaño) |
| `RefinementHint` | Orientación legible para acotar la consulta (p. ej., "Añada un filtro de fecha para reducir los resultados") |

#### Responsabilidad del servicio sobre el recorte

El runtime no calcula subconjuntos ni truncados por sí mismo; **los servicios son responsables de**:

1. **Aplicar la lógica de truncado**: paginación, límites de resultados, topes de profundidad, ventanas temporales
2. **Rellenar los metadatos de bounds del runtime**: establecer `planner.ToolResult.Bounds`
3. **Proporcionar sugerencias de refinamiento**: guiar a los usuarios/modelos sobre cómo acotar las consultas cuando los resultados están truncados

Este diseño mantiene la lógica de truncado donde reside el conocimiento del dominio (en los servicios), a la vez que ofrece un contrato uniforme para que el runtime, los planificadores y las UIs lo consuman.

#### Declarar herramientas acotadas

Utiliza el helper DSL `BoundedResult()` dentro de la definición de un `Tool`:

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("site_id", String, "Site identifier")
        Attribute("cursor", String, "Opaque pagination cursor")
        Required("site_id")
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "Matching devices")
        Required("devices")
    })
    BoundedResult(func() {
        Cursor("cursor")
        NextCursor("next_cursor")
    })
    BindTo("DeviceService", "ListDevices")
})
```

#### Generación de código

Cuando una herramienta está marcada con `BoundedResult()`:

- El spec de herramienta generado incluye `tools.ToolSpec.Bounds`
- El esquema JSON generado del resultado incluye los campos canónicos de acotado (`returned`, `total`,
  `truncated`, `refinement_hint`, y el opcional `next_cursor`)
- El tipo de resultado Go semántico sigue siendo específico del dominio; no necesita duplicar esos campos

Para herramientas `BindTo` respaldadas por métodos, el resultado del método de servicio enlazado todavía debe
llevar los campos canónicos de acotado para que el ejecutor generado pueda construir
`planner.ToolResult.Bounds` antes de la proyección en runtime.

```go
spec.Bounds = &tools.BoundsSpec{
    Paging: &tools.PagingSpec{
        CursorField:     "cursor",
        NextCursorField: "next_cursor",
    },
}
```

#### Implementar herramientas acotadas

Las herramientas acotadas son un contrato estricto: los servicios implementan el truncado y rellenan los metadatos de bounds en cada ruta de código exitosa.

**Contrato:**

- `Bounds.Returned` y `Bounds.Truncated` deben establecerse siempre en los resultados exitosos de herramientas acotadas.
- `Bounds.Total`, `Bounds.NextCursor` y `Bounds.RefinementHint` son opcionales y solo deben establecerse cuando se conozcan.

Los ejecutores implementan el truncado y rellenan los metadatos de bounds:

```go
func (e *DeviceExecutor) Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    args, err := specs.UnmarshalListDevicesPayload(call.Payload)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("invalid payload"),
        }), nil
    }

    devices, total, nextCursor, truncated, err := e.repo.QueryDevices(ctx, args.SiteID, args.Cursor)
    if err != nil {
        return nil, err
    }

    return runtime.Executed(&planner.ToolResult{
        Name: call.Name,
        Result: &ListDevicesResult{
            Devices: devices,
        },
        Bounds: &agent.Bounds{
            Returned:       len(devices),
            Total:          ptr(total),
            Truncated:      truncated,
            NextCursor:     nextCursor,
            RefinementHint: "Add a status filter or reduce the site scope to see fewer results",
        },
    }), nil
}
```

#### Comportamiento en runtime

Cuando se ejecuta una herramienta acotada:

1. El runtime valida que una herramienta acotada exitosa haya devuelto `planner.ToolResult.Bounds`
2. El runtime fusiona esos bounds en el JSON emitido usando los nombres de campo de `BoundedResult(...)`
3. Los bounds permanecen adjuntos a `planner.ToolResult.Bounds`
4. Los suscriptores de streams y los finalizadores pueden acceder a los bounds para su visualización en la UI, logging o decisiones de políticas

```go
// En un suscriptor de stream
func handleToolEnd(event *stream.ToolEndEvent) {
    if event.Bounds != nil && event.Bounds.Truncated {
        log.Printf("Tool %s returned %d of %d results (truncated)",
            event.ToolName, event.Bounds.Returned, *event.Bounds.Total)
        if event.Bounds.RefinementHint != "" {
            log.Printf("Hint: %s", event.Bounds.RefinementHint)
        }
    }
}
```

#### Cuándo usar BoundedResult

Utiliza `BoundedResult()` para herramientas que:
- Devuelven listas paginadas (dispositivos, usuarios, registros, logs)
- Consultan grandes conjuntos de datos con límites de resultados
- Aplican topes de profundidad o tamaño a estructuras anidadas (grafos, árboles)
- Devuelven datos de ventanas temporales (métricas, eventos)

El contrato acotado ayuda a que:
- Los **modelos** entiendan que los resultados pueden estar incompletos y puedan pedir un refinamiento
- Las **UIs** muestren indicadores de truncado y controles de paginación
- Las **políticas** apliquen límites de tamaño y detecten consultas descontroladas

### Campos inyectados

La función DSL `Inject` marca campos específicos de la carga como "inyectados": valores de infraestructura del lado del servidor que se ocultan al LLM pero son necesarios para el método de servicio. Esto es útil para IDs de sesión, contexto de usuario, tokens de autenticación y otros valores proporcionados en tiempo de ejecución.

#### Cómo funciona Inject

Cuando marcas un campo con `Inject`:

1. **Oculto al LLM**: el campo se excluye del esquema JSON enviado al proveedor del modelo
2. **Validado en tiempo de diseño**: la carga del método enlazado debe exponer el campo como un `String` obligatorio
3. **Rellenado por el ejecutor**: los ejecutores de servicio generados copian los valores compatibles desde `runtime.ToolCallMeta` antes de que se ejecuten los hooks de interceptor opcionales

#### Declaración DSL

```go
Tool("get_user_data", "Get data for current user", func() {
    Args(func() {
        Attribute("session_id", String, "Current session ID")
        Attribute("query", String, "Data query")
        Required("session_id", "query")
    })
    Return(func() {
        Attribute("data", ArrayOf(String), "Query results")
        Required("data")
    })
    BindTo("UserService", "GetData")
    Inject("session_id")  // Oculto al LLM, rellenado en tiempo de ejecución
})
```

#### Código generado

Los ejecutores generados respaldados por métodos copian los campos inyectados desde `runtime.ToolCallMeta`
sobre la carga tipada del método antes de invocar al cliente del servicio:

```go
p := specs.InitGetUserDataMethodPayload(toolArgs)
p.SessionID = meta.SessionID
```

Los nombres admitidos para los campos inyectados son fijos: `run_id`, `session_id`, `turn_id`,
`tool_call_id` y `parent_tool_call_id`.

#### Rellenado en runtime mediante interceptores generados

Los ejecutores de servicio generados también exponen hooks de interceptor tipados. Úsalos para
derivar campos de la carga del método a partir del contexto de la solicitud u otro estado de runtime:

```go
type SessionInterceptor struct{}

func (i *SessionInterceptor) Inject(ctx context.Context, payload any, meta *runtime.ToolCallMeta) error {
    sessionID, ok := ctx.Value(sessionKey).(string)
    if !ok {
        return fmt.Errorf("session ID not found in context")
    }

    switch p := payload.(type) {
    case *userservice.GetDataPayload:
        p.SessionID = sessionID
    }
    return nil
}

exec := usertools.NewChatUserToolsExec(
    usertools.WithClient(userClient),
    usertools.WithInterceptors(&SessionInterceptor{}),
)
```

#### Cuándo usar Inject

Usa `Inject` para campos que:
- Son necesarios para el servicio pero no deberían ser elegidos por el LLM
- Provienen del contexto de runtime (sesión, usuario, tenant, ID de solicitud)
- Contienen valores sensibles (tokens de autenticación, claves de API)
- Son aspectos de infraestructura (IDs de trazado, IDs de correlación)

---

## Modelos de ejecución

### Ejecución basada en actividades (por defecto)

Los conjuntos de herramientas respaldados por servicios se ejecutan mediante actividades de Temporal (o su equivalente en otros motores):

1. El planificador devuelve las llamadas a herramientas en `PlanResult` (la carga es `json.RawMessage`)
2. El runtime programa una `ExecuteToolActivity` por cada llamada a herramienta
3. La actividad decodifica la carga mediante el codec generado para validación/sugerencias
4. Llama al `Execute(ctx, planner.ToolRequest)` del registro del conjunto de herramientas con JSON canónico
5. Vuelve a codificar el resultado con el codec de resultado generado

### Ejecución en línea (Agent-as-Tool)

Los conjuntos de herramientas agent-as-tool se ejecutan en línea desde la perspectiva del planificador, mientras que el runtime ejecuta el agente proveedor como un run hijo real:

1. El runtime detecta `Inline=true` en el registro del conjunto de herramientas
2. Inyecta el `engine.WorkflowContext` en `ctx` para que la función `Execute` del conjunto de herramientas pueda iniciar el agente proveedor como un workflow hijo con su propio `RunID`
3. Llama al `Execute(ctx, call)` del conjunto de herramientas con una carga JSON canónica y metadatos de la herramienta (incluyendo el `RunID` y `ToolCallID` padre)
4. El ejecutor agent-tool generado construye mensajes anidados del agente (sistema + usuario) a partir de la carga de la herramienta y ejecuta al agente proveedor como un run hijo
5. El agente anidado ejecuta un bucle completo de plan/execute/resume en su propio run; su `RunOutput` y los eventos de herramienta se agregan a un `planner.ToolResult` padre que lleva la carga de resultado, telemetría agregada, `ChildrenCount` del hijo y un `RunLink` que apunta al run hijo
6. Los suscriptores de streams emiten tanto `tool_start` / `tool_end` para la llamada a herramienta padre como un evento de enlace `child_run_linked` para que las UIs puedan construir tarjetas anidadas de agentes mientras consumen un único stream de sesión

### Materializadores de resultados

Los conjuntos de herramientas pueden registrar un materializador de resultados tipado:

```go
reg := runtime.ToolsetRegistration{
    Name: "chat.ask_question",
    Execute: runtime.ToolCallExecutorFunc(func(
        ctx context.Context,
        meta *runtime.ToolCallMeta,
        call *planner.ToolRequest,
    ) (*runtime.ToolExecutionResult, error) {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("externally provided"),
        }), nil
    }),
    Specs: []tools.ToolSpec{specs.SpecAskQuestion},
    ResultMaterializer: func(ctx context.Context, meta runtime.ToolCallMeta, call *planner.ToolRequest, result *planner.ToolResult) error {
        // Adjunta aquí sidecars deterministas solo del servidor.
        result.ServerData = buildServerData(call, result)
        return nil
    },
}
```

Contrato:

- `ResultMaterializer` se ejecuta tanto en la **ruta de ejecución normal** como en la **ruta de espera con resultado proporcionado externamente**.
- Recibe el `planner.ToolRequest` tipado original junto con el `planner.ToolResult` tipado, antes de que el runtime codifique JSON para hooks, límites del workflow o llamadores.
- Úsalo para adjuntar `result.ServerData` o para normalizar la forma semántica del resultado de manera determinista.
- Mantenlo puro y determinista; cuando se ejecuta dentro de código de workflow no debe realizar E/S.

Este es el lugar canónico para derivar sidecars solo para observadores a partir de la carga original de la herramienta y el resultado tipado, manteniendo esos sidecars invisibles para los proveedores de modelos.

---

## Modelo centrado en el ejecutor

Los conjuntos de herramientas de servicio generados exponen helpers de registro que aceptan
implementaciones de `runtime.ToolCallExecutor` para los conjuntos de herramientas que usa un agente.

```go
if err := chat.RegisterUsedToolsets(ctx, rt,
    chat.WithSearchExecutor(searchExec),
    chat.WithProfilesExecutor(profileExec),
); err != nil {
    return err
}
```

Las aplicaciones registran una implementación de ejecutor para cada conjunto de herramientas
local consumido. El ejecutor decide cómo ejecutar la herramienta (cliente de servicio, función
personalizada, llamador del registro, etc.) y recibe metadatos explícitos por llamada mediante
`ToolCallMeta`.

**Ejemplo de ejecutor:**

```go
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    switch call.Name {
    case "orchestrator.profiles.upsert":
        args, err := profilesspecs.UnmarshalUpsertPayload(call.Payload)
        if err != nil {
            return runtime.Executed(&planner.ToolResult{
                Name: call.Name,
                Error: planner.NewToolError("invalid payload"),
            }), nil
        }
        
        // Transforms opcionales si codegen los emite
        mp, _ := profilesspecs.ToMethodPayload_Upsert(args)
        methodRes, err := client.Upsert(ctx, mp)
        if err != nil {
            return runtime.Executed(&planner.ToolResult{
                Name:  call.Name,
                Error: planner.ToolErrorFromError(err),
            }), nil
        }
        tr, _ := profilesspecs.ToToolReturn_Upsert(methodRes)
        return runtime.Executed(&planner.ToolResult{
            Name:   call.Name,
            Result: tr,
        }), nil
        
    default:
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("unknown tool"),
        }), nil
    }
}
```

---

## Metadatos de llamada a herramienta

Los ejecutores de herramientas reciben metadatos explícitos por llamada mediante `ToolCallMeta`, en lugar de extraer valores del `context.Context`. Esto proporciona acceso directo a los identificadores con alcance de run para la correlación, la telemetría y las relaciones padre/hijo.

### Campos de ToolCallMeta

| Campo | Descripción |
|-------|-------------|
| `RunID` | Identificador duradero de ejecución del workflow del run al que pertenece esta llamada a herramienta. Estable entre reintentos; se usa para correlacionar registros de runtime y telemetría. |
| `SessionID` | Agrupa lógicamente los runs relacionados (p. ej., una conversación de chat). Los servicios suelen indexar memoria y atributos de búsqueda por sesión. |
| `TurnID` | Identifica el turno conversacional que produjo esta llamada a herramienta. Los flujos de eventos lo usan para ordenar y agrupar eventos. |
| `ToolCallID` | Identifica de forma única esta invocación de herramienta. Se usa para correlacionar eventos start/update/end y relaciones padre/hijo. |
| `ParentToolCallID` | Identificador de la llamada a herramienta padre cuando esta invocación es hija (p. ej., una herramienta lanzada por un agent-tool). Las UIs y los suscriptores lo usan para reconstruir el árbol de llamadas. |

### Firma del ejecutor

Todos los ejecutores de herramientas reciben `ToolCallMeta` como un parámetro explícito:

```go
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    // Accede al contexto del run directamente desde meta
    log.Printf("Executing tool in run %s, session %s, turn %s",
        meta.RunID, meta.SessionID, meta.TurnID)

    // Usa ToolCallID para la correlación
    span := tracer.StartSpan("tool.execute", trace.WithAttributes(
        attribute.String("tool.call_id", meta.ToolCallID),
        attribute.String("tool.parent_call_id", meta.ParentToolCallID),
    ))
    defer span.End()
    
    typedResult := buildTypedResult()
    return runtime.Executed(&planner.ToolResult{Name: call.Name, Result: typedResult}), nil
}
```

### ¿Por qué metadatos explícitos?

El patrón de metadatos explícitos ofrece varios beneficios:

- **Seguridad de tipos**: garantías en tiempo de compilación de que los identificadores necesarios están disponibles
- **Facilidad de pruebas**: es sencillo construir metadatos de prueba sin tener que simular el contexto
- **Claridad**: sin dependencias ocultas de claves de contexto ni del orden del middleware
- **Correlación**: acceso directo a las relaciones padre/hijo para llamadas anidadas de agent-tool
- **Trazabilidad**: cadena causal completa desde la entrada del usuario hasta la ejecución de la herramienta y la respuesta final

---

## Ejecución asíncrona y duradera
 
Goa-AI utiliza **Temporal Activities** para todas las ejecuciones de herramientas respaldadas por servicios. Esta arquitectura "async-first" es implícita y no requiere ningún DSL especial.
 
### Async implícito
 
Cuando un planificador decide llamar a una herramienta, el runtime no bloquea el hilo del SO. En su lugar:
 
1. El runtime programa una **Actividad de Temporal** para la llamada a herramienta.
2. El workflow del agente suspende la ejecución (guardando el estado).
3. La actividad se ejecuta (en un worker local, un worker remoto o incluso en un clúster distinto).
4. Cuando la actividad termina, el workflow se despierta, restaura el estado y continúa con el resultado.
 
Esto significa que **cada llamada a herramienta** es automáticamente paralelizable, duradera y de ejecución prolongada. **No** necesitas configurar `InterruptsAllowed` para este comportamiento asíncrono estándar.
 
### Pausa y reanudación (nivel de agente)
 
`InterruptsAllowed(true)` es distinto: permite que el **propio agente** se detenga y espere una señal externa arbitraria (como una aclaración del usuario) que *no* esté asociada a una actividad de herramienta en curso.
 
| Característica | Async implícito | Pausa y reanudación |
| :--- | :--- | :--- |
| **Alcance** | Ejecución de una única herramienta | Todo el workflow del agente |
| **Disparador** | Llamar a cualquier herramienta respaldada por servicio | Argumentos que faltan o solicitud del planificador |
| **Política requerida** | Ninguna (por defecto) | `InterruptsAllowed(true)` |
| **Caso de uso** | API lenta, trabajo por lotes, procesamiento | Human-in-the-loop, aclaración |
 
Verifica que tu caso de uso realmente requiera una pausa *a nivel de agente* antes de activar la política; a menudo, el async estándar de herramientas es suficiente.
 
### Planificadores no bloqueantes
 
Desde la perspectiva del **planificador (LLM)**, la interacción parece síncrona: el modelo solicita una herramienta, "se pausa", y después "ve" el resultado en el siguiente turno.
 
Desde la perspectiva de la **infraestructura**, es totalmente asíncrona y no bloqueante. Esto permite que un único worker de agente pequeño gestione miles de ejecuciones concurrentes y de larga duración sin quedarse sin hilos ni memoria.
 
### Supervivencia ante reinicios
 
Dado que la ejecución es duradera, puedes reiniciar todo tu backend, incluidos los workers de agente, mientras las herramientas están en plena ejecución. Cuando los sistemas vuelven a estar activos:
 
- Las actividades de herramientas pendientes serán recogidas por los workers.
- Las herramientas completadas reportarán resultados a sus workflows padre.
- Los agentes retomarán exactamente donde se quedaron.
 
Esta capacidad es esencial para construir sistemas agentivos robustos de nivel de producción que operen de manera fiable en entornos dinámicos.

---

## Transforms

Cuando una herramienta está enlazada a un método Goa mediante `BindTo`, la generación de código analiza los Arg/Return de la herramienta y el Payload/Result del método. Si las formas son compatibles, Goa emite helpers de transform con tipado seguro:

- `ToMethodPayload_<Tool>(in <ToolArgs>) (<MethodPayload>, error)`
- `ToToolReturn_<Tool>(in <MethodResult>) (<ToolReturn>, error)`

Los transforms se emiten en el paquete propietario del conjunto de herramientas (por ejemplo, `gen/<service>/toolsets/<toolset>/transforms.go`) y utilizan GoTransform de Goa para mapear campos de forma segura. Si no se emite un transform, escribe un mapeador explícito en el ejecutor.

---

## Identidad de herramienta

Cada conjunto de herramientas define identificadores de herramienta tipados (`tools.Ident`) para todas las herramientas generadas, incluidos los conjuntos no exportados. Prefiere estas constantes frente a cadenas ad hoc:

```go
import searchspecs "example.com/assistant/gen/orchestrator/toolsets/search"

// Usa una constante generada en lugar de cadenas/casts ad hoc
spec, _ := rt.ToolSpec(searchspecs.Search)
schemas, _ := rt.ToolSchema(searchspecs.Search)
```

Para los conjuntos de herramientas exportados (agent-as-tool), Goa-AI genera paquetes de exportación en `gen/<service>/agents/<agent>/exports/<export>` con:
- IDs de herramienta tipados
- Tipos alias de payload/result
- Codecs
- Constructores helper (p. ej., `New<Search>Call`)

---

## Validación de herramientas y sugerencias de reintento

Goa-AI combina las **validaciones en tiempo de diseño de Goa** con un **modelo de error de herramienta estructurado** para dar a los planificadores LLM una forma potente de **reparar automáticamente llamadas a herramientas inválidas**.

### Tipos principales: ToolError y RetryHint

**ToolError** (alias de `runtime/agent/toolerrors.ToolError`):
- `Message string` – resumen legible por humanos
- `Cause *ToolError` – causa anidada opcional (preserva las cadenas a través de reintentos y saltos agent-as-tool)
- Constructores: `planner.NewToolError(msg)`, `planner.NewToolErrorWithCause(msg, cause)`, `planner.ToolErrorFromError(err)`, `planner.ToolErrorf(format, args...)`

**RetryHint** – sugerencia del lado del planificador utilizada por el runtime y el motor de políticas:

```go
type RetryHint struct {
    Reason             RetryReason
    Tool               tools.Ident
    RestrictToTool     bool
    MissingFields      []string
    ExampleInput       map[string]any
    PriorInput         map[string]any
    ClarifyingQuestion string
    Message            string
}
```

Valores habituales de `RetryReason`:
- `invalid_arguments` – la carga no superó la validación (esquema/tipo)
- `missing_fields` – faltan campos obligatorios
- `malformed_response` – la herramienta devolvió datos que no se pudieron decodificar
- `timeout`, `rate_limited`, `tool_unavailable` – problemas de ejecución/infraestructura

**ToolResult** transporta errores y sugerencias:

```go
type ToolResult struct {
    Name          tools.Ident
    Result        any
    Error         *ToolError
    RetryHint     *RetryHint
    Telemetry     *telemetry.ToolTelemetry
    ToolCallID    string
    ChildrenCount int
    RunLink       *run.Handle
}
```

### Reparación automática de llamadas a herramientas inválidas

El patrón recomendado:

1. **Diseña herramientas con esquemas de carga robustos** (diseño Goa)
2. **Permite que los ejecutores/herramientas expongan los fallos de validación** como `ToolError` + `RetryHint` en lugar de entrar en pánico u ocultar errores
3. **Enseña a tu planificador** a inspeccionar `ToolResult.Error` y `ToolResult.RetryHint`, reparar la carga cuando sea posible y reintentar la llamada a herramienta si es apropiado

**Ejemplo de ejecutor:**

```go
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    args, err := spec.UnmarshalUpsertPayload(call.Payload)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name: call.Name,
            Error: planner.NewToolError("invalid payload"),
            RetryHint: &planner.RetryHint{
                Reason:        planner.RetryReasonInvalidArguments,
                Tool:          call.Name,
                RestrictToTool: true,
                Message:       "Payload did not match the expected schema.",
            },
        }), nil
    }

    res, err := client.Upsert(ctx, args)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.ToolErrorFromError(err),
        }), nil
    }

    return runtime.Executed(&planner.ToolResult{Name: call.Name, Result: res}), nil
}
```

**Ejemplo de lógica del planificador:**

```go
func (p *MyPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    if len(in.ToolOutputs) == 0 {
        return &planner.PlanResult{}, nil
    }

    last := in.ToolOutputs[len(in.ToolOutputs)-1]
    if last.Error != nil && last.RetryHint != nil {
        hint := last.RetryHint

        switch hint.Reason {
        case planner.RetryReasonMissingFields, planner.RetryReasonInvalidArguments:
            return &planner.PlanResult{
                Await: &planner.Await{
                    Clarification: &planner.AwaitClarification{
                        ID:               "fix-" + string(hint.Tool),
                        Question:         hint.ClarifyingQuestion,
                        MissingFields:    hint.MissingFields,
                        RestrictToTool:   hint.Tool,
                        ExampleInput:     hint.ExampleInput,
                        ClarifyingPrompt: hint.Message,
                    },
                },
            }, nil
        }
    }

    return &planner.PlanResult{/* FinalResponse, next ToolCalls, ... */}, nil
}
```

---

## Catálogos y esquemas de herramientas

Los agentes Goa-AI generan un **catálogo único y autoritativo de herramientas** a partir de tus diseños Goa. Este catálogo impulsa:
- La publicación de herramientas al planificador (qué herramientas puede llamar el modelo)
- El descubrimiento en la UI (listas de herramientas, categorías, esquemas)
- Orquestadores externos (MCP, frontends personalizados) que necesitan specs legibles por máquina

### Specs generados y tool_schemas.json

Para cada agente, Goa-AI emite un **paquete de specs** y un **catálogo JSON**:

**Paquetes de specs (`gen/<service>/agents/<agent>/specs/...`):**
- `types.go` – structs Go de payload/result
- `codecs.go` – codecs JSON (codifican/decodifican payloads/results tipados)
- `specs.go` – entradas `[]tools.ToolSpec` con el ID canónico de la herramienta, esquemas de payload/result y sugerencias

**Catálogo JSON (`tool_schemas.json`):**

Ubicación: `gen/<service>/agents/<agent>/specs/tool_schemas.json`

Contiene una entrada por herramienta con:
- `id` – ID canónico de la herramienta (`"<service>.<toolset>.<tool>"`)
- `service`, `toolset`, `title`, `description`, `tags`
- `payload.schema` y `result.schema` (JSON Schema)

Este fichero JSON es ideal para alimentar los esquemas a proveedores LLM, construir formularios/editores de UI y herramientas de documentación sin conexión.

### APIs de introspección en runtime

En runtime, no necesitas leer `tool_schemas.json` desde disco. El runtime expone una API de introspección:

```go
agents   := rt.ListAgents()     // []agent.Ident
toolsets := rt.ListToolsets()   // []string

spec,   ok := rt.ToolSpec(toolID)              // single ToolSpec
schemas, ok := rt.ToolSchema(toolID)           // payload/result schemas
specs   := rt.ToolSpecsForAgent(chat.AgentID)  // []ToolSpec for one agent
```

Donde `toolID` es una constante `tools.Ident` tipada proveniente de un paquete generado de specs o agenttools.

### Server Data

Algunas herramientas necesitan devolver una salida rica orientada a observadores —series temporales completas,
grafos de topología, grandes conjuntos de resultados, referencias de evidencia— que es útil para las UIs
y los sistemas de auditoría, pero demasiado pesada para los proveedores de modelos. Goa-AI modela esa
salida no orientada al modelo como **server-data**.

#### Resultado para el modelo vs server-data

La distinción clave es qué datos fluyen a dónde:

| Tipo de dato | Se envía al modelo | Se almacena/emite por streaming | Propósito |
|-----------|---------------|-----------------|---------|
| **Resultado orientado al modelo** | ✓ | ✓ | Resumen acotado sobre el que razona el LLM |
| **Server-data de timeline** | ✗ | ✓ | Datos orientados a observadores para UIs, timelines, gráficos, mapas y tablas |
| **Server-data de evidencia** | ✗ | ✓ | Referencias de procedencia o evidencia de auditoría |
| **Server-data interno** | ✗ | Depende del consumidor | Adjuntos de composición de herramientas o metadatos solo de servidor |

Esta separación te permite:
- Mantener acotadas y enfocadas las ventanas de contexto del modelo
- Ofrecer visualizaciones ricas (gráficos, grafos, tablas) sin inflar los prompts del LLM
- Adjuntar datos de procedencia y auditoría que los modelos no necesitan ver
- Emitir por streaming grandes conjuntos de datos a las UIs mientras el modelo trabaja con resúmenes

#### Declarar ServerData en el DSL

Usa la función `ServerData(kind, schema)` dentro de la definición de un `Tool`:

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Attribute("start_time", String, "Start timestamp (RFC3339)")
        Attribute("end_time", String, "End timestamp (RFC3339)")
        Required("device_id", "start_time", "end_time")
    })
    // Model-facing result: bounded summary
    Return(func() {
        Attribute("summary", String, "Summary for the model")
        Attribute("count", Int, "Number of data points")
        Attribute("min_value", Float64, "Minimum value in range")
        Attribute("max_value", Float64, "Maximum value in range")
        Required("summary", "count")
    })
    // Server-data: full-fidelity data for observers (e.g., UIs)
    ServerData("atlas.time_series", func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
        Attribute("metadata", MapOf(String, String), "Additional metadata")
        Required("data_points")
    }, func() {
        AudienceTimeline()
    })
})
```

El parámetro `kind` (p. ej., `"atlas.time_series"`) identifica el tipo de server-data para que las UIs puedan despachar los renderizadores apropiados.
La audiencia declara la intención de enrutamiento:

- `AudienceTimeline()` para payloads orientados a observadores en timeline/UI.
- `AudienceEvidence()` para procedencia o evidencia de auditoría.
- `AudienceInternal()` para payloads de composición solo de servidor.

Utiliza `FromMethodResultField("field_name")` junto con herramientas `BindTo(...)` cuando el
payload de server-data se proyecte a partir de un campo del resultado del método de servicio enlazado.

#### Specs y helpers generados

En los paquetes de specs, cada entrada `tools.ToolSpec` incluye:
- `Payload tools.TypeSpec` – esquema de entrada de la herramienta
- `Result tools.TypeSpec` – esquema de salida orientada al modelo
- `ServerData []*tools.ServerDataSpec` – payloads solo de servidor emitidos junto con el resultado

Las entradas de server-data incluyen esquemas y codecs generados para que los suscriptores puedan
decodificar los bytes JSON canónicos sin enviar esos bytes a los proveedores de modelos.

#### Patrones de uso en runtime

**En los ejecutores de herramientas**, adjunta el JSON canónico de server-data al resultado de la herramienta:

```go
func (e *Executor) Execute(
    ctx context.Context,
    meta *runtime.ToolCallMeta,
    call *planner.ToolRequest,
) (*runtime.ToolExecutionResult, error) {
    args, _ := specs.UnmarshalGetTimeSeriesPayload(call.Payload)

    // Obtiene todos los datos
    fullData, err := e.dataService.GetTimeSeries(ctx, args.DeviceID, args.StartTime, args.EndTime)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.ToolErrorFromError(err),
        }), nil
    }

    // Construye el resultado acotado orientado al modelo
    result := &specs.GetTimeSeriesResult{
        Summary:  fmt.Sprintf("Retrieved %d data points from %s to %s", len(fullData.Points), args.StartTime, args.EndTime),
        Count:    len(fullData.Points),
        MinValue: fullData.Min,
        MaxValue: fullData.Max,
    }

    // Construye server-data de fidelidad completa para las UIs
    // Los codecs de server-data generados se nombran a partir de la herramienta y el kind, por ejemplo:
    // specs.GetTimeSeriesAtlasTimeSeriesServerDataCodec.ToJSON(...)
    serverData, err := buildCanonicalServerData("atlas.time_series", fullData)
    if err != nil {
        return nil, err
    }

    return runtime.Executed(&planner.ToolResult{
        Name:   call.Name,
        Result: result,
        ServerData: serverData,
    }), nil
}
```

Las herramientas respaldadas por métodos también pueden adjuntar server-data a través de providers generados y
materializadores de resultados. Un materializador es determinista y se ejecuta tanto en la ejecución normal
como en las rutas de espera con resultado proporcionado externamente:

```go
reg := runtime.ToolsetRegistration{
    Name:  "orchestrator.metrics",
    Specs: []tools.ToolSpec{specs.SpecGetTimeSeries},
    ResultMaterializer: func(ctx context.Context, meta runtime.ToolCallMeta, call *planner.ToolRequest, result *planner.ToolResult) error {
        if len(result.ServerData) != 0 {
            return nil
        }
        result.ServerData = buildServerData(call, result)
        return nil
    },
}
```

**En suscriptores de stream o handlers de UI**, lee `ServerData` de los eventos de fin de herramienta
o de los logs del run y decodifícalo con los codecs generados para los kinds declarados:

```go
func handleToolEnd(event stream.ToolEnd) {
    if len(event.Data.ServerData) == 0 {
        return
    }
    data, err := decodeTimeSeriesServerData(event.Data.ServerData)
    if err != nil {
        log.Printf("invalid server-data: %v", err)
        return
    }
    renderTimeSeriesChart(data.DataPoints)
}
```

#### Cuándo usar ServerData

Utiliza server-data cuando:
- Los resultados de la herramienta incluyan datos demasiado grandes para el contexto del modelo (series temporales, logs, tablas grandes)
- Las UIs necesiten datos estructurados para visualización (gráficos, grafos, mapas)
- Quieras separar aquello sobre lo que razona el modelo de lo que ven los usuarios
- Los sistemas posteriores necesiten datos de fidelidad completa mientras el modelo trabaja con resúmenes

Evita server-data cuando:
- El resultado completo cabe cómodamente en el contexto del modelo
- No haya ninguna UI ni consumidor posterior que necesite los datos completos
- El resultado acotado ya contenga todo lo necesario

---

## Buenas prácticas

- **Pon las validaciones en el diseño, no en los planificadores** – Usa el DSL de atributos de Goa (`Required`, `MinLength`, `Enum`, etc.)
- **Devuelve ToolError + RetryHint desde los ejecutores** – Prefiere errores estructurados en lugar de panics o retornos `error` simples
- **Mantén las sugerencias concisas pero accionables** – Céntrate en qué campos faltan/son inválidos, una breve pregunta aclaratoria y un pequeño mapa `ExampleInput`
- **Enseña a los planificadores a leer las sugerencias** – Haz del manejo de `RetryHint` una parte de primera clase de tu planificador
- **Evita la revalidación dentro de los servicios** – Goa-AI asume que la validación ocurre en el límite de la herramienta

---

## Próximos pasos

- **[Composición de agentes](./agent-composition.md)** - Construye sistemas complejos con patrones agent-as-tool
- **[Integración MCP](./mcp-integration.md)** - Conecta con servidores de herramientas externos
- **[Runtime](./runtime.md)** - Comprende el flujo de ejecución de herramientas
