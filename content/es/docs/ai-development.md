---
title: "Desarrollar con un agente de programación"
linkTitle: "Flujo con agentes"
weight: 1
description: "Proporciona un contrato explícito, genera el código repetitivo y utiliza el compilador para orientar la implementación."
---

Goa ayuda a **desarrollar software con un agente de programación** y a **integrar agentes de IA en ese software**. Goa genera contratos de servicio; Goa-AI amplía la generación a herramientas, salidas estructuradas e integración de agentes.

## Por qué la generación cambia el trabajo

Un LLM que escribe por separado manejadores, clientes, esquemas y validación debe mantenerlos coherentes. Goa los deriva del diseño, dejando al modelo requisitos, decisiones de dominio e implementación.

- **Menos escritura repetitiva.** El generador produce archivos sin que los redacte el LLM. El ahorro total depende del contexto, iteraciones y revisión.
- **Contexto concreto.** Tipos, descripciones, ejemplos y restricciones están juntos. Lee diseño e interfaz antes de explorar toda la implementación.
- **Responsabilidades predecibles.** Edita diseño y aplicación; regenera `gen/`. Reutiliza esquemas y convenciones.
- **Información del compilador.** Las firmas generadas hacen visibles llamadas e implementaciones incompatibles. Los cambios de comportamiento requieren pruebas.
- **Contratos conectados.** Goa-AI reutiliza tipos y vincula herramientas a métodos con esquemas, códecs y transformaciones generados.

## Instala la skill Goa service designer {#install-the-skill}

