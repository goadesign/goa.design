---
title: "Highbay"
weight: 5
description: "Build and verify Go services and AI agents with separate coding-agent roles—confirm edge cases in your browser, generate Goa and Goa-AI interfaces, and run independent scenario tests before merging."
llm_optimized: true
---

[Highbay](https://github.com/goadesign/highbay) builds and verifies [Goa](/docs/1-goa/) services and [Goa-AI](/docs/2-goa-ai/) agents with the coding agents you already use, separating who writes the service from who writes the scenario tests that gate approval. You confirm open product choices in your browser, one coding agent implements the service against Goa-generated interfaces, a second coding agent writes scenario tests in its own workspace, and Highbay runs those accepted tests against the candidate commit before you approve and merge.

For an interactive walkthrough of the `$50` refunds example, see the [Highbay page](/highbay/).

## Installation

Highbay runs on macOS or Linux and requires **Go 1.27.3+**, **Git 2.45+** (with `user.name` and `user.email` configured), and **Docker** (used by `check_project` to compile and unit-test builder work inside Linux containers).

Install the `hbay` binary and register your coding agents:

```bash
go install github.com/goadesign/highbay/cmd/hbay@latest
hbay up
```

`hbay up` registers the `hbay stdio` MCP server and `/highbay` (`$highbay` in Codex) skill with detected coding agents—Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI, and VS Code—and starts [Chorus](/docs/3-ecosystem/chorus/) when installed. Use `hbay setup -global` to register MCP and skills without starting Chorus. Reload your coding agent or start a new session if it was already open during setup.

When [Herdr](https://herdr.dev)'s configuration folder (`$HERDR_APP_HOME` or `~/.config/herdr-app`) exists, setup also installs the floating Highbay companion mod into `mods/highbay/` and binds **Command–Option–Shift–H** (`⌥⌘⇧H`) on macOS when the shortcut is free.

---

## Starting a Project {#blank-and-example}

Open a folder in your coding agent and invoke `/highbay` (`$highbay` in Codex):

```text
/highbay — build a refund assistant: refunds up to $50 get instant store credit; larger ones wait for a manager.
```

The first Highbay MCP call starts or attaches to the project's local Highbay server, registers your current session as the `guide`, and calls `open_views` to open the browser page.

When the folder has not been initialized yet, your coding agent calls `init_project(dir: ".")` (deriving `example.com/<folder>` when you did not specify a Go module path; first-time setup takes a couple of minutes while Go modules download and compile):

- **New workspace (`worked_example: false`, default)**: `init_project` and `hbay init` initialize a two-module Go layout (`<module>` and `<module>/eval`) with Goa, Goa-AI, Model, and Story pinned in `go.mod` and a startup readiness check in `eval/`, ready for your own `Story` and `design/`.
- **Runnable sample (`worked_example: true` / `-example`)**: Pass `-example` on the CLI or ask your agent for `worked_example: true` when you want to explore a complete Goa-AI agent, tool, `Story` flow, and scripted evaluation suite first:

```bash
hbay init -dir ./demo-shop -module example.com/shop -example
```

- **Existing Goa repositories**: Adopting Highbay in an existing Goa or Goa-AI repository requires at least one Git commit and either a `<module>/eval` suite in Highbay's layout or a test program registered with `hbay verification set` (when a saved verification suite is configured, Highbay runs it on every change and starts no test writer); see [What a build adds](https://github.com/goadesign/highbay/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds). Note that `hbay gen` and candidate `generate_code` support Goa HTTP, JSON-RPC, and MCP designs; gRPC transport designs are refused because `protoc` finalization is not bundled.

{{< highbay-views >}}

---

## Roles and Responsibilities {#workflow}

When a single coding agent writes both an application and the tests that check it, open product questions get answered silently and encoded into both sides. Highbay separates those duties across distinct workspaces and MCP credentials:

| Participant | Connects Through | Responsibility |
|-------------|------------------|----------------|
| **You** | Browser views page | Answer open questions on the Change Card, inspect the architecture preview, start builds, record approval on a passing report, and merge into your local branch |
| **Guide** | `highbay` MCP (`guide` role) | Your active coding agent session; initializes empty folders, drafts `Story` flows and Goa designs, and proposes or revises Change Cards |
| **Test Writer** | `highbay` MCP (`.highbay-tests` copy) | Writes one scenario test per finished `Story` flow in `eval/` from the confirmed Change Card without editing service code |
| **Builder** | `highbay` MCP (`.highbay-build` copy) | Runs `generate_code` to materialize the agreed design and `gen/`, implements business logic, checks inside a Linux container, and requests verification |
| **Highbay Server** | Per-project local process | Enforces role permissions, compiles and accepts `eval/` suites, builds digest-pinned candidate binaries, runs verification, and records approvals |

---

## Why Code Generation Matters for Coding Agents {#codegen}

If a coding agent writes HTTP routers, JSON-RPC handlers, MCP servers, request validation, and tool JSON schemas by hand, it spends tokens on work Goa can generate and leaves conventions to vary from turn to turn. Highbay makes generation part of the agreed build across separate owners:

- **Service `gen/` (`generate_code`)**: When the builder runs `generate_code`, Highbay writes the open build's agreed `design/` into `.highbay-build` and runs the project's pinned Goa and Goa-AI generators to replace candidate `gen/`—producing handlers, typed clients, codecs, and structural validation for the declared HTTP, JSON-RPC, and MCP transports, plus Goa-AI tool JSON schemas, method bindings, injected fields, confirmation declarations, and `AGENTS_QUICKSTART.md` at the module root (unless disabled). Goa writes those files without model output tokens; overall token savings depend on how much context, iteration, and review the change needs.
- **Focused starting context**: Edits start with `design/` and the relevant generated Go interfaces rather than loading every transport and schema file into the prompt.
- **Uniform generated shape across models**: Regenerating `gen/` from one compiler keeps generated transport, validation, and tool-schema code consistent whether the implementation around it was written by Claude, Codex, or Gemini.
- **Compile-time and server checks across roles**: Giving a method a new result type and regenerating fails `go build` on handlers still returning the old type (while invalid model-authored tool calls are rejected at runtime). Separately, Highbay writes required `Story` flows to `eval/design/story_tests.go` when preparing or checking the test writer's assignment, generates the Go runner in `eval/gen/`, builds the test program and checks its scenario listing, and refuses a `verify_change` commit whose `design/` differs from the agreed revision.

For guidance on structuring Goa and Goa-AI contracts for coding agents, see [Develop with a coding agent](/docs/ai-development/).

---

## Five Checkpoints (`CP1`–`CP5`) {#checkpoints}

Every architecture preview, accepted test commit, live target, verification run, and approval is bound to an exact `request_revision` digest of the Change Card:

1. **`CP1` — Agree on a Change Card**: Your coding agent evaluates a `Story` (`github.com/goadesign/highbay/story/dsl`) in its isolated draft and proposes a Change Card—a one-page summary of the change, any open product questions, concrete acceptance examples, and preserved behaviors. You answer open questions and confirm the card in your browser.
2. **`CP2` — Preview Architecture**: Inspect the C4 containers, Goa-AI agent policies, and tool guardrails declared by the agreed Goa and [Model](/docs/3-ecosystem/model/) design in **Architecture** before starting workers.
3. **`CP3` — Tune Prompts Live (Optional)**: When your service includes a Goa-AI agent and you configure a model provider key or gateway, the builder can start a live copy of the candidate commit and test runtime prompt overrides before committing.
4. **`CP4` — Run Independent Verification**: Highbay compiles and checks the test writer's `eval/` module on branch `highbay/tests-<n>` before accepting that test commit, then builds the builder's candidate commit and runs the accepted test commit against it (no model API key is required unless your `eval/` suite calls a live provider). When an operator configures a separate evaluator with holdouts, Highbay shows each holdout's outcome under an anonymous name and omits its scenario name, checks, and diagnostics from builder-facing reports (`Report.ForBuilders()`; the test writer cannot submit holdouts).
5. **`CP5` — Approve and Merge**: Review the scenario report in **Approve**, record your approval (with optional release-binary digest checks when promotion settings are configured), and click **Merge into current branch** to merge the verified candidate and test commits into your local branch.

---

## Side-by-Side Herdr Panes or Background Workers {#herdr}

On the **Build** view, you pick each worker role's coding agent and model inline (choices are remembered per project). When multiple coding-agent families are installed (for example Claude Code and Codex), Highbay prefers different families for the builder and test writer; a single installed CLI can also fill both roles:

| Worker Mode | When Used | How It Runs |
|-------------|-----------|-------------|
| **Herdr + Chorus** | [Herdr](https://herdr.dev) (`herdr-core`, `herdr-app`) and [Chorus](/docs/3-ecosystem/chorus/) (`chorus up`) are available | Adopts your live coding-agent pane when compatible, splits the `builder` and `test_writer` panes beside it during **Build**, and closes worker panes automatically once the build is merged or dropped. Press **⌥⌘⇧H** on macOS to open the Highbay companion and focus panes or reopen the browser window. |
| **Background workers** | Herdr is not installed or not running | Runs `builder` and `test_writer` as server-supervised non-interactive CLI processes with no Herdr or Chorus requirement once you confirm background worker execution in **Build**. |

---

## Architecture and Process Boundaries {#architecture}

{{< figure src="/images/diagrams/HighbayArchitecture.svg" alt="Highbay architecture showing the Guide agent, Browser page, Highbay Server, Test Writer, Builder, and Verifier" class="img-fluid" >}}

1. **Portable `Story` DSL (`github.com/goadesign/highbay/story/dsl`)**: Declares actors, flows (`StartsWith`, `Step`, `Outcome`), and open `Question` items in Go alongside `design/`. Every finished flow requires a matching scenario test in `eval/` before a build counts (Highbay checks that each required scenario is declared and runs it; it does not judge whether the assertions inside the test are sufficient).
2. **Goa & Goa-AI code generation (`generate_code`)**: Highbay materializes the agreed `design/` into `.highbay-build` and runs the project's pinned Goa and Goa-AI generators atomically so neither agent edits `gen/` by hand.
3. **Test-module acceptance (`internal/testwriter`)**: Before tests count, Highbay regenerates the Story test table, verifies nothing outside `eval/` changed, compiles the test binary, and records the accepted commit on `highbay/tests-<n>`.
4. **Candidate verification & local execution (`verify/candidate`)**: Role credentials limit what each role can call in Highbay—only you can confirm a Change Card, record approval, or merge. Agents, design evaluation, candidate binaries, and `eval/` suites run as ordinary local process groups under your user account with your access to files and the network, while builder `check_project` runs compile and unit checks inside local Docker containers.

## See Also

- [Highbay GitHub Repository](https://github.com/goadesign/highbay) — Source code, `HOW_IT_WORKS.md`, `REFERENCE.md`, and `story/dsl`
- [Highbay Page](/highbay/) — Interactive policy comparison and four-view browser walkthrough
- [Chorus Documentation](/docs/3-ecosystem/chorus/) — Multi-agent `#channel` and `@agent` coordination used by Herdr worker panes
- [Develop with a Coding Agent](/docs/ai-development/) — Design-first Goa and Goa-AI workflow
