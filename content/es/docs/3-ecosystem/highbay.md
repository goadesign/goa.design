---
title: "Highbay"
weight: 5
description: "Construye y verifica servicios Go y agentes de IA separando los roles de tus agentes de programación: confirma casos límite en el navegador, genera interfaces con Goa y Goa-AI y ejecuta pruebas de escenario independientes antes de fusionar."
llm_optimized: true
---

[Highbay](https://github.com/goadesign/highbay) construye y verifica servicios [Goa](/es/docs/1-goa/) y agentes [Goa-AI](/es/docs/2-goa-ai/) con los agentes de programación que ya utilizas, separando quién escribe el servicio de quién escribe las pruebas de escenario que condicionan la aprobación. Tú confirmas las decisiones abiertas de producto en el navegador, un agente implementa el servicio contra las interfaces generadas por Goa, un segundo agente escribe las pruebas de escenario en su propio espacio de trabajo y Highbay ejecuta esas pruebas aceptadas contra el commit candidato antes de que apruebes y fusiones.

Para probar la comparación interactiva del ejemplo de reembolsos de `$50`, visita la [página de Highbay](/es/highbay/).

## Instalación

Highbay funciona en macOS o Linux y requiere **Go 1.27.3+**, **Git 2.45+** (con `user.name` y `user.email` configurados) y **Docker** (usado por `check_project` para compilar y ejecutar pruebas unitarias del constructor en contenedores Linux).

Instala el binario `hbay` y registra tus agentes de programación:

```bash
go install github.com/goadesign/highbay/cmd/hbay@latest
hbay up
```

`hbay up` registra el servidor MCP `hbay stdio` y la skill `/highbay` (`$highbay` en Codex) en los agentes detectados —Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI y VS Code— e inicia [Chorus](/es/docs/3-ecosystem/chorus/) si está instalado. Usa `hbay setup -global` para registrar únicamente MCP y skills sin iniciar Chorus. Recarga tu agente o abre una nueva sesión si ya estaba abierto durante la instalación.

Si existe la carpeta de configuración de [Herdr](https://herdr.dev) (`$HERDR_APP_HOME` o `~/.config/herdr-app`), la instalación también añade el módulo flotante de Highbay en `mods/highbay/` y asigna **Command–Option–Shift–H** (`⌥⌘⇧H`) en macOS cuando el atajo está libre.

---

## Iniciar un proyecto {#blank-and-example}

Abre una carpeta en tu agente de programación e invoca `/highbay` (`$highbay` en Codex):

```text
/highbay — crea un asistente de reembolsos: hasta $50 dan crédito en tienda al instante; los mayores esperan a un encargado.
```

La primera llamada MCP inicia o se conecta al servidor local de Highbay del proyecto, registra tu sesión actual como `guide` y llama a `open_views` para abrir la página en tu navegador.

Cuando la carpeta aún no está inicializada, tu agente llama a `init_project(dir: ".")` (derivando `example.com/<carpeta>` si no indicaste una ruta de módulo Go; la primera vez tarda un par de minutos mientras se descargan y compilan los módulos):

- **Nuevo espacio de trabajo (`worked_example: false`, predeterminado)**: `init_project` y `hbay init` inicializan una estructura de dos módulos Go (`<module>` y `<module>/eval`) con Goa, Goa-AI, Model y Story fijados en `go.mod` y una comprobación inicial en `eval/`, lista para tu propia `Story` y `design/`.
- **Ejemplo ejecutable (`worked_example: true` / `-example`)**: Pasa `-example` en la CLI o pide `worked_example: true` cuando quieras explorar primero un agente Goa-AI completo con herramienta, flujo `Story` y suite de evaluación guionizada:

```bash
hbay init -dir ./demo-shop -module example.com/shop -example
```

- **Repositorios Goa existentes**: Adoptar Highbay en un repositorio Goa o Goa-AI existente requiere al menos un commit Git y una suite `<module>/eval` en el formato de Highbay o un programa de pruebas registrado con `hbay verification set` (cuando configuras una suite guardada, Highbay la ejecuta en cada cambio sin iniciar un autor de pruebas); consulta [What a build adds](https://github.com/goadesign/highbay/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds). Ten en cuenta que `hbay gen` y `generate_code` admiten diseños HTTP, JSON-RPC y MCP; los diseños con transporte gRPC se rechazan hoy porque no se incluye la finalización con `protoc`.

{{< highbay-views >}}

---

## Roles y responsabilidades {#workflow}

Cuando un único agente escribe tanto la aplicación como las pruebas que la evalúan, las dudas de producto se responden en silencio y quedan codificadas en ambos lados. Highbay separa esas funciones en espacios de trabajo y credenciales MCP independientes:

| Participante | Conexión | Responsabilidad |
|--------------|----------|-----------------|
| **Tú** | Página en el navegador | Responder las preguntas abiertas de la Change Card, revisar la arquitectura, iniciar builds, registrar la aprobación y fusionar en tu rama local |
| **Guide** | MCP `highbay` (rol `guide`) | Tu sesión activa de agente; inicializa carpetas vacías, redacta flujos `Story` y diseños Goa, y propone o revisa Change Cards |
| **Test Writer** | MCP `highbay` (copia `.highbay-tests`) | Escribe una prueba de escenario por cada flujo `Story` finalizado en `eval/` desde la Change Card confirmada sin editar el código del servicio |
| **Builder** | MCP `highbay` (copia `.highbay-build`) | Ejecuta `generate_code` para materializar `design/` y `gen/`, implementa la lógica de negocio, comprueba en un contenedor Linux y solicita verificación |
| **Servidor Highbay** | Proceso local por proyecto | Aplica permisos por rol, compila y acepta suites `eval/`, construye binarios candidatos fijados por digest, ejecuta la verificación y registra aprobaciones |

---

## Por qué la generación de código importa con agentes de programación {#codegen}

Si un agente de programación escribe a mano enrutadores HTTP, manejadores JSON-RPC, servidores MCP, validaciones de entrada y esquemas JSON de herramientas, gasta tokens en un trabajo que Goa puede generar y deja que las convenciones varíen en cada turno. Highbay integra la generación en el build acordado separando cada responsable:

- **`gen/` del servicio (`generate_code`)**: Cuando el constructor ejecuta `generate_code`, Highbay escribe el `design/` acordado del build activo en `.highbay-build` y ejecuta los generadores fijados de Goa y Goa-AI para reemplazar el `gen/` candidato, produciendo manejadores, clientes tipados, códecs y validación estructural para los transportes HTTP, JSON-RPC y MCP declarados, además de esquemas JSON de herramientas Goa-AI, enlaces a métodos, campos inyectados, declaraciones de confirmación y `AGENTS_QUICKSTART.md` en la raíz del módulo (salvo que se desactive). Goa escribe esos archivos sin tokens de salida del modelo; el ahorro total depende del contexto, las iteraciones y la revisión que requiera el cambio.
- **Contexto inicial enfocado**: Las ediciones comienzan por `design/` y las interfaces Go generadas relevantes en lugar de cargar todos los archivos de transporte y esquemas en el prompt.
- **Forma generada uniforme entre modelos**: Regenerar `gen/` con un único compilador mantiene coherentes el transporte, la validación y los esquemas de herramientas tanto si la implementación la escribió Claude como Codex o Gemini.
- **Comprobaciones del compilador y del servidor entre roles**: Cambiar el tipo de resultado de un método y regenerar hace fallar `go build` en los manejadores con el tipo antiguo (mientras que llamadas inválidas del modelo a herramientas se rechazan en ejecución). Por separado, Highbay escribe los flujos `Story` obligatorios en `eval/design/story_tests.go` al preparar o comprobar la tarea del autor de pruebas, genera el ejecutor Go en `eval/gen/`, compila el programa de pruebas y comprueba su listado de escenarios, y rechaza en `verify_change` cualquier commit cuyo `design/` difiera de la revisión acordada.

Para estructurar contratos Goa y Goa-AI pensados para agentes, consulta [Desarrollar con un agente de programación](/es/docs/ai-development/).

---

## Cinco puntos de control (`CP1`–`CP5`) {#checkpoints}

Cada vista previa de arquitectura, commit de pruebas aceptado, copia en vivo, ejecución de verificación y aprobación queda vinculado a un digest exacto `request_revision` de la Change Card:

1. **`CP1` — Acordar una Change Card**: Tu agente evalúa una `Story` (`github.com/goadesign/highbay/story/dsl`) en su borrador aislado y propone una Change Card con el resumen del cambio, las preguntas abiertas de producto, ejemplos concretos de aceptación y comportamientos conservados. Respondes y confirmas la tarjeta en el navegador.
2. **`CP2` — Vista previa de arquitectura**: Inspecciona los contenedores C4, las políticas de agentes Goa-AI y las salvaguardas de herramientas declaradas por el diseño Goa y [Model](/es/docs/3-ecosystem/model/) en **Architecture** antes de lanzar los trabajadores.
3. **`CP3` — Ajustar prompts en vivo (opcional)**: Cuando el servicio incluye un agente Goa-AI y configuras una clave de proveedor o un gateway, el constructor puede iniciar una copia en vivo del commit candidato y probar ajustes de prompts en tiempo real antes de confirmar cambios.
4. **`CP4` — Verificación independiente**: Highbay compila y comprueba el módulo `eval/` del autor de pruebas en la rama `highbay/tests-<n>` antes de aceptar ese commit de pruebas, y después construye el commit candidato del constructor y ejecuta contra él el commit de pruebas aceptado (no requiere clave de API salvo que `eval/` llame a un proveedor en vivo). Cuando un operador configura un evaluador separado con pruebas holdout, Highbay muestra el resultado de cada holdout bajo un nombre anónimo y omite su nombre, comprobaciones y diagnósticos en los informes visibles para el constructor (`Report.ForBuilders()`; el autor de pruebas no puede enviar holdouts).
5. **`CP5` — Aprobar y fusionar**: Revisa el informe de escenarios en **Approve**, registra tu aprobación (con comprobación opcional del digest del binario de lanzamiento si configuraste ajustes de promoción) y pulsa **Merge into current branch** para fusionar los commits verificados de código y pruebas en tu rama local.

---

## Paneles en paralelo con Herdr o trabajadores en segundo plano {#herdr}

En la vista **Build** eliges en línea el agente y modelo de cada trabajador (las preferencias se recuerdan por proyecto). Cuando hay varias familias de agentes instaladas (por ejemplo Claude Code y Codex), Highbay prefiere familias distintas para el constructor y el autor de pruebas; un único CLI instalado también puede cubrir ambos roles:

| Modo de trabajadores | Cuándo se usa | Cómo funciona |
|----------------------|---------------|---------------|
| **Herdr + Chorus** | [Herdr](https://herdr.dev) (`herdr-core`, `herdr-app`) y [Chorus](/es/docs/3-ecosystem/chorus/) (`chorus up`) están disponibles | Adopta el panel activo de tu agente cuando es compatible, abre `builder` y `test_writer` a su lado durante **Build** y cierra los paneles de trabajo automáticamente al fusionar o descartar. Pulsa **⌥⌘⇧H** en macOS para abrir la ventana complementaria de Highbay. |
| **Trabajadores en segundo plano** | Herdr no está instalado o no está en ejecución | Ejecuta `builder` y `test_writer` como procesos CLI no interactivos supervisados por el servidor sin requerir Herdr ni Chorus tras confirmar su ejecución en **Build**. |

---

## Arquitectura y límites de procesos {#architecture}

{{< figure src="/images/diagrams/HighbayArchitecture.svg" alt="Arquitectura de Highbay con Guide Agent, Browser Page, Highbay Server, Test Writer, Builder y Verifier" class="img-fluid" >}}

1. **DSL portable `Story` (`github.com/goadesign/highbay/story/dsl`)**: Declara actores, flujos (`StartsWith`, `Step`, `Outcome`) y preguntas abiertas `Question` en Go junto a `design/`. Cada flujo finalizado exige una prueba de escenario correspondiente en `eval/` para que un build cuente (Highbay comprueba que cada escenario requerido esté declarado y lo ejecuta; no juzga si las aserciones internas de la prueba son suficientes).
2. **Generación Goa y Goa-AI (`generate_code`)**: Highbay materializa el `design/` acordado en `.highbay-build` y ejecuta los generadores fijados de Goa y Goa-AI de forma atómica para que ningún agente edite `gen/` a mano.
3. **Aceptación del módulo de pruebas (`internal/testwriter`)**: Antes de que las pruebas cuenten, Highbay regenera la tabla de pruebas de Story, verifica que nada fuera de `eval/` haya cambiado, compila el binario de pruebas y registra el commit aceptado en `highbay/tests-<n>`.
4. **Verificación candidata y ejecución local (`verify/candidate`)**: Las credenciales por rol limitan qué puede invocar cada agente en Highbay —solo tú puedes confirmar una Change Card, registrar la aprobación o fusionar—. Los agentes, la evaluación del diseño, los binarios candidatos y las suites `eval/` se ejecutan como grupos de procesos locales ordinarios bajo tu cuenta de usuario con tu acceso a archivos y red, mientras que `check_project` ejecuta compilación y pruebas unitarias en contenedores Docker locales.

## Véase también

- [Repositorio de Highbay en GitHub](https://github.com/goadesign/highbay) — Código fuente, `HOW_IT_WORKS.md`, `REFERENCE.md` y `story/dsl`
- [Página de Highbay](/es/highbay/) — Comparación interactiva y recorrido por las cuatro vistas del navegador
- [Documentación de Chorus](/es/docs/3-ecosystem/chorus/) — Coordinación multiagente en `#channel` y `@agent` usada por los paneles de Herdr
- [Desarrollar con un agente de programación](/es/docs/ai-development/) — Flujo guiado por diseño con Goa y Goa-AI
