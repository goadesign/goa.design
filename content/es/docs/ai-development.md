---
title: "Desarrollar con un agente de programación"
linkTitle: "Flujo con agentes"
weight: 1
description: "Dale a tu agente de programación un contrato explícito, genera el código repetitivo y usa el compilador para guiar la implementación."
---

Goa cubre dos tareas complementarias: **construir software con un agente de programación** e
**integrar agentes de IA dentro de ese software**. El mismo flujo guiado por el diseño ayuda en
ambas. Goa genera contratos de servicio; Goa-AI amplía la generación a herramientas,
respuestas estructuradas e integración de agentes.

{{< anchors "por-qué-la-generación-cambia-el-trabajo" >}}
## Por qué la generación cambia el flujo de trabajo

Cuando un LLM escribe por separado manejadores, clientes, esquemas JSON y validaciones,
tiene que mantener todas esas representaciones alineadas. Goa las deriva del diseño.
Así el modelo puede centrarse en los requisitos, las decisiones de dominio y la implementación.

- **Menos escritura repetitiva.** El generador produce el código sin que un LLM
  redacte cada archivo generado. Esto reduce el trabajo en tokens de salida; el ahorro total
  depende del contexto, las iteraciones y la revisión que requiera la tarea.
- **Un punto de partida concentrado.** El diseño reúne tipos, descripciones, ejemplos,
  restricciones y operaciones. Carga el diseño y la interfaz relevantes antes de pedir
  al agente que explore una base de código grande.
- **Responsabilidades predecibles.** Edita el diseño y el código de aplicación. Regenera
  `gen/`. Un agente de programación no tiene que inventar un patrón de transporte nuevo en
  cada servicio ni una convención de esquemas distinta en cada herramienta.
- **Verificación del compilador.** Si cambia la firma de un método generado, el compilador
  de Go señala al instante las implementaciones y llamadas incompatibles. Los cambios de
  comportamiento siguen requiriendo pruebas.
- **Contratos de servicio y herramientas conectados.** Goa-AI reutiliza tipos de Goa y
  vincula herramientas a métodos de servicio. Los esquemas, códecs y transformaciones
  generados mantienen conectadas ambas representaciones.

## Instala la skill Goa service designer {#install-the-skill}

