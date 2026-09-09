---
title: Evaluaciones generadas
weight: 10
description: "Define escenarios de evaluación en el diseño Goa, genera hooks tipados y produce informes fiables."
llm_optimized: true
---

Las evaluaciones de Goa-AI permiten definir escenarios estables en el diseño e
implementar el trabajo específico del producto en Go normal. Goa-AI se encarga
de generar el código, seleccionar escenarios, limitar la concurrencia, evaluar
el significado de las respuestas y crear el informe. La aplicación se encarga
del sistema que llama, del destino, de los hechos exactos que comprueba y de
los artefactos de diagnóstico que guarda.

## Definir escenarios

Añade el DSL de evaluaciones a un paquete de diseño de una aplicación que ya
utilice el DSL de Goa v3:

```go
package design

import . "goa.design/goa-ai/eval/dsl"

var _ = Suite("chat", func() {
    Description("Ejercita resultados completos de Chat.")
    Timeout("2m")

    Scenario("alarm_inventory", func() {
        Description("Recupera todo el historial de alarmas.")
        Input("Lista todas las alarmas de la ventana solicitada.")
        Tags("production", "alarm")
        Timeout("3m")
    })
})
```

La aplicación también debe contener su diseño de servicio Goa habitual. La
CLI de Goa usa ese diseño para identificar la versión de Goa antes de cargar
DSL adicionales.

Los IDs de suites, escenarios y etiquetas usan `lower_snake_case`. Las
descripciones, las entradas y un timeout positivo de suite son obligatorios.
El timeout de un escenario reemplaza el de la suite para ese escenario.

`goa gen` genera `gen/evals/<suite>/suite.go`:

```go
type Hooks interface {
    AlarmInventory(context.Context, string) (eval.Result, error)
}

func New(hooks Hooks) eval.Suite
```

Cada escenario tiene un método. Por ello, añadir un escenario obliga a la
aplicación ejecutora a implementarlo y el compilador verifica esa obligación.
El código generado contiene nombres, entradas, etiquetas y timeouts finales;
no usa reflexión ni registros en runtime.

## Implementar comprobaciones y afirmaciones

Un hook ejecuta el escenario y devuelve un `eval.Result`. Una comprobación
(`Check`) compara evidencia tipada con un hecho que la aplicación conoce con
exactitud. Una afirmación (`Claim`) expresa un significado que debe estar
respaldado por la respuesta del modelo.

Usa comprobaciones para nombres de herramientas, IDs, cantidades, estados y
otros valores exactos. Usa afirmaciones solo cuando sea necesario leer e
interpretar la respuesta. Devuelve los fallos de infraestructura o protocolo
como errores. Toda comprobación fallida debe incluir un diagnóstico.

El runner rechaza resultados sin comprobaciones ni afirmaciones, IDs repetidos,
artefactos inválidos y respuestas incompletas del juez semántico. Si `Output`
está vacío, asigna `not_addressed` a cada afirmación sin llamar al juez.

## Crear y ejecutar un runner

La concurrencia es explícita y limitada:

```go
grader, err := judge.New(modelClient, maxOutputTokens)
if err != nil {
    return err
}
runner, err := eval.NewRunner(
    grader,
    eval.RunnerConfig{MaxConcurrency: 5},
)
if err != nil {
    return err
}
suite := genevals.New(hooks)
report, err := runner.Run(ctx, suite)
```

`MaxConcurrency` es obligatorio y positivo. Como máximo se ejecuta ese número
de escenarios a la vez. El fallo de un escenario no detiene los demás. El
informe conserva siempre el orden de declaración de la suite. Por tanto, los
hooks y el juez semántico deben admitir llamadas simultáneas hasta ese límite.

Si todos los hooks devuelven solo comprobaciones deterministas y ninguna
afirmación semántica, pasa un juez nil:

```go
runner, err := eval.NewRunner(nil, eval.RunnerConfig{MaxConcurrency: 2})
```

## Seleccionar escenarios

El runner valida la selección antes de llamar al producto o al modelo:

```go
report, err := runner.Run(ctx, suite)
report, err := runner.RunScenarios(ctx, suite, "alarm_inventory", "solar_analysis")
report, err := runner.RunTags(ctx, suite, "smoke", "alarm")
```

`RunScenarios` ejecuta IDs exactos. `RunTags` ejecuta cada escenario que tenga
al menos una etiqueta solicitada. Ambos rechazan selecciones vacías, valores
vacíos, duplicados e IDs o etiquetas desconocidos.

## Evaluación semántica

La aplicación debe pasar un `maxOutputTokens` positivo a `judge.New` y manejar
el error devuelto. Lee el valor de la configuración de la aplicación antes de
ejecutar la suite. Cero y los valores negativos hacen fallar la construcción
sin llamar al modelo; no hay un valor predeterminado.

El valor es un límite inclusivo de tokens de salida para **una respuesta
completa del modelo**, incluidos todos los juicios y su estructura JSON. No es
una asignación por afirmación ni un presupuesto total por escenario o suite.
Goa-AI envía el mismo valor en la petición inicial y en cada petición de
corrección permitida, independientemente del número de afirmaciones. Elige un
valor compatible con el proveedor y el modelo configurados; los valores no
compatibles siguen siendo errores, sin reducir silenciosamente el límite. Un
límite finito no garantiza que la respuesta pueda completarse.

### Referencia compartida y migración del juez

Pon el contexto factual compartido por varias afirmaciones en la cadena opcional
`Result.Reference`, en lugar de repetirlo en cada afirmación. Mantén `Output`
como la respuesta que se evalúa:

