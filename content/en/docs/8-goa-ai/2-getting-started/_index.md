---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
description: >
  Get up and running with Goa-AI quickly - installation, setup, and your first agent.
menu:
  main:
    weight: 2
---

This section guides you through getting started with Goa-AI development. You'll learn how to:

1. [Set up your development environment](./1-installation/) with Go modules and the Goa CLI
2. [Create your first agent](./2-first-agent/) using Goa-AI's design-first approach

## What to Expect

When working with Goa-AI, your development workflow typically follows these steps:

1. **Design First**: Write your agent definition using Goa-AI's DSL in Go
2. **Generate Code**: Use the Goa CLI to generate agent packages, tool specs, and workflows
3. **Implement Planner**: Add your planner logic (LLM integration, tool selection)
4. **Wire Runtime**: Configure the runtime with engines, stores, and feature modules
5. **Test & Run**: Use the generated client to test your agent

## Choose Your Path

After completing the getting started guides, you can:

- Follow the [Simple Agent Tutorial](../4-tutorials/1-simple-agent/) for a deep dive into building basic agents
- Explore [Agent Composition](../4-tutorials/2-agent-composition/) to learn about agent-as-tool patterns
- Learn about [MCP Integration](../4-tutorials/3-mcp-toolsets/) for consuming external tool suites

## Best Practices

- **Keep your design files in a separate `design` package**: This separation helps maintain a clear distinction between your agent design and implementation. It makes it easier to manage changes to your agent contract independently from your planner logic.

- **Run `goa gen` after any design changes**: Keeping generated code in sync with your design is crucial. Running `goa gen` ensures that your agent packages, tool specs, and workflows always reflect your current agent design.

- **Version control your generated code**: While generated code can be recreated, versioning it helps track agent evolution, makes deployments more reliable, and enables easier code review of agent changes.

- **Use the generated tool specs**: The auto-generated tool specs serve as a valuable resource for both development and validation. They provide type-safe access to tool payloads and results.

- **Follow consistent naming conventions**: Use descriptive and consistent names for your agents, toolsets, and tools in your design. This makes your agent architecture more intuitive and easier to maintain.

- **Leverage Goa's type system**: Take advantage of Goa's rich type system to define precise tool payloads and validation rules in your design. This reduces boilerplate validation code and ensures consistent data handling.

Ready to begin? Start with [Installation](./1-installation/) to set up your Goa-AI development environment.


