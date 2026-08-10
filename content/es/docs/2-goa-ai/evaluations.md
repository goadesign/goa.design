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

El runner rechaza resultados vacíos, IDs repetidos, afirmaciones sin respuesta,
artefactos inválidos y respuestas incompletas del juez semántico.

## Crear y ejecutar un runner

La concurrencia es explícita y limitada:

```go
runner, err := eval.NewRunner(
    judge.New(modelClient),
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

Antes de ejecutar escenarios, el runner verifica el juez con cuatro ejemplos
propiedad del framework: `entailed` (la respuesta demuestra la afirmación),
`contradicted` (demuestra lo contrario), `not_addressed` (habla de otra cosa) e
`indeterminate` (la evidencia conflictiva no permite concluir).

Los cuatro resultados deben ser correctos. Así, un juez que siempre responde
`entailed` no puede hacer que toda la suite pase. Un fallo de calibración detiene
la suite antes de llamar a la aplicación. En los escenarios, solo `entailed`
aprueba; el juez no reintenta ni repara su salida.

## Leer el informe

La duración de un escenario incluye la llamada a la aplicación, la validación
del resultado y la evaluación semántica. Los errores de selección y calibración
son errores de la suite. Los errores del hook, validación, timeout o juez se
guardan en el escenario correspondiente y los demás escenarios continúan.

Si no hay un error de suite, comprueba `report.Passed`; un valor false debe
hacer fallar la prueba o el comando de CI que invocó la evaluación.