```go
result := eval.Result{
    Output:    answer,
    Reference: "Supported export formats: CSV and JSON.",
    Claims: []eval.Claim{{
        ID:   "export_formats",
        Text: "The answer lists the supported export formats.",
    }},
}
```

El runner pasa la referencia por separado, sin modificar la respuesta. El juez
basado en un modelo la incluye una vez en cada petición, incluidas las peticiones
de corrección existentes. Los hechos de la referencia ayudan a comprobar la
exactitud de la respuesta; nunca aportan contenido que falte en ella. En este
ejemplo, enumerar los formatos solo en la referencia no satisface la afirmación.
Un `Output` vacío sigue dando `not_addressed` a todas las afirmaciones sin llamar
al juez, aunque la referencia contenga la respuesta.

Los jueces personalizados implementan la nueva interfaz de cuatro argumentos:

```go
Judge(ctx context.Context, output string, claims []eval.Claim, reference string) ([]eval.Judgment, error)
```

Actualiza las llamadas directas a `grader.Judge(ctx, output, claims, reference)`.
Pasa `""` cuando no se necesite contexto adicional; la calibración también usa
una referencia vacía. El runner conserva una referencia no vacía como `reference`
en el informe JSON y omite el campo cuando está vacía. Los informes anteriores
sin ese campo siguen indicando que no hay contexto adicional. Los lectores
externos estrictos deben aceptar el nuevo campo antes de consumir informes que
lo incluyan. No hace falta migrar los informes guardados ni cambiar las suites
generadas o los contratos de servicios del producto. Este cambio no añade llamadas
al modelo ni modifica su selección, los límites de tokens, las etiquetas o el
número de correcciones.

### Etiquetas y validación de respuestas

Antes de ejecutar escenarios, el runner verifica el juez con cuatro ejemplos
propiedad del framework: `entailed` (la respuesta demuestra la afirmación),
`contradicted` (demuestra lo contrario), `not_addressed` (habla de otra cosa) e
`indeterminate` (la evidencia conflictiva no permite concluir).

Los cuatro resultados deben ser correctos. Así, un juez que siempre responde
`entailed` no puede hacer que toda la suite pase. Un fallo de calibración detiene
la suite antes de llamar a la aplicación. En los escenarios, solo `entailed`
aprueba.

Aplica las condiciones de cada afirmación tal como están escritas. «Indica el
precio» exige un precio. «Todo precio citado debe coincidir con la referencia;
no citar ningún precio satisface esta restricción» permite omitirlo: una
respuesta no vacía que no cite precios satisface esa restricción (`entailed`,
no `not_addressed`) si cumple los demás requisitos. Omitir información no aporta
contenido obligatorio, no respalda una afirmación incluida sin evidencia ni
resuelve una condición desconocida sobre el mundo.

El modelo interpreta estas condiciones; el framework no clasifica afirmaciones
mediante código ni reescribe etiquetas o justificaciones. Un `Output` totalmente
vacío sigue asignando `not_addressed` a todas las afirmaciones y hace fallar el
escenario sin llamar al juez.

El prompt pide llamar exactamente una vez a la herramienta de evaluación
proporcionada, sin escribir un nombre específico del proveedor. Su esquema exige
una propiedad con el ID de cada afirmación, que contenga una etiqueta y una
justificación no vacía. El juez devuelve los juicios en el orden de las
afirmaciones buscándolos por nombre, no por su posición en la respuesta. Rechaza
nombres ausentes, desconocidos o duplicados, campos adicionales y etiquetas inválidas.

Los metadatos estructurales permiten al validador explicar errores independientes
en los campos, como una afirmación codificada como cadena cuando se exige un
objeto. El texto completo de las afirmaciones permanece en el esquema y la
evidencia de referencia en la petición; ninguno se copia en estos metadatos de
corrección. Una afirmación llamada `requests` es válida si el esquema la exige.
El juez no proporciona veredictos de ejemplo.

El mecanismo de corrección existente y limitado puede pedir un reemplazo, pero
nunca repara una salida inválida. Las etiquetas, la selección del modelo, los
límites de tokens y el número de correcciones no cambian; unas instrucciones más
claras no garantizan su cumplimiento. Si se agotan las correcciones, el llamante
recibe un error, no juicios inventados. Consulta el
[contrato del juez del framework](https://github.com/goadesign/goa-ai/blob/main/docs/evals.md#how-judging-works).

## Migrar la construcción del juez

`judge.New(client, opts...) *Judge` se sustituye por
`judge.New(client, maxOutputTokens, opts...) (*Judge, error)`. Actualiza todos
los llamantes para pasar el límite positivo configurado y manejar el error
antes de crear el runner. Las opciones existentes, como `WithModelClass`, van
después del límite obligatorio y mantienen su significado.

Se elimina el cálculo anterior de `256 × número de afirmaciones`. Este cambio
del código fuente Go exige actualizar los llamantes para compilar con la nueva
versión. No cambia la selección del modelo, el prompt, las etiquetas, la
validación estricta de las respuestas ni el número de correcciones. No hace
falta migrar los informes guardados.

## Leer el informe

La duración de un escenario incluye la llamada a la aplicación, la validación
del resultado y la evaluación semántica. Los errores de selección y calibración
son errores de la suite. Los errores del hook, validación, timeout o juez se
guardan en el escenario correspondiente y los demás escenarios continúan.

Si no hay un error de suite, comprueba `report.Passed`; un valor false debe
hacer fallar la prueba o el comando de CI que invocó la evaluación.
