---
title: "Surla"
weight: 5
description: "Plano de control multiagente guiado por contratos para Goa y Goa-AI que separa intención, autoría de pruebas, implementación y verificación."
llm_optimized: true
---

[Surla](https://github.com/goadesign/surla) es un plano de control local para construir, verificar y evolucionar servicios [Goa](/es/docs/1-goa/) y [Goa-AI](/es/docs/2-goa-ai/) con agentes de programación. Organiza los agentes que ya utilizas en roles separados en torno a un contrato compilado, ejecuta una verificación independiente antes de aprobar y fusiona los commits aprobados en tu rama local desde el navegador.

Para ver un recorrido visual de un cambio a través de cada rol, visita la [página de Surla](/es/surla/).

## Resumen {#workflow}

Cuando un único agente escribe tanto la aplicación como las pruebas que la evalúan, los supuestos erróneos pasan desapercibidos y el código manual de transporte o esquemas diverge con cada cambio. Surla combina separación de roles con generación determinista de Goa y Goa-AI:

| Participante | Conexión | Responsabilidad |
|--------------|----------|-----------------|
| **Tú** | Página en el navegador | Confirmar la Change Card, revisar la arquitectura, iniciar builds, aprobar verificaciones superadas y fusionar en tu rama local |
| **Guide** | MCP `surla` (rol `guide`) | Tu sesión activa de agente; inicializa carpetas vacías, redacta flujos `Story` y diseños Goa, y propone o revisa Change Cards |
| **Test Writer** | MCP `surla` (copia `.surla-tests`) | Escribe una prueba de escenario por cada flujo `Story` finalizado en `eval/` sin tocar el código de la aplicación |
| **Builder** | MCP `surla` (copia `.surla-build`) | Ejecuta `generate_code` para materializar `design/` y `gen/`, implementa la lógica de negocio, valida en un contenedor Linux y solicita verificación |
| **Servidor Surla** | Proceso local por proyecto | Aplica permisos por rol, valida y acepta suites `eval/`, compila binarios fijados por digest, ejecuta la verificación y registra aprobaciones |

## Cinco puntos de control (`CP1`–`CP5`) {#checkpoints}

Cada vista previa, suite de pruebas aceptada, objetivo en vivo, ejecución de verificación y aprobación queda vinculado a un digest exacto `request_revision` de la Change Card:

1. **`CP1` — Acordar una Change Card**: Tu agente evalúa una `Story` (`github.com/goadesign/surla/story/dsl`) en su borrador aislado y propone una Change Card en lenguaje claro con resumen, preguntas abiertas de producto, ejemplos concretos de aceptación y comportamientos a conservar. Respondes y confirmas en el navegador.
2. **`CP2` — Vista previa de arquitectura**: Inspecciona el diagrama C4 derivado del diseño Goa y [Model](/es/docs/3-ecosystem/model/) en **Architecture** antes de lanzar trabajadores.
3. **`CP3` — Ajustar prompts en vivo (opcional)**: Si el servicio incluye un agente Goa-AI y configuras una clave de proveedor o un gateway, el constructor puede iniciar una copia en vivo del commit candidato y probar overrides de prompts antes de confirmar cambios.
4. **`CP4` — Verificación independiente**: Surla recompila y comprueba el informe `eval/` del autor de pruebas en la rama `surla/tests-<n>` antes de aceptarlo, y después compila el commit del constructor y ejecuta contra él la suite aceptada (con un modelo guionizado determinista por defecto, sin clave de API). Los escenarios holdout se filtran mediante `Report.ForBuilders()`.
5. **`CP5` — Aprobar y fusionar**: Revisa los resultados en **Approve**, registra la aprobación y pulsa **Merge into current branch** para fusionar los commits verificados de código y pruebas en tu rama local.

## Instalación

Surla funciona en macOS o Linux y requiere **Go 1.27+**, **Git 2.45+** (con `user.name` y `user.email` configurados) y **Docker** (usado por `check_project` para compilar y probar el trabajo del constructor en contenedores Linux).

Instala el binario `surla` y registra tus agentes:

```bash
go install github.com/goadesign/surla/cmd/surla@latest
surla up
```

`surla up` registra el servidor MCP `surla stdio` y la skill `/surla` (`$surla` en Codex) en los clientes detectados —Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI y VS Code— e inicia [Chorus](/es/docs/3-ecosystem/chorus/) si está instalado. Usa `surla setup -global` para registrar únicamente MCP y skills sin iniciar Chorus.

Si existe la carpeta de configuración de Herdr (`$HERDR_APP_HOME` o `~/.config/herdr-app`), la configuración también instala la ventana complementaria en `mods/surla/` y asigna **Command–Option–Shift–S** (`⌥⌘⇧S`) en macOS cuando el atajo está libre.

---

## Iniciar un proyecto: base limpia de forma predeterminada {#blank-and-example}

Abre una carpeta vacía o un repositorio Goa existente en tu agente e invoca `/surla` (`$surla` en Codex):

```text
/surla — build a refund assistant: refunds up to $50 get instant store credit; larger ones wait for a manager.
```

En una carpeta aún no inicializada, tu agente llama a `init_project(dir: ".")` (derivando `example.com/<carpeta>` si no indicaste una ruta de módulo):

- **Estructura limpia predeterminada (`example: false`)**: `init_project` y `surla init` crean una estructura neutral de dos módulos Go (`<module>` y `<module>/eval`) con Goa, Goa-AI, Model y Story fijados en `go.mod`, sin endpoints ni agentes de demostración, y con una comprobación neutral de arranque en `eval/`. Tu primera Change Card describe únicamente tu producto.
- **Ejemplo ejecutable opcional (`example: true` / `-example`)**: Si deseas explorar primero un ejemplo completo de agente Goa-AI, herramienta, flujo `Story` y suite guionizada, pasa `-example` en la CLI o pide `example: true`:

```bash
surla init -dir ./demo-shop -module example.com/shop -example
```

---

## Paneles en paralelo con Herdr o trabajadores en segundo plano {#herdr}

En la vista **Build** eliges en línea el agente, modelo y modo de permisos de cada rol:

| Modo de trabajadores | Cuándo se usa | Cómo funciona |
|----------------------|---------------|---------------|
| **Herdr + Chorus** | `herdr-core`, `herdr-app` y Chorus (`chorus up`) están disponibles | Vincula el panel activo de tu agente, abre los paneles `builder` y `test_writer` a su lado durante **Build** y los cierra al fusionar o descartar. Pulsa **⌥⌘⇧S** en macOS para abrir la ventana complementaria de Surla. |
| **Trabajadores en segundo plano** | Herdr no está instalado o no se usa | Ejecuta `builder` y `test_writer` como procesos CLI no interactivos supervisados por el servidor tras confirmar su ejecución en **Build**, sin requerir Herdr ni Chorus. |

---

## Arquitectura y límites de confianza {#architecture}

{{< figure src="/images/diagrams/SurlaArchitecture.svg" alt="Arquitectura de Surla con Guide Agent, Browser Page, Surla Server, Test Writer, Builder y Verifier" class="img-fluid" >}}

1. **DSL portable `Story` (`github.com/goadesign/surla/story/dsl`)**: Declara actores, flujos (`StartsWith`, `Step`, `Outcome`) y preguntas abiertas `Question` en Go junto a `design/`. Todo flujo finalizado exige una prueba de escenario en `eval/`.
2. **Generación Goa y Goa-AI (`generate_code`)**: Materializa el `design/` acordado en `.surla-build` y ejecuta los generadores fijados sin ediciones manuales en `gen/`.
3. **Aceptación de pruebas (`internal/testwriter`)**: Regenera la tabla de pruebas de Story, verifica que nada fuera de `eval/` cambió, compila el binario de pruebas y registra `surla/tests-<n>`.
4. **Verificación y procesos (`verify/candidate`)**: Las credenciales por rol separan permisos MCP y ocultan los escenarios holdout al constructor; la evaluación del diseño, los binarios candidatos y `eval/` se ejecutan como grupos de procesos locales bajo tu usuario, mientras `check_project` utiliza contenedores Docker locales.

## Véase también

- [Repositorio de Surla en GitHub](https://github.com/goadesign/surla) — Código fuente, `HOW_IT_WORKS.md`, `REFERENCE.md` y `story/dsl`
- [Página de Surla](/es/surla/) — Recorrido de un cambio entre roles
- [Documentación de Chorus](/es/docs/3-ecosystem/chorus/) — Coordinación multiagente usada en los paneles de Herdr
- [Desarrollar con un agente de programación](/es/docs/ai-development/) — Flujo guiado por diseño con Goa y Goa-AI
