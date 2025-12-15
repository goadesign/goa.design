# Requirements Document

## Introduction

This document specifies the requirements for synchronizing goa.design documentation with the latest goa-ai features. The goal is to ensure goa.design is up-to-date and covers ALL features of goa-ai, including new DSL functions, runtime capabilities, and feature modules.

## Glossary

- **Goa-AI**: The design-first framework for building agentic, tool-driven systems in Go
- **DSL**: Domain Specific Language used to declare agents, toolsets, and policies
- **Runtime**: The execution layer that orchestrates agents, enforces policies, and manages state
- **MCP**: Model Context Protocol for integrating external tool servers
- **Toolset**: A collection of tools that agents can use
- **Registry**: A centralized catalog of MCP servers, toolsets, and agents for discovery

## Requirements

### Requirement 1: Document Registry DSL Functions

**User Story:** As a developer, I want to understand how to use the Registry DSL to discover and consume toolsets from centralized catalogs, so that I can integrate external tool sources into my agents.

#### Acceptance Criteria

1. WHEN a developer reads the DSL Reference THEN the documentation SHALL include the `Registry` function with its configuration options (`URL`, `APIVersion`, `RegistryTimeout`, `Retry`, `SyncInterval`, `CacheTTL`)
2. WHEN a developer reads the DSL Reference THEN the documentation SHALL include the `Federation` function with `Include` and `Exclude` patterns for namespace filtering
3. WHEN a developer reads the DSL Reference THEN the documentation SHALL include the `FromRegistry` provider option for toolsets
4. WHEN a developer reads the DSL Reference THEN the documentation SHALL include the `ToolsetVersion` function for pinning registry-backed toolsets
5. WHEN a developer reads the DSL Reference THEN the documentation SHALL include the `PublishTo` function for publishing toolsets to registries

### Requirement 2: Document Timing DSL Functions

**User Story:** As a developer, I want to configure fine-grained timeouts for my agents, so that I can control execution timing at different levels (overall budget, plan activities, tool activities).

#### Acceptance Criteria

1. WHEN a developer reads the DSL Reference THEN the documentation SHALL include the `Timing` function as an alternative to `TimeBudget`
2. WHEN a developer reads the DSL Reference THEN the documentation SHALL include the `Budget`, `Plan`, and `Tools` functions within `Timing`
3. WHEN a developer reads the Runtime documentation THEN the documentation SHALL explain how timing configuration affects activity timeouts

### Requirement 3: Document Cache DSL Functions

**User Story:** As a developer, I want to configure prompt caching for my agents, so that I can optimize model inference costs with providers that support caching.

#### Acceptance Criteria

1. WHEN a developer reads the DSL Reference THEN the documentation SHALL include the `Cache` function within `RunPolicy`
2. WHEN a developer reads the DSL Reference THEN the documentation SHALL include the `AfterSystem` and `AfterTools` cache checkpoint functions
3. WHEN a developer reads the documentation THEN the documentation SHALL explain which providers support prompt caching

### Requirement 4: Document Artifact/Sidecar DSL Function

**User Story:** As a developer, I want to attach full-fidelity data to tool results that is not sent to the model, so that I can provide rich artifacts for UIs while keeping model payloads bounded.

#### Acceptance Criteria

1. WHEN a developer reads the DSL Reference THEN the documentation SHALL include the `Artifact` function (also known as `Sidecar`) with its kind parameter
2. WHEN a developer reads the Toolsets documentation THEN the documentation SHALL explain the difference between model-facing results and sidecar data
3. WHEN a developer reads the documentation THEN the documentation SHALL include examples of using sidecars for time series data, graphs, or large result sets

### Requirement 5: Document BoundedResult DSL Function

**User Story:** As a developer, I want to mark tools that return bounded views over larger data sets, so that the runtime can enforce and surface truncation metadata.

#### Acceptance Criteria

1. WHEN a developer reads the DSL Reference THEN the documentation SHALL include the `BoundedResult` function
2. WHEN a developer reads the Toolsets documentation THEN the documentation SHALL explain the `agent.Bounds` contract and how it flows through the runtime
3. WHEN a developer reads the documentation THEN the documentation SHALL explain that services are responsible for trimming and setting bounds metadata

### Requirement 6: Document ToolsetDescription DSL Function

**User Story:** As a developer, I want to add descriptions to my toolsets, so that I can document their purpose and capabilities.

#### Acceptance Criteria

1. WHEN a developer reads the DSL Reference THEN the documentation SHALL include the `ToolsetDescription` function

### Requirement 7: Document UseAgentToolset Alias

**User Story:** As a developer, I want to understand all available ways to reference agent-exported toolsets, so that I can choose the most readable approach for my codebase.

#### Acceptance Criteria

1. WHEN a developer reads the DSL Reference THEN the documentation SHALL mention `UseAgentToolset` as an alias for `AgentToolset` + `Use`

### Requirement 8: Update MCP DSL Documentation

**User Story:** As a developer, I want complete documentation of MCP DSL functions, so that I can build MCP servers and integrate MCP toolsets.

#### Acceptance Criteria

1. WHEN a developer reads the DSL Reference THEN the documentation SHALL include `MCP` as an alias for `MCPServer`
2. WHEN a developer reads the DSL Reference THEN the documentation SHALL include `SubscriptionMonitor` for SSE monitoring of subscriptions
3. WHEN a developer reads the MCP Integration documentation THEN the documentation SHALL explain all MCP transport types (HTTP, SSE, stdio)

### Requirement 9: Document Model Client Rate Limiting

