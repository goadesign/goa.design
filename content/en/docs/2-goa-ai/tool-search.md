---
nav_group: guides
title: "Tool search and dynamic catalogs"
linkTitle: "Tool search and dynamic catalogs"
weight: 25
description: "Generate loading choices and consume changing registry tools without a separate loaded-tool store."
llm_optimized: true
---

Tool search loads definitions when the model needs them. A registry lets providers change the available tools without rebuilding the consumer. These are independent: static tools can use search, and dynamic tools can be advertised immediately.

## Choose which tools load through search

Suppose the compiled `Records` toolset defines `lookup`, `search`, and `analyze`. Keep the frequently used `lookup` tool immediately available by deferring only the other two:

```go
Agent("assistant", "Find and analyze records.", func() {
    Use(Records, func() {
        Deferred("search", "analyze")
    })
})
```

Only `search` and `analyze` load through search; `lookup` is advertised immediately. This changes definition loading, not permission or execution. The choice belongs inside the consuming `Use`, never on a shared `Toolset` definition or an `Export`. Shared providers, exports, and other consumers remain unchanged.

Names must exactly match authored local tool names in the compiled toolset: `"search"`, not `"records.search"` or a generated Go name. Named selection supports local tools, agents exposed as tools, external MCP tools with declared schemas, and Goa-backed MCP tools.

- `Deferred()` selects all tools in that `Use`; repeating it is valid.
- Multiple named declarations combine: `Deferred("search")` followed by `Deferred("analyze")` selects both.
- Empty or duplicate names are rejected, including duplicates across declarations. Code generation rejects unknown names after collecting the complete compiled tool list.
- Combining `Deferred()` with any named selection in the same `Use` is rejected.

## Consume a changing catalog

For a changing catalog, use `Registry`. Both `FromRegistry` toolsets and whole registries reject named `Deferred` selections because their tools are resolved at runtime:

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

Duplicate or overlapping sources, inline tool declarations on registry references, and exporting registry references are rejected. Provider contracts own tool definitions; run policy filters the resolved catalog before it reaches the model.

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

