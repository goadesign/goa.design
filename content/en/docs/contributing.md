---
title: "Contributing to Documentation"
linkTitle: "Contributing"
weight: 100
description: "Guidelines for contributing to Goa documentation: canonical homes, cross-linking, and content strategy."
llm_optimized: true
content_scope: "Documentation Contribution Guide"
---

This guide helps documentation contributors maintain consistency across the Goa documentation. It covers canonical homes for topics, cross-linking patterns, and content strategy.

## Canonical Homes

Every documentation topic has exactly one **canonical home** — the single authoritative location containing full details. Other mentions should provide brief summaries with cross-links to the canonical location.

### Canonical Home Reference

| Topic | Canonical Home | Category |
|-------|---------------|----------|
| **Data Modeling** | [DSL Reference](1-goa/dsl-reference/#data-modeling) | Design |
| **Services & Methods** | [DSL Reference](1-goa/dsl-reference/#services-and-methods) | Design |
| **Streaming (Design)** | [DSL Reference](1-goa/dsl-reference/#streaming) | Design |
| **Static Files (Design)** | [DSL Reference](1-goa/dsl-reference/#static-files) | Design |
| **Error Handling (Design)** | [DSL Reference](1-goa/dsl-reference/#error-handling) | Design |
| **Security Schemes** | [DSL Reference](1-goa/dsl-reference/#security) | Design |
| **HTTP Transport** | [HTTP Guide](1-goa/http-guide/) | Transport |
| **HTTP Streaming** | [HTTP Guide](1-goa/http-guide/#streaming) | Transport |
| **HTTP Error Responses** | [HTTP Guide](1-goa/http-guide/#error-responses) | Transport |
| **gRPC Transport** | [gRPC Guide](1-goa/grpc-guide/) | Transport |
| **gRPC Streaming** | [gRPC Guide](1-goa/grpc-guide/#streaming) | Transport |
| **gRPC Status Codes** | [gRPC Guide](1-goa/grpc-guide/#error-handling) | Transport |
| **Interceptors** | [Interceptors](1-goa/interceptors/) | Cross-Cutting |
| **Observability** | [Clue](3-ecosystem/clue/) | Ecosystem |
| **Distributed Events** | [Pulse](3-ecosystem/pulse/) | Ecosystem |
| **Architecture Diagrams** | [Model](3-ecosystem/model/) | Ecosystem |

### Category Definitions

**Design**: Protocol-agnostic API definitions using Goa DSL. Content here should focus on *what* you're defining, not *how* it behaves in a specific transport.

**Transport**: HTTP or gRPC protocol-specific implementation details. Content here covers transport-specific behavior, configuration, and patterns.

**Cross-Cutting**: Features that apply across transports (interceptors, middleware).

**Ecosystem**: Companion libraries (model, pulse, clue) that extend Goa's capabilities.

## Content Strategy

### Design-Level Documentation

Keep design-level documentation **concise and focused**:

- Explain the DSL syntax and semantics
- Show examples using structured types
- Note which transports support the feature
- Include "Further reading" links to transport guides

**Example pattern:**

```markdown
## Streaming

Goa supports streaming for both payloads and results using `StreamingPayload` 
and `StreamingResult`. The same design works for HTTP (WebSocket/SSE) and gRPC.

[code example]

**Further reading:**
- [HTTP Streaming](../http-guide/#streaming) — WebSocket and SSE implementation
- [gRPC Streaming](../grpc-guide/#streaming) — Bidirectional streaming patterns
```

### Transport-Level Documentation

Transport guides should be **detailed and practical**:

- Start with a "Design Recap" callout linking to the DSL reference
- Cover transport-specific behavior in depth
- Include configuration options and patterns
- Show complete, runnable examples

**Design Recap callout pattern:**

```markdown
{{< alert title="Design Recap" color="info" >}}
Streaming is defined at the design level using `StreamingPayload` and 
`StreamingResult`. See [Streaming in DSL Reference](../dsl-reference/#streaming) 
for design patterns. This section covers HTTP-specific implementation details.
{{< /alert >}}
```

### Ecosystem Documentation

Ecosystem tool pages should be **comprehensive and self-contained**:

- Provide complete context without requiring external references
- Include all necessary imports and setup in code examples
- Document all major features of the library
- Link to GitHub repositories for additional details

## Cross-Linking Guidelines

### When to Cross-Link

Add cross-links when:

- A topic is mentioned outside its canonical home
- Related concepts would help the reader
- A feature has transport-specific behavior documented elsewhere

### Cross-Link Patterns

**Inline links** for brief mentions:

```markdown
Goa supports [streaming](../dsl-reference/#streaming) for real-time data.
```

**"See also" sections** for related topics:

```markdown
## See Also

- [Streaming Design](../dsl-reference/#streaming) — Design-level streaming concepts
- [gRPC Streaming](../grpc-guide/#streaming) — gRPC-specific streaming patterns
```

**"Further reading" sections** at the end of design topics:

```markdown
**Further reading:**
- [HTTP Error Responses](../http-guide/#error-responses) — HTTP status code mapping
- [gRPC Error Handling](../grpc-guide/#error-handling) — gRPC status code mapping
```

## Ecosystem Tools Update Workflow

When updating ecosystem tool documentation (model, pulse, clue):

1. **Update the canonical page first** — Make changes in `3-ecosystem/[tool].md`
2. **Update cross-references** — Check for mentions in other pages that need updating
3. **Keep summaries in sync** — Update the ecosystem index (`3-ecosystem/_index.md`) if the tool's purpose or key features changed
4. **Don't duplicate details** — Other pages should link to the ecosystem page, not repeat its content

### Source of Truth

Ecosystem documentation should reflect the actual library behavior:

- **Clue**: [github.com/goadesign/clue](https://github.com/goadesign/clue)
- **Pulse**: [github.com/goadesign/pulse](https://github.com/goadesign/pulse)
- **Model**: [github.com/goadesign/model](https://github.com/goadesign/model)

When library behavior changes, update the documentation to match.

## LLM-Optimized Content

All documentation should be optimized for both human readers and LLM consumption:

### Self-Contained Sections

Each section should provide complete context:

```markdown
## Health Checks

The `health` package provides HTTP health check endpoints for monitoring service 
availability. Health checks verify that the service and its dependencies (databases, 
external APIs) are functioning correctly.

// Include necessary imports
import "goa.design/clue/health"

// Show complete, runnable example
checker := health.NewChecker(
    health.NewPinger("database", dbAddr),
    health.NewPinger("cache", redisAddr),
)
```

### Inline Definitions

Define technical terms inline rather than relying solely on glossary links:

```markdown
The **canonical home** (the single authoritative location for a topic's detailed 
documentation) for streaming is the DSL Reference.
```

### Explicit Relationships

State connections between concepts explicitly:

```markdown
Error handling spans two layers: the **design layer** where you define errors 
using the `Error` DSL, and the **transport layer** where errors map to HTTP 
status codes or gRPC status codes.
```

### Heading Hierarchy

Use proper heading hierarchy without skipping levels:

```markdown
## Main Topic (h2)
### Subtopic (h3)
#### Detail (h4)
```

## File Organization

### Frontmatter Requirements

Every documentation page needs proper frontmatter:

```yaml
---
title: "Page Title"
linkTitle: "Short Title"  # Optional, for navigation
weight: 2                 # Controls sort order
description: "One-line description for SEO and previews."
llm_optimized: true       # Mark as LLM-optimized
content_scope: "What this page covers"
aliases:                  # Optional, for redirects
  - /old/path/
---
```

### Naming Conventions

- Use lowercase with hyphens: `http-guide.md`, `dsl-reference.md`
- Index files: `_index.md` for section landing pages
- Keep names short but descriptive

## Example: Adding a New Feature

When documenting a new Goa feature:

1. **Identify the canonical home** — Is it design-level (DSL Reference), transport-specific (HTTP/gRPC Guide), or cross-cutting?

2. **Write the canonical content** — Full details, examples, and explanations in the canonical location

3. **Add cross-links** — Brief mentions with links in related pages

4. **Update the index** — If it's a major feature, add it to the relevant section index

5. **Check consistency** — Ensure example names and patterns match across pages

## Checklist for Contributors

Before submitting documentation changes:

- [ ] Content is in the correct canonical home
- [ ] Cross-links point to canonical locations (not duplicated content)
- [ ] Design docs are concise; transport docs are detailed
- [ ] Code examples include necessary imports and context
- [ ] Heading hierarchy is correct (no skipped levels)
- [ ] Frontmatter is complete and accurate
- [ ] Technical terms are defined inline where first used
- [ ] "See also" or "Further reading" sections link to related topics
