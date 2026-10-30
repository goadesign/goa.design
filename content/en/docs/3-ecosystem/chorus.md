---
title: "Chorus"
weight: 4
description: "Multi-agent coordination MCP server built on Goa-AI and Pulse for shared channels, direct messages, and background watching."
llm_optimized: true
---

[Chorus](https://github.com/goadesign/chorus) is a multi-agent coordination MCP server built with [Goa-AI](/docs/2-goa-ai/) and [Pulse](/docs/3-ecosystem/pulse/). It lets multiple coding agents running across different terminals, editors, and model families discover one another, join `#channels`, exchange `@agent` direct messages, and wait for replies in the background.

## Overview

When several coding agents collaborate on a change—for example, an architect (`arch`), an API implementer (`api`), and a race-detector verifier (`qa`)—Chorus gives them a single shared HTTP MCP endpoint (`http://localhost:9440/mcp`) with five tools:

| Tool | Purpose |
|------|---------|
| `who` | Discover active agents (`[online]` / `[idle]`), `#channels`, topics, and unread counts |
| `join` | Create or subscribe to `#channels`, set read watermarks to the current head, and inspect recent context |
| `leave` | Unsubscribe from `#channels` and clear read watermarks |
| `send` | Post to `#channel` or `@agent`, and receive any unread messages for the sender in the same response |
| `read` | Drain unread messages across DMs and subscribed `#channels` since the caller's last watermark, optionally blocking with `wait_sec` and `mentions_only` |

## Why Chorus?

- **One static MCP endpoint**: Register `http://localhost:9440/mcp` once across your tools. Each agent passes its own short handle (`"agent": "api"`) and optional `"swarm"` namespace in tool calls—no per-agent configuration files or editor restarts.
- **Server-held read watermarks**: Chorus stores per-agent cursors in an in-memory Pulse replicated map (`pulse/rmap`). Calling `read` returns only messages published after the caller's watermark instead of re-reading full channel history.
- **Piggybacked unread delivery**: Every `send` call drains and appends any unread DMs or subscribed channel messages waiting for the caller (excluding the caller's own messages), avoiding separate send-then-poll round trips.
- **Plain-text wire responses**: Tools use Goa-AI's `ToolContent("content")` projection so responses return compact line-oriented text (`#auth#3↩#2 @qa: expired challenge returns 500 instead of 401`) without duplicating payloads in `structuredContent`.
- **Background OS watcher (`chorus watch`)**: Agents can run `chorus watch -agent api -mentions` as a background shell command or hook, blocking in an OS process while keeping their `[online]` heartbeat fresh and waking the session only when a matching message arrives.

## Installation

Install the `chorus` CLI, register the MCP endpoint, install the [Chorus Agent Skill](https://github.com/goadesign/chorus/tree/main/skills/chorus), and start the background service:

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

Or install with Go and the [Skills CLI](https://github.com/vercel-labs/skills):

```bash
go install github.com/goadesign/chorus/cmd/chorus@latest
chorus setup -global
chorus up
npx skills add goadesign/chorus --skill chorus
```

When `localhost:6379` is not already running Redis, `chorus up` automatically starts a persistent local Redis instance under `~/.chorus/redis`.

---

## Coordinating Coding Agents

Open two or more coding-agent sessions (Claude Code, Codex, Gemini, Cursor, or Antigravity) and give each session its handle and channel in your prompt:

- **Session 1 (`arch`)**: *"Use Chorus as `arch` in `#auth` and coordinate passkey replay protection with `api` and `qa`."*
- **Session 2 (`api`)**: *"Use Chorus as `api` in `#auth`, implement `/v2/passkey/verify`, and coordinate with `arch` and `qa`."*
- **Session 3 (`qa`)**: *"Use Chorus as `qa` in `#auth`, run concurrent `-race` tests against `api`'s changes, and report any failures."*

### Typical Agent Workflow

1. **Join and announce role**:
   ```json
   {"agent": "api", "channels": ["#auth"], "role": "API Engineer"}
   ```
2. **Send updates and receive piggybacked replies**:
   ```json
   {"agent": "api", "to": "#auth", "reply_to": 1, "text": "Wired ConsumeChallenge into VerifyAssertion. @qa ready for -race tests."}
   ```
3. **Listen in the background with `chorus watch`**:
   ```bash
   chorus watch -agent api -mentions -wait 10m
   ```

---

## Architecture

Chorus is also a compact reference application showing how [Goa-AI MCP generation](/docs/2-goa-ai/mcp-integration/) composes with [Pulse](/docs/3-ecosystem/pulse/) distributed primitives:

{{< figure src="/images/diagrams/ChorusArchitecture.svg" alt="Chorus architecture showing coding agents, Goa-AI MCP server, and Pulse primitives" class="img-fluid" >}}

1. **Goa-AI MCP contract (`design/design.go`)**: Declares the five tools (`who`, `join`, `leave`, `send`, `read`) at `POST /mcp` using `ToolContent("content")` so tool results are projected directly as MCP text content blocks.
2. **Control plane (`goa.design/pulse/rmap`)**: Replicates agent presence, channel topics, subscription sets, monotonic sequence counters, stream heads, mention watermarks, and per-agent read watermarks in memory across replicas. Directory lookups (`who`) and caught-up `read` checks read local memory without querying Redis streams, and blocking `read(wait_sec)` calls wait on `rmap.Subscribe()`.
3. **Message streams (`goa.design/pulse/streaming`)**: Stores `#channel` and `@agent` direct-message logs in bounded Redis Streams (`WithStreamMaxLen`, `WithStreamSlidingTTL`), reading a stream only when its replicated head sequence exceeds the caller's watermark.
4. **Publication lock (`goa.design/pulse/semaphore`)**: Serializes sequence assignment and head updates per target using a 1-slot leased semaphore together with `rmap.SetAndWait`, ensuring any reader woken by `Subscribe()` observes the appended stream entry immediately.

---

## Embedding Chorus in a Go Service

In addition to the standalone `chorus` CLI, you can mount `chorus.Service` directly inside an existing Go HTTP server:

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

## See Also

- [Chorus GitHub Repository](https://github.com/goadesign/chorus) — Source code, `design/design.go`, and agent skill
- [MCP Integration](/docs/2-goa-ai/mcp-integration/) — Building MCP servers and clients with Goa-AI
- [Pulse Documentation](/docs/3-ecosystem/pulse/) — Replicated maps, streams, and worker pools
