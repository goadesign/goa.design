# Design Document: Goa-AI Documentation Sync

## Overview

This design document outlines the approach for synchronizing goa.design documentation with the latest goa-ai features. The implementation involves updating existing documentation files and adding new sections to cover undocumented features.

## Architecture

The documentation follows Hugo's content structure with markdown files organized by topic. Each documentation page is designed to be LLM-optimized for easy copying into AI contexts.

### Documentation Structure

```
goa.design/content/en/docs/2-goa-ai/
├── _index.md           # Overview and navigation
├── quickstart.md       # Installation and first agent
├── dsl-reference.md    # Complete DSL function reference
├── runtime.md          # Runtime architecture and concepts
├── toolsets.md         # Toolset types and execution models
├── agent-composition.md # Agent-as-tool patterns
├── mcp-integration.md  # MCP server integration
├── memory-sessions.md  # Transcripts and state management
└── production.md       # Temporal, streaming, reminders
```

## Components and Interfaces

### Documentation Files to Update

1. **dsl-reference.md** - Add new DSL functions:
   - Registry functions (Registry, Federation, Include, Exclude, FromRegistry, ToolsetVersion, PublishTo)
   - Timing functions (Timing, Budget, Plan, Tools)
   - Cache functions (Cache, AfterSystem, AfterTools)
   - Artifact function
   - BoundedResult function
   - ToolsetDescription function
   - UseAgentToolset alias
   - MCP alias and SubscriptionMonitor

2. **runtime.md** - Add runtime concepts:
   - Run phases and lifecycle
   - Automatic event capture
   - Policy override API
   - Decorated model clients

3. **toolsets.md** - Add toolset features:
   - ToolCallMeta documentation
   - Sidecar/Artifact usage patterns
   - BoundedResult and agent.Bounds contract

4. **memory-sessions.md** - Add memory concepts:
   - Transcript ledger
   - Provider fidelity

5. **agent-composition.md** - Add composition features:
   - Complete stream profiles documentation
   - ChildStreamPolicy options

6. **production.md** - Add production features:
   - Model client rate limiting middleware
   - AIMD strategy explanation

7. **quickstart.md** - Add quickstart features:
   - AGENTS_QUICKSTART.md generation
   - DisableAgentDocs() function

## Data Models

### Documentation Page Structure

Each documentation page follows this structure:
- Front matter (title, weight, description, aliases)
- Table of Contents
- Sections with clear headings
- Code examples with syntax highlighting
- Cross-references to related pages

### DSL Function Documentation Format

Each DSL function should be documented with:
- Function signature and context
- Description of purpose
- Parameters and their types
- Code example
- Related functions

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Since this is a documentation update task, the acceptance criteria are primarily example-based (verifying specific content exists) rather than property-based. The correctness of documentation is validated through:

1. **Content Completeness**: Each documented feature must include all required elements (description, parameters, examples)
2. **Code Example Validity**: All code examples must be syntactically correct Go code
3. **Cross-Reference Accuracy**: All links to other documentation pages must be valid

## Error Handling

Documentation errors are handled through:
- Hugo build validation (catches broken links, invalid front matter)
- Manual review of rendered output
- Verification against goa-ai source code

## Testing Strategy

### Manual Verification

1. Build the Hugo site locally to verify no build errors
2. Review each updated page for completeness
3. Verify code examples compile (where applicable)
4. Check cross-references resolve correctly

### Content Checklist

For each requirement, verify:
- [ ] DSL function is documented with correct signature
- [ ] Description matches goa-ai source code comments
- [ ] Code example demonstrates typical usage
- [ ] Related functions are cross-referenced

## Implementation Approach

### Phase 1: DSL Reference Updates

Update `dsl-reference.md` to add:

1. **Registry Functions Section**
```go
// Registry declares a registry source for tool discovery
var CorpRegistry = Registry("corp-registry", func() {
    Description("Corporate tool registry")
    URL("https://registry.corp.internal")
    APIVersion("v1")
    RegistryTimeout("30s")
    Retry(3, "1s")
    SyncInterval("5m")
    CacheTTL("1h")
})

// Federation for external registries
var AnthropicRegistry = Registry("anthropic", func() {
    URL("https://registry.anthropic.com/v1")
    Federation(func() {
        Include("web-search", "code-execution")
        Exclude("experimental/*")
    })
})

// FromRegistry provider option
var RegistryTools = Toolset(FromRegistry(CorpRegistry, "data-tools"))

// Version pinning
var PinnedTools = Toolset(FromRegistry(CorpRegistry, "data-tools"), func() {
    ToolsetVersion("1.2.3")
})
```

2. **Timing Functions Section**
```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")   // overall wall-clock
        Plan("45s")     // timeout for Plan/Resume activities
        Tools("2m")     // default timeout for tool activities
    })
})
```

3. **Cache Functions Section**
```go
RunPolicy(func() {
    Cache(func() {
        AfterSystem()  // checkpoint after system messages
        AfterTools()   // checkpoint after tool definitions
    })
})
```

4. **Artifact Function**
```go
Tool("get_time_series", "Get time series data", func() {
    Args(GetTimeSeriesArgs)
    Return(GetTimeSeriesReturn)
    Artifact("time_series", GetTimeSeriesSidecar)
})
```

5. **BoundedResult Function**
```go
Tool("list_devices", "List devices", func() {
    Args(ListDevicesArgs)
    Return(ListDevicesReturn)
    BoundedResult()
})
```

### Phase 2: Runtime Documentation Updates

Update `runtime.md` to add:

1. **Run Phases Section**
   - Document `run.Phase` values
   - Explain phase transitions
   - Document `RunPhaseChanged` events

2. **Automatic Event Capture Section**
   - Explain decorated model clients
   - Document automatic streaming events
   - Explain Bedrock validation

3. **Policy Override Section**
   - Document `rt.OverridePolicy` API
   - Explain process-local scope
   - List overridable fields

### Phase 3: Toolsets Documentation Updates

Update `toolsets.md` to add:

1. **ToolCallMeta Section**
   - Document all fields
   - Explain explicit metadata pattern

2. **Sidecar/Artifact Section**
   - Explain model-facing vs sidecar data
   - Provide usage examples

3. **BoundedResult Section**
   - Explain `agent.Bounds` contract
   - Document runtime enforcement

### Phase 4: Memory & Sessions Updates

Update `memory-sessions.md` to add:

1. **Transcript Ledger Section**
   - Explain provider fidelity
   - Document automatic maintenance

### Phase 5: Agent Composition Updates

Update `agent-composition.md` to add:

1. **Stream Profiles Section**
   - Document all built-in profiles
   - Explain `ChildStreamPolicy` options
   - Show custom profile creation

### Phase 6: Production Updates

Update `production.md` to add:

1. **Model Rate Limiting Section**
   - Document middleware package
   - Explain AIMD strategy
   - Provide wiring examples

### Phase 7: Quickstart Updates

Update `quickstart.md` to add:

1. **Generated Quickstart Section**
   - Mention AGENTS_QUICKSTART.md
   - Document DisableAgentDocs()

## Dependencies

- Hugo static site generator
- Existing goa.design documentation structure
- goa-ai source code for reference

## Migration Strategy

All changes are additive - no existing documentation is removed. New sections are added to existing files following the established structure and style.
