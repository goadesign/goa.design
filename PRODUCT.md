# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers using coding agents to build software and developers building AI
agents into products are equally important audiences. This priority was
confirmed by the maintainer.

## Product Purpose

Help developers understand, adopt, and use the Goa ecosystem to build Go
services and AI agents. A visitor should understand what the generator owns,
what they implement, and where to begin.

## Positioning

One Goa ecosystem with two clear entry points: services with Goa and AI agents
with Goa-AI. A Go design defines contracts; code generation produces the types,
validation, clients, transports, schemas, and integration code derived from
those contracts. Developers and coding agents implement application behavior.

The advantage for LLM-assisted development is a smaller authored surface,
explicit edit boundaries, consistent generated structure, and compiler feedback
when implementations no longer satisfy generated interfaces. Token, cost, and
speed improvements are hypotheses to measure, not established benchmarks.

## Operating Context

Developers edit a design, run `goa gen`, implement or update application code,
and run checks. `gen/` is regenerated; `goa example` creates application
scaffolding without replacing existing files. Goa-AI adds tool contracts,
structured completions, evaluation suites, and an execution runtime. It also
generates MCP servers exposing tools, resources, and prompts, and includes a
Redis/Pulse-backed tool registry server for discovery and invocation.

## Capabilities and Constraints

- Preserve Hugo, Docsy, existing documentation routes, and five languages.
- Preserve search, page copying, light and dark themes, diagrams, community
  resources, sponsors, and links to all documented capabilities.
- Keep executable examples consistent with the framework versions they use.
- Distinguish coding agents used during development from agents in a product.
- Goa-AI's in-memory engine is for local execution; production durability
  requires the Temporal engine and appropriate application configuration.
- Authorization, business correctness, side-effect safety, and model quality
  remain application responsibilities.

## Brand Commitments

Use Goa as the ecosystem name, Goa for the service framework, and Goa-AI for
the agent framework. The maintainer requested a clean, professional redesign.
Use plain, technically specific language with a shared identity and equal
entry points. The current maintainer-directed refinement emphasizes the work a
coding agent can avoid, one-command service-designer skill installation, and the
original round black-and-white Goa badge recovered from the repository history.
Make both GitHub repositories immediately accessible from the hero. Public MCP
examples use the framework default without naming a protocol version.

## Evidence on Hand

The Goa and Goa-AI source repositories, their generated-code tests and examples,
the Goa service designer skill, and this site's documentation are available.
Existing sponsor and company assets live under `static/img/`. No measured
10× productivity improvement or token-savings percentage has been supplied.

## Product Principles

- Show a real contract and its generated outputs before making broad claims.
- Put the first successful workflow before the complete capability inventory.
- Explain the shared design model once, then provide focused learning paths.
- Keep long reference material accessible to people and coding agents.
