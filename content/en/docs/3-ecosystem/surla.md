---
title: "Surla"
weight: 5
description: "Contract-driven multi-agent control plane for Goa and Goa-AI that separates intent, test authoring, implementation, and verification."
llm_optimized: true
---

[Surla](https://github.com/goadesign/surla) is a local control plane for building, verifying, and evolving [Goa](/docs/1-goa/) and [Goa-AI](/docs/2-goa-ai/) services with coding agents. It organizes the coding agents you already use into separate roles around one compiled contract, runs independent verification before approval, and merges approved commits into your local branch from your browser.

For a visual walkthrough of one change across roles, see the [Surla page](/surla/).

## Overview {#workflow}

When a single coding agent writes both an application and the tests that judge it, shared assumptions pass unchallenged, and hand-written transport or schema code drifts across features. Surla pairs role separation with Goa and Goa-AI code generation:

| Participant | Connects Through | Responsibility |
|-------------|------------------|----------------|
| **You** | Browser views page | Confirm the Change Card, inspect the architecture preview, start builds, approve passed verification runs, and merge into your local branch |
| **Guide** | `surla` MCP (`guide` role) | Your active coding agent session; initializes empty folders, drafts `Story` flows and Goa designs, and proposes or revises Change Cards |
| **Test Writer** | `surla` MCP (`.surla-tests` copy) | Writes one scenario test per finished `Story` flow in `eval/` from the confirmed Change Card without editing application code |
| **Builder** | `surla` MCP (`.surla-build` copy) | Runs `generate_code` to materialize the agreed design and `gen/`, implements business logic, checks inside a Linux container, and requests verification |
| **Surla Server** | Per-project local process | Enforces role permissions, checks and accepts `eval/` suites, builds digest-pinned candidate binaries, runs verification, and records approvals |

## Five Checkpoints (`CP1`–`CP5`) {#checkpoints}

Every preview, accepted test suite, live target, verification run, and approval is bound to an exact `request_revision` digest of the Change Card:

1. **`CP1` — Agree on a Change Card**: Your coding agent evaluates a `Story` (`github.com/goadesign/surla/story/dsl`) in its isolated draft and proposes a plain-language Change Card containing a summary, open product questions, concrete acceptance examples, and preserved behaviors. You answer open questions and confirm the card on the browser page.
2. **`CP2` — Preview Architecture**: Inspect the C4 architecture diagram derived from the agreed Goa and [Model](/docs/3-ecosystem/model/) design in **Architecture** before starting workers.
3. **`CP3` — Tune Prompts Live (Optional)**: When your service includes a Goa-AI agent and you configure a model provider key or gateway, the builder can start a live copy of the candidate commit and test runtime prompt overrides before committing.
4. **`CP4` — Independent Verification**: Surla compiles and validates the test writer's `eval/` report on branch `surla/tests-<n>` before accepting it, then builds the builder's candidate commit and runs the accepted suite against it (using a deterministic scripted model by default with no API key required). Holdout scenario details are filtered through `Report.ForBuilders()` so builders never see hidden checks.
5. **`CP5` — Approve and Merge**: Review the scenario outcomes in **Approve**, record approval (with optional release-binary digest checks when promotion settings are configured), and click **Merge into current branch** to merge the verified candidate and test commits cleanly.

## Installation

Surla runs on macOS or Linux and requires **Go 1.27+**, **Git 2.45+** (with `user.name` and `user.email` configured), and **Docker** (used by `check_project` to compile and unit-test builder work inside Linux containers).

Install the `surla` binary and register your coding agents:

```bash
go install github.com/goadesign/surla/cmd/surla@latest
surla up
```

`surla up` registers the `surla stdio` MCP server and `/surla` (`$surla` in Codex) skill with detected coding agents—Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI, and VS Code—and starts [Chorus](/docs/3-ecosystem/chorus/) when installed. Use `surla setup -global` to register MCP and skills without starting Chorus. Reload your coding agent or start a new session if it was already open during setup.

When Herdr's configuration folder (`$HERDR_APP_HOME` or `~/.config/herdr-app`) exists, setup also installs the floating Surla companion mod into `mods/surla/` and binds **Command–Option–Shift–S** (`⌥⌘⇧S`) on macOS when the shortcut is free.

---

## Starting a Project: Clean Shell by Default {#blank-and-example}

Open an empty folder or an existing Goa repository in your coding agent and invoke `/surla` (`$surla` in Codex):

```text
/surla — build a refund assistant: refunds up to $50 get instant store credit; larger ones wait for a manager.
```

The first Surla MCP call starts or attaches to the project's Surla server, registers your current session as the `guide`, and calls `open_views` to open the browser page.

When the folder has not been initialized yet, your coding agent calls `init_project(dir: ".")` (deriving `example.com/<folder>` when you did not specify a Go module path):

- **Blank shell by default (`example: false`)**: `init_project` and `surla init` create a clean, domain-neutral two-module Go layout (`<module>` and `<module>/eval`) with Goa, Goa-AI, Model, and Story pinned in `go.mod`, zero sample endpoints or demo agents, and a neutral startup readiness check in `eval/`. Your first Change Card describes only your product rather than explaining how to remove starter code.
- **Opt-in runnable sample (`example: true` / `-example`)**: When you want to explore a complete Goa-AI agent, tool, `Story` flow, and scripted evaluation suite before writing your own service, pass `-example` on the CLI or ask your agent for `example: true`:

```bash
surla init -dir ./demo-shop -module example.com/shop -example
```

---

## Side-by-Side Herdr Panes or Background Workers {#herdr}

On the **Build** view, you pick each worker role's coding agent, model, and permission mode inline (choices are remembered per project):

| Worker Mode | When Used | How It Runs |
|-------------|-----------|-------------|
| **Herdr + Chorus** | `herdr-core`, `herdr-app`, and Chorus (`chorus up`) are available | Adopts your live coding-agent pane when compatible, splits the `builder` and `test_writer` panes beside it during **Build**, and closes worker panes automatically once the build is merged or dropped. Press **⌥⌘⇧S** on macOS to open the Surla companion and focus panes or reopen the browser window. |
| **Background workers** | Herdr is not installed or not running | Runs `builder` and `test_writer` as server-supervised non-interactive CLI processes with no Herdr or Chorus requirement once you confirm background worker execution in **Build**. |

If multiple coding-agent families are installed (for example Claude Code and Codex), Surla defaults the builder and test writer to different families so one model's implementation is tested by another. A single installed CLI can also fill every role.

---

## Architecture and Trust Boundaries {#architecture}

{{< figure src="/images/diagrams/SurlaArchitecture.svg" alt="Surla architecture showing the Guide agent, Browser page, Surla Server, Test Writer, Builder, and Verifier" class="img-fluid" >}}

1. **Portable `Story` DSL (`github.com/goadesign/surla/story/dsl`)**: Declares actors, flows (`StartsWith`, `Step`, `Outcome`), and open `Question` items in Go alongside `design/`. A flow with a start, at least one outcome, and no open questions is *finished* and requires a matching scenario test in `eval/` during **Build**.
2. **Goa & Goa-AI generation (`generate_code`)**: Surla materializes the agreed `design/` into `.surla-build` and runs the project's pinned Goa and Goa-AI generators atomically so neither agent hand-edits `gen/`.
3. **Evaluator acceptance (`internal/testwriter`)**: Before tests count, Surla rewrites the generated Story test table, verifies nothing outside `eval/` was modified, compiles the test binary, and commits the accepted suite to `surla/tests-<n>`.
4. **Candidate verification & process boundary (`verify/candidate`)**: Role credentials enforce who can propose, report tests, verify, or approve, and holdout scenarios remain hidden from builders. Design evaluation, candidate binaries, and `eval/` suites execute as ordinary local process groups with your user account's file and network access (they are separated by duty, not OS-sandboxed), while builder `check_project` runs inside local Docker containers with read-only module caches.

## See Also

- [Surla GitHub Repository](https://github.com/goadesign/surla) — Source code, `HOW_IT_WORKS.md`, `REFERENCE.md`, and `story/dsl`
- [Surla Overview](/surla/) — Interactive walkthrough of one change across roles
- [Chorus Documentation](/docs/3-ecosystem/chorus/) — Multi-agent `#channel` and `@agent` coordination used by Herdr worker panes
- [Develop with a Coding Agent](/docs/ai-development/) — Design-first Goa and Goa-AI workflow
