---
title: "Transcripts & Message Parts"
linkTitle: "Transcripts"
weight: 5
description: "Understand Goa-AI's transcript model and how it simplifies planner and UI state."
---

## Why Transcripts Matter

Goa-AI treats the **transcript** as the single source of truth for a run: an ordered
sequence of messages and tool interactions that is sufficient to:

- reconstruct provider payloads (Bedrock/OpenAI) for every model call,
- drive planners (including retries and tool repair),
- and power UIs with accurate history.

Because the transcript is authoritative, you do **not** need to hand‑manage:

- separate lists of prior tool calls and tool results,
- ad‑hoc “conversation state” structures,
- or per‑turn copies of previous user/assistant messages.

You persist and pass **the transcript only**; Goa-AI and its provider adapters rebuild
everything they need from that.

## Messages and Parts

At the model boundary, Goa-AI uses `model.Message` values (from
`runtime/agent/model`) to represent the transcript. Each message has a role
(`user`, `assistant`) and an ordered list of **parts**:

- **ThinkingPart**  
  Provider reasoning content (plaintext + signature or redacted bytes). Not
  user‑facing; used for audit/replay and optional “thinking” UIs.

- **TextPart**  
  Visible text shown to the user (questions, answers, explanations).

- **ToolUsePart**  
  Assistant‑initiated tool call:
  - `ID`: unique tool_use identifier within the run.
  - `Name`: canonical tool ID (dot‑separated `service.toolset.tool`).
  - `Input`: JSON payload matching the tool’s schema.

- **ToolResultPart**  
  User/tool result correlated with a prior tool_use:
  - `ToolUseID`: the `ID` of the corresponding `ToolUsePart`.
  - `Content`: JSON payload with the tool result (any shape).

Order is sacred:

- A tool‑using assistant message typically looks like:
  - `ThinkingPart`, then one or more `ToolUsePart`s, then optional `TextPart`.
- A user/tool result message typically contains one or more `ToolResultPart`s
  referencing previous tool_use IDs, plus optional user text.

Goa-AI’s provider adapters (e.g., Bedrock Converse) re‑encode these parts into
provider‑specific blocks **without reordering**.

## The Transcript Contract

The high‑level contract (see `docs/transcript_contract.md` in the goa-ai repo) is:

- The application (or runtime) **persists every event** for a run in order:
  - assistant thinking, text, tool_use (ID + args),
  - user tool_result (tool_use_id + content),
  - subsequent assistant messages, and so on.
- Before each model call, the caller supplies the **entire transcript** for that
  run as `[]*model.Message`, with the last element being the new delta
  (user text or tool_result).
- Goa-AI re‑encodes that transcript into the provider’s chat format in the
  same order, preserving:
  - which tools were called, with what inputs,
  - which results were returned, with what outputs,
  - and all visible text and thinking.

There is **no separate “tool history” API**; the transcript is the history.

## How This Simplifies Planners and UIs

Transcripts unlock a much simpler mental model for both planners and UIs:

- **Planners**:
  - Receive the current transcript in `planner.PlanInput.Messages` and
    `planner.PlanResumeInput.Messages`.  
  - Can decide what to do based purely on the messages (including prior
    tool_use/tool_result content), without threading extra state.
  - When they call tools, the runtime records those calls/results as
    `ToolUsePart` / `ToolResultPart` and extends the transcript automatically.

- **UIs**:
  - Can render chat history, tool ribbons, and agent cards from the same
    underlying transcript they persist for the model.
  - Do not need separate “tool log” structures; every tool call/result already
    lives in the transcript with correlated IDs.

- **Provider adapters**:
  - Never guess which tools were called or which results belong where; they
    simply map transcript parts → provider blocks.
  - Avoid double‑encoding or lossy projections; the transcript is already
    provider‑ready.

In other words, once you persist the transcript, you can:

- re‑issue model calls (for retries, new prompts, or analysis),
- rebuild UI views (chat, debug, audit),
- and run diagnostics—**without any extra bookkeeping beyond the transcript**.

## Where Transcripts Come From

There are two common ways transcripts are built and used:

- **Inside Goa-AI agent runs**  
  When you use the generated agents and runtime:
  - The runtime emits hook events (`ToolCallScheduled`, `ToolResultReceived`,
    `AssistantMessageEvent`, `ThinkingBlockEvent`, etc.).
  - Memory subscribers (`memory.Store`) and/or the application persist these as
    `memory.Event`s.
  - Planners and provider adapters see the current transcript via
    `planner.PlanInput.Messages` / `PlanResumeInput.Messages`.
  - You rarely need to touch `model.Message` directly unless you are building
    a custom model client.

- **Custom model clients / external orchestrators**  
  When you call `features/model/*` directly:
  - You assemble or load the transcript as `[]*model.Message`.
  - You pass it to the model client on each call; the client handles provider
    encoding and streaming.
  - You update the transcript based on streamed tool_use/tool_result and text
    parts, then persist it for the next call.

Both paths share the same invariant: the transcript is the only state you need.

## Transcripts and Streaming

Streaming and transcripts are complementary:

- The **streaming layer** (`runtime/agent/stream`) emits real‑time events such
  as `AssistantReply`, `PlannerThought`, `ToolStart`, `ToolEnd`,
  `AgentRunStarted`, etc. These are optimized for UIs and observability.
- The **transcript layer** is optimized for **replay and provider calls**:
  it records thinking/text/tool_use/tool_result in `model.Message` form.

Typical pattern:

1. A run executes; the stream subscriber sends events to your UI sink (SSE, WebSocket, Pulse).
2. A memory subscriber writes durable events (messages, tool calls/results,
   planner notes, thinking) to your chosen store.
3. When you need to call the model again, you rebuild `[]*model.Message` for the
   run from the stored transcript and pass it to the model client.

You can think of the stream as “what the user/operator sees now” and the
transcript as “what the model sees (and will see again)”.

## Design Guidelines for Transcript-Friendly Agents

To get the most out of the transcript model:

- **Always correlate tool results**  
  Make sure tool implementations and planners preserve tool_use IDs and map
  tool results back to the correct `ToolUsePart` via `ToolResultPart.ToolUseID`.

- **Use strong, descriptive schemas**  
  Rich `Args` / `Return` types, descriptions, and examples in your Goa design
  produce clearer tool payloads/results in the transcript, which:
  - helps LLMs repair invalid calls,
  - and makes UIs and audits easier.

- **Let the runtime own state**  
  Avoid maintaining parallel “tool history” arrays or “previous messages”
  slices in your planner. Instead:
  - read from `PlanInput.Messages` / `PlanResumeInput.Messages`,
  - and rely on the runtime to append new thinking/tool_use/tool_result parts.

- **Persist transcripts once, reuse everywhere**  
  Whatever store you choose (Mongo, in‑memory, custom), treat the transcript as
  reusable infrastructure:
  - same transcript backing model calls, chat UI, debug UI, and offline analysis.

For detailed provider‑level rules (especially Bedrock’s thinking/tool_use
requirements), consult the Goa-AI runtime docs in the `goa-ai` repo
(`docs/transcript_contract.md`, `docs/ui_thinking_rendering.md`).


