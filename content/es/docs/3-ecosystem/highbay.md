---
title: "Highbay"
weight: 5
description: "Construye y verifica APIs, servidores MCP y flujos de IA separando los roles de tus agentes de código: confirma decisiones abiertas en el navegador, genera el 70 % del código Go fuera de pruebas (en el servicio de referencia Orders) y ejecuta pruebas independientes antes de fusionar."
llm_optimized: true
---

[Highbay](https://github.com/goadesign/highbay) aporta a los agentes de programación que ya usas un flujo estructurado para APIs, servidores MCP y flujos de IA. Cada servicio comparte una misma estructura de proyecto (`design/`, `gen/`, `cmd/`, `internal/`, `eval/`), reglas integradas de arquitectura para autenticación, trazas OpenTelemetry y registros con búfer ([Clue](/es/docs/3-ecosystem/clue/)), colas y grupos de workers sobre Redis Streams ([Pulse](/es/docs/3-ecosystem/pulse/)) y flujos duraderos, junto con generación determinista mediante [Goa](/es/docs/1-goa/) y [Goa-AI](/es/docs/2-goa-ai/). Tú confirmas las decisiones abiertas de producto y autonomía en el Studio del navegador, un agente implementa los manejadores sobre las interfaces Go generadas, un segundo agente escribe las pruebas de escenario en su propia copia Git y Highbay verifica ambos commits antes de aprobar y fusionar.

Para recorrer de principio a fin el ejemplo de plataforma de incidentes `ops-copilot`, visita la [página de Highbay](/es/highbay/).

## Instalación

Highbay funciona en macOS o Linux y utiliza **Go 1.27.3+**, **Git 2.45+** (con `user.name` y `user.email` configurados) y **Docker** (usado por `check_project` para compilar y ejecutar pruebas unitarias del constructor en contenedores Linux).

Instala `highbay` y registra tus agentes de programación con Homebrew, `npx` o `go install`:

```bash
# macOS o Linux (Homebrew)
brew install goadesign/tap/highbay
highbay up

# Linux o macOS (Node.js 18+)
npx @goadesign/highbay up

# O con Go 1.27.3+
go install github.com/goadesign/highbay/cmd/highbay@latest
highbay up
```

`highbay up` registra el servidor MCP `highbay stdio` y la skill `/highbay` (`$highbay` en Codex) en los agentes detectados (Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI y VS Code) e inicia [Chorus](/es/docs/3-ecosystem/chorus/) si está instalado. Ejecuta `highbay update` en cualquier momento para actualizar en el sitio el binario, las skills, los registros MCP y el complemento de Herdr, o `highbay setup -global` para registrar MCP y skills sin iniciar Chorus. Highbay también está listado en el Official MCP Registry (`io.github.goadesign/highbay`), Glama, Serverdex y como plugin de Claude Code (`/plugin marketplace add goadesign/highbay`). Recarga tu agente o abre una nueva sesión si ya estaba abierto durante la instalación.

Si existe la carpeta de configuración de [Herdr](https://herdr.dev) (`$HERDR_APP_HOME` o `~/.config/herdr-app`), la instalación también añade el módulo flotante de Highbay en `mods/highbay/` y asigna **Command+Option+Shift+H** (`⌥⌘⇧H`) en macOS cuando el atajo está libre.

## Iniciar un proyecto {#blank-and-example}

Ejecuta `highbay` en la carpeta de tu proyecto para abrir el Studio en el navegador. En una carpeta vacía, el Studio muestra un único compositor de objetivos (`Describe what you want to build`), inicia el agente de programación elegido como `guide`, publica tu solicitud en el panel **Team conversation** de Chorus, inicializa el espacio de trabajo y abre la primera Change Card en **Agree** en cuanto está lista.

Si ya tienes una sesión de agente abierta en tu editor o terminal, invoca `/highbay` (`$highbay` en Codex) directamente:

```text
/highbay Crea una plataforma multitenant de incidentes con herramientas MCP para logs de pods y rollbacks con aprobación de guardia.
```

La primera llamada MCP inicia o se conecta al servidor local de Highbay del proyecto, registra tu sesión actual como `guide` y llama a `open_views` para abrir el Studio. Usa **+ New change** en la cabecera del Studio cuando quieras que el guía redacte otra Change Card en paralelo conservando los cambios sin guardar de las tarjetas abiertas.

Cuando la carpeta aún no está inicializada, tu agente llama a `init_project(dir: ".")` (derivando `example.com/<carpeta>` si no indicaste una ruta de módulo Go; la primera vez tarda un par de minutos mientras se descargan y compilan los módulos):

- **Nuevo espacio de trabajo (`worked_example: false`, predeterminado)**: `init_project` y `highbay init` crean una estructura de dos módulos Go (`<module>` y `<module>/eval`) con Goa, Goa-AI, Model y Story fijados en `go.mod` y una comprobación inicial en `eval/`, lista para tu propia `Story` y `design/`.
- **Ejemplo ejecutable (`worked_example: true` / `-example`)**: Pasa `-example` en la CLI o pide `worked_example: true` para explorar primero un agente Goa-AI completo con herramienta, flujo `Story` y suite de evaluación guionizada:

```bash
highbay init -dir ./demo-shop -module example.com/shop -example
```

- **Repositorios Goa existentes**: Adoptar Highbay en un repositorio Goa o Goa-AI existente requiere al menos un commit Git y una suite `<module>/eval` en el formato de Highbay o un programa de pruebas registrado con `highbay verification set` (cuando configuras una suite guardada, Highbay la ejecuta en cada cambio sin iniciar un autor de pruebas); consulta [What a build adds](https://github.com/goadesign/highbay/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds). `highbay gen` y `generate_code` admiten diseños HTTP, JSON-RPC y MCP; los diseños con transporte gRPC se rechazan porque no se incluye la finalización con `protoc`.

{{< highbay-views >}}

## Roles y diseño del Studio {#workflow}

Cuando un único agente escribe tanto la aplicación como las pruebas que la evalúan, las dudas de producto se responden en silencio y quedan codificadas en ambos lados. Highbay separa esas funciones en espacios de trabajo y credenciales MCP independientes, mientras el Studio muestra la etapa activa (**Agree**, **Architecture**, **Build**, **Verify**, **Approve**) junto al panel fijo **Team conversation** de Chorus y un cajón acoplado **Terminal**:

| Participante | Conexión | Responsabilidad |
|--------------|----------|-----------------|
| **Tú** | Studio en el navegador (`/views`) | Confirmar las preguntas abiertas de la Change Card, pedir revisiones acotadas al guía en **Team conversation**, revisar la arquitectura, iniciar builds, observar o responder en terminales de rol, aprobar informes y fusionar |
| **Guide** | MCP `highbay` (rol `guide`) | Inicializa carpetas vacías, evalúa flujos `Story` y diseños Goa en `.highbay-draft`, responde preguntas en Chorus y propone o revisa Change Cards |
| **Test Writer** | MCP `highbay` (copia `.highbay-tests`) | Escribe una prueba de escenario por cada flujo `Story` finalizado en `eval/` desde la Change Card confirmada sin editar el código del servicio |
| **Builder** | MCP `highbay` (copia `.highbay-build`) | Ejecuta `generate_code` para materializar `design/` y `gen/`, implementa los manejadores, comprueba en un contenedor Linux y solicita verificación |
| **Servidor Highbay** | Proceso local por proyecto | Aplica permisos por rol, compila y acepta suites `eval/`, construye binarios candidatos fijados por digest, ejecuta la verificación y registra aprobaciones |

## Por qué la generación de código importa con agentes de programación {#codegen}

Escribir a mano enrutadores HTTP, manejadores JSON-RPC, servidores MCP, validaciones de entrada y esquemas JSON de herramientas gasta tokens del modelo en código repetitivo y deja que las convenciones varíen en cada turno. Highbay integra la generación en el build acordado separando cada responsable:

- **`gen/` del servicio (`generate_code`)**: Cuando el constructor ejecuta `generate_code`, Highbay escribe el `design/` acordado del build activo en `.highbay-build` y ejecuta los generadores fijados de Goa y Goa-AI para reemplazar el `gen/` candidato. Así produce manejadores, clientes tipados, códecs y validación estructural para los transportes HTTP, JSON-RPC y MCP declarados, además de esquemas JSON de herramientas Goa-AI, enlaces a métodos, campos inyectados en servidor, compuertas de confirmación y `AGENTS_QUICKSTART.md` en la raíz del módulo (salvo que se desactive). Goa genera el 70 % del código Go fuera de pruebas en el servicio de referencia `Orders` con cero tokens de salida del modelo; el consumo total depende del contexto, las iteraciones y la revisión que requiera el cambio.
- **Contexto inicial enfocado**: Las ediciones comienzan por `design/` y las interfaces Go generadas relevantes sin cargar todos los archivos de transporte y esquemas en el prompt.
- **Forma generada uniforme entre modelos**: Regenerar `gen/` con un único compilador mantiene coherentes el transporte, la validación y los esquemas de herramientas con Claude, Codex o Gemini.
- **Comprobaciones del compilador y del servidor entre roles**: Cambiar el tipo de resultado de un método y regenerar hace fallar `go build` en los manejadores con el tipo antiguo, mientras que llamadas inválidas del modelo a herramientas se rechazan en ejecución. Por separado, Highbay escribe los flujos `Story` obligatorios en `eval/design/story_tests.go` al preparar o comprobar la tarea del autor de pruebas, genera el ejecutor Go en `eval/gen/`, compila el programa de pruebas para verificar su listado de escenarios y rechaza en `verify_change` cualquier commit cuyo `design/` difiera de la revisión acordada.

Para estructurar contratos Goa y Goa-AI pensados para agentes, consulta [Desarrollar con un agente de programación](/es/docs/ai-development/).

## Cinco puntos de control (`CP1` a `CP5`) {#checkpoints}

Cada vista previa de arquitectura, commit de pruebas aceptado, copia en vivo, ejecución de verificación y aprobación queda vinculado a un digest exacto `request_revision` de la Change Card:

1. **`CP1`: Acordar una Change Card**: Tu agente evalúa una `Story` (`github.com/goadesign/highbay/story/dsl`) en su copia `.highbay-draft` y propone una Change Card con el resumen del cambio, las preguntas abiertas de producto, ejemplos concretos de aceptación y comportamientos conservados. Respondes las preguntas, pides revisiones en **Team conversation** si tus respuestas cambian el borrador y confirmas la tarjeta en **Agree**.
2. **`CP2`: Vista previa de arquitectura**: Inspecciona los contenedores C4, las políticas de agentes Goa-AI y las salvaguardas de herramientas declaradas por el diseño Goa y [Model](/es/docs/3-ecosystem/model/) en **Architecture**, o pulsa **Ask Guide** sobre cualquier contenedor para comentarlo en **Team conversation**.
3. **`CP3`: Ajustar prompts en vivo (opcional)**: Cuando el servicio incluye un agente Goa-AI y configuras una clave de proveedor o un gateway, el constructor puede iniciar una copia en vivo del commit candidato y probar ajustes de prompts en **Live target** antes de confirmar cambios.
4. **`CP4`: Verificar el candidato**: Highbay compila y comprueba el módulo `eval/` del autor de pruebas en la rama `highbay/tests-<n>` antes de aceptar ese commit de pruebas, y después construye el commit candidato del constructor y ejecuta contra él el commit de pruebas aceptado en **Verify** (no requiere clave de API salvo que `eval/` llame a un proveedor en vivo). Si falla un escenario, **Message Builder** abre el compositor dirigido a `builder` con los datos de la ejecución. Cuando un operador configura un evaluador separado con pruebas holdout, Highbay muestra el resultado de cada holdout bajo un nombre anónimo y omite su nombre, comprobaciones y diagnósticos en los informes visibles para el constructor (`Report.ForBuilders()`; el autor de pruebas no puede enviar holdouts).
5. **`CP5`: Aprobar y fusionar**: Revisa el informe de escenarios superados en **Approve**, registra tu aprobación (con comprobación opcional del digest del binario de lanzamiento si configuraste ajustes de promoción) y pulsa **Merge into current branch** para fusionar los commits verificados de código y pruebas en tu rama local.

## Terminales en vivo, paneles de Herdr y trabajadores en segundo plano {#herdr}

En **Build** eliges en línea el agente y modelo de cada trabajador (las preferencias se recuerdan por proyecto). Cuando hay varias familias de agentes instaladas (por ejemplo Claude Code y Codex), Highbay prefiere familias distintas para el constructor y el autor de pruebas; un único CLI instalado también puede cubrir ambos roles:

| Modo de trabajadores | Cuándo se usa | Cómo funciona |
|----------------------|---------------|---------------|
| **Herdr + Chorus** | [Herdr](https://herdr.dev) (`herdr-core`, `herdr-app`) y [Chorus](/es/docs/3-ecosystem/chorus/) (`chorus up`) están disponibles | Adopta el panel activo de tu agente cuando es compatible, ejecuta `builder` y `test_writer` en PTY gestionados, envía mensajes de Chorus a **Team conversation** y te permite observar el terminal de cualquier rol en modo de solo lectura dentro del cajón **Terminal** del Studio (cambiando a **Type in terminal** cuando un rol necesita respuesta). Pulsa **⌥⌘⇧H** en macOS para abrir el complemento de Highbay. |
| **Trabajadores en segundo plano** | Herdr no está instalado o no está en ejecución | Ejecuta `builder` y `test_writer` como procesos CLI no interactivos supervisados por el servidor sin requerir Herdr ni Chorus tras confirmar su ejecución en **Build**. |

## Arquitectura y límites de procesos {#architecture}

{{< figure src="/images/diagrams/HighbayArchitecture.svg" alt="Arquitectura de Highbay con Guide Agent, Browser Studio, Highbay Server, Test Writer, Builder y Verifier" class="img-fluid" >}}

1. **DSL portable `Story` (`github.com/goadesign/highbay/story/dsl`)**: Declara actores, flujos (`StartsWith`, `Step`, `Outcome`) y preguntas abiertas `Question` en Go junto a `design/`. Cada flujo finalizado exige una prueba de escenario correspondiente en `eval/` para que un build cuente (Highbay comprueba que cada escenario requerido esté declarado y lo ejecuta; no juzga si las aserciones internas de la prueba son suficientes).
2. **Generación Goa y Goa-AI (`generate_code`)**: Highbay materializa el `design/` acordado en `.highbay-build` y ejecuta los generadores fijados de Goa y Goa-AI de forma atómica para que ningún agente edite `gen/` a mano.
3. **Aceptación del módulo de pruebas (`internal/testwriter`)**: Antes de que las pruebas cuenten, Highbay regenera la tabla de pruebas de Story, verifica que nada fuera de `eval/` haya cambiado, compila el binario de pruebas y registra el commit aceptado en `highbay/tests-<n>`.
4. **Verificación candidata y ejecución local (`verify/candidate`)**: Las credenciales por rol limitan qué puede invocar cada agente en Highbay, de modo que solo tú puedes confirmar una Change Card, registrar la aprobación o fusionar. Los agentes, la evaluación del diseño, los binarios candidatos y las suites `eval/` se ejecutan como grupos de procesos locales ordinarios bajo tu cuenta de usuario con tu acceso a archivos y red, mientras que `check_project` ejecuta compilación y pruebas unitarias en contenedores Docker locales.

## Véase también

- [Repositorio de Highbay en GitHub](https://github.com/goadesign/highbay): Código fuente, `HOW_IT_WORKS.md`, `REFERENCE.md` y `story/dsl`
- [Página de Highbay](/es/highbay/): Recorrido interactivo por el Studio y resumen de capacidades
- [Documentación de Chorus](/es/docs/3-ecosystem/chorus/): Coordinación multiagente en `#channel` y `@agent` usada en **Team conversation**
- [Desarrollar con un agente de programación](/es/docs/ai-development/): Flujo guiado por contratos con Goa y Goa-AI
