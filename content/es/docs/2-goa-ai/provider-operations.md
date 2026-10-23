---
nav_group: guides
title: "Operaciones a cargo del proveedor"
weight: 35
description: "Invoca operaciones de agentes y herramientas registradas sin importar su implementación."
llm_optimized: true
---

Invoca operaciones de agentes y herramientas registradas sin importar su implementación.

## Iniciar una operación

El host autoriza al llamador y envía la declaración generada y los argumentos
originales. `StartOperation` usa una sesión existente del host; `StartOneShotOperation`
no crea una sesión. El worker del proveedor valida su exportación y prepara la
configuración inmutable seleccionada. El consumidor no necesita la definición privada
del agente ni `WithAgentExecutors`.

```go
handle, err := rt.StartOneShotOperation(
    ctx, runID, operation, arguments, labels, nil,
)
if err != nil {
    return err
}
output, err := handle.Wait(ctx)
if err != nil {
    return err
}
```

Usa `StartToolOperation` o `StartOneShotToolOperation` con la selección exacta
conservada del Registry y su `RegisteredInvocation`. Configura la misma fuente Registry
y el cliente generado. Los agentes nativos usan el workflow y la cola declarados. Los
servicios usan `WithToolWorkflowQueue` y un worker que llama a `RegisterToolWorkflow`;
no necesitan agente, planificador, modelo ni conversación. Un registro o una etiqueta no
concede acceso.

Para iniciar y esperar una operación de forma idempotente tras la interrupción
del proceso de inicio, usa `EnsureOperationCompletion`,
`EnsureOneShotOperationCompletion`, `EnsureToolOperationCompletion` o
`EnsureOneShotToolOperationCompletion`. Pasa `runtime.WithTextOnly(true)` cuando
la operación deba devolver texto directo del asistente sin llamar a herramientas.

Usa `runtime.WithRootExecutionTarget(target)` cuando el trabajo inicial deba nombrar
una versión exacta de worker. El motor concreto `temporal.Engine` posee el método
de consulta `temporalEngine.CurrentWorkflowTarget(ctx, queue)`. Los nuevos workflows
de respuesta y de limpieza ordinaria omiten el destino explícito: Temporal elige
la versión actual al despacharlos y el comportamiento de versiones configurado del
worker controla la ejecución posterior. La recuperación conserva los ajustes
publicados exactos, incluidos los destinos explícitos anteriores.

Cuando un worker de proveedor necesita prestar servicio a un contrato de operación
a través de cambios de revisión compatibles, registre el contrato propiedad de la revisión con
`rt.RegisterAgentOperationProvider` antes de sellar el runtime.

## Seleccionar el historial explícitamente

Registra `AgentToolResolver` en el worker del proveedor antes de sellar el runtime o
enviar trabajo. Su firma es `func(context.Context, genregistry.ExecutionInvocation,
string, *runtime.ToolCall) (*runtime.AgentToolConfiguration, error)`. Recibe la
invocación original, la referencia inmutable y la llamada validada. Devuelve `History`
obligatorio, etiquetas, política y, opcionalmente, metadatos y referencias de prompts.

```go
configuration := &runtime.AgentToolConfiguration{
    History: runtime.LiteralAgentHistory(messages),
    Labels: labels,
    Policy: policy,
}
```

Para otro turno, usa `runtime.NextTurnAgentHistory(completedRunID, systemMessages,
freshMessages)`. La fuente debe ser una ejecución completada correctamente del mismo
agente y sesión. Los mensajes nuevos no pueden contener mensajes de sistema.
`WithoutPriorReasoning()` excluye razonamiento del historial recibido y heredado; la
exclusión persiste en turnos posteriores. Las operaciones sin sesión no heredan otra
sesión. La repetición exacta reutiliza la preparación aceptada.

## Resultados, entrada y cancelación

El motor se hace cargo del trabajo aceptado antes de la preparación. Repetir la
solicitud exacta observa la ejecución original; modificarla provoca un conflicto. Un
fallo o una cancelación anterior al primer registro del runtime conserva un resultado
terminal en el motor. Observa el trabajo aceptado antes de concluir que la ausencia de
un registro significa que no comenzó.

Las entradas, salidas, registros e instantáneas comunes requieren `Subject` generado: el
identificador real del agente, o la fuente Registry y el nombre cualificado de la
herramienta de servicio. Un servicio no tiene un agente ficticio ni una sesión oculta.
Los clientes de agentes y su historial siguen requiriendo identidad de agente.

