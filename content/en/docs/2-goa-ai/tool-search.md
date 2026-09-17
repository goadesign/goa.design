---
nav_group: guides
title: "Tool search and dynamic catalogs"
linkTitle: "Tool search and dynamic catalogs"
weight: 25
description: "Generate loading choices and consume changing registry tools without a separate loaded-tool store."
llm_optimized: true
---

Tool search loads definitions when the model needs them. A registry lets providers change the available tools without rebuilding the consumer. These are independent: static tools can use search, and dynamic tools can be advertised immediately.

For compiled tools, add `Deferred()` inside their consuming `Use`. The generator prepares search word counts and the agent's loading choices. Another agent can consume the same tools immediately. For a changing catalog, reuse `Registry`:

```go
var Company = Registry("company", func() {
    URL("https://registry.example")
})
var Records = Toolset(FromRegistry(Company, "records"))

var _ = Service("assistant", func() {
    Agent("reader", "Read records.", func() {
        Use(Records, func() { Deferred() })
    })
    Agent("generalist", "Use the company catalog.", func() {
        Use(Company, func() { Deferred() })
    })
})
```

The reader resolves one required toolset; the generalist resolves every currently listed toolset. Removing `Deferred()` advertises that same catalog immediately. A named source may require `Version("1.2.3")`; this checks the current version, rather than selecting an archived one.

`Deferred()` is valid only inside `Use`. Duplicate or overlapping sources, inline tool declarations on registry references, and exporting registry references are rejected. Provider contracts own tool definitions; run policy filters the resolved catalog before it reaches the model.

Registry references also reject consumer `Tags(...)` overrides and `PublishTo(...)`. Providers own tool tags; consumers filter them through run policy.

## Connect and publish

Construct the clustered registry's generated service client (`registry/gen/registry.Client`) and Pulse result-stream client in application startup code. Connect them before starting runs:

```go
if err := rt.RegisterRegistry("company", registryClient, pulseClient); err != nil {
    return err
}
if err := genreader.RegisterReaderAgent(ctx, rt, genreader.ReaderAgentConfig{
    Planner: myPlanner,
}); err != nil {
    return err
}
client := genreader.NewClient(rt)
```

`Definition()` and `NewClient(rt)` require no catalog arguments and make no network calls. Register compiled tools through the usual generated helpers. The runtime executes registry tools; no discovery callback or custom dynamic executor is required. Generated HTTP catalog clients are a separate transport for matching HTTP servers.

Providers publish generated `ToolSchemas()` records with the existing schema fingerprint and provider registration lifecycle. Their `ConsumerContract` carries search terms, field metadata, required labels, confirmation, pagination, and server-only data. Dynamic service tools support these features; child-agent and control tools remain compiled. Schema-only registrations and unsupported execution kinds fail resolution explicitly.

## Who performs search?

- **OpenAI Responses, direct or Bedrock:** the model emits native client search calls. The adapter ranks permitted tool names, titles, and descriptions using BM25, a word-based relevance algorithm, and returns matching definitions. The first request contains a query-only search tool, with no directory of names or descriptions. The deferred catalog stays in the application.
- **Anthropic Messages, direct or Bedrock:** send the permitted catalog with deferred-loading flags and Claude's hosted search tool. The provider searches and expands definitions. On Bedrock, use the Messages `NewAnthropic` adapter and InvokeModel transport; Converse does not implement search.
- **Other adapters:** unsupported discovery returns `model.ErrToolSearchUnsupported`. There is no eager-loading fallback.

Planners pass `input.Agent.AdvertisedToolDefinitions()` with the current messages to model requests, and explicitly set the model or model class. Search calls stay inside the adapter; planners receive ordinary tool calls. OpenAI requires a positive `MaxTokens` or adapter `MaxCompletionTokens`; native search rounds share that invocation's output budget.

## Catalog changes and history

Each planning activity that can start work reads the declared sources once and keeps that catalog fixed during inference. A later activity reads again, including providers registered since the previous turn. Final-answer-only and explicit finalizer activities do not read the registry. Empty whole registries are valid; missing named sources, version mismatches, duplicate tool identities, failed reads, and removals during resolution fail explicitly.

Accepted calls save only their selected definition, any fixed pagination partner, and the existing registration token. Confirmation, result decoding, and checkpoint restoration use that saved contract without fetching today's catalog. `CallResolvedTool` checks the original token before publication; replacement before publication records `call_not_admitted`. Overload retries retain the token and report `admission_conflict` if that admission was replaced. Published calls retain their original assignment and result.

Native search records remain in existing message metadata. Preserve that metadata through storage and compaction. There is no separate loaded-tool database. Historical definitions explain past calls; current consumption and policy authorize new ones.

Claude add/remove history requires a model supporting tool availability changes. A changed definition under a retained name cannot be replayed by that protocol and is rejected. Start a new conversation or deliberately compact away that retained definition; the adapter never silently resets history. Native-only Claude pause continuation is not implemented.

## Examples and upgrades

Regenerate providers and consumers with Goa v3.31.1. Replace startup `Discover` calls, `RegistryToolsets` inputs, and dynamic executor wiring with `RegisterRegistry`. Upgrade the registry to expose `ResolveToolset` and `CallResolvedTool`, and publish complete `ToolSchemas()` before enabling dynamic consumers. Old schema-only registrations remain usable by existing static integrations, but not by this dynamic path.

Confirmation templates now use JSON names, such as `{{ .key }}`, rather than Go field names such as `{{ .Key }}`. Use `{{ json .value }}` for JSON values and `index` for optional properties.

The goa-ai quickstart includes `go run ./cmd/tool-search -provider openai -model YOUR_MODEL_ID`, or `-provider anthropic`, using the corresponding API-key environment variable. This optional command makes billable model calls; the regular quickstart stays credential-free. The helper returns its fixed Tokyo example. The local SDK test covers search, execution, and replay. A one-tool example does not establish token savings; measure search quality and usage on the chosen model and real catalog.
