package design

import . "goa.design/model/dsl"

var _ = Design("Goa Documentation Diagrams", "Architecture diagrams for goa.design documentation", func() {
	Version("1.0.0")

	// =========================================================================
	// Goa Workflow Diagram - Three-phase design workflow
	// =========================================================================

	var GoaWorkflowSystem = SoftwareSystem("Goa Framework", "Design-first API development", func() {
		Container("Design", "design/*.go - Define your API using Goa DSL", "Go DSL", func() {
			Tag("goa", "folder")
			Uses("Generate", "feeds into")
		})

		Container("Generate", "goa gen - Produces server scaffolding, clients, OpenAPI specs", "CLI", func() {
			Tag("goa")
			Uses("Implement", "used by")
		})

		Container("Implement", "service.go - Write your business logic", "Go", func() {
			Tag("goa")
		})
	})

	// =========================================================================
	// Goa-AI Run Tree Diagram - Hierarchical agent execution
	// =========================================================================

	var GoaAISystem = SoftwareSystem("Goa-AI Runtime", "Agentic system runtime", func() {
		Container("Parent Run", "research-assistant", "Agent Run", func() {
			Tag("goa")
			Uses("search_web", "invokes")
			Uses("Child Run", "delegates to", func() { Tag("async") })
			Uses("compile_report", "invokes")
		})

		Container("search_web", "Tool call returning results", "Tool", func() {
			Tag("goa")
		})

		Container("Child Run", "summarizer-agent", "Agent Run", func() {
			Tag("goa")
			Uses("extract_key_points", "invokes")
			Uses("format_markdown", "invokes")
		})

		Container("compile_report", "Tool call returning final_report", "Tool", func() {
			Tag("goa")
		})

		Container("extract_key_points", "Returns summary", "Tool", func() {
			Tag("goa")
		})

		Container("format_markdown", "Returns output", "Tool", func() {
			Tag("goa")
		})
	})

	// =========================================================================
	// Goa-AI Registry Cluster Diagram - Multi-node clustering with shared state
	// =========================================================================

	var RegistryClusterSystem = SoftwareSystem("Registry Cluster", "Multi-node registry cluster", func() {
		Container("Registry 1", "gRPC server handling discovery and invocation", "Registry", func() {
			Tag("goa")
			Uses("Shared State", "Pulse streams, replicated maps")
		})

		Container("Registry 2", "gRPC server handling discovery and invocation", "Registry", func() {
			Tag("goa")
			Uses("Shared State", "Pulse streams, replicated maps")
		})

		Container("Registry N", "gRPC server handling discovery and invocation", "Registry", func() {
			Tag("goa")
			Uses("Shared State", "Pulse streams, replicated maps")
		})

		Container("Shared State", "Toolset registrations, health, streams", "Redis", func() {
			Tag("store")
		})
	})

	// =========================================================================
	// Goa-AI Registry Topology Diagram - Agent-registry-provider flow
	// =========================================================================

	var RegistryTopologySystem = SoftwareSystem("Registry Topology", "Agent-registry-provider topology", func() {
		Container("Agent 1", "AI agent consuming tools", "Agent", func() {
			Tag("goa")
			Uses("Registry", "gRPC")
		})

		Container("Agent 2", "AI agent consuming tools", "Agent", func() {
			Tag("goa")
			Uses("Registry", "gRPC")
		})

		Container("Agent N", "AI agent consuming tools", "Agent", func() {
			Tag("goa")
			Uses("Registry", "gRPC")
		})

		Container("Registry", "Clustered gateway for toolset discovery", "Registry", func() {
			Tag("goa")
			Uses("Provider 1", "Streaming", func() { Tag("async") })
			Uses("Provider 2", "Streaming", func() { Tag("async") })
			Uses("Provider N", "Streaming", func() { Tag("async") })
		})

		Container("Provider 1", "Toolset provider service", "Provider", func() {
			Tag("goa")
		})

		Container("Provider 2", "Toolset provider service", "Provider", func() {
			Tag("goa")
		})

		Container("Provider N", "Toolset provider service", "Provider", func() {
			Tag("goa")
		})
	})

	// =========================================================================
	// Goa-AI Registry Architecture Diagram - Internal components
	// =========================================================================

	var RegistryArchSystem = SoftwareSystem("Registry Architecture", "Internal registry components", func() {
		Container("Registry", "Handles discovery and invocation requests", "gRPC Service", func() {
			Tag("goa")
			Uses("Store", "reads/writes toolset metadata")
			Uses("Health Tracker", "checks provider health")
			Uses("Stream Manager", "routes tool calls")
		})

		Container("Store", "Toolset metadata persistence", "Memory/MongoDB", func() {
			Tag("store")
		})

		Container("Health Tracker", "Monitors provider liveness via ping/pong", "Component", func() {
			Tag("goa")
		})

		Container("Stream Manager", "Manages Pulse streams for tool routing", "Component", func() {
			Tag("goa")
		})
	})

	// =========================================================================
	// Pulse Streaming Diagram - Event producer/consumer architecture
	// =========================================================================

	var PulseStreamingSystem = SoftwareSystem("Pulse Streaming", "Event streaming architecture", func() {
		Container("Event Producer", "Publishes events to streams", "Producer", func() {
			Tag("goa")
			Uses("Stream A", "Add")
			Uses("Stream B", "Add")
		})

		Container("Stream A", "Redis Stream with Topic", "Stream", func() {
			Tag("queue")
			Uses("Event Consumer", "Event", func() { Tag("async") })
		})

		Container("Stream B", "Redis Stream with Topic", "Stream", func() {
			Tag("queue")
			Uses("Event Consumer", "Event", func() { Tag("async") })
		})

		Container("Event Consumer", "Consumes events from streams", "Consumer", func() {
			Tag("goa")
		})
	})

	// =========================================================================
	// Pulse Worker Pool Diagram - Job dispatch architecture
	// =========================================================================

	var PulsePoolSystem = SoftwareSystem("Pulse Worker Pool", "Worker pool architecture", func() {
		Container("Job Producer", "Dispatches jobs with keys", "Producer", func() {
			Tag("goa")
			Uses("Pool Node", "Job+Key")
		})

		Container("Pool Node", "Contains Sink for job routing", "Node", func() {
			Tag("goa")
			Uses("Worker Node", "Job", func() { Tag("async") })
		})

		Container("Worker Node", "Contains Reader and Worker", "Node", func() {
			Tag("goa")
		})
	})

	// =========================================================================
	// Pulse Replicated Map Diagram - Distributed state synchronization
	// =========================================================================

	var PulseRmapSystem = SoftwareSystem("Pulse Replicated Map", "Replicated map architecture", func() {
		Container("Node A", "Application node", "Node", func() {
			Tag("goa")
			Uses("Replicated Map", "Set")
		})

		Container("Replicated Map", "Eventually-consistent key-value store", "Redis", func() {
			Tag("store")
			Uses("Node B", "Update", func() { Tag("async") })
		})

		Container("Node B", "Application node", "Node", func() {
			Tag("goa")
		})
	})

	// =========================================================================
	// Views
	// =========================================================================

	Views(func() {
		ContainerView(GoaWorkflowSystem, "GoaWorkflow", "Goa three-phase workflow: Design → Generate → Implement", func() {
			Add("Design")
			Add("Generate")
			Add("Implement")
			AutoLayout(RankLeftRight)
		})

		ContainerView(GoaAISystem, "RunTree", "Hierarchical agent execution with run trees", func() {
			Add("Parent Run")
			Add("search_web")
			Add("Child Run")
			Add("compile_report")
			Add("extract_key_points")
			Add("format_markdown")
			AutoLayout(RankLeftRight)
		})

		ContainerView(RegistryClusterSystem, "RegistryCluster", "Multi-node registry cluster with shared Redis state", func() {
			Add("Registry 1")
			Add("Registry 2")
			Add("Registry N")
			Add("Shared State")
			AutoLayout(RankLeftRight)
		})

		ContainerView(RegistryTopologySystem, "RegistryTopology", "Agent-registry-provider topology", func() {
			Add("Agent 1")
			Add("Agent 2")
			Add("Agent N")
			Add("Registry")
			Add("Provider 1")
			Add("Provider 2")
			Add("Provider N")
			AutoLayout(RankLeftRight)
		})

		ContainerView(RegistryArchSystem, "RegistryArchitecture", "Internal registry components", func() {
			Add("Registry")
			Add("Store")
			Add("Health Tracker")
			Add("Stream Manager")
			AutoLayout(RankLeftRight)
		})

		ContainerView(PulseStreamingSystem, "PulseStreaming", "Event streaming architecture", func() {
			Add("Event Producer")
			Add("Stream A")
			Add("Stream B")
			Add("Event Consumer")
			AutoLayout(RankLeftRight)
		})

		ContainerView(PulsePoolSystem, "PulsePool", "Worker pool job dispatch", func() {
			Add("Job Producer")
			Add("Pool Node")
			Add("Worker Node")
			AutoLayout(RankLeftRight)
		})

		ContainerView(PulseRmapSystem, "PulseRmap", "Replicated map synchronization", func() {
			Add("Node A")
			Add("Replicated Map")
			Add("Node B")
			AutoLayout(RankLeftRight)
		})

		ApplyGoaStyles()
	})
})
