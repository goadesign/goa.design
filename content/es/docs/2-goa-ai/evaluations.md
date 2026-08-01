---
title: Evaluaciones generadas
weight: 10
description: "Define suites de evaluación en un DSL, genera hooks tipados y juzga respuestas del modelo con contratos semánticos estrictos."
llm_optimized: true
---

Las evaluaciones de Goa-AI mantienen la intención estable de la prueba en el
diseño y dejan la ejecución del producto y la evidencia en la aplicación. El
framework posee el DSL, la interfaz de hooks generada, la orquestación, el juez
semántico y el informe. La aplicación posee el destino real, la interacción de
protocolo, las comprobaciones deterministas, las afirmaciones y los artefactos.

## Definir una suite

Importa `goa.design/goa-ai/eval/dsl` en un paquete de diseño Goa:

```go
var _ = Suite("chat", func() {
    Description("Ejercita resultados completos de Chat.")
    Timeout("2m")

    Scenario("alarm_inventory", func() {
        Description("Recupera el historial completo de alarmas.")
        Input("Lista cada alarma de la ventana solicitada.")
        Tags("production", "alarm")
        Timeout("3m")
    })

    Calibration("entailed", func() {
        Answer("El compresor 1 está funcionando.")
        Claim("El compresor 1 está funcionando.")
        Want(eval.Entailed)
    })
})
```

Los IDs usan `lower_snake_case`. Las descripciones, entradas y duraciones
positivas son obligatorias. Las calibraciones usan `entailed`, `contradicted`,
`not_addressed` o `indeterminate`.

`goa gen` genera `gen/evals/<suite>/suite.go` con una interfaz directa:

```go
type Hooks interface {
    AlarmInventory(context.Context, string) (eval.Result, error)
}

func New(hooks Hooks) eval.Suite
```

No hay registro de adaptadores ni reflexión. Los métodos generados convierten
cada escenario en una obligación de compilación; los campos del receptor o los
closures capturan dependencias y destinos de la aplicación.

## Implementar evidencia y ejecutar

Cada hook realiza la interacción completa y devuelve `eval.Result` con
`Checks` deterministas, `Claims` semánticas, el `Output` del modelo y
`Artifacts` de diagnóstico. Los fallos de infraestructura o protocolo se
devuelven como errores. El runner rechaza resultados vacíos, IDs duplicados,
claims sin salida y respuestas del juez que no sean uno-a-uno.

`eval/judge` usa un `model.Client` neutral al proveedor. Realiza una única
solicitud estructurada y sin herramientas por lote; nunca repara, reintenta ni
sustituye la salida del modelo.

```go
suite := genevals.New(hooks)
runner := eval.NewRunner(judge.New(modelClient))
report, err := runner.Run(ctx, suite)
```

El runner prueba todas las calibraciones antes de ejecutar escenarios. Después
los ejecuta secuencialmente con sus timeouts generados. Un escenario solo pasa
si todas las comprobaciones pasan y cada claim es `entailed`. Los informes usan
campos JSON estables para CI y retención de artefactos.

