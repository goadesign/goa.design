---
nav_group: guides
title: MCP Integration
weight: 50
description: "Build typed MCP servers and clients from Goa designs, with authorization, user input, durable jobs, Apps, and Skills."
llm_optimized: true
aliases:
---

Goa-AI supports both **creating MCP servers** and **consuming external MCP tools**. Add MCP declarations to a Goa service to expose methods as tools, publish resources, and provide prompt templates. The generator produces JSON-RPC protocol handling and service adapters. Hosting an MCP server does not require running a Goa-AI agent.

The HTTP and stdio callers send self-contained requests with protocol metadata. There is no initialization handshake or protocol session. Their `Caller` interface invokes tools; their `Listen` methods receive change notifications. Generated Goa JSON-RPC clients also expose the resource, prompt, discovery, and completion operations declared by the service.

Generated HTTP servers also accept basic MCP `2025-11-25` clients on the same POST URL. Regenerate the server; no service interface or constructor changes are needed. `initialize` replies with `2025-11-25`, then calls carry `MCP-Protocol-Version: 2025-11-25` without a session ID. Tools, resources, prompts and argument completion keep the same authentication, authorization, middleware and typed validation. Object results keep their shape; scalar, array and untagged-union results use `{"value": ...}` and a matching object schema. Structured results are also included as text content. This older path does not offer Tasks, change subscriptions or requests for additional client input. Built-in callers continue to use `2026-07-28`.

One design supplies the tool schema, typed decoding, validation, server adapters
and client bindings. Your configured Goa endpoints keep authentication,
authorization, middleware and application behavior. Developers and coding agents
edit that contract and application code; `goa gen` keeps the derived interfaces
in agreement. Generated MCP servers use HTTP. Subprocess clients remain
available; generated stdio servers are deferred.

Use the [Quickstart module setup](../quickstart/) to install the verified development snapshot and its matching Goa dependency before generating this server.

| What you need | Declare or compose |
|---|---|
| Tools, resources, prompts and suggestions | `Tool`, `Resource`, `ResourceReader`, `Prompt`, `PromptCompletion`, `ResourceCompletion` |
| Authenticated catalogs and change notifications | `ToolCatalog`, `PromptCatalog`, `ResourceCatalog`, `ResourceTemplateCatalog`, `SubscriptionSource` |
| User forms or consent to open a URL | `InputExchange` on an existing Goa method |
| Asynchronous jobs and later host answers | `TaskExchange` with existing create, read, answer and cancel methods |
| Browser interfaces inside an MCP host | `ToolUI`, `ToolVisibility` and `ToolMetadata` with ordinary resources |
| Instructions and supporting files | `SkillCatalog`, `SkillLookup`, optional `ResourceDirectory`, and host-owned loading |

Start with the server below, then add the capabilities your application needs.

## Overview

MCP integration follows this workflow:

1. **Service design**: Declare the MCP server via Goa's MCP DSL
2. **Agent design**: Reference that suite via a toolset declared with `FromMCP(...)` or `FromExternalMCP(...)`
3. **Code generation**: Produces the MCP JSON-RPC server (when Goa-backed) plus runtime registration helpers and toolset-owned specs/codecs for the suite
4. **Runtime wiring**: Instantiate an HTTP or stdio `mcpruntime.Caller`. The
   HTTP caller accepts either a JSON response or an HTTP event stream. Generated
   helpers register the toolset and adapt JSON-RPC errors into
   `planner.ToolFailure` values
5. **Planner execution**: Planners construct calls with generated typed tool
   descriptors; the runtime forwards canonical JSON to the MCP caller, records
   results, and surfaces structured telemetry

---

## Declaring MCP Toolsets

### In Service Design

First, declare the MCP server in your Goa service design:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })
    
    StaticPrompt("find-docs", "Help a user find documentation",
        "user", "Find relevant documentation for the user's question.")

    Method("readme", func() {
        Result(String)
        Resource("readme", "file:///docs/README.md", "text/markdown")
    })

    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
        })
        Tool("search", "Search documents by query")
    })
})
```

### In Agent Design

Then reference the MCP suite in your agent:

```go
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### External MCP Servers with Inline Schemas

For external MCP servers (not Goa-backed), declare tools with inline schemas:

