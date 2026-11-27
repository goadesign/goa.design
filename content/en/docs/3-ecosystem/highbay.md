---
title: "Highbay"
weight: 5
description: "Build and verify APIs, MCP servers, and AI workflows with separate coding-agent roles: confirm open decisions in your browser, generate 70% of non-test Go code (in Highbay's Orders reference service), and run independent scenario tests before merging."
llm_optimized: true
---

[Highbay](https://github.com/goadesign/highbay) gives the coding agents you already use a structured workflow for APIs, MCP servers, and AI workflows. Every service shares one repository layout (`design/`, `gen/`, `cmd/`, `internal/`, `eval/`), built-in architecture rules covering authentication, OpenTelemetry tracing and buffered error logs ([Clue](/docs/3-ecosystem/clue/)), Redis Streams queues and worker pools ([Pulse](/docs/3-ecosystem/pulse/)), and durable workflows, plus deterministic [Goa](/docs/1-goa/) and [Goa-AI](/docs/2-goa-ai/) code generation. You confirm open product and autonomy choices in the browser Studio, one coding agent implements handlers against generated Go interfaces, a second coding agent writes scenario tests in its own Git copy, and Highbay verifies both commits before you approve and merge.

For an interactive walkthrough of the multi-tenant `ops-copilot` incident platform, see the [Highbay page](/highbay/).

## Installation

Highbay runs on macOS or Linux. Building and verifying services uses **Go 1.27.3+**, **Git 2.45+** (with `user.name` and `user.email` configured), and **Docker** (used by `check_project` to compile and unit-test builder work inside Linux containers).

Install `highbay` and register your coding agents with Homebrew, `npx`, or `go install`:

```bash
# macOS or Linux (Homebrew)
brew install goadesign/tap/highbay
highbay up

# Linux or macOS (Node.js 18+)
npx @goadesign/highbay up

# Or with Go 1.27.3+
go install github.com/goadesign/highbay/cmd/highbay@latest
highbay up
```

`highbay up` registers the `highbay stdio` MCP server and `/highbay` (`$highbay` in Codex) skill with detected coding agents (Claude Code, Codex, Cursor, Antigravity, Gemini CLI, Windsurf, GitHub Copilot CLI, and VS Code) and starts [Chorus](/docs/3-ecosystem/chorus/) when installed. Run `highbay update` anytime to update the binary, skills, MCP registrations, and Herdr companion in place, or `highbay setup -global` to register MCP and skills without starting Chorus. Highbay is also listed on the Official MCP Registry (`io.github.goadesign/highbay`), Glama, Serverdex, and as a Claude Code plugin (`/plugin marketplace add goadesign/highbay`). Reload your coding agent or start a new session if it was already open during setup.

When [Herdr](https://herdr.dev)'s configuration folder (`$HERDR_APP_HOME` or `~/.config/herdr-app`) exists, setup also installs the floating Highbay companion into `mods/highbay/` and binds **Command+Option+Shift+H** (`⌥⌘⇧H`) on macOS when the shortcut is free.

## Starting a project {#blank-and-example}

Run `highbay` in a project folder to open the browser Studio. In an empty folder, the Studio presents one goal composer (`Describe what you want to build`), launches your chosen coding agent as the project's `guide`, posts your request to the Chorus **Team conversation** rail, initializes the starter workspace, and opens the first Change Card in **Agree** when ready.

If you already have a coding session open in your editor or terminal, invoke `/highbay` (`$highbay` in Codex) directly:

```text
/highbay Build a multi-tenant incident platform with MCP tools for pod logs and on-call-approved rollbacks.
```

The first Highbay MCP call starts or attaches to the project's local Highbay server, registers your current session as the `guide`, and calls `open_views` to open the Studio. Use **+ New change** in the Studio header whenever you want the guide to draft a separate Change Card while keeping unsaved edits on existing cards intact.

When the folder has not been initialized yet, the guide calls `init_project(dir: ".")` (deriving `example.com/<folder>` when you did not specify a Go module path; first-time setup takes a couple of minutes while Go modules download and compile):

- **New workspace (`worked_example: false`, default)**: `init_project` and `highbay init` create a two-module Go layout (`<module>` and `<module>/eval`) with Goa, Goa-AI, Model, and Story pinned in `go.mod` and a startup readiness check in `eval/`, ready for your own `Story` and `design/`.
- **Runnable sample (`worked_example: true` / `-example`)**: Pass `-example` on the CLI or ask your agent for `worked_example: true` to explore a complete Goa-AI agent, tool, `Story` flow, and scripted evaluation suite first:

```bash
highbay init -dir ./demo-shop -module example.com/shop -example
```

- **Existing Goa repositories**: Adopting Highbay in an existing Goa or Goa-AI repository requires at least one Git commit and either a `<module>/eval` suite in Highbay's layout or a test program registered with `highbay verification set` (when a saved verification suite is configured, Highbay runs it on every change and starts no test writer); see [What a build adds](https://github.com/goadesign/highbay/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds). `highbay gen` and candidate `generate_code` support Goa HTTP, JSON-RPC, and MCP designs; gRPC transport designs are refused because `protoc` finalization is not bundled.

{{< highbay-views >}}

## Roles and Studio layout {#workflow}

When a single coding agent writes both an application and the tests that check it, open product questions get answered silently and encoded into both sides. Highbay separates those duties across distinct workspaces and MCP credentials, while the Studio keeps the active stage (**Agree**, **Architecture**, **Build**, **Verify**, **Approve**) beside the live Chorus **Team conversation** rail and a docked **Terminal** drawer:

| Participant | Connects Through | Responsibility |
|-------------|------------------|----------------|
| **You** | Browser Studio (`/views`) | Confirm open questions on the Change Card, ask the guide for scoped revisions in **Team conversation**, preview architecture, start builds, watch or answer role terminals, approve passing reports, and merge |
| **Guide** | `highbay` MCP (`guide` role) | Initializes empty folders, evaluates `Story` flows and Goa designs in `.highbay-draft`, answers Chorus questions, and proposes or revises Change Cards |
| **Test Writer** | `highbay` MCP (`.highbay-tests` copy) | Writes one scenario test per finished `Story` flow in `eval/` from the confirmed Change Card without editing service code |
| **Builder** | `highbay` MCP (`.highbay-build` copy) | Runs `generate_code` to materialize the agreed design and `gen/`, implements handlers, runs container checks, and requests verification |
| **Highbay Server** | Per-project local process | Enforces role permissions, compiles and accepts `eval/` suites, builds digest-pinned candidate binaries, runs verification, and records approvals |

## Why code generation matters for coding agents {#codegen}

Hand-writing HTTP routers, JSON-RPC handlers, MCP servers, request validation, and tool JSON schemas spends model tokens on boilerplate and lets conventions drift from turn to turn. Highbay makes generation part of the agreed build across separate owners:

- **Service `gen/` (`generate_code`)**: When the builder runs `generate_code`, Highbay writes the open build's agreed `design/` into `.highbay-build` and runs the project's pinned Goa and Goa-AI generators to replace candidate `gen/`. That produces handlers, typed clients, codecs, and structural validation for the declared HTTP, JSON-RPC, and MCP transports, along with Goa-AI tool JSON schemas, method bindings, server-injected fields, confirmation gates, and `AGENTS_QUICKSTART.md` at the module root (unless disabled). Goa writes 70% of non-test Go code in the `Orders` reference service in zero model output tokens; overall token use depends on the context, iteration, and review a change requires.
- **Focused starting context**: Edits start from `design/` and the generated Go interfaces instead of loading every transport and schema file into the prompt.
- **Uniform generated shape across models**: Regenerating `gen/` from one compiler keeps transport, validation, and tool-schema code consistent whether Claude, Codex, or Gemini wrote the surrounding implementation.
- **Compile-time and server checks across roles**: Changing a method's result type and regenerating fails `go build` on handlers still returning the old type, while invalid model-authored tool calls are rejected at runtime. Separately, Highbay writes required `Story` flows to `eval/design/story_tests.go` when preparing or checking the test writer's assignment, generates the Go runner in `eval/gen/`, builds the test program to verify its scenario listing, and refuses any `verify_change` commit whose `design/` differs from the agreed revision.

For guidance on structuring Goa and Goa-AI contracts for coding agents, see [Develop with a coding agent](/docs/ai-development/).

## Five checkpoints (`CP1` to `CP5`) {#checkpoints}

Every architecture preview, accepted test commit, live target, verification run, and approval is bound to an exact `request_revision` digest of the Change Card:

1. **`CP1`: Agree on a Change Card**: Your coding agent evaluates a `Story` (`github.com/goadesign/highbay/story/dsl`) in its `.highbay-draft` copy and proposes a Change Card summarizing the change, open product questions, concrete acceptance examples, and preserved behaviors. You answer open questions, request scoped revisions in **Team conversation** when your answers change the draft, and confirm the card in **Agree**.
2. **`CP2`: Preview architecture**: Inspect the C4 containers, Goa-AI agent policies, and tool guardrails declared by the agreed Goa and [Model](/docs/3-ecosystem/model/) design in **Architecture**, or click **Ask Guide** on any container to discuss it in **Team conversation**.
3. **`CP3`: Tune prompts live (optional)**: When your service includes a Goa-AI agent and you configure a model provider key or gateway, the builder can start a live copy of the candidate commit and test runtime prompt overrides in **Live target** before committing.
4. **`CP4`: Verify the candidate**: Highbay compiles and checks the test writer's `eval/` module on branch `highbay/tests-<n>` before accepting that test commit, then builds the builder's candidate commit and runs the accepted test commit against it in **Verify** (no model API key is required unless your `eval/` suite calls a live provider). If a scenario fails, **Message Builder** opens the conversation composer addressed to `builder` with the failing run details. When an operator configures a separate evaluator with holdouts, Highbay shows each holdout's outcome under an anonymous name and omits its scenario name, checks, and diagnostics from builder-facing reports (`Report.ForBuilders()`; the test writer cannot submit holdouts).
5. **`CP5`: Approve and merge**: Review the passing scenario report in **Approve**, record your approval (with optional release-binary digest checks when promotion settings are configured), and click **Merge into current branch** to merge the verified candidate and test commits into your local branch.

## Live terminals, Herdr panes, and background workers {#herdr}

On **Build**, you pick each worker role's coding agent and model inline (choices are remembered per project). When multiple coding-agent families are installed (for example Claude Code and Codex), Highbay prefers different families for the builder and test writer; a single installed CLI can also fill both roles:

| Worker Mode | When Used | How It Runs |
|-------------|-----------|-------------|
| **Herdr + Chorus** | [Herdr](https://herdr.dev) (`herdr-core`, `herdr-app`) and [Chorus](/docs/3-ecosystem/chorus/) (`chorus up`) are available | Adopts your live coding-agent pane when compatible, runs `builder` and `test_writer` in managed PTYs, streams Chorus messages to **Team conversation**, and lets you watch any role's terminal inside the Studio's docked **Terminal** drawer in read-only mode (switching to **Type in terminal** when a role needs input). Press **⌥⌘⇧H** on macOS to open the Highbay companion. |
| **Background workers** | Herdr is not installed or not running | Runs `builder` and `test_writer` as server-supervised non-interactive CLI processes with no Herdr or Chorus requirement once you confirm background worker execution in **Build**. |

## Architecture and process boundaries {#architecture}

{{< figure src="/images/diagrams/HighbayArchitecture.svg" alt="Highbay architecture showing the Guide agent, Browser Studio, Highbay Server, Test Writer, Builder, and Verifier" class="img-fluid" >}}

1. **Portable `Story` DSL (`github.com/goadesign/highbay/story/dsl`)**: Declares actors, flows (`StartsWith`, `Step`, `Outcome`), and open `Question` items in Go alongside `design/`. Every finished flow requires a matching scenario test in `eval/` before a build counts (Highbay checks that each required scenario is declared and runs it; it does not judge whether the assertions inside the test are sufficient).
2. **Goa and Goa-AI code generation (`generate_code`)**: Highbay materializes the agreed `design/` into `.highbay-build` and runs the project's pinned Goa and Goa-AI generators atomically so neither agent edits `gen/` by hand.
3. **Test-module acceptance (`internal/testwriter`)**: Before tests count, Highbay regenerates the Story test table, verifies nothing outside `eval/` changed, compiles the test binary, and records the accepted commit on `highbay/tests-<n>`.
4. **Candidate verification and local execution (`verify/candidate`)**: Role credentials limit what each role can call in Highbay, so only you can confirm a Change Card, record approval, or merge. Agents, design evaluation, candidate binaries, and `eval/` suites run as ordinary local process groups under your user account with your access to files and the network, while builder `check_project` runs compile and unit checks inside local Docker containers.

## See also

- [Highbay GitHub repository](https://github.com/goadesign/highbay): Source code, `HOW_IT_WORKS.md`, `REFERENCE.md`, and `story/dsl`
- [Highbay page](/highbay/): Interactive Studio walkthrough and capability overview
- [Chorus documentation](/docs/3-ecosystem/chorus/): Multi-agent `#channel` and `@agent` coordination used in **Team conversation**
- [Develop with a coding agent](/docs/ai-development/): Contract-first Goa and Goa-AI workflow
