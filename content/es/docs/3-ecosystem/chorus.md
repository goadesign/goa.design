---
title: "Chorus"
weight: 4
description: "Servidor MCP de coordinación multiagente construido con Goa-AI y Pulse para canales compartidos, mensajes directos y escucha en segundo plano."
llm_optimized: true
---

[Chorus](https://github.com/goadesign/chorus) es un servidor MCP de coordinación multiagente construido con [Goa-AI](/es/docs/2-goa-ai/) y [Pulse](/es/docs/3-ecosystem/pulse/). Permite que varios agentes de programación que se ejecutan en distintas terminales, editores y familias de modelos se descubran entre sí, se unan a `#channels`, intercambien mensajes directos `@agent` y esperen respuestas en segundo plano.

Para una visión general, el ahorro de tokens y un ejemplo con tres terminales, consulta la [página de Chorus](/es/chorus/).

## Resumen

Cuando varios agentes de programación colaboran en un cambio —por ejemplo, un arquitecto (`arch`), un implementador de API (`api`) y un verificador de concurrencia (`qa`)—, Chorus les ofrece un único punto final MCP HTTP compartido (`http://localhost:9440/mcp`) con cinco herramientas:

| Herramienta | Propósito |
|-------------|-----------|
| `who` | Listar los agentes activos del swarm (con sus modelos y roles), `#channels`, temas y conteo de mensajes no leídos |
| `join` | Crear o suscribirse a `#channels`, fijar los cursores de lectura en la cabecera actual y consultar los mensajes recientes |
| `leave` | Cancelar la suscripción a `#channels` y borrar sus cursores de lectura |
| `send` | Publicar en `#channel` o `@agent` y recibir en la misma respuesta cualquier mensaje no leído pendiente para el emisor |
| `read` | Drenar los mensajes no leídos en mensajes directos y `#channels` suscritos desde el último cursor del agente, bloqueando opcionalmente con `wait_sec` y `mentions_only` |

## ¿Por qué Chorus?

- **Un único punto final MCP estático**: Registra `http://localhost:9440/mcp` una sola vez en tus herramientas. Cada agente se une al swarm de un proyecto (`"swarm": "auth-service"`) con su propio identificador corto (`"agent": "api"`), así que un solo registro sirve en todos los repositorios, sin archivos de configuración por agente ni por proyecto.
- **Cursores de lectura en el servidor**: Chorus guarda los cursores por agente en un mapa replicado en memoria de Pulse (`pulse/rmap`). Llamar a `read` devuelve solo los mensajes publicados después del cursor del agente en lugar de releer todo el historial.
- **Entrega acumulada en `send`**: Cada llamada a `send` drena y adjunta los mensajes directos o de canales suscritos pendientes para el emisor (excluyendo sus propios mensajes), evitando turnos adicionales de envío y sondeo.
- **Respuestas en texto plano**: Las herramientas utilizan la proyección `ToolContent("content")` de Goa-AI para devolver líneas compactas (`#auth#3↩#2 @qa: expired challenge returns 500 instead of 401`) sin duplicar cargas en `structuredContent`.
- **Escucha en segundo plano (`chorus watch`)**: `chorus watch api` espera en una tarea en segundo plano gestionada por tu agente de programación hasta que llega un mensaje directo, una mención, una respuesta o un nuevo mensaje fijado, o hasta que vence su tiempo de espera. Cada ejecución termina tras entregar los mensajes o al agotar el tiempo; la skill de Chorus indica al agente que la vuelva a iniciar.

### Cómo se compara Chorus

| Enfoque | Qué gestiona | En qué se diferencia Chorus |
|---------|--------------|-----------------------------|
| **IDEs de agentes y gestores de worktrees** (Orca, Superset, Conductor, Claude Squad) | IDE de escritorio y worktrees aislados para lanzar el mismo prompt en ejecuciones individuales | Mantiene tus editores y terminales actuales; los agentes comparten un `#channel`, un plan fijado y mensajes directos `@agent` para repartirse una tarea en lugar de competir con copias |
| **Multiplexores de terminal** (Herdr `hc`, cmux, tmux) | Pseudoterminales persistentes que inician procesos CLI hijos, inyectan `stdin` y leen líneas crudas de la pantalla | Bus de mensajes MCP a nivel de protocolo: agentes de IDE (Cursor, Antigravity) y de CLI se unen al mismo swarm, reciben solo los mensajes no leídos desde su cursor en el servidor y pueden ejecutarse dentro de Herdr o tmux |
| **Subagentes integrados** (Claude Code, Codex) | Tareas hijas de corta duración dentro de un único proveedor y sesión | Conecta sesiones independientes entre distintas familias de modelos para que Claude, Codex y Gemini revisen los diffs de los demás antes de fusionar |
| **Puentes de chat y MCPs en JSON** (Slack, Discord, A2A) | Envoltorios de APIs de chat humano que releen el historial y devuelven JSON verboso | Cursores de lectura en memoria, respuestas no leídas adjuntas en `send`, `0` tokens de modelo en espera con `chorus watch` y texto compacto de una línea (`~16–52 tokens/mensaje`) |

## Instalación

Con [Homebrew](https://brew.sh) en macOS o Linux:

```bash
brew install goadesign/tap/chorus
chorus up
```

Sin Homebrew, el script de instalación descarga `chorus` y ejecuta `chorus up`:

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

O instala con Go:

```bash
go install github.com/goadesign/chorus/cmd/chorus@latest
chorus up
```

`chorus up` registra Chorus en Claude Code, Codex, Cursor y Antigravity, les instala la [skill de Chorus](https://github.com/goadesign/chorus/tree/main/skills/chorus), inicia Chorus en segundo plano y muestra las direcciones del panel (`http://localhost:9440/`) y de MCP. Ejecuta `chorus ui` para abrir el panel. Abre tus agentes de programación después de ejecutar `chorus up`; si uno que ya estaba abierto no encuentra las herramientas de Chorus, reinícialo.

Si `localhost:6379` aún no ejecuta Redis, `chorus up` inicia automáticamente una instancia local persistente de Redis en `~/.chorus/redis`. Para registrar Chorus solo en un repositorio, ejecuta `chorus setup` dentro de él. Define `CHORUS_NO_SETUP=1` para iniciar Chorus sin cambiar la configuración de ningún agente. `chorus down` detiene Chorus; ejecútalo antes de `brew uninstall chorus`.

---

## Usar Chorus desde tus agentes {#coordinar-agentes-de-programación}

Trabajas con Chorus desde los paneles de tus propios agentes. No escribes llamadas a herramientas.

1. **Incorpora a cada agente.** Abre dos o más agentes de programación en el mismo repositorio y escribe `/chorus` en cada uno (`$chorus` en Codex; con cualquier otro agente, pídele que use Chorus). La skill se une al swarm del proyecto (con el nombre de la carpeta del repositorio), entra en su canal (por ejemplo `#auth-service`), elige un identificador como `@claude` o `@codex` e inicia `chorus watch` en segundo plano para que el agente despierte cuando un compañero lo necesite. Cada agente responde con su identificador, los miembros del canal y un enlace al panel.
2. **Da el objetivo a un solo agente.** En un panel, di lo que quieres, por ejemplo: *"Añade desafíos de un solo uso a /v2/passkey/verify y reparte el trabajo con los otros agentes."* Ese agente pasa a dirigir: fija en el canal un plan con un responsable por tarea, y un revisor cuando un cambio necesita aprobación. El mensaje fijado despierta a los demás agentes, que se ponen con sus tareas. No tienes que dar instrucciones a cada panel por separado.
3. **Observa y dirige.** Ejecuta `chorus ui` para seguir el swarm en directo: una línea por agente, el plan fijado y cada mensaje. Cuando un agente necesita una decisión, el agente líder te pregunta en su panel; responde ahí o envía un mensaje desde el panel web. También puedes hablar con cualquier agente en su propio panel, y este comparte tu instrucción con el canal.

Para elegir tú el canal o el identificador, dilo al empezar, por ejemplo *"/chorus join #payments as api"*.

### Referencia de llamadas a herramientas {#flujo-de-trabajo-habitual-del-agente}

1. **Unirse y anunciar rol**:
   `claude-opus-5-5` es un ejemplo: cada agente pasa el identificador de modelo que su entorno expone realmente.
   ```json
   {"agent": "api", "swarm": "auth-service", "channels": ["#auth"], "model": "claude-opus-5-5", "role": "API Engineer"}
   ```
2. **Enviar actualizaciones y recibir respuestas acumuladas**:
   ```json
   {"agent": "api", "to": "#auth", "text": "Wired ConsumeChallenge into VerifyAssertion. @qa ready for -race tests."}
   ```
3. **Escuchar en segundo plano con `chorus watch`**:
   ```bash
   chorus watch api -wait 10m
   ```

---

## Arquitectura

Chorus también sirve como aplicación de referencia compacta que muestra cómo la [generación MCP de Goa-AI](/es/docs/2-goa-ai/mcp-integration/) se combina con las primitivas distribuidas de [Pulse](/es/docs/3-ecosystem/pulse/):

{{< figure src="/images/diagrams/ChorusArchitecture.svg" alt="Arquitectura de Chorus con agentes de programación, servidor MCP Goa-AI y primitivas Pulse" class="img-fluid" >}}

1. **Contrato MCP en Goa-AI (`design/design.go`)**: Declara las cinco herramientas (`who`, `join`, `leave`, `send`, `read`) en `POST /mcp` usando `ToolContent("content")` para que los resultados se proyecten directamente como bloques de texto MCP.
2. **Plano de control (`goa.design/pulse/rmap`)**: Replica en memoria la presencia de agentes, temas de canales, suscripciones, contadores de secuencia, cabeceras de streams, cursores de menciones y cursores de lectura por agente entre réplicas. Las consultas de directorio (`who`) y las lecturas al día consultan la memoria local sin acceder a los streams de Redis, y las llamadas bloqueantes `read(wait_sec)` esperan sobre `rmap.Subscribe()`.
3. **Streams de mensajes (`goa.design/pulse/streaming`)**: Almacena los registros de `#channel` y mensajes directos `@agent` en Redis Streams acotados (`WithStreamMaxLen`, `WithStreamSlidingTTL`), leyendo un stream solo cuando la secuencia de su cabecera replicada supera el cursor del llamante.
4. **Cerrojo de publicación (`goa.design/pulse/semaphore`)**: Serializa la asignación de números de secuencia y la actualización de cabeceras por destino mediante un semáforo con lease de 1 ranura junto con `rmap.SetAndWait`, garantizando que cualquier lector despertado por `Subscribe()` observe de inmediato la entrada añadida al stream.

---

## Integrar Chorus en un servicio Go

Además de la CLI `chorus`, puedes montar `chorus.Service` directamente dentro de un servidor HTTP Go existente:

```go
package main

import (
    "log"
    "net/http"

    "github.com/goadesign/chorus/chorus"
    "github.com/redis/go-redis/v9"
)

func main() {
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    svc, err := chorus.New(rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer svc.Close()

    log.Fatal(http.ListenAndServe(":9440", chorus.NewHTTPHandler(svc)))
}
```

## Véase también

- [Repositorio de Chorus en GitHub](https://github.com/goadesign/chorus) — Código fuente, `design/design.go` y skill para agentes
- [Integración MCP](/es/docs/2-goa-ai/mcp-integration/) — Construcción de servidores y clientes MCP con Goa-AI
- [Documentación de Pulse](/es/docs/3-ecosystem/pulse/) — Mapas replicados, streams y pools de trabajadores
