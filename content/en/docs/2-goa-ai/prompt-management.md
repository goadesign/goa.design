---
nav_group: guides
title: "Prompt management"
linkTitle: "Prompt management"
weight: 28
description: "Declare prompts in the design, render them with typed arguments, change them at runtime for one scope, and see which prompt version built every model request."
llm_optimized: true
---

<!-- PENDING(signatures): this draft describes contracts already settled in
review. Every block marked PENDING(signatures) waits for the reviewed goa-ai
prompt API; do not publish while any marker remains. -->

A prompt is the text your agent sends to a model, such as a system prompt that
tells a support assistant how to handle refunds. Goa-AI treats prompts as part of
your design:

- You declare each prompt, its role, and the arguments it takes in the design.
- `goa gen` checks every template against those arguments and generates a typed
  function that renders it.
- At runtime you can replace a prompt's text for one customer, one session, or
  everyone, without rebuilding or redeploying.
- Rendering returns the exact prompt versions it used. Attach them to the model
  request that sends the text, and the request's trace shows which text produced
  which answer.

## Concepts {#concepts}

**Baseline prompt.** The prompt as declared in the design: its ID (for example
`support.system`), its role (`system`, `user`, `tool`, or `synthesis`), its
template text, and the fields the template may use. The runtime registers each
baseline once, and a registered baseline never changes. Its version is derived
from the template text, so changing the text in the design produces a new
version.

**Override.** Replacement text for one prompt, saved in a prompt store, that
applies only within a scope. Each override gets its own version.

**Scope.** Where an override applies. A scope has an optional session ID and any
labels you choose, such as `account=acme` or `region=eu`. An override applies to
a request when:

- the override has no session ID, or its session ID equals the request's; and
- every label on the override is present on the request with the same value.

An override with no session and no labels applies everywhere.

**Which override wins.** When several overrides apply, the runtime picks one:

1. An override with a session ID beats one without.
2. Otherwise, the override with more labels beats the one with fewer.
3. Otherwise, the newer override wins.

The choice is deterministic: overrides saved at the same instant still resolve
to the same one every time.

If no override applies, the runtime renders the baseline.

For example, with these overrides saved for `support.system`:

| Override scope | Applies to a request in session `s-42` for `account=acme`, `region=eu`? |
| --- | --- |
| no session, no labels | yes |
| `account=acme` | yes |
| `account=acme`, `region=eu` | yes, and wins: it has the most labels |
| `account=globex` | no: the label value differs |

## Declare prompts in the design

<!-- PENDING(signatures): Prompt / SystemPrompt / Args DSL, agent-level and
service-level placement, and the exact generated names. Arguments are rendered
from the generated Go struct, so templates use exact generated Go field names. -->

## Register prompts

The runtime must know a prompt's baseline before anything can render it.

**Agent prompts** register with their agent. `AgentRegistration.PromptSpecs`
lists the prompts an agent owns, and `Runtime.RegisterAgent` handles them:

1. It checks every listed prompt first, before it registers anything. A
   template that does not parse, a duplicate ID, or an ID that is already
   registered fails the whole call. So does a template that uses a field its
   prompt does not declare, when the prompt declares its fields.
2. It registers the agent with the workflow engine.
3. Only when that succeeds, it adds the prompts to `Runtime.PromptRegistry`.

A prompt that fails the checks stops `RegisterAgent` before the agent reaches
the workflow engine. Building a registration value has no side effects: nothing
is registered until you call `RegisterAgent`.

**Service-owned prompts** belong to a service rather than one agent, so several
agents and non-agent code can share them. Their `PromptSpec.AgentID` is empty,
and you register them directly with `Runtime.PromptRegistry.Register`.

<!-- PENDING(signatures): the generated agent registration that fills
PromptSpecs and the generated service registration function. -->

**Prompts you register by hand** keep working. Build a `prompt.PromptSpec` and
pass it to `Runtime.PromptRegistry.Register`, as before. A spec without
`Fields` declares no fields, so its template is checked for syntax but not for
field names.

## Render a prompt and record what was used

Rendering returns the text and the list of every prompt version used to build
it. That list includes prompts pulled in with `{{ render "<prompt-id>" . }}`, in
the order they were rendered. Put that list on the model request that uses the
text:

<!-- PENDING(signatures): replace with the generated typed render helper once
its signature is final. -->

```go
content, err := input.Agent.RenderPrompt(ctx, "support.system", args)
if err != nil {
    return nil, err
}

system := &model.Message{
    Role:  model.ConversationRoleSystem,
    Parts: []model.Part{model.TextPart{Text: content.Text}},
}
resp, err := modelClient.Complete(ctx, &model.Request{
    Messages:   append([]*model.Message{system}, input.Messages...),
    PromptRefs: content.Refs,
})
```

Use `content.Refs`, not `[]prompt.PromptRef{content.Ref}`. `content.Ref` names
only the top-level prompt and drops the prompts it composed.

The runtime does not attach prompt versions for you: each request carries the
list its caller put on it. If a planner renders a classification prompt and a
separate answer prompt for two model calls in the same turn, give each request
the `Refs` from its own render. The model call's trace span lists the prompt IDs
and versions on that request.

<!-- PENDING(signatures): exact span attribute names. -->

## Change a prompt at runtime

Saving an override replaces a prompt's text for one scope. The runtime checks
the new template before it saves anything. For a prompt that declares its
fields, a template that uses an unknown field is rejected at save time instead
of failing later on every render.

<!-- PENDING(signatures): state how generated prompts, including prompts with
no arguments, declare their fields. -->

<!-- PENDING(signatures): SetOverride / ValidateOverride signatures and return
values. -->

## Reset an override

Resetting removes a prompt's overrides at one exact scope, so the next render
falls back to the next override that applies, or to the baseline.

Reset is destructive:

- It permanently deletes every saved override for that prompt whose scope
  exactly equals the one you pass: the same session ID and the same labels, no
  more and no fewer.
- Overrides at other scopes are untouched, including broader and narrower ones.
- `History` afterwards returns only the overrides that remain. Reset does not
  keep an audit trail of what it deleted. If you need one, record it before you
  reset.

For example, resetting `support.system` at scope `account=acme` deletes the
overrides saved at exactly `account=acme`. An override at
`account=acme, region=eu` remains, and so does one with no labels. A request
for `account=acme, region=eu` keeps using the narrower override. A request for
`account=acme` alone now uses the override with no labels.

<!-- PENDING(signatures): Registry.ResetOverride / Store.Reset call. -->

## Store overrides

Overrides live in a prompt store that you pass to the runtime with
`runtime.WithPromptStore`. Goa-AI includes two:

- `prompt.NewInMemoryStore()`, for tests and single-process development;
- the MongoDB store in `features/prompt/mongo`, for production.

Without a prompt store, every render uses the baseline.

### Custom stores

A custom `prompt.Store` now also implements `Reset`, with the exact-scope,
destructive behavior described above. Treat label keys and values as plain data:
a key may contain dots, and a value may start with `$`.

<!-- PENDING(signatures): final Store interface listing and migration note for
external implementers. -->