Ejecuta este comando en el repositorio de tu aplicación. La [Skills CLI](https://github.com/vercel-labs/skills) instala la skill completa y permite elegir tu herramienta de programación. Requiere Node.js y npm.

```bash
npx skills add goadesign/goa --skill goa-service-designer
```

La skill enseña al agente a examinar el proyecto, cambiar primero el diseño, ejecutar el generador correspondiente, implementar fuera de `gen/`, actualizar los consumidores afectados y verificar el cambio. Cubre contratos de servicio, HTTP/gRPC, validación, errores e interceptores. Para Goa-AI, proporciona también el archivo generado `AGENTS_QUICKSTART.md`; esta skill se centra en servicios Goa.

Para seleccionar herramientas sin las preguntas del instalador:

```bash
npx --yes skills add goadesign/goa --skill goa-service-designer \
  -a codex -a cursor -a claude-code --yes
```

La instalación es local al proyecto por defecto. Añade `--global` para una instalación personal o `--copy` si tu entorno no admite enlaces simbólicos. Sin Node.js, copia el [directorio `goa-service-designer` completo](https://github.com/goadesign/goa/tree/v3/skills/goa-service-designer) en la carpeta de skills compatible con tu herramienta.

## El ciclo de desarrollo

### 1. Proporciona el contexto necesario

Da al agente el objetivo, diseño e implementación que cambiará. Instala la [skill Goa service designer](https://github.com/goadesign/goa/tree/v3/skills) según las instrucciones de tu herramienta.

Con Goa-AI, lee también **`AGENTS_QUICKSTART.md`** en la raíz de la aplicación. Se genera desde el diseño salvo con `DisableAgentDocs()` y describe los paquetes y el trabajo pendiente. Usa páginas Markdown o el [índice](/es/llms.txt) para aportar referencias concretas. No cargues todos los transportes generados por defecto; consúltalos cuando la tarea lo requiera.

### 2. Cambia primero el diseño

Define operaciones, entradas, resultados, errores y restricciones en `design/`. La validación estructural pertenece al diseño; autorización y reglas de negocio al código responsable. Explica cuándo usar una herramienta, su resultado y sus campos. Reutiliza tipos de servicio cuando expresen el mismo contrato.

### 3. Genera e implementa

```bash
goa gen example.com/catalog/design
```

Implementa las interfaces fuera de `gen/`. `goa example` crea archivos iniciales una vez y no actualiza la lógica existente. No arregles errores de compilación editando `gen/`: corrige diseño o implementación y regenera.

### 4. Verifica el cambio completo

```bash
gofmt -w design
go test ./...
```

Revisa el contrato público y prueba el comportamiento observable. Para IA, evalúa resultados y uso de herramientas. Un esquema válido no demuestra que se eligiera la herramienta correcta. Autorización, idempotencia de efectos externos y compatibilidad con clientes desplegados siguen siendo responsabilidades de la aplicación.

## Un diseño, dos puntos de entrada {#one-design-two-entry-points}

Este catálogo expone la misma operación por **HTTP, gRPC y JSON-RPC**, y ofrece al agente una herramienta vinculada a ella. `LookupPayload` y `Product` definen ambos contratos. Los campos numerados también definen el mapeo de Protocol Buffer. Implementa la búsqueda y el planificador en el código de la aplicación.

Crea el módulo e instala las versiones del ejemplo:

Esta guía usa una revisión de desarrollo de Goa-AI fijada, no una versión estable. El módulo Go selecciona la dependencia Goa compatible. Ejecuta el generador con `go run` para usar esa versión. Utiliza la versión de Go declarada por el módulo o una posterior.

```bash
mkdir catalog && cd catalog
go mod init example.com/catalog
go get goa.design/goa-ai@v0.78.8-0.20260915025548-ae0c418b7e77
mkdir design
```

Guarda este código en `design/catalog.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("catalog", func() {
    Title("Product catalog")
    Description("Find products through an API or an agent tool")
})

var LookupPayload = Type("LookupPayload", func() {
    Field(1, "sku", String, "Product stock-keeping unit", func() {
        MinLength(1)
    })
    Required("sku")
    Example(map[string]any{"sku": "BOOK-1"})
})

var Product = Type("Product", func() {
    Field(1, "sku", String, "Product stock-keeping unit")
    Field(2, "name", String, "Product name")
    Required("sku", "name")
    Example(map[string]any{"sku": "BOOK-1", "name": "The Go Book"})
})

var _ = Service("catalog", func() {
    Description("Provides product information to API clients and agents")
    JSONRPC(func() { POST("/rpc") })

    Method("lookup", func() {
        Description("Find a product by SKU")
        Payload(LookupPayload)
        Result(Product)

        HTTP(func() {
            GET("/products/{sku}")
            Response(StatusOK)
        })
        GRPC(func() {})
        JSONRPC(func() {})
    })

    Agent("assistant", "Find products", func() {
        Use("catalog", func() {
            Tool("lookup", "Find a product by SKU", func() {
                Args(LookupPayload)
                Return(Product)
                BindTo("lookup")
            })
        })
    })
})
```

Genera contratos y archivos iniciales:

```bash
go mod tidy
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy
go test ./...
```

Examina interfaz, servidor y cliente HTTP, OpenAPI, esquemas y códecs de herramientas, y `AGENTS_QUICKSTART.md`. Implementa la búsqueda y sustituye el planificador de ejemplo antes de usarlo en un producto.

## Una instrucción útil

```text
Read design/ and the relevant generated service interface. For Goa-AI,
also read AGENTS_QUICKSTART.md.

Implement the requested behavior by changing the design first when the
contract changes. Regenerate with the project's pinned Goa version.
Do not edit gen/ or maintain a second tool schema by hand.

Update application implementations and callers. Put structural validation
in the design; keep authorization and business rules in their owning code.
Run the project's tests and relevant agent evaluations. Report the contract
changes, checks performed, and any behavior still needing review.
```

Añade el resultado deseado y los criterios de aceptación. La instrucción define un proceso; no sustituye una tarea clara ni el criterio de ingeniería.

## Mide la ventaja

Compara la misma tarea, criterios, modelo y código inicial en varias ejecuciones. Registra tokens de entrada y salida, tiempo total, generación, pruebas, correcciones manuales, revisión y defectos. Incluye preparación e intentos fallidos. Las líneas generadas demuestran trabajo del generador, no un ahorro medido de tokens.

No hay una promesa universal de 10×. La ventaja concreta es delegar trabajo repetitivo en generación determinista y dar a personas y agentes un objetivo de implementación más claro.

Continúa con la [guía rápida de Goa](../1-goa/quickstart/) o de [Goa-AI](../2-goa-ai/quickstart/).