```go
var RemoteSearch = Toolset("remote-search", FromExternalMCP("remote", "search"), func() {
    Tool("web_search", "Search the web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

---

## URL values and mapped attributes

Use Goa’s `Param("payload_field:url_name")` notation to distinguish a payload field from a URL wildcard:

```go
JSONRPC(func() {
    POST("/organizations/{organization}/mcp")
    Param("organization_id:organization")
})
```

The URL supplies `organization_id`. Tool and prompt arguments, schemas, examples, and generated argument codecs exclude that field. An independent domain field named `organization` remains an argument. Each method keeps its declared type, custom Go field name, and validation. Invalid URL values stop before its configured endpoint runs. API and parent service prefixes retain their complete authored paths.

Generated protocol clients carry URL values outside JSON-RPC parameters. Generated `NewCaller` accepts those values in route order after its retry policy; pass `"blue"` last for this route. That caller keeps the same address for every tool call. `NewHTTPCaller` instead receives the complete URL, such as `https://example.com/organizations/blue/mcp`. Regenerate clients, servers, and agent contracts together.

---

## Hosting the generated server

Pass your configured original Goa endpoints to `NewMCPAdapter`, then construct the generated HTTP server. Pass allowed browser origins as the final string arguments to its `New` constructor, such as `"https://app.example.com"`. With no origins, requests without an `Origin` header are accepted and requests carrying that header are rejected.

Use `Server.Use` to install HTTP middleware before requests begin. `Mount(mux)` and direct `ServeHTTP` calls share the same checks for origins, HTTP methods, MCP headers and request metadata before middleware or service work. The origin list is copied during construction. Replace `MountWithOrigins` with constructor arguments and use `ServeHTTP` instead of the removed inner `Handler` field. Regenerate servers and update their callers together.

If a generator plugin declares required server dependencies through Goa's construction plan, pass their typed values before the final origin arguments. Native example startup calls the matching application factories. Configure those factories before starting the example server.

For routes with URL parameters, register `ServeHTTP` with the same mux passed to `New`, or use `Mount(mux)`. The mux supplies path values to generated decoders.

---

## Runtime Wiring

At runtime, instantiate an MCP caller and register the toolset:

```go
import (
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    genchat "example.com/assistant/gen/orchestrator/agents/chat"
    genmcpexec "example.com/assistant/gen/orchestrator/agents/chat/assistant_mcp"
)

// Create an HTTP MCP caller.
caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
if err != nil {
    log.Fatal(err)
}

// Register the MCP toolset
if err := genchat.RegisterUsedToolsets(ctx, rt,
    genchat.WithAssistantMcpExecutor(genmcpexec.NewMCPExecutor(caller)),
); err != nil {
    log.Fatal(err)
}
```

---

## MCP Caller Types

Goa-AI supports HTTP and stdio through the `runtime/mcp` package. Both callers
implement the `Caller` interface:

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
    GetTask(ctx context.Context, taskID string) (Task, error)
    UpdateTask(ctx context.Context, taskID string, responses map[string]json.RawMessage) error
    CancelTask(ctx context.Context, taskID string) error
}
```

`CallRequest` carries the tool name, raw JSON arguments, and an optional host-owned continuation. `CallResponse.Content` is `content.Blocks` from `runtime/content`: ordered text, image, audio, resource-link, or embedded-resource values. Structured JSON stays separate in `StructuredContent`. An `InputRequired` result leaves the operation unfinished; the host supplies requested input before continuing.

### HTTP Caller

For MCP servers accessible via HTTP JSON-RPC:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    Client:   customHTTPClient,
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
```

The constructor validates the endpoint and application identity without making a network request. Each operation sends JSON-RPC over HTTP `POST` and accepts JSON or an event stream. When `Client` is omitted, it uses `http.DefaultClient`; the application owns request deadlines through its context and HTTP client.

### Stdio Caller

For MCP servers running as subprocesses communicating via stdin/stdout:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
    Args:    []string{"--config", "config.json"},
    Env:     []string{"MCP_DEBUG=1"}, // Added to the current environment.
    Dir:     "/path/to/workdir",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
if err != nil {
    return err
}
defer func() {
    if err := caller.Close(shutdownContext); err != nil {
        log.Print(err)
    }
}()
```

The stdio caller starts one subprocess and correlates concurrent operations by request ID. Requests carry their own metadata. Close the caller with an application-owned shutdown context and handle the returned error.

### Custom callers {#callerfunc-adapter}

Implement all four `Caller` methods when supplying a custom transport or test
double. The tool-only `CallerFunc` adapter is removed. Task support uses the same
typed contract as ordinary calls rather than an optional interface assertion.

### Goa-Generated JSON-RPC Caller

For Goa-generated MCP clients that wrap service methods:

```go
import genmcpclient "example.com/assistant/gen/jsonrpc/mcp_assistant/client"