`planner.PlanInput.ParentTool` y `planner.PlanResumeInput.ParentTool` contienen el
contrato de resultado seleccionado para delegación y operaciones directas. El
planificador devuelve `planner.FinalToolResult` conforme al contrato; solo texto de
conversación se rechaza. Usa `FinalToolResult` para el resultado tipado y `Final` para
texto. Lee eventos paginados solo para consultar el historial de diagnóstico.

Cuando se requiere una entrada, la continuación restaura la operación original, conserva los
metadatos del llamador aceptados (`Metadata`) y admite un sucesor. En las herramientas de servicio,
el host guarda de forma duradera el predecesor, el ID de la ejecución sucesora y la respuesta tipada;
su worker llama a `StartToolContinuation` y `EnsureToolContinuationCompletion` (pasando cualquier memo
de workflow `memo map[string]any` como argumento final). La cancelación del padre sigue las
relaciones hijas aceptadas y conserva la limpieza no finalizada. La finalización no debe depender del
reintento del cliente.

Los workflows que observan la cancelación usan `AutoUpgrade` para ejecuciones
activas y suspendidas. Observan la limpieza mientras el trabajo de dominio
conserva su ejecución asignada. La recuperación mantiene el destino explícito y
la huella de la solicitud de un observador ya aceptado.

## Contratos de entrada generados

Dentro de `Use` de un toolset compilado, `BindInput("read", "scope")` elimina un campo
obligatorio de nivel superior de la entrada visible al modelo de ese consumidor. Instala
el helper tipado generado en cada actividad de planificación para aportar el valor de la
aplicación. El proveedor recibe la entrada original completa. Se rechazan campos
opcionales, inyectados, desconocidos, repetidos o rutas anidadas; un contrato remoto
Registry requiere una declaración compilada.

Los codecs admiten `Any` o `Bytes` representados explícitamente como `json.RawMessage`,
conservando JSON y números exactos. Un mapa declarado con `Meta("struct:tag:json",
",embed")` acepta miembros adicionales según el contrato de sus valores. Se rechazan
claves duplicadas, colisiones y valores inválidos. Los objetos normales siguen cerrados
y los bytes normales usan base64.

## Actualización y reversión {#upgrade}

Es una actualización coordinada de código, formatos de intercambio y datos guardados.
Regenera y recompila proveedores y consumidores; sustituye `Messages` del resolver por
`History` obligatorio y registra el resolver en el proveedor. El historial vacío
explícito es `runtime.LiteralAgentHistory(nil)`; se rechaza un `AgentHistory` sin
seleccionar. Los destinos nativos requieren `Executor`, `Configuration`, `Workflow` y
`Queue`. `SeedDeclaration` ya no duplica `Origin`; `RunSeed.Origin` se toma directamente
del parámetro de `BeginRunPreparationOperation`. Valida cada grupo de declaraciones
retenido, incluidas las entradas retiradas, antes de la activación.

Las suspensiones actuales usan `goa-ai.run-suspension.v14` y los resultados superiores
`json/goa-ai-run-output-v3`. Se rechazan formatos anteriores. Actualiza Stores,
adaptadores del motor, registros, consumidores y transportes para `Subject` obligatorio.
Inventaría inicios, preparaciones, selecciones, checkpoints, historiales padres con
resultados hijos, exportaciones y copias de resultados. Termina el trabajo con sus
workers anteriores o realiza una conversión del propietario verificada mediante replay.
No compartas una cola entre preparaciones antiguas y nuevas mientras quede trabajo
antiguo.

Coordina lectores y escritores desplegados por separado. La reversión requiere datos,
declaraciones, solicitudes y workers compatibles; revertir solo el binario tras nuevas
escrituras no es seguro. El framework no infiere ejecutores ni ofrece un modo de
compatibilidad permanente.

Contratos detallados del framework:

- [Run subjects](https://github.com/goadesign/goa-ai/blob/main/docs/run-subjects.md)
- [Workflow results](https://github.com/goadesign/goa-ai/blob/main/docs/workflow-results.md)
- [Native declarations](https://github.com/goadesign/goa-ai/blob/main/docs/native-agent-declarations.md)
- [JSON codecs](https://github.com/goadesign/goa-ai/blob/main/docs/json_codecs.md)
