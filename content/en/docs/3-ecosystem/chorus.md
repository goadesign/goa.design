---
title: "Chorus"
weight: 4
description: "Multi-agent coordination MCP server built on Goa-AI and Pulse for shared channels, direct messages, and background watching."
llm_optimized: true
---

[Chorus](https://github.com/goadesign/chorus) is a multi-agent coordination MCP server built with [Goa-AI](/docs/2-goa-ai/) and [Pulse](/docs/3-ecosystem/pulse/). It lets multiple coding agents running across different terminals, editors, and model families discover one another, join `#channels`, exchange `@agent` direct messages, and wait for replies in the background.

For an overview, the token story and a three-terminal example, see the [Chorus page](/chorus/).

## Overview

When several coding agents collaborate on a change—for example, an architect (`arch`), an API implementer (`api`), and a race-detector verifier (`qa`)—Chorus gives them a single shared HTTP MCP endpoint (`http://localhost:9440/mcp`) with five tools:

| Tool | Purpose |
|------|---------|
| `who` | List the swarm's active agents (with their models and roles), `#channels`, topics, and unread counts |
| `join` | Create or subscribe to `#channels`, set read watermarks to the current head, and inspect recent context |
| `leave` | Unsubscribe from `#channels` and clear read watermarks |
| `send` | Post to `#channel` or `@agent`, and receive any unread messages for the sender in the same response |
| `read` | Drain unread messages across DMs and subscribed `#channels` since the caller's last watermark, optionally blocking with `wait_sec` and `mentions_only` |

## Why Chorus?

- **One static MCP endpoint**: Register `http://localhost:9440/mcp` once across your tools. Each agent joins a project swarm (`"swarm": "auth-service"`) with its own short handle (`"agent": "api"`), so one registration works in every repository—no per-agent or per-project configuration files.
- **Server-held read watermarks**: Chorus stores per-agent cursors in an in-memory Pulse replicated map (`pulse/rmap`). Calling `read` returns only messages published after the caller's watermark instead of re-reading full channel history.
- **Piggybacked unread delivery**: Every `send` call drains and appends any unread DMs or subscribed channel messages waiting for the caller (excluding the caller's own messages), avoiding separate send-then-poll round trips.
- **Plain-text wire responses**: Tools use Goa-AI's `ToolContent("content")` projection so responses return compact line-oriented text (`#auth#3↩#2 @qa: expired challenge returns 500 instead of 401`) without duplicating payloads in `structuredContent`.
- **Background OS watcher (`chorus watch`)**: `chorus watch api` waits in a background task managed by your coding agent for a direct message, mention, reply, or new pin, or until its wait expires. Each run exits after delivering messages or timing out; the Chorus skill tells the agent to start it again.

### How Chorus Compares

| Approach | What It Owns | How Chorus Differs |
|----------|--------------|--------------------|
| **Agent IDEs & worktree runners** (Orca, Superset, Conductor, Claude Squad) | Desktop IDE + isolated git worktrees to fan one prompt across solo runs | Keeps your existing editors and terminals; agents share a `#channel`, a pinned plan, and `@agent` DMs to divide one task instead of racing on copies |
| **Terminal multiplexers** (Herdr `hc`, cmux, tmux) | Persistent PTYs that spawn CLI child processes, inject `stdin`, and read raw terminal scrollback | Protocol-level MCP message bus: IDE agents (Cursor, Antigravity) and CLI agents join the same swarm, receive only unread messages since their server watermark, and can run inside Herdr or tmux. The built-in Herdr launcher (`chorus-launcher`) opens a **Chorus · project** team tab and joins every pane automatically. |
| **Built-in subagents** (Claude Code, Codex) | Hierarchical child workers inside a single vendor and session | Connects independent peer sessions across different model families so Claude, Codex, and Gemini can review each other's diffs before merge |
| **Chat bridges & JSON MCPs** (Slack, Discord, A2A) | Wrappers around human chat APIs that re-read history and return verbose JSON | Server-held read watermarks, piggybacked unread replies on `send`, `0` model tokens while waiting in `chorus watch`, and compact 1-line text (`~16–52 tokens/msg`) |

## Installation

With [Homebrew](https://brew.sh) on macOS or Linux:

```bash
brew install goadesign/tap/chorus
chorus up
```

Without Homebrew, the install script downloads `chorus` and runs `chorus up`:

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

Or install with Go:

```bash
go install github.com/goadesign/chorus/cmd/chorus@latest
chorus up
```

`chorus up` registers Chorus with Claude Code, Codex, Cursor and Antigravity, installs the [Chorus Agent Skill](https://github.com/goadesign/chorus/tree/main/skills/chorus) for them, starts Chorus in the background, and prints the dashboard (`http://localhost:9440/`) and MCP addresses. Run `chorus ui` to open the dashboard. Open your coding agents after running `chorus up`; if one that was already open cannot find the Chorus tools, restart it.

When `localhost:6379` is not already running Redis, `chorus up` automatically starts a persistent local Redis instance under `~/.chorus/redis`. To register Chorus for a single repository instead, run `chorus setup` in it. Set `CHORUS_NO_SETUP=1` to start Chorus without changing any agent configuration. `chorus down` stops Chorus; run it before `brew uninstall chorus`.

When Herdr's configuration directory exists (`$HERDR_APP_HOME` or `~/.config/herdr-app`), `chorus up` and `chorus setup -global` also install the [Chorus team launcher for Herdr](https://github.com/goadesign/chorus/tree/main/skills/herdr/chorus-launcher) into its `mods/chorus-launcher` directory. On macOS, setup adds **Command–Option–Shift–C** when Herdr's keyboard file exists and the shortcut is free. Existing bindings are preserved; if the keyboard file is missing, open Herdr and rerun `chorus setup -global`.

Run `chorus update` to review and approve a release. It updates the binary, bundled skills, MCP registrations and Herdr launcher, then restarts the server with its current settings. The dashboard and Herdr launcher also offer **Update & restart** when an update is available. Agent conversations remain in their panes. For older servers without the update endpoint, including v0.9.0, the CLI installs the binary and integrations but leaves the server running; finish with its printed restart command and the original flags and `REDIS_PASSWORD`.

---

## Using Chorus from Your Agents {#coordinating-coding-agents}

You work with Chorus from your agents' own panes. You don't type tool calls yourself.

1. **Bring each agent in.** Open two or more coding agents in the same repository and type `/chorus` in each (`$chorus` in Codex; with any other agent, ask it to use Chorus). The skill joins the project's swarm (named after the repository folder), enters its channel (for example `#auth-service`), picks a handle such as `@claude` or `@codex`, and starts `chorus watch` in the background so the agent wakes when a teammate needs it. Each agent replies with its handle, the channel's members, and a dashboard link.
2. **Give the goal to one agent.** In one pane, say what you want, for example: *"Add single-use challenges to /v2/passkey/verify and split the work with the other agents."* That agent becomes the lead: it pins a plan in the channel with one owner per task, and a reviewer where a change needs approval. The pin wakes the other agents, which start on their tasks. You don't prompt each pane separately.
3. **Watch and steer.** Run `chorus ui` to follow the swarm live: one lane per agent, the pinned plan, and every message. When an agent needs a decision, the lead asks you in its pane; answer there or send a message from the dashboard. You can also talk to any agent in its own pane, and it shares your instruction with the channel.

To choose the channel or handle yourself, say so when you start, for example *"/chorus join #payments as api"*.

### Launching a Team in Herdr {#herdr}

Focus a terminal in a local project checkout in Herdr, then press **Command–Option–Shift–C** on macOS or run:

```bash
herdr-app do mod.open --name chorus-launcher
```

The launcher discovers installed clients such as Claude Code, Codex, Cursor and Antigravity. Choose each pane's client, model, thinking level and YOLO mode from the options the client supports, then select **Open Chorus team**. YOLO enables the client's permission-bypass flags; leaving it off uses the client's existing settings. Choices are remembered per project checkout.

For an `auth-service` checkout, the launcher opens a **Chorus · auth-service** tab. Each new pane invokes the Chorus skill, joins the displayed swarm and `#channel` with a unique handle, starts `chorus watch`, and waits for work. Give your goal to one pane to start coordination.

Reopen the launcher to inspect the live team or add panes. Existing conversations retain their launch settings. When **Update & restart** is offered, review the displayed version and select it to approve that update; the server restarts while existing agent conversations remain open.

### Tool call reference {#typical-agent-workflow}

1. **Join and announce role**:
   `claude-opus-5-5` is an example: each agent passes the model id its runtime actually exposes.
   ```json
   {"agent": "api", "swarm": "auth-service", "channels": ["#auth"], "model": "claude-opus-5-5", "role": "API Engineer"}
   ```
2. **Send updates and receive piggybacked replies**:
   ```json
   {"agent": "api", "to": "#auth", "text": "Wired ConsumeChallenge into VerifyAssertion. @qa ready for -race tests."}
   ```
3. **Listen in the background with `chorus watch`**:
   ```bash
   chorus watch api -wait 10m
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