caller, err := genmcpclient.NewCaller(client, mcpruntime.ClientInfo{
    Name: "my-agent", Version: "1.0.0",
}, mcpruntime.InputSupport{}, mcpruntime.HTTPRetryPolicy{})
if err != nil {
    return err
}
```

## Progress and resource changes

Use `WithProgress(ctx, handler)` when the host needs progress before a completed result. Service code calls `ReportProgress`; the transport supplies correlation identifiers. A callback failure stops that operation and must be handled.

```go
err := caller.Listen(ctx, mcpruntime.SubscriptionFilter{
    ResourceSubscriptions: []string{"file:///docs/README.md"},
}, func(ctx context.Context, event mcpruntime.SubscriptionEvent) error {
    return handleResourceChange(ctx, event)
})
if err != nil {
    return err
}
```

Use `Listen` to receive an acknowledgment followed by accepted catalog or resource changes. Check the acknowledged filter: unsupported kinds can be omitted. The application implements `handleResourceChange`, reloads the relevant data, and honors cancellation. A connection loss is an error; the caller does not automatically reconnect.

For a generated JSON-RPC client, use `WithSubscriptionEvents(ctx, handler)` and call its typed `SubscriptionsListen` endpoint. The endpoint returns the final result while the handler receives validated events. A missing handler fails before network dispatch.

### Declaring a resource subscription source

Mark one server-streaming Goa method with `SubscriptionSource()`. Its optional
`resources` input selects URI strings; optional `tasks` fields select native job
identifiers under their creator method names. The required `change` union starts
with `acknowledged`, containing the accepted selection, then identifies resource,
job or catalog changes. Declare `Format(FormatURI)` for resource URIs.

The original method owns authorization and change detection. Generated code
reads changed jobs through their configured observation endpoints and sends full
Task snapshots. The shared transport owns event ordering and request identifiers.
`ToolCatalog`, `PromptCatalog`, `ResourceCatalog` and `ResourceTemplateCatalog`
bind authenticated pages to ordinary Goa methods. The same stream can acknowledge
and emit their list changes. Fixed catalogs do not gain change notifications.
Replace `ResourceSubscription()` with `SubscriptionSource()` and regenerate;
there is no legacy alias.

### Resources, prompts, and rich content

`ResourceTemplate` binds a parameterized URI to a typed read method. `Prompt` binds a method that returns prompt messages. `ResourceCompletion` and `PromptCompletion` bind typed argument suggestions. `ToolContent` selects a typed rich-content field beside the tool’s structured result. These contracts use the same Goa design and generation workflow as ordinary service methods.

### Retrying an interrupted tool response

HTTP calls make one attempt by default. A host can opt into `HTTPRetryPolicy` for a trusted endpoint. An interrupted response is retried only when the selected tool declares read-only or idempotent behavior and the policy trusts those declarations. The retry sends a new request ID and may execute the tool again. Errors, malformed responses, callback failures, and subscription interruptions do not authorize retries.

Local request preparation failures do not imply that the tool ran. Cancellation observed before dispatch sends no request. Once an attempt reaches the HTTP client, losing its response leaves the outcome unknown. Local client errors and unknown tool outcomes both stop agent recovery.

## OAuth authorization {#client-secret-authorization}

Protect MCP methods with native Goa security. Construct a required resource
verifier with `NewJWTResourceServer` for signed access tokens or
`NewIntrospectionResourceServer` for opaque tokens, then pass it to the generated
server constructor. Trusted issuer, audience, keys and introspection credentials
come from application configuration. Missing or invalid credentials receive
401; insufficient scopes receive 403. A verifier outage receives 503. Application
errors after dispatch do not become authorization challenges.

Clients share the ordinary HTTP transport and generated contracts:

- `NewAuthorizationCodeHTTPTransport` runs browser consent with state, issuer
  checks and S256 proof of possession, commonly called PKCE.
- `NewClientCredentialsHTTPTransport` obtains machine grants for a configured
  confidential registration.
- `NewEnterpriseHTTPTransport` exchanges host-validated single sign-on
  credentials through an identity provider and the resource authorization server.

Registration explicitly selects a public client, HTTP Basic, a POST client
secret, or signed client assertions. Preregistered clients and HTTPS client
metadata documents have explicit constructors. Deprecated dynamic registration
is removed. The host owns sign-in, trusted issuer configuration and an
`AuthorizationStore` for each authenticated user or application. Supply encrypted
persistence and cross-instance serialization for durable authorization; the
memory store lasts one process.

Resource discovery and challenges bind credentials to the exact issuer and
audience. The internal delivery URL may differ from that audience. An initial
credential-free discovery request obtains scope guidance before consent. Saved
grants retain established permissions; newly advertised scopes alone do not
trigger another consent flow. A browser or enterprise client can recover once
from an explicit pre-execution authorization rejection. Machine-grant rejection
is terminal. This recovery does not permit replay after an uncertain tool result.

See the framework's [authorization guide](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#mcp-resource-servers)
for configuration, trust and credential-store contracts.

## Additional input and asynchronous Tasks

`InputExchange(continuationField, outcomeField)` binds an existing method's
optional continuation to its required complete/input-required result union.
The pending branch declares typed form or URL requests; the complete branch
alone supplies the advertised tool result. Generation derives form schemas and
typed answer decoders from Goa expressions. Native authentication and method
validation run on every round. State and host answers stay outside model
arguments. URL acceptance records consent; the application checks whether the
external interaction actually finished.

The same method works through MCP, local `BindTo` execution and a registry
provider. The agent suspends while awaiting host input and resumes the exact
unfinished call after a typed response. Sensitive data belongs in an external
URL interaction, rather than a model-visible form.

`TaskExchange(read, answer, cancel)` binds existing durable job methods. Creation
must own accepted work durably before returning a job identifier. Read returns
working, input-required, complete, failed or cancelled state. Answer and cancel
acknowledge accepted intent; subsequent reads establish the effect. The MCP
adapter supplies protocol metadata and typed conversions, while your service
owns job persistence and completion. It does not create another job store.

A direct client advertises support with `WithTaskSupport(ctx)` only when it can
retain and observe the returned `CallResponse.Task`. `GetTask`, `UpdateTask` and
`CancelTask` use the same caller. Generated agent execution retains job identity,
polls or consumes notifications, suspends for user input and settles cancellation
through the configured workflow engine. Production durability requires the
Temporal engine and an application storage implementation; the in-memory engine
provides process-lifetime execution.

See [native input and jobs](https://github.com/goadesign/goa-ai/blob/main/docs/dsl.md#native-job-tools)
for exact declarations and [Task clients](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#mcp-task-clients)
for their state and cancellation contract.

## MCP Apps

Serve an HTML resource with media type `text/html;profile=mcp-app` through the
ordinary resource methods. Inside a tool declaration, `ToolUI("ui://...")`
associates that same-server resource with its result. `ToolVisibility("model")`,
`ToolVisibility("app")`, or both declare who may call the tool; omission permits
both. App-only helpers stay outside generated model catalogs. `ToolMetadata`
selects typed host data separately from model-visible content and structured
results. Hosts without a browser still receive meaningful ordinary tool output.

The host owns browser isolation and app permissions. The maintained
[Apps example](https://github.com/goadesign/goa-ai/tree/main/integration_tests/apps)
composes generated Goa endpoints with the official browser SDK, a separate-origin
frame and explicit permissions. It checks current tool visibility before calls
and keeps private host results outside model messages.

## MCP Skills

Declare `SkillCatalog()` and `SkillLookup()` on ordinary unary methods, together
with `ResourceReader()`. Catalog pages and direct URI lookups return complete
entries: the entry URI, every frontmatter field and either a stable file manifest
or a dynamic declaration. Each stable file declares its exact URI, raw byte size
and SHA-256 digest. Optional `ResourceDirectory()` pages list immediate children;
listing never activates instructions or expands a retained manifest.

The generated protocol client supplies discovery and file reads. The consuming
host assigns server identity and retains the complete entry with its model
context. Call `mcp.VerifySkillFile(ctx, retainedEntryJSON, uri, bytes)` before use
to check exact manifest membership, byte size and digest. Loading the entry's own
`SKILL.md` also compares every YAML field with discovery, including future fields
and exact numbers. Cached content needs the same check. Dynamic entries cannot
pass stable-manifest verification.

Skills are untrusted instructions, not system messages or tool permissions.
Reading a nested `SKILL.md` supplies supporting content; activating it needs its
own discovery and consent. Local execution requires explicit consent for the
originating server, exact Skill and complete manifest. A changed manifest revokes
that consent. The [reference host](https://github.com/goadesign/goa-ai/tree/main/codegen/mcp/testdata/skills_host)
composes lazy reads and native tool confirmation. Its context and approvals last
one process; applications that persist context must retain its entries and own
the approval lifetime.

See [serve and load Skills](https://github.com/goadesign/goa-ai/blob/main/docs/mcp_skills.md)
for the full manifest, directory and host contracts.

## Breaking upgrade

Regenerate servers, clients, executors and registry providers together. Remove
initialization and session calls, protocol-selection options and JSON-text result
decoders. Custom callers implement all four task-aware methods. Construct MCP
adapters from configured Goa endpoints and protected servers from a resource
verifier. Replace `ResourceSubscription` with `SubscriptionSource`; select
completed or input-required branches through generated union methods.

Old and new peers cannot share an endpoint. Drain incompatible accepted work and
saved runs before changing workers, registry peers and application persistence.
Reverting one dependency does not restore compatibility with newer saved data.
Follow the [framework upgrade guide](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#preview-upgrade-guide)
for storage and coordinated cutover requirements.

---

## Tool Execution Flow

1. Planner returns tool calls constructed from the generated MCP tool
   descriptors, or forwards validated model calls with
   `planner.ToolRequestFromModelCall`
2. Runtime validates the complete planner result and assigns execution IDs,
   producing `runtime.ToolCall` values
3. Runtime detects MCP toolset registration
4. Forwards the runtime call's canonical JSON payload to the MCP caller
5. The MCP caller uses HTTP or stdio and handles the JSON-RPC protocol. An HTTP
   response may be JSON or an event stream
6. Decodes result using generated codec
7. Returns `ToolResult` to planner

---

## Error Handling

Generated helpers adapt JSON-RPC errors into `planner.ToolFailure` values:

- **Validation errors** → invalid-call failures with exact correction evidence
- **Network errors** → unavailable or timeout failures with an explicit
  replanning or finish action
- **Server errors** → structured causes preserved in the failure

This gives MCP and native toolsets the same enforced recovery contract.

Failures returned by a tool become `ToolFailure`. An invalid completed planner
result becomes `OutputContractError` instead; it is rejected without another
model request and is not presented as a tool failure.

---

## Complete Example

### Design

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// MCP server service
var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })
    
    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
        })
        Tool("search", "Search documents by query")
    })
})

// Agent that uses MCP tools
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Runtime

Pass the generated executor through `RegisterUsedToolsets` before registering the agent. The example accepts an already constructed runtime and your planner.

```go
package main

