---
title: "Why Goa-AI?"
linkTitle: "Why Goa-AI?"
weight: 2
description: "Understand why Goa-AI is the right choice for building robust agentic systems."
---

`goa-ai` is an **opinionated, design-first framework** for building production-grade agents in Go.

While many frameworks focus on *prompt engineering* (chains, templates) or *rapid prototyping*, `goa-ai` focuses on **software engineering**: architecture, type safety, reliability, and composability.

Here is why you would use it over a generic LLM library:

## 1. Design-First Contracts (The "Goa" Way)

You define your agents, tools, and policies in a **DSL** (Domain Specific Language). `goa-ai` then generates the glue code.

*   **Why it matters**: You never write brittle "string parsing" code for tool arguments.
*   **The result**: Your tools have **strong schemas**. If an LLM calls a tool with missing fields, the *generated code* catches it at the boundary and provides a structured **Auto-Repair Hint** (`RetryHint`) so the planner can fix it automatically. You get compile-time safety for your agent's interface.

## 2. Agents as First-Class Actors

In `goa-ai`, an agent isn't just a prompt loop. It is a **service**.

*   **Agent-as-Tool**: You can register an entire agent (e.g., `ResearchAgent`) as a *tool* for another agent (e.g., `ChatAgent`).
*   **Run Trees**: The runtime tracks this hierarchy. It doesn't "flatten" the execution; it maintains a **Run Tree** (Parent → Child → Tool).
*   **Why it matters**: You can build complex systems out of small, specialized agents that compose cleanly. The runtime handles the "plumbing" of passing context and linking runs.

## 3. Structured Streaming (Not Just Text)

Most frameworks stream raw text tokens. `goa-ai` streams **Typed Events**.

*   **The Experience**: Your UI receives specific events: `AssistantReply`, `PlannerThought`, `ToolStart`, `AgentRunStarted`.
*   **Topology-Aware**: The stream tells the UI *exactly* what is happening: "The Chat Agent just started a child run of the Research Agent."
*   **Why it matters**: This enables **Rich UIs** (like "Agent Cards" or "Thinking Accordions") instead of just a chat bubble. You can render the *structure* of the thought process, not just the output.

## 4. Production-Ready Runtime

It is built for "Day 2" operations, not just demos.

*   **Durability**: First-class support for **Temporal** workflows. Your agents can run for days (e.g., "Monitor this incident") and survive restarts.
*   **Policy & Caps**: Enforce strict limits (e.g., "Max 5 tool calls", "2 minute budget").
*   **Observability**: Every run is tracked with `RunID`, `SessionID`, and `TurnID`. You can persist transcripts to Mongo and search them later.
*   **MCP Integration**: Native support for the **Model Context Protocol**, so your agents can instantly use external tool servers (GitHub, Slack, Postgres).

## Summary: Systems vs Scripts

Use `goa-ai` if you are building **systems**, not just scripts.

*   **If you want**: To hack together a quick script to "chat with a PDF" or prototype an idea in an afternoon -> Use a dynamic language library.
*   **If you want**: To build a reliable, scalable platform where agents are services, tools are strongly typed, and UIs reflect the real state of the system -> **Use `goa-ai`**.