Ejecuta este comando en el repositorio de tu aplicación. La [Skills CLI](https://github.com/vercel-labs/skills) instala la skill completa y permite elegir tu herramienta de programación. Requiere Node.js y npm.

```bash
npx skills add goadesign/goa --skill goa-service-designer
```

La skill enseña al agente a inspeccionar tu proyecto, editar primero el diseño, ejecutar el generador correspondiente, implementar fuera de `gen/`, actualizar los consumidores afectados y verificar el cambio. Incluye pautas sobre contratos de servicio, HTTP/gRPC, validación, errores e interceptores. Para Goa-AI, facilita también el archivo generado `AGENTS_QUICKSTART.md`; la skill de diseño de servicios se centra en servicios Goa.

Para seleccionar herramientas concretas sin las preguntas interactivas del instalador:

```bash
npx --yes skills add goadesign/goa --skill goa-service-designer \
  -a codex -a cursor -a claude-code --yes
```

La instalación es local al proyecto por defecto. Añade `--global` para una instalación personal o `--copy` si tu entorno no admite enlaces simbólicos. Sin Node.js, copia el [directorio `goa-service-designer` completo](https://github.com/goadesign/goa/tree/v3/skills/goa-service-designer) en el directorio de skills que admita tu herramienta de programación.

## El ciclo de desarrollo

{{< anchors "1-proporciona-el-contexto-necesario" >}}
### 1. Aporta el contexto relevante

Entrega al agente de programación el objetivo, los archivos de diseño y la implementación que
vaya a modificar. Para un servicio, instala la
[skill Goa service designer](https://github.com/goadesign/goa/tree/v3/skills)
siguiendo las instrucciones de tu herramienta.

Con Goa-AI, lee también **`AGENTS_QUICKSTART.md`** en la raíz de la aplicación. Goa-AI
genera esta guía a partir del diseño del agente salvo que se indique `DisableAgentDocs()`.
Describe los paquetes generados y el trabajo de implementación pendiente.

Usa las páginas en Markdown de este sitio o el [índice de documentación](/es/llms.txt) para
aportar material de referencia preciso. Evita cargar todos los transportes generados en el
contexto del modelo por defecto; inspecciónalos cuando la tarea lo requiera.

### 2. Cambia primero el diseño

Describe operaciones, entradas, resultados, errores y restricciones en `design/`.
Pon la validación estructural en el diseño. Mantén la autorización y las reglas de negocio
en la capa de aplicación que sea su propietaria.

En una herramienta de agente, haz que su descripción explique cuándo usarla y qué
devuelve. Añade una descripción clara en cada campo. Reutiliza tipos de servicio existentes
cuando expresen el mismo contrato de dominio.

### 3. Genera e implementa

```bash
goa gen example.com/catalog/design
```

Implementa o actualiza las interfaces generadas en los archivos propios de la aplicación.
`goa example` crea archivos iniciales una sola vez; no actualiza la lógica de negocio
existente cuando cambia el diseño. Nunca modifiques `gen/` para silenciar un error de
compilación: corrige el diseño o la implementación de la aplicación y vuelve a generar.

### 4. Verifica el cambio completo

```bash
gofmt -w design
go test ./...
```

Revisa el diff del diseño y el contrato público resultante. Añade pruebas de comportamiento
sobre lo que observan los clientes. En aplicaciones de IA, ejecuta evaluaciones que comprueben
los resultados y el uso de herramientas. Que los argumentos cumplan el esquema no demuestra que
el modelo eligiera la herramienta adecuada ni produjera una respuesta útil.

La generación tampoco resuelve la autorización, ni vuelve idempotentes los efectos externos,
ni demuestra la compatibilidad con clientes ya desplegados. Prueba esas propiedades en la
capa de aplicación que las gobierna.

## Un diseño, dos puntos de entrada {#one-design-two-entry-points}

Este catálogo expone la misma operación sobre **HTTP, gRPC y JSON-RPC**, y ofrece a un agente una herramienta vinculada a ella. `LookupPayload` y `Product` definen ambos contratos. Los campos numerados definen también el mapeo de Protocol Buffers. Implementa la búsqueda de productos y el planificador en el código de la aplicación.

Crea un módulo e instala las versiones utilizadas en este ejemplo:

Esta guía emplea la versión `v0.90.0` de Goa-AI (que requiere Go 1.27.3 o posterior). Su módulo Go selecciona automáticamente una dependencia compatible de Goa `v3.35+` (o ejecuta `go get goa.design/goa/v3@v3.36.0` para fijar la última versión de Goa). Ejecuta el generador con `go run` para utilizar la versión seleccionada por el módulo.

```bash
mkdir catalog && cd catalog
go mod init example.com/catalog
go get goa.design/goa-ai@v0.90.0
mkdir design
```

Guarda lo siguiente como `design/catalog.go`:

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

Genera los contratos y los archivos iniciales de la aplicación:

```bash
go mod tidy
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy
go test ./...
```

Inspecciona la interfaz de servicio generada, el servidor y cliente HTTP, las especificaciones
OpenAPI, los esquemas y códecs de herramientas del agente y `AGENTS_QUICKSTART.md`. A partir de
estas 54 líneas de `design/catalog.go`, `goa gen` produce 57 archivos bajo `gen/`
(5.388 líneas en total: 5.108 líneas de Go además de OpenAPI, Protobuf y esquemas JSON de herramientas) junto con
`AGENTS_QUICKSTART.md`, sin gastar tokens de salida del modelo. El código inicial de la
aplicación es un punto de partida: implementa la búsqueda real y sustituye el planificador de
ejemplo antes de llevarlo a producción.

{{< anchors "una-instrucción-útil" >}}
## Un prompt de tarea útil

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

Añade el resultado concreto esperado por el usuario y los criterios de aceptación. Este prompt
define un flujo de trabajo; no sustituye una especificación clara ni el buen criterio de ingeniería.

## Coordina varios agentes de programación con Chorus {#coordinate-multiple-agents}

Cuando una tarea abarca varios roles o familias de modelos —por ejemplo, un agente revisando contratos y seguridad (`arch`), un segundo implementando el servicio Goa (`api`) y un tercero ejecutando pruebas concurrentes de condición de carrera e integración (`qa`)—, utiliza [Chorus](/es/docs/3-ecosystem/chorus/) (`github.com/goadesign/chorus`) para conectar sus sesiones mediante un servidor MCP local compartido (`http://localhost:9440/mcp`).

Instala e inicia Chorus (registra MCP y la skill `chorus` en tus agentes de programación):

```bash
brew install goadesign/tap/chorus && chorus up
```

O sin Homebrew (`curl` o `npx` con Node.js 18+):

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

```bash
npx @goadesign/chorus up
```

Después indica a cada sesión de agente su identificador y canal en el prompt:

```text
Use Chorus as arch in #catalog and review the LookupPayload contract with api and qa.
```

Los agentes se unen a `#channels`, intercambian mensajes directos `@agent`, reciben respuestas no leídas adjuntas en `send` y esperan en segundo plano mediante `chorus watch <handle>` hasta que un compañero los menciona o les responde. Consulta la [guía de Chorus](/es/docs/3-ecosystem/chorus/) para ver la referencia completa de herramientas y su arquitectura.

## Separa autoría de pruebas y verificación con Highbay {#build-and-verify-with-highbay}

Cuando quieras que un agente de programación escriba las pruebas de aceptación y otro distinto escriba la implementación —con un servidor verificando ambos frente a un contrato acordado antes de fusionar nada—, utiliza [Highbay](/es/docs/3-ecosystem/highbay/) (`github.com/goadesign/highbay`).

Instala Highbay y registra el servidor MCP `highbay` y la skill `/highbay` (`$highbay` en Codex) en tus agentes de programación:

```bash
go install github.com/goadesign/highbay/cmd/highbay@latest
highbay up
```

A continuación invoca `/highbay` en una carpeta vacía (o en un repositorio Goa existente que ya tenga un commit de Git y una suite `<module>/eval` o ajustes de verificación guardados):

```text
/highbay — build a refund assistant: refunds up to $50 get instant store credit; larger ones wait for a manager.
```

Tu agente de programación inicializa una estructura limpia y neutral de Go y `eval/` si la carpeta está vacía (`highbay init -example` o `worked_example: true` añade un ejemplo ejecutable si lo prefieres), redacta los flujos de negocio en `design/story.go` y abre una Change Card en tu navegador. Una vez confirmada la tarjeta, Highbay asigna al autor de pruebas (`.highbay-tests`) y al constructor (`.highbay-build`) copias de trabajo independientes, comprueba y acepta la suite `eval/`, verifica frente a ella el commit del constructor y te permite fusionar los commits aprobados en tu rama local con un solo clic. Consulta la [página de Highbay](/es/highbay/) y la [guía del ecosistema de Highbay](/es/docs/3-ecosystem/highbay/).

{{< anchors "mide-la-ventaja" >}}
## Mide la ventaja en tu proyecto

Compara la misma tarea, criterios de aceptación, modelo y código base inicial a lo largo de
varias ejecuciones. Registra tokens de entrada y salida, tiempo total, tiempo de regeneración
y pruebas, correcciones manuales, esfuerzo de revisión y defectos de comportamiento. Incluye
la configuración inicial y los intentos fallidos. Las líneas de código generadas reflejan el
trabajo que realiza el generador, no un índice directo de ahorro de tokens ni de productividad.

Aquí no hay ninguna promesa universal de 10×. La ventaja concreta es que la generación
determinista de código retira el trabajo repetitivo de contratos de la redacción del modelo y
ofrece tanto a las personas como a los agentes un objetivo de implementación más claro.

Continúa con el [inicio rápido de Goa](../1-goa/quickstart/) o el
[inicio rápido de Goa-AI](../2-goa-ai/quickstart/).
