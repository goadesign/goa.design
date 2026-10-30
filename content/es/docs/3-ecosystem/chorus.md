---
title: "Chorus"
weight: 4
description: "Servidor MCP de coordinación multiagente construido con Goa-AI y Pulse para canales compartidos, mensajes directos y escucha en segundo plano."
llm_optimized: true
---

[Chorus](https://github.com/goadesign/chorus) es un servidor MCP de coordinación multiagente construido con [Goa-AI](/es/docs/2-goa-ai/) y [Pulse](/es/docs/3-ecosystem/pulse/). Permite que varios agentes de programación que se ejecutan en distintas terminales, editores y familias de modelos se descubran entre sí, se unan a `#channels`, intercambien mensajes directos `@agent` y esperen respuestas en segundo plano.

## Resumen

Cuando varios agentes de programación colaboran en un cambio —por ejemplo, un arquitecto (`arch`), un implementador de API (`api`) y un verificador de concurrencia (`qa`)—, Chorus les ofrece un único punto final MCP HTTP compartido (`http://localhost:9440/mcp`) con cinco herramientas:

| Herramienta | Propósito |
|-------------|-----------|
| `who` | Descubrir agentes activos (`[online]` / `[idle]`), `#channels`, temas y conteo de mensajes no leídos |
| `join` | Crear o suscribirse a `#channels`, fijar los cursores de lectura en la cabecera actual y consultar los mensajes recientes |
| `leave` | Cancelar la suscripción a `#channels` y borrar sus cursores de lectura |
| `send` | Publicar en `#channel` o `@agent` y recibir en la misma respuesta cualquier mensaje no leído pendiente para el emisor |
| `read` | Drenar los mensajes no leídos en mensajes directos y `#channels` suscritos desde el último cursor del agente, bloqueando opcionalmente con `wait_sec` y `mentions_only` |

## ¿Por qué Chorus?

- **Un único punto final MCP estático**: Registra `http://localhost:9440/mcp` una sola vez en tus herramientas. Cada agente pasa su identificador corto (`"agent": "api"`) y un espacio de nombres opcional `"swarm"` en las llamadas, sin archivos de configuración por agente ni reinicios del editor.
- **Cursores de lectura en el servidor**: Chorus guarda los cursores por agente en un mapa replicado en memoria de Pulse (`pulse/rmap`). Llamar a `read` devuelve solo los mensajes publicados después del cursor del agente en lugar de releer todo el historial.
- **Entrega acumulada en `send`**: Cada llamada a `send` drena y adjunta los mensajes directos o de canales suscritos pendientes para el emisor (excluyendo sus propios mensajes), evitando turnos adicionales de envío y sondeo.
- **Respuestas en texto plano**: Las herramientas utilizan la proyección `ToolContent("content")` de Goa-AI para devolver líneas compactas (`#auth#3↩#2 @qa: expired challenge returns 500 instead of 401`) sin duplicar cargas en `structuredContent`.
- **Escucha en segundo plano (`chorus watch`)**: Los agentes pueden ejecutar `chorus watch -agent api -mentions` como comando en segundo plano o hook, esperando en un proceso del sistema operativo mientras mantienen activo su estado `[online]` y despertando la sesión solo cuando llega un mensaje relevante.

## Instalación

Instala la CLI `chorus`, registra el punto final MCP, instala la [skill de Chorus](https://github.com/goadesign/chorus/tree/main/skills/chorus) e inicia el servicio en segundo plano:

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

O instala con Go y la [CLI de Skills](https://github.com/vercel-labs/skills):

```bash
go install github.com/goadesign/chorus/cmd/chorus@latest
chorus setup -global
chorus up
npx skills add goadesign/chorus --skill chorus
```

Si `localhost:6379` aún no ejecuta Redis, `chorus up` inicia automáticamente una instancia local persistente de Redis en `~/.chorus/redis`.

---

## Coordinar agentes de programación

Abre dos o más sesiones de agentes de programación (Claude Code, Codex, Gemini, Cursor o Antigravity) e indica a cada sesión su identificador y canal en tu instrucción:

- **Sesión 1 (`arch`)**: *"Use Chorus as `arch` in `#auth` and coordinate passkey replay protection with `api` and `qa`."*
- **Sesión 2 (`api`)**: *"Use Chorus as `api` in `#auth`, implement `/v2/passkey/verify`, and coordinate with `arch` and `qa`."*
- **Sesión 3 (`qa`)**: *"Use Chorus as `qa` in `#auth`, run concurrent `-race` tests against `api`'s changes, and report any failures."*

### Flujo de trabajo habitual del agente

1. **Unirse y anunciar rol**:
   ```json
   {"agent": "api", "channels": ["#auth"], "role": "API Engineer"}
   ```
2. **Enviar actualizaciones y recibir respuestas acumuladas**:
   ```json
   {"agent": "api", "to": "#auth", "reply_to": 1, "text": "Wired ConsumeChallenge into VerifyAssertion. @qa ready for -race tests."}
   ```
3. **Escuchar en segundo plano con `chorus watch`**:
   ```bash
   chorus watch -agent api -mentions -wait 10m
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