Providers publish generated `ToolSchemas()` records with the existing schema fingerprint and provider registration lifecycle. `ConsumerContract` carries search terms, field metadata, required labels, confirmation, pagination, and server-only data. Dynamic service tools and [native Agent tools](../agent-composition/#dynamic-agent-tools) support these contracts; planner control tools remain compiled. Schema-only registrations and unsupported execution kinds fail resolution explicitly.

## Runtime-authored tools and scoped catalogs

The dynamic Agent APIs described here require Goa-AI v0.84.0 or later.

Generated toolset packages also expose `Toolset()`: the authored registration name, description, tags, and fresh tool schemas. For declarations authored dynamically in Go, `runtime/toolregistry/contract.Compile` validates a `*genregistry.ToolSchema` and returns an owned `tools.ToolSpec` with validating JSON codecs. Supply metadata explicitly; the compiler does not infer context or permissions from field names.

Use `contract.Fingerprint(toolset)` for a runtime-authored declaration or a complete `Toolset()` value, including its description and tags. The registration timestamp is excluded. The existing generated `SchemaFingerprint(name)` continues to describe provider registration without optional toolset-level annotations. Generated service tools keep their typed codecs.

For application-specific source selection, implement `runtime.RegistryTools` and attach it with `WithRegistryTools`. Inside `Resolve`, `catalog.RunLabels()` returns a copy of the current run's labels. Use them to choose sources with `IncludeToolset` or `IncludeRegistry`; `Allows` determines which sources saved calls may continue using. Run policy still filters tools. Catalogs belong to individual planning activities, so concurrent sessions do not change one another's tools. Application namespaces and authorization remain application responsibilities.

### Binding generated tools to selected registrations

When an application selects a registry registration for tools already compiled into an Agent, bind it inside `RegistryTools.Resolve` using the activity's `*runtime.RegistryCatalog`:

- **Service-backed tools:** Call `catalog.BindStaticService(registry, expected, selected, readPrevious, names...)` with the complete generated `specs.Toolset()` as `expected`, the owner's `*genregistry.ResolvedToolset` as `selected`, and explicit original tool names. The required service reader receives a context, the saved toolset route and exact registration token. It must use the owner's API to prove that this earlier registration belongs to the same resource, then return its exact `ResolvedToolset`. See the [service binding contract](https://github.com/goadesign/goa-ai/blob/main/docs/tool_search.md#bind-generated-service-tools).
- **Native Agent tools:** Call `catalog.BindStaticAgent(registry, expected, selected, readPrevious, names...)` with the complete generated unbound operation declarations, the owner's `*genregistry.ResolvedToolset`, and every original export name. Its required reader additionally receives the saved `*genregistry.AgentToolTarget`; use that target's configuration reference and the owner's API to prove the same owner and resource, then return the exact earlier registration. This callback has a different signature from the service reader. See the [native Agent binding contract](https://github.com/goadesign/goa-ai/blob/main/docs/tool_search.md#bind-generated-native-agent-tools).

For service execution, construct `runtime/toolregistry/executor.NewResolved(registry, client, pulse, specs, options...)`, where `specs` is the generated specification lookup, and handle its returned error. Calls keep their saved route and token. Native Agent execution uses the existing durable child workflow. Inside `RegistryTools.Resolve`, `catalog.SelectedOperation()` returns an owned copy of the current run's retained native operation; it is a method on the activity's catalog, not a field of `ToolCallMeta`.

Before planning a new page from an earlier result, the runtime calls the appropriate reader and checks the saved operation against the returned declarations. A failed read stops planning. The new page uses the current selected registration after current input and paging checks. Accepted calls and retries retain their saved selection and do not call this reader. Portable bounded-result codecs accept both raw provider semantic JSON (with `planner.ToolResult.Bounds` supplied separately) and finalized JSON results that already include the canonical bounded fields.

### Reuse a checked service declaration

When the complete expected and selected service declarations stay fixed, call `runtime.CompileStaticService(expected, selected)` once. It performs the same complete generated validation and comparison as `BindStaticService`, including operations that are not selected. The returned opaque `*runtime.CompiledStaticService` owns compact operation and pagination-partner selections; later changes to the raw inputs cannot change it.

Each planning activity calls `catalog.BindCompiledStaticService(registry, compiled, readPrevious, names...)` with its own previous-registration reader. Binding checks the activity's current source policy, generated declarations and local tool specifications before installing independent selections. The compiled value retains no full catalog, callback, actor, permission or provider availability.

Applications own this value's lifetime. Compile again when selecting another declaration or registration; an old compiled value does not make an old provider current or grant execution authority. Accepted calls keep their saved selection. Keep `BindStaticService` for mutable declarations: it still checks both complete raw inputs on every call. Concurrent activities may share a compiled value, but raw inputs must not change during compilation. The value has no serialized or durable format.

## Who performs search?

- **OpenAI Responses, direct or Bedrock:** the model emits native client search calls. The adapter ranks permitted tool names, titles, and descriptions using BM25, a word-based relevance algorithm, and returns matching definitions. The first request contains a query-only search tool, with no directory of names or descriptions. The deferred catalog stays in the application.
- **Anthropic Messages, direct or Bedrock:** send the permitted catalog with deferred-loading flags and Claude's hosted search tool. The provider searches and expands definitions. On Bedrock, use the Messages `NewAnthropic` adapter and InvokeModel transport; Converse does not implement search.
- **Other adapters:** unsupported discovery returns `model.ErrToolSearchUnsupported`. There is no eager-loading fallback.

Planners pass `input.Agent.AdvertisedToolDefinitions()` with the current messages to model requests, and explicitly set the model or model class. Search calls stay inside the adapter; planners receive ordinary tool calls. OpenAI requires a positive `MaxTokens` or adapter `MaxCompletionTokens`; native search rounds share that invocation's output budget.

## Catalog changes and history

OpenAI search results place each selected function in a native namespace with the same provider name. This lets Bedrock return a complete call identity for replay. The adapter owns this representation; no namespace DSL, application mapping, or separate loaded-tool state is needed. Eager tools keep their existing representation. Bedrock histories created with bare dynamically loaded functions may contain calls without a namespace that Bedrock rejects during replay. Start a new conversation or deliberately trim the complete affected exchange; the adapter never invents missing provider fields.

Each planning activity that can start work reads the declared sources once and keeps that catalog fixed during inference. A later activity reads again, including providers registered since the previous turn. Final-answer-only and explicit finalizer activities do not read the registry. Empty whole registries are valid; missing named sources, version mismatches, duplicate tool identities, failed reads, and removals during resolution fail explicitly.

Accepted calls save only their selected definition, any fixed pagination partner, and the existing registration token. Confirmation, result decoding, and checkpoint restoration use that saved contract without fetching today's catalog. For service tools, `CallResolvedTool` checks the original token before publication; replacement before publication records `call_not_admitted`. Overload retries retain the token and report `admission_conflict` if that admission was replaced. Published calls retain their original assignment and result.

Native Agent calls retain their selected executor, configuration, and result contract and run as child workflows. Later registry changes affect subsequent planning activities, not already accepted calls.

Native search records remain in existing message metadata. Preserve that metadata through storage and compaction. There is no separate loaded-tool database. Historical definitions explain past calls; current consumption and policy authorize new ones.

Claude add/remove history requires a model supporting tool availability changes. A changed definition under a retained name cannot be replayed by that protocol and is rejected. Start a new conversation or deliberately compact away that retained definition; the adapter never silently resets history. Native-only Claude pause continuation is not implemented.

## Examples and upgrades

Regenerate the consuming agent after changing its `Deferred` selection. Code generation prepares search word counts and emits the selected tools' existing fixed IDs through the same runtime API. Named selection adds no provider API, provider state, or namespace.

In v0.80.0, `Deferred` changed from `func()` to `func(...string)`. Calls to `Deferred()` remain valid, but passing `Deferred` itself as a `func()` callback no longer compiles. Wrap direct callback references:

```go
// Before
Use(Records, Deferred)

// After
Use(Records, func() { Deferred() })
```

Apply the same wrapper to other assignments of `Deferred` to a `func()` callback. This preserves whole-toolset deferral. Wrapping an existing callback alone does not require regeneration.

Regenerate providers and consumers with Goa v3.32.0. Replace startup `Discover` calls, `RegistryToolsets` inputs, and dynamic executor wiring with `RegisterRegistry`. Upgrade the registry to expose `ResolveToolset` and `CallResolvedTool`, and publish complete `ToolSchemas()` before enabling dynamic consumers. Old schema-only registrations remain usable by existing static integrations, but not by this dynamic path.

Confirmation templates now use JSON names, such as `{{ .key }}`, rather than Go field names such as `{{ .Key }}`. Use `{{ json .value }}` for JSON values and `index` for optional properties.

The goa-ai quickstart includes `go run ./cmd/tool-search -provider openai -model YOUR_MODEL_ID`, or `-provider anthropic`, using the corresponding API-key environment variable. This optional command makes billable model calls; the regular quickstart stays credential-free. The helper returns its fixed Tokyo example. The local SDK test covers search, execution, and replay. A one-tool example does not establish token savings; measure search quality and usage on the chosen model and real catalog.
