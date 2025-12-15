---
title: "Documentation"
linkTitle: "Documentation"
weight: 20
description: >
  LLM-optimized documentation for Goa and Goa-AI frameworks. Consolidated pages designed for easy copying into LLM contexts.
llm_optimized: true
content_scope: "Complete Documentation"
aliases:
---

{{< section-llm-info >}}
**📋 LLM-Optimized Documentation** — This documentation is designed for easy copying into LLM contexts. Use the "Copy page" button on any page to copy content as Markdown or Plain Text.
{{< /section-llm-info >}}

## Documentation Sections

This documentation is organized into consolidated, self-contained pages optimized for LLM consumption. Each page can be copied in full to provide comprehensive context.

### Goa Framework

Design-first API development with automatic code generation for Go microservices.

| Guide | Description | ~Tokens |
|-------|-------------|---------|
| [Quickstart](1-goa/quickstart/) | Install Goa and build your first service | ~1,100 |
| [DSL Reference](1-goa/dsl-reference/) | Complete reference for Goa's design language | ~2,900 |
| [Code Generation](1-goa/code-generation/) | Understanding Goa's code generation process | ~2,100 |
| [HTTP Guide](1-goa/http-guide/) | HTTP transport features, routing, and patterns | ~1,700 |
| [gRPC Guide](1-goa/grpc-guide/) | gRPC transport features and streaming | ~1,800 |
| [Error Handling](1-goa/error-handling/) | Defining and handling errors | ~1,800 |
| [Interceptors](1-goa/interceptors/) | Interceptors and middleware patterns | ~1,400 |
| [Production](1-goa/production/) | Observability, security, and deployment | ~1,300 |

**Total Goa Section:** ~14,500 tokens

### Goa-AI Framework

Design-first framework for building agentic, tool-driven systems in Go.

| Guide | Description | ~Tokens |
|-------|-------------|---------|
| [Quickstart](2-goa-ai/quickstart/) | Installation and first agent | ~2,700 |
| [DSL Reference](2-goa-ai/dsl-reference/) | Complete DSL: agents, toolsets, policies, MCP | ~3,600 |
| [Runtime](2-goa-ai/runtime/) | Runtime architecture, plan/execute loop, engines | ~2,400 |
| [Toolsets](2-goa-ai/toolsets/) | Toolset types, execution models, transforms | ~2,300 |
| [Agent Composition](2-goa-ai/agent-composition/) | Agent-as-tool, run trees, streaming topology | ~1,400 |
| [MCP Integration](2-goa-ai/mcp-integration/) | MCP servers, transports, generated wrappers | ~1,200 |
| [Memory & Sessions](2-goa-ai/memory-sessions/) | Transcripts, memory stores, sessions, runs | ~1,600 |
| [Production](2-goa-ai/production/) | Temporal setup, streaming UI, model integration | ~2,200 |

**Total Goa-AI Section:** ~17,600 tokens

## Using This Documentation with LLMs

### Copy Page Feature

Every documentation page includes a "Copy page" button with two options:

- **Copy as Markdown** — Preserves formatting, code block language annotations, and heading hierarchy
- **Copy as Plain Text** — Clean text without markdown syntax, suitable for any context

### Recommended Workflow

1. **Start with the Quickstart** — Copy the quickstart guide to give your LLM basic context
2. **Add specific guides** — Copy relevant guides based on your task (e.g., HTTP Guide for REST APIs)
3. **Include DSL Reference** — For design questions, include the complete DSL reference

### Token Budget Tips

- Each guide is designed to fit within typical LLM context windows
- The complete Goa documentation (~14.5k tokens) fits easily in most modern LLMs
- The complete Goa-AI documentation (~17.6k tokens) is similarly compact
- Both frameworks together (~32k tokens) work well with larger context models

## Key Concepts

### Design-First Development

Both Goa and Goa-AI follow a design-first philosophy:

1. **Define your API/Agent** using a powerful DSL
2. **Generate code** automatically from your design
3. **Implement business logic** in clean, type-safe interfaces
4. **Documentation stays in sync** because it comes from the same source

### Type Safety

Generated code provides end-to-end type safety:

```go
// Generated interface - your contract
type Service interface {
    Add(context.Context, *AddPayload) (int, error)
}

// Your implementation - clean and focused
func (s *service) Add(ctx context.Context, p *calc.AddPayload) (int, error) {
    return p.A + p.B, nil
}
```

## Community

- [Gophers Slack](https://gophers.slack.com/messages/goa) — #goa channel
- [GitHub Discussions](https://github.com/goadesign/goa/discussions) — Questions and ideas
- [Bluesky](https://goadesign.bsky.social) — Updates and announcements

## Contributing

Want to improve the documentation? See the [Contributing Guide](contributing/) for guidelines on canonical homes, cross-linking patterns, and content strategy.
