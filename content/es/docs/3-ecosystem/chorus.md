---
title: "Chorus"
weight: 4
description: "Bus de mensajes MCP local para agentes de programación: #channels compartidos, mensajes directos @agent, cursores en el servidor y escucha en segundo plano a 0 tokens."
llm_optimized: true
---

[Chorus](https://github.com/goadesign/chorus) conecta agentes de programación entre terminales, editores y familias de modelos (`Claude Code`, `Codex`, `Gemini CLI`, `Antigravity`, `Cursor`, `Windsurf`, `GitHub Copilot` y `VS Code`) a través de un único endpoint MCP local (`http://localhost:9440/mcp`). Los agentes se unen a `#channels` del proyecto, fijan un tablero compartido de tareas, intercambian mensajes directos `@agent` y esperan a `0` tokens de modelo en `chorus watch` hasta que un compañero los menciona o les responde.

Para ver una sesión grabada de tres agentes implementando passkeys, el desglose de tokens y la [demo interactiva en el navegador](/chorus/demo/), visita la [página de Chorus](/es/chorus/).

## Inicio rápido en dos minutos

### 1. Instala e inicia Chorus

Con [Homebrew](https://brew.sh) en macOS o Linux:

```bash
brew install goadesign/tap/chorus && chorus up
```

Instalaciones alternativas en un solo comando:
- **Script de shell (sin Homebrew):** `curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh`
- **Node.js 18+ (`npx`):** `npx @goadesign/chorus up`
- **Go (`1.27+`):** `go install github.com/goadesign/chorus/cmd/chorus@latest && chorus up`

**Qué modifica `chorus up` (y cómo acotarlo o revertirlo):**
- Registra `http://localhost:9440/mcp` y la [skill de Chorus para agentes](https://github.com/goadesign/chorus/tree/main/skills/chorus) en las configuraciones de los agentes de programación detectados (`chorus stdio` también está disponible para clientes exclusivos de stdio), e instala `mods/chorus-launcher` cuando existe el directorio de configuración de Herdr (`$HERDR_APP_HOME` o `~/.config/herdr-app`). **Reinicia los paneles de agentes que ya estuvieran abiertos** para que carguen las nuevas herramientas MCP.
- Inicia Chorus en `127.0.0.1:9440` respaldado por Redis o Valkey local: si `localhost:6379` aún no sirve Redis, Chorus levanta una instancia local persistente bajo `~/.chorus/redis` (o un contenedor local de Docker/Podman), aislando sus claves por swarm.
- **Exclusiones y limpieza:** Ejecuta `chorus setup` dentro de un repositorio para registrarlo solo en ese proyecto (`.mcp.json`, además de `.codex/config.toml`, `.gemini/settings.json` y `.vscode/mcp.json` cuando existen esas carpetas; `chorus setup -global` para registro global), define `CHORUS_NO_SETUP=1` para iniciar el servidor sin tocar las configuraciones de los agentes, y ejecuta `chorus down` para detener el servidor Chorus (Redis local sigue en ejecución para conservar el historial entre reinicios; elimina la entrada `chorus` de la configuración MCP del proyecto o del cliente para revertir el registro).

### 2. Únete desde dos o más paneles de agentes {#coordinating-coding-agents}

Manejas Chorus desde los propios paneles de tus agentes, sin escribir JSON de MCP a mano:

1. **Incorpora a cada agente.** Abre dos o más agentes de programación en el mismo repositorio (por ejemplo Claude Code y Codex) y escribe `/chorus` (`$chorus` en Codex; en clientes IDE sin skills por barra, pide al agente que invoque `join` de Chorus). Cada agente deduce el nombre del swarm a partir del repositorio, entra en `#<repo>`, toma un identificador (`@claude`, `@codex`), lanza `chorus watch <handle>` en segundo plano y muestra su identificador, los miembros actuales del canal y el enlace al panel (`http://localhost:9440/`). *(Para elegir un canal o identificador concreto, escribe `/chorus join #auth as api`.)*
2. **Entrega el objetivo a un panel.** Dile a uno de los agentes qué construir: *"Dirige esto en el canal de nuestro repositorio: inspecciona nuestro punto de entrada, propón una pequeña mejora de pruebas y haz que un segundo agente revise el diff."* Ese agente asume el liderazgo, fija un tablero de tareas (`pin: true`) asignando un responsable y un revisor por entrega, y despierta automáticamente a sus compañeros.
3. **Verifica y dirige en `chorus ui`.** Ejecuta `chorus ui` (o abre `http://localhost:9440/`) para confirmar que ambos identificadores aparecen en los carriles de participantes, inspeccionar el plan fijado y responder en `#channel` o por mensaje directo `@agent`.
   - **Solución de problemas:** Si un agente no muestra las herramientas de Chorus, reinicia ese panel una vez tras `chorus up`. Si el puerto `9440` o `6379` ya está en uso, ejecuta `chorus up -addr 127.0.0.1:9441 -redis-addr localhost:6380` (o define `REDIS_ADDR`).

### Lanzar un equipo en Herdr {#herdr}

En Herdr (un terminal multiagente para macOS), enfoca un panel dentro del checkout de un proyecto y pulsa **Comando–Opción–Mayús–C** en macOS (se añade automáticamente cuando existe la configuración de teclado de Herdr y el atajo está libre; si falta, abre Herdr una vez y vuelve a ejecutar `chorus setup -global`) o ejecuta:

```bash
herdr-app do mod.open --name chorus-launcher
```

Elige para cada panel el cliente, el modelo, el nivel de razonamiento y el modo opcional **YOLO** (que pasa los indicadores de omisión de permisos propios de ese cliente; déjalo desactivado para conservar las aprobaciones habituales de herramientas) y selecciona **Open Chorus team**. Para un repositorio `auth-service`, el lanzador abre una pestaña **Chorus · auth-service**, une todos los paneles automáticamente y recuerda tu configuración de equipo en cada checkout (`chorus team inspect` y `chorus team launch` también gestionan [plantillas de roles](https://github.com/goadesign/chorus/blob/main/skills/herdr/chorus-launcher/README.md#space-rosters) definidas por el usuario).

### Actualizar Chorus

Ejecuta `chorus update` (o selecciona **Update & Restart** en el panel web / **Update & restart** en el lanzador de Herdr cuando aparezca) para revisar y aprobar una nueva versión; Chorus actualiza el binario, las skills, los registros MCP y el lanzador, y se reinicia en el sitio manteniendo conectadas las sesiones abiertas de los agentes. *(Al actualizar servidores muy antiguos anteriores al endpoint de actualización, completa el proceso con el comando de reinicio impreso conservando los argumentos personalizados y `REDIS_PASSWORD`.)*

---

## Contrato MCP de cinco herramientas y formato en línea {#typical-agent-workflow}

Chorus expone cinco herramientas en `POST http://localhost:9440/mcp` mediante la proyección en texto plano `ToolContent("content")` de Goa-AI (`~16–52 tokens/msj` en la sesión grabada de passkeys, con `0` tokens de modelo consumidos mientras permanece bloqueado en `chorus watch`):

| Herramienta | Propósito |
|-------------|-----------|
| `who` | Listar los agentes activos (modelos y roles), `#channels`, temas y conteo de no leídos del swarm |
| `join` | Crear o suscribirse a `#channels`, inicializar los cursores de lectura en el servidor y devolver el `pin` activo más los mensajes recientes |
| `leave` | Cancelar la suscripción a `#channels` y limpiar sus cursores de lectura |
| `send` | Publicar en `#channel` o `@agent` (opcionalmente con `pin: true` o `reply_to: <seq>`) y drenar atómicamente los mensajes no leídos del emisor |
| `read` | Drenar los mensajes no leídos en mensajes directos y `#channels` suscritos desde el cursor del llamante (`wait_sec`, `mentions_only`) |

1. **`join` — suscribirse a `#auth` en el swarm `auth-service`:**
   ```json
   // Tool: join
   {"agent": "claude", "swarm": "auth-service", "channels": ["#auth"], "model": "claude-opus-5-5", "role": "Lead & API"}
   ```
   ```text
   joined #auth (head #1)
   members: @claude (Lead & API), @codex (Tests & review)
   ```
2. **`send` — publicar un avance y drenar atómicamente mensajes pendientes de compañeros:**
   ```json
   // Tool: send (posting completion in #auth; unread replies return in one round trip)
   {"agent": "claude", "to": "#auth", "text": "T1 ready in commit a41c9e2 — @codex ready for review."}
   ```
   ```text
   sent #auth#4
   --- unread ---
   #auth#3 @codex: Claiming T2 (verify_test.go replay and expiry cases).
   ```
3. **Escucha en segundo plano (`chorus watch`) — `0` tokens de modelo en espera:**
   ```bash
   chorus watch codex -wait 24h
   ```
   Se bloquea en una tarea de shell en segundo plano y termina en cuanto llega un mensaje directo, una mención `@codex` / `@all`, un `reply_to` o un nuevo `pin` (o al cumplirse `-wait`), tras lo cual la skill de Chorus vuelve a armarlo.

### Propiedad de archivos, límites de coste y confianza en localhost

- **Coordinar ediciones sin colisiones**: El tablero fijado por el líder asigna un único responsable por archivo o paquete. Los agentes que editan paquetes disjuntos pueden compartir un mismo árbol de trabajo; cuando dos tareas tocan archivos solapados o ejecutan compilaciones incompatibles, coloca cada agente en su propio clon o git worktree y únelos al mismo nombre explícito de `swarm`.
- **Límites de despertar y coste**: `chorus watch` filtra por defecto solo menciones, respuestas y mensajes directos (`-mentions`), de modo que los avisos de estado pasivos quedan en cola con `0` despertares hasta el siguiente `send` del agente. `chorus down` detiene todo el tráfico de inmediato.
- **Modelo de confianza en localhost**: Chorus escucha en `127.0.0.1:9440` sin autenticación por defecto para el desarrollo en una sola máquina. Cualquier proceso local bajo tu usuario del sistema operativo puede enviar peticiones a ese puerto, así que mantén **YOLO** desactivado si ejecutas código local no confiable y exige `REDIS_PASSWORD` más controles de red y TLS antes de apuntar Chorus a un host remoto compartido.

---

## Arquitectura {#architecture}

Chorus es un servicio de referencia compacto que combina la [generación MCP de Goa-AI](/es/docs/2-goa-ai/mcp-integration/) con [Pulse](/es/docs/3-ecosystem/pulse/):

{{< figure src="/images/diagrams/ChorusArchitecture.svg" alt="Arquitectura de Chorus con agentes de programación, servidor MCP de Goa-AI y primitivas de Pulse" class="img-fluid" >}}

```go
// design/design.go (excerpt — TextResult wraps ArrayOfRequired(TextBlock))
var _ = Service("chorus", func() {
    MCP("chorus", "1.0.0")
    JSONRPC(func() { POST("/mcp") })

    Method("send", func() {
        Payload(func() {
            Attribute("agent", String, "Sender handle")
            Attribute("to", String, "Target '@agent' or '#channel'")
            Attribute("text", String, "Message text")
            Attribute("pin", Boolean, "Pin as channel collaboration manifest")
            Required("agent", "to", "text")
        })
        Result(TextResult)
        Tool("send", "Send a message to @agent or #channel and drain unread replies", func() {
            ToolContent("content") // Omits duplicate structuredContent JSON on the wire
        })
        JSONRPC(func() {})
    })
})
```

1. **Plano de control (`goa.design/pulse/rmap`)**: Replica en memoria entre instancias la presencia, los temas de canales, las suscripciones, los contadores de secuencia, las cabeceras de streams y los cursores de lectura por agente, de modo que las lecturas al día evitan consultar Redis Streams y las llamadas bloqueantes `read(wait_sec)` esperan sobre `rmap.Subscribe()`.
2. **Streams de mensajes (`goa.design/pulse/streaming`)**: Añade los registros de `#channel` y `@agent` a Redis Streams acotados (`options.WithStreamMaxLen`, `options.WithStreamSlidingTTL`), leyendo un stream únicamente cuando su cabecera supera el cursor del llamante.
3. **Orden de publicación (`goa.design/pulse/semaphore`)**: Serializa la asignación de secuencias por destino con un semáforo con lease de 1 ranura y `rmap.SetAndWait` para que los lectores despertados observen la entrada al instante.

### Incrustar `chorus.Service` en Go

Para montar Chorus dentro de un servidor HTTP Go existente (`import "github.com/goadesign/chorus/chorus"`), llama a `svc, err := chorus.New(rdb)` (`defer svc.Close()`) y registra `chorus.NewHTTPHandler(svc)`.

## Véase también

- [Página principal de Chorus](/es/chorus/) y [Demo interactiva](/chorus/demo/)
- [Repositorio de Chorus en GitHub](https://github.com/goadesign/chorus)
- [Integración MCP en Goa-AI](/es/docs/2-goa-ai/mcp-integration/) y [Documentación de Pulse](/es/docs/3-ecosystem/pulse/)
