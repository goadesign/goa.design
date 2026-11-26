---
title: "Highbay"
weight: 5
description: "Plano de control multiagente guiado por contratos para Goa y Goa-AI que separa intención, autoría de pruebas, implementación y verificación."
llm_optimized: true
---

[Highbay](https://github.com/goadesign/highbay) es un plano de control local para construir, verificar y evolucionar servicios [Goa](/es/docs/1-goa/) y [Goa-AI](/es/docs/2-goa-ai/) con agentes de programación. Organiza los agentes que ya utilizas en roles separados en torno a un contrato compilado, ejecuta una verificación independiente antes de aprobar y fusiona los commits aprobados en tu rama local desde el navegador.

Para ver un recorrido visual de un cambio a través de cada rol, visita la [página de Highbay](/es/highbay/).

## Resumen {#workflow}

Cuando un único agente escribe tanto la aplicación como las pruebas que la evalúan, los supuestos erróneos pasan desapercibidos y el código manual de transporte o esquemas diverge con cada cambio. Highbay combina separación de roles con generación determinista de Goa y Goa-AI:

| Participante | Conexión | Responsabilidad |
|--------------|----------|-----------------|
| **Tú** | Página en el navegador | Confirmar la Change Card, revisar la arquitectura, iniciar builds, aprobar verificaciones superadas y fusionar en tu rama local |
| **Guide** | MCP `highbay` (rol `guide`) | Tu sesión activa de agente; inicializa carpetas vacías, redacta flujos `Story` y diseños Goa, y propone o revisa Change Cards |
| **Test Writer** | MCP `highbay` (copia `.highbay-tests`) | Escribe una prueba de escenario por cada flujo `Story` finalizado en `eval/` sin tocar el código de la aplicación |
| **Builder** | MCP `highbay` (copia `.highbay-build`) | Ejecuta `generate_code` para materializar `design/` y `gen/`, implementa la lógica de negocio, valida en un contenedor Linux y solicita verificación |
| **Servidor Highbay** | Proceso local por proyecto | Aplica permisos por rol, valida y acepta suites `eval/`, compila binarios fijados por digest, ejecuta la verificación y registra aprobaciones |

## Cinco puntos de control (`CP1`–`CP5`) {#checkpoints}

Cada vista previa, suite de pruebas aceptada, objetivo en vivo, ejecución de verificación y aprobación queda vinculado a un digest exacto `request_revision` de la Change Card:

1. **`CP1` — Acordar una Change Card**: Tu agente evalúa una `Story` (`github.com/goadesign/highbay/story/dsl`) en su borrador aislado y propone una Change Card en lenguaje claro con resumen, preguntas abiertas de producto, ejemplos concretos de aceptación y comportamientos a conservar. Respondes y confirmas en el navegador.
2. **`CP2` — Vista previa de arquitectura**: Inspecciona el diagrama C4 derivado del diseño Goa y [Model](/es/docs/3-ecosystem/model/) en **Architecture** antes de lanzar trabajadores.
3. **`CP3` — Ajustar prompts en vivo (opcional)**: Si el servicio incluye un agente Goa-AI y configuras una clave de proveedor o un gateway, el constructor puede iniciar una copia en vivo del commit candidato y probar overrides de prompts antes de confirmar cambios.
4. **`CP4` — Verificación independiente**: Highbay recompila y comprueba el informe `eval/` del autor de pruebas en la rama `highbay/tests-<n>` antes de aceptarlo, y después compila el commit del constructor y ejecuta contra él esa suite `eval/` aceptada (sin requerir clave de API salvo que la suite `eval/` llame a un proveedor en vivo; el ejemplo opcional `-example` incluye un modelo guionizado y el arranque inicial en blanco no usa modelo). En evaluadores configurados por el operador, los nombres, comprobaciones y registros de escenarios holdout se omiten en los informes al constructor mediante `Report.ForBuilders()` (el autor de pruebas no puede enviar holdouts).
5. **`CP5` — Aprobar y fusionar**: Revisa los resultados en **Approve**, registra la aprobación y pulsa **Merge into current branch** para fusionar los commits verificados de código y pruebas en tu rama local.

{{< highbay-views >}}

## Instalación

Highbay funciona en macOS o Linux y requiere **Go 1.27.3+**, **Git 2.45+** (con `user.name` y `user.email` configurados) y **Docker** (usado por `check_project` para compilar y probar el trabajo del constructor en contenedores Linux).

Instala el binario `hbay` y registra tus agentes:

```bash
go install github.com/goadesign/highbay/cmd/hbay@latest
hbay up
```

`hbay up` registra el servidor MCP `hbay stdio` y la skill `/highbay` (`$highbay` en Codex) en los clientes detectados —Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI y VS Code— e inicia [Chorus](/es/docs/3-ecosystem/chorus/) si está instalado. Usa `hbay setup -global` para registrar únicamente MCP y skills sin iniciar Chorus.

Si existe la carpeta de configuración de Herdr (`$HERDR_APP_HOME` o `~/.config/herdr-app`), la configuración también instala la ventana complementaria en `mods/highbay/` y asigna **Command–Option–Shift–H** (`⌥⌘⇧H`) en macOS cuando el atajo está libre.

---

## Iniciar un proyecto: base limpia de forma predeterminada {#blank-and-example}

Abre una carpeta vacía en tu agente e invoca `/highbay` (`$highbay` en Codex):

```text
/highbay — build a refund assistant: refunds up to $50 get instant store credit; larger ones wait for a manager.
```

En una carpeta aún no inicializada, tu agente llama a `init_project(dir: ".")` (derivando `example.com/<carpeta>` si no indicaste una ruta de módulo):

- **Estructura limpia predeterminada (`worked_example: false`)**: `init_project` y `hbay init` crean una estructura neutral de dos módulos Go (`<module>` y `<module>/eval`) con Goa, Goa-AI, Model y Story fijados en `go.mod`, sin endpoints ni agentes de demostración, y con una comprobación neutral de arranque en `eval/`. Tu primera Change Card describe únicamente tu producto.
- **Ejemplo ejecutable opcional (`worked_example: true` / `-example`)**: Si deseas explorar primero un ejemplo completo de agente Goa-AI, herramienta, flujo `Story` y suite guionizada, pasa `-example` en la CLI o pide `worked_example: true`:

```bash
hbay init -dir ./demo-shop -module example.com/shop -example
```

- **Repositorios Goa existentes**: Usar Highbay en un repositorio existente requiere un commit Git inicial y una suite `<module>/eval` en el formato de Highbay o ajustes de verificación configurados (`hbay verification set`); consulta [What a build adds](https://github.com/goadesign/highbay/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds).

---

## Paneles en paralelo con Herdr o trabajadores en segundo plano {#herdr}

En la vista **Build** eliges en línea el agente, modelo y modo de permisos de cada rol:

| Modo de trabajadores | Cuándo se usa | Cómo funciona |
|----------------------|---------------|---------------|
| **Herdr + Chorus** | `herdr-core`, `herdr-app` y Chorus (`chorus up`) están disponibles | Vincula el panel activo de tu agente, abre los paneles `builder` y `test_writer` a su lado durante **Build** y los cierra al fusionar o descartar. Pulsa **⌥⌘⇧H** en macOS para abrir la ventana complementaria de Highbay. |
| **Trabajadores en segundo plano** | Herdr no está instalado o no se usa | Ejecuta `builder` y `test_writer` como procesos CLI no interactivos supervisados por el servidor tras confirmar su ejecución en **Build**, sin requerir Herdr ni Chorus. |

---

## Arquitectura y límites de confianza {#architecture}

{{< figure src="/images/diagrams/HighbayArchitecture.svg" alt="Arquitectura de Highbay con Guide Agent, Browser Page, Highbay Server, Test Writer, Builder y Verifier" class="img-fluid" >}}

1. **DSL portable `Story` (`github.com/goadesign/highbay/story/dsl`)**: Declara actores, flujos (`StartsWith`, `Step`, `Outcome`) y preguntas abiertas `Question` en Go junto a `design/`. Todo flujo finalizado exige una prueba de escenario en `eval/`.
2. **Generación Goa y Goa-AI (`generate_code`)**: Materializa el `design/` acordado en `.highbay-build` y ejecuta los generadores fijados sin ediciones manuales en `gen/`.
3. **Aceptación de pruebas (`internal/testwriter`)**: Regenera la tabla de pruebas de Story, verifica que nada fuera de `eval/` cambió, compila el binario de pruebas y registra `highbay/tests-<n>`.
4. **Verificación y procesos (`verify/candidate`)**: Las credenciales por rol separan permisos MCP; en evaluadores configurados, los nombres, comprobaciones y registros de escenarios holdout se omiten en los informes al constructor (el autor de pruebas no puede enviar holdouts). Los agentes, la evaluación del diseño, los binarios candidatos y `eval/` se ejecutan como procesos locales bajo tu usuario y pueden leer archivos locales, mientras `check_project` utiliza contenedores Docker locales.

## Véase también

- [Repositorio de Highbay en GitHub](https://github.com/goadesign/highbay) — Código fuente, `HOW_IT_WORKS.md`, `REFERENCE.md` y `story/dsl`
- [Página de Highbay](/es/highbay/) — Recorrido de un cambio entre roles
- [Documentación de Chorus](/es/docs/3-ecosystem/chorus/) — Coordinación multiagente usada en los paneles de Herdr
- [Desarrollar con un agente de programación](/es/docs/ai-development/) — Flujo guiado por diseño con Goa y Goa-AI