**User Story:** As a developer, I want to understand how to apply adaptive rate limiting to model clients, so that I can manage throughput and handle provider throttling.

#### Acceptance Criteria

1. WHEN a developer reads the Production documentation THEN the documentation SHALL include the `features/model/middleware` package
2. WHEN a developer reads the documentation THEN the documentation SHALL explain the AIMD (additive-increase/multiplicative-decrease) rate limiting strategy
3. WHEN a developer reads the documentation THEN the documentation SHALL include code examples for wiring rate-limited model clients

### Requirement 10: Document Run Phases and Lifecycle

**User Story:** As a developer, I want to understand the run lifecycle and phase transitions, so that I can build UIs that show high-level progress.

#### Acceptance Criteria

1. WHEN a developer reads the Runtime documentation THEN the documentation SHALL explain `run.Phase` values (`prompted`, `planning`, `executing_tools`, `synthesizing`, terminal phases)
2. WHEN a developer reads the documentation THEN the documentation SHALL explain `RunPhaseChanged` hook events
3. WHEN a developer reads the documentation THEN the documentation SHALL explain how stream subscribers map phase changes to `stream.Workflow` payloads

### Requirement 11: Document Transcript Ledger

**User Story:** As a developer, I want to understand how the transcript ledger maintains provider-precise conversation history, so that I can rely on deterministic replay.

#### Acceptance Criteria

1. WHEN a developer reads the Memory & Sessions documentation THEN the documentation SHALL explain the transcript ledger concept
2. WHEN a developer reads the documentation THEN the documentation SHALL explain provider fidelity and ordering requirements
3. WHEN a developer reads the documentation THEN the documentation SHALL explain that the runtime automatically maintains the ledger

### Requirement 12: Document Automatic Thinking/Event Capture

**User Story:** As a developer, I want to understand how the runtime automatically captures streaming events, so that I can write simpler planners.

#### Acceptance Criteria

1. WHEN a developer reads the Runtime documentation THEN the documentation SHALL explain that the runtime decorates model clients to automatically emit events
2. WHEN a developer reads the documentation THEN the documentation SHALL explain that planners no longer need to manually emit streaming events
3. WHEN a developer reads the documentation THEN the documentation SHALL explain the Bedrock client's message ordering validation

### Requirement 13: Document History Policies Completely

**User Story:** As a developer, I want complete documentation of history policies, so that I can manage conversation history effectively.

#### Acceptance Criteria

1. WHEN a developer reads the DSL Reference THEN the documentation SHALL include complete examples for `KeepRecentTurns` and `Compress`
2. WHEN a developer reads the documentation THEN the documentation SHALL explain that `Compress` requires a `HistoryModel` client in the agent config
3. WHEN a developer reads the documentation THEN the documentation SHALL explain that history policies preserve system prompts and turn boundaries

### Requirement 14: Document Stream Profiles Completely

**User Story:** As a developer, I want to understand all available stream profiles, so that I can choose the right visibility for different audiences.

#### Acceptance Criteria

1. WHEN a developer reads the Agent Composition documentation THEN the documentation SHALL list all built-in profiles (`UserChatProfile`, `AgentDebugProfile`, `MetricsProfile`)
2. WHEN a developer reads the documentation THEN the documentation SHALL explain `ChildStreamPolicy` options (`Off`, `Flatten`, `Linked`)
3. WHEN a developer reads the documentation THEN the documentation SHALL explain how to create custom profiles

### Requirement 15: Document Policy Override API

**User Story:** As a developer, I want to understand how to override agent policies at runtime, so that I can adjust behavior for experiments or temporary backoffs.

#### Acceptance Criteria

1. WHEN a developer reads the Runtime documentation THEN the documentation SHALL include the `rt.OverridePolicy` API
2. WHEN a developer reads the documentation THEN the documentation SHALL explain that overrides are local to the current process
3. WHEN a developer reads the documentation THEN the documentation SHALL explain which policy fields can be overridden

### Requirement 16: Document ToolCallMeta

**User Story:** As a developer, I want to understand the metadata available to tool executors, so that I can access run context without fishing values from context.

#### Acceptance Criteria

1. WHEN a developer reads the Toolsets documentation THEN the documentation SHALL explain `ToolCallMeta` fields (`RunID`, `SessionID`, `TurnID`, `ToolCallID`, `ParentToolCallID`)
2. WHEN a developer reads the documentation THEN the documentation SHALL explain that executors receive explicit metadata rather than context values

### Requirement 17: Document Generated Quickstart Guide

**User Story:** As a developer, I want to understand the generated AGENTS_QUICKSTART.md file, so that I can use it as a reference after code generation.

#### Acceptance Criteria

1. WHEN a developer reads the Quickstart documentation THEN the documentation SHALL mention that `goa gen` produces `AGENTS_QUICKSTART.md` at the module root
2. WHEN a developer reads the documentation THEN the documentation SHALL explain how to disable this with `DisableAgentDocs()`

### Requirement 18: Document Tool Display Hints

**User Story:** As a developer, I want to understand how to configure display hints for tool invocations and results, so that I can provide better UI feedback.

#### Acceptance Criteria

1. WHEN a developer reads the DSL Reference THEN the documentation SHALL include `CallHintTemplate` and `ResultHintTemplate` with complete examples
2. WHEN a developer reads the documentation THEN the documentation SHALL explain that templates receive typed structs (Go field names, not JSON keys)
3. WHEN a developer reads the documentation THEN the documentation SHALL recommend keeping hints concise (≤140 characters)
