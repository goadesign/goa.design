# Implementation Plan

- [x] 1. Update DSL Reference with Registry Functions
  - [x] 1.1 Add Registry function documentation with URL, APIVersion, RegistryTimeout, Retry, SyncInterval, CacheTTL options
    - Include complete code example showing registry declaration
    - _Requirements: 1.1_
  - [x] 1.2 Add Federation function documentation with Include and Exclude patterns
    - Include example showing namespace filtering
    - _Requirements: 1.2_
  - [x] 1.3 Add FromRegistry provider option documentation
    - Show how to create toolsets from registry sources
    - _Requirements: 1.3_
  - [x] 1.4 Add ToolsetVersion function documentation
    - Show version pinning for registry-backed toolsets
    - _Requirements: 1.4_
  - [x] 1.5 Add PublishTo function documentation
    - Show how to publish toolsets to registries
    - _Requirements: 1.5_

- [x] 2. Update DSL Reference with Timing Functions
  - [x] 2.1 Add Timing function documentation as alternative to TimeBudget
    - Include complete code example with Budget, Plan, Tools
    - _Requirements: 2.1, 2.2_
  - [x] 2.2 Update RunPolicy section to reference Timing as advanced option
    - _Requirements: 2.3_

- [x] 3. Update DSL Reference with Cache Functions
  - [x] 3.1 Add Cache function documentation within RunPolicy
    - Include AfterSystem and AfterTools checkpoint functions
    - _Requirements: 3.1, 3.2_
  - [x] 3.2 Add note about provider support for prompt caching
    - _Requirements: 3.3_

- [x] 4. Update DSL Reference with Artifact Function
  - [x] 4.1 Add Artifact function documentation (also known as Sidecar)
    - Include kind parameter explanation
    - Include code example with time series data
    - _Requirements: 4.1, 4.3_

- [x] 5. Update DSL Reference with BoundedResult Function
  - [x] 5.1 Add BoundedResult function documentation
    - Explain bounded view concept
    - _Requirements: 5.1_

- [x] 6. Update DSL Reference with Minor Functions
  - [x] 6.1 Add ToolsetDescription function documentation
    - _Requirements: 6.1_
  - [x] 6.2 Add UseAgentToolset alias mention
    - _Requirements: 7.1_
  - [x] 6.3 Add MCP alias mention (alias for MCPServer)
    - _Requirements: 8.1_
  - [x] 6.4 Add SubscriptionMonitor function documentation
    - _Requirements: 8.2_

- [x] 7. Checkpoint - Verify DSL Reference updates
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update Runtime Documentation
  - [x] 8.1 Add Run Phases section explaining run.Phase values and transitions
    - Include prompted, planning, executing_tools, synthesizing, terminal phases
    - _Requirements: 10.1_
  - [-] 8.2 Add RunPhaseChanged events documentation
    - Explain how stream subscribers map to stream.Workflow payloads
    - _Requirements: 10.2, 10.3_
  - [x] 8.3 Add Automatic Event Capture section
    - Explain decorated model clients
    - Explain simplified planner streaming
    - _Requirements: 12.1, 12.2_
  - [x] 8.4 Add Bedrock validation note
    - Explain message ordering validation when thinking is enabled
    - _Requirements: 12.3_
  - [x] 8.5 Add Policy Override section with rt.OverridePolicy API
    - Explain process-local scope and overridable fields
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 9. Update Toolsets Documentation
  - [x] 9.1 Add ToolCallMeta section explaining executor metadata
    - Document RunID, SessionID, TurnID, ToolCallID, ParentToolCallID fields
    - _Requirements: 16.1, 16.2_
  - [x] 9.2 Enhance Sidecar/Artifact section with usage patterns
    - Explain model-facing vs sidecar data distinction
    - _Requirements: 4.2_
  - [x] 9.3 Enhance BoundedResult section with agent.Bounds contract
    - Explain service responsibility for trimming
    - _Requirements: 5.2, 5.3_

- [x] 10. Update Memory & Sessions Documentation
  - [x] 10.1 Add Transcript Ledger section
    - Explain provider fidelity and ordering requirements
    - Explain automatic ledger maintenance by runtime
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 11. Update Agent Composition Documentation
  - [x] 11.1 Enhance Stream Profiles section with all built-in profiles
    - Document UserChatProfile, AgentDebugProfile, MetricsProfile
    - _Requirements: 14.1_
  - [x] 11.2 Add ChildStreamPolicy documentation
    - Explain Off, Flatten, Linked options
    - _Requirements: 14.2_
  - [x] 11.3 Add custom profile creation guidance
    - _Requirements: 14.3_

- [x] 12. Update Production Documentation
  - [x] 12.1 Add Model Rate Limiting section
    - Document features/model/middleware package
    - Explain AIMD strategy
    - Include wiring code example
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 13. Update Quickstart Documentation
  - [x] 13.1 Add AGENTS_QUICKSTART.md generation mention
    - Explain that goa gen produces contextual quickstart guide
    - _Requirements: 17.1_
  - [x] 13.2 Add DisableAgentDocs() documentation
    - Show how to opt out of quickstart generation
    - _Requirements: 17.2_

- [x] 14. Update DSL Reference with Display Hint Templates
  - [x] 14.1 Enhance CallHintTemplate and ResultHintTemplate documentation
    - Include complete examples with typed struct fields
    - Recommend ≤140 character hints
    - _Requirements: 18.1, 18.2, 18.3_

- [x] 15. Update History Policy Documentation
  - [x] 15.1 Enhance KeepRecentTurns and Compress examples
    - _Requirements: 13.1_
  - [x] 15.2 Add HistoryModel requirement note for Compress
    - _Requirements: 13.2_
  - [x] 15.3 Add turn boundary preservation explanation
    - _Requirements: 13.3_

- [x] 16. Update MCP Integration Documentation
  - [x] 16.1 Ensure all MCP transport types are documented
    - Verify HTTP, SSE, stdio callers are covered
    - _Requirements: 8.3_

- [x] 17. Final Checkpoint - Verify all documentation updates
  - Ensure all tests pass, ask the user if questions arise.