import (
    "context"

    genchat "example.com/assistant/gen/orchestrator/agents/chat"
    genmcpexec "example.com/assistant/gen/orchestrator/agents/chat/assistant_mcp"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
    mcpruntime "goa.design/goa-ai/runtime/mcp"
)

func registerChat(ctx context.Context, rt *runtime.Runtime, p planner.Planner) error {
    caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
        ClientInfo: mcpruntime.ClientInfo{Name: "my-agent", Version: "1.0.0"},
    })
    if err != nil {
        return err
    }
    if err := genchat.RegisterUsedToolsets(ctx, rt,
        genchat.WithAssistantMcpExecutor(genmcpexec.NewMCPExecutor(caller)),
    ); err != nil {
        return err
    }
    return genchat.RegisterChatAgent(ctx, rt, genchat.ChatAgentConfig{Planner: p})
}
```

### Planner

Your planner can reference MCP tools just like native toolsets:

```go
func (p *MyPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    call, err := planner.NewToolRequest(
        genmcpspecs.SearchTool(),
        &genmcpspecs.SearchPayload{Query: "golang tutorials"},
    )
    if err != nil {
        return nil, err
    }
    return &planner.PlanResult{ToolCalls: []planner.ToolRequest{call}}, nil
}
```

`genmcpspecs` imports `example.com/assistant/gen/assistant/toolsets/assistant_mcp`. For a validated model call, use `planner.ToolRequestFromModelCall` to preserve its provider correlation ID.

---

## Best Practices

- **Let codegen manage registration**: Use the generated helper to register MCP
  toolsets; avoid hand-written glue so codecs and structured failure recovery
  stay consistent
- **Use typed callers**: Prefer Goa-generated JSON-RPC callers when available for type safety
- **Handle errors explicitly**: Map MCP errors to `ToolFailure` values with the
  correct failure kind and recovery action
- **Monitor telemetry**: MCP calls emit structured telemetry events; use them for observability
- **Choose the right transport**: Use HTTP for remote servers and stdio for subprocess-based servers. The HTTP caller accepts JSON and event-stream responses

---

## Next Steps

- **[Toolsets](./toolsets.md)** - Understand tool execution models
- **[Memory & Sessions](./memory-sessions.md)** - Manage state with transcripts and memory stores
- **[Production](./production.md)** - Deploy with Temporal and streaming UI
