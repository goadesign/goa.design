---
title: Generated Evaluations
weight: 6
description: "Declare agent test scenarios in your Goa design, implement one typed hook per scenario, and get calibrated, model-graded reports."
llm_optimized: true
---

**Your agent changed. Did its answers get worse?**

An evaluation (eval) is a repeatable test that runs your real agent and checks
that the outcome is still correct. Evals are not unit tests: they call live
systems and models, they can take minutes, and part of "is this correct?"
requires reading a model-written answer rather than comparing exact values.

Most teams hand-build this harness: a YAML file of test cases, a bespoke
runner, and a pile of regular expressions trying to match model answers.
Goa-AI generates the harness from the same design that defines your agent, and
replaces answer-matching with claims graded by a calibrated model judge.

Each part of an evaluation suite has exactly one owner:

- **The design** describes every scenario: its name, what it tests, the shape
  of its input, its tags, and its time limit.
- **Generated code** turns that description into Go types and one interface
  method per scenario. If the design and the application drift apart, the
  build breaks — a test cannot silently disappear.
- **Your application code** implements those methods: it calls the agent,
  gathers evidence, and states what must be true.
- **The runner** (from `goa.design/goa-ai/eval`) selects scenarios, limits how
  many run at once, grades answers, and produces a JSON report.

Six terms cover the whole feature:

| Term | Meaning |
|------|---------|
| **Scenario** | One test case, such as "ask the chat agent to list every alarm" |
| **Hook** | The Go method you write for one scenario; it runs the agent and returns what happened |
| **Check** | A pass/fail fact your code verifies exactly, such as "every result page was fetched" |
| **Claim** | A short English sentence that must be true of the model's answer |
| **Judge** | A model-backed grader that labels each claim against the answer |
| **Report** | The JSON summary of a run: what ran, what passed, why, and how long it took |

Claims exist because answer wording changes from run to run, so exact string
comparison cannot work. Checks exist because facts your code *can* verify
exactly should never be delegated to a model.

## Declare scenarios in the design

The design declares the *shape* of each scenario input: which fields exist and
what makes them valid. It never contains real values. Concrete user IDs,
facilities, and prompts stay in application code, so the same design works in
every environment.

```go
package design

import (
    . "goa.design/goa-ai/dsl"
    . "goa.design/goa-ai/eval/dsl"
    . "goa.design/goa/v3/dsl"
)

var ChatEvalInput = Type("ChatEvalInput", func() {
    Attribute("user_id", String, "User running the evaluation.", func() {
        Format(FormatUUID)
    })
    Attribute("prompt", String, "User message.", func() {
        MinLength(1)
    })
    Required("user_id", "prompt")
})

var _ = Service("chat_agent", func() {
    Agent("chat", "Answers product questions.", func() {
        Suite("chat", func() {
            Description("Exercises production Chat outcomes.")
            Timeout("2m")

            Scenario("alarm_inventory", func() {
                Description("Retrieves every alarm in a fixed window.")
                Input(ChatEvalInput)
                Tags("production", "alarm")
                Timeout("3m")
            })

            Scenario("health_check", func() {
                Description("Verifies application-owned setup.")
            })
        })
    })
})
```

The rules:

- Suite, scenario, and tag names use `lower_snake_case`. They become stable
  identifiers in reports and command-line flags, so renaming one renames the
  test everywhere.
- Every suite and scenario needs a `Description`. Every suite needs a positive
  `Timeout`; a scenario `Timeout` replaces the suite one for that scenario.
- `Input` is optional. A scenario without `Input` generates a hook that
  receives only a `context.Context`. `Input` accepts the same forms as tool
  `Args`: a named Goa type, a primitive, an array or map, or an inline
  function listing attributes. `OneOf` is not supported in evaluation inputs.
- A suite can be declared at the top level of the design or inside an `Agent`.
  Declaring it inside an agent additionally gives the generated package access
  to that agent's tool contracts (explained below).

## Generate the Go code

Importing `goa.design/goa-ai/eval/dsl` in the design registers the evaluation
generator. Running the normal `goa gen` command then writes
`gen/evals/<suite>/suite.go`:

```go
type ChatEvalInput struct {
    UserID string
    Prompt string
}

type Hooks interface {
    AlarmInventory(context.Context, *ChatEvalInput) (eval.Result, error)
    HealthCheck(context.Context) (eval.Result, error)
}

type Inputs struct {
    AlarmInventory *ChatEvalInput
}

func New(hooks Hooks, inputs Inputs) (eval.Suite, error)
```

`Hooks` has one method per scenario, so adding a scenario to the design breaks
the build until the application implements it. `Inputs` has one field per
scenario that declared an `Input`; the application fills these with real
values. `New` checks every supplied value against the design rules (required
fields, formats, lengths) and returns an error before any scenario can start.

### Tool contracts for agent suites

Agents declare their tools in the design too, so the generator knows exactly
which tools an agent can call — including the tools of other agents it uses.
When a suite is declared inside an `Agent`, its generated package includes:

```go
func MustToolContract(name tools.Ident) *tools.ToolSpec
```

Given a tool name, it returns that tool's generated contract: its schema and
the codec that decodes its arguments and results. Use it in hooks to decode
recorded tool calls and check their arguments exactly, without writing JSON
handling by hand. It covers every tool the agent can reach at build time; it
does not cover tools discovered at runtime, whose contracts the generator
cannot know. Asking for a tool the agent cannot use panics, because that is a
bug in the evaluation itself.

## Create the runnable command

Run `goa example` after `goa gen`:

```bash
goa example example.com/product/design
```

This creates `cmd/<suite>-evals/main.go` once and never overwrites it — the
file belongs to the application from then on. Later design changes still
update `gen/evals`: a changed hook signature fails compilation and a missing
input value fails `New`, so the command cannot silently fall out of date.

The generated file compiles immediately and contains a `TODO` at every place
that needs application code: one empty hook per scenario, one input value per
scenario that declares an `Input`, and the judge. It also comes with a working
command line:

- `--scenario <id>` runs one scenario; repeat the flag for several.
- `--tag <tag>` runs every scenario carrying that tag; repeat for several.
  Scenario and tag flags cannot be combined.
- `--max-concurrency <n>` limits how many scenarios run at once (default 5).

Every run writes the JSON report to standard output and exits non-zero when
the suite fails. The command is a plain Go program, so it can run locally, in
CI, or on a schedule. Applications that prefer `go test` can skip the command
and call the generated `New` from a test instead.

## Write the hooks

Implement the generated interface on an ordinary type:

```go
type hooks struct {
    client *Client
}

func (h *hooks) AlarmInventory(
    ctx context.Context,
    input *genevals.ChatEvalInput,
) (eval.Result, error) {
    answer, evidence, err := h.client.Run(ctx, input.UserID, input.Prompt)
    if err != nil {
        return eval.Result{}, err
    }
    return eval.Result{
        Checks: []eval.Check{{
            Name:   "all_pages_retrieved",
            Passed: evidence.Exhausted,
        }},
        Claims: []eval.Claim{{
            ID:   "complete_answer",
            Text: "The answer reports every alarm in the window.",
        }},
        Output: answer,
        Artifacts: []eval.Artifact{{
            Name: "protocol",
            URI:  evidence.ArtifactURI,
        }},
    }, nil
}
```

A hook returns three kinds of information:

- **Checks** are facts the code can verify exactly: tool names, IDs, counts,
  states. A failed check must include a diagnostic explaining what went wrong.
- **Claims** are sentences about the model's answer, judged later. Write one
  claim per fact ("The answer names the alarm", "The answer gives the
  activation time") rather than one long compound claim, so a failure points
  at the exact missing fact. Do not approximate answer meaning with regular
  expressions or keyword lists — that is what claims and the judge replace.
  Claims are judged against `Output`, the answer under evaluation. An empty
  `Output` — the run produced no answer — labels every claim `not_addressed`
  and fails the scenario without consulting the judge.
- **Artifacts** are optional links to saved evidence — logs, transcripts,
  protocol dumps — that help debug a failure.

Use the returned error only for infrastructure problems: the agent could not
be reached, a timeout, a broken test environment. "The agent answered but the
answer is wrong" is a failed check or an unsupported claim, not an error.

The runner rejects malformed results before scoring them: a result must
contain at least one check or claim, names and IDs must be unique, and
artifacts need both a name and a URI.

## Collect evidence and declare expectations

Most hooks do the same two things: watch a run's stream events to record what
the agent did, and compare that record against the scenario's expectations.
The `eval/evidence` package owns both so every suite shares one
implementation.

An `evidence.Collector` consumes the runtime's stream events (tool starts and
ends, assistant replies, workflow lifecycle, confirmation boundaries) and
builds an `evidence.Evidence`: every tool call with its canonical JSON
arguments and result, correlated by tool call ID and ordered causally (each
parent tool immediately before the nested calls its child run made), the
accumulated assistant answer, any pending confirmation, and the terminal
workflow phase. Applications that expose goa-ai streams natively feed events
straight in; applications that re-encode the stream over their own transport
write a small adapter that maps their wire type back to stream events.

```go
collector := evidence.NewCollector()
for !collector.Done() {
    event, err := stream.Recv()
    if err != nil {
        return eval.Result{}, err
    }
    if err := collector.Consume(event); err != nil {
        return eval.Result{}, err
    }
}
ev, err := collector.Finish()
```

An `evidence.Expect` declares the deterministic expectations and converts the
evidence into checks. Each generated toolset package exports one typed tool
descriptor per tool (for example `helpers.AnswerTool`) pairing the tool
identifier with its typed payload and result codecs. Build expectations from
descriptors with `evidence.ExpectCall`: the pairing is fixed at generation
time, assertions are typed Go predicates — no JSON traversal by hand — and a
design change that renames or retypes a field breaks the suite at compile
time instead of silently never matching:

```go
expect := evidence.Expect{
    Tools: []evidence.Tool{
        evidence.ExpectCall(helpers.AnswerTool,
            func(p *helpers.AnswerPayload) error {
                if p.Question == "" {
                    return errors.New("question must not be empty")
                }
                return nil
            },
            nil, // result unconstrained
        ),
    },
    ForbidTools: []tools.Ident{admin.DeleteRecords},
}
return eval.Result{
    Checks: expect.Checks(ev),
    Claims: claims,
    Output: ev.Answer,
}, nil
```

`Expect` supports two trajectory modes. The default binds the declared tools
as an in-order subsequence of the observed calls, leaving undeclared calls
unconstrained — a run may retry a rejected call or split work across several
calls of one tool. Setting `Exact: true` compares the complete causal
trajectory call for call, so hidden retries and extra tools fail. Per-tool
policies cover failure semantics: `evidence.ExpectFailure` declares a call
that must fail with exactly one classification, `ForbidFailureKinds` rejects
protected failure classes across every attempt, and
`RequireAllAttemptsSuccessful` rejects any failed or missing result.
`evidence.ExpectConfirmation` asserts the run stopped at a pending operator
confirmation instead of completing. For tools without generated descriptors
(registry-discovered toolsets), declare a bare `evidence.Tool` with the tool
identifier and `evidence.Decoded` asserts.

Bounded-result metadata is carried beside the typed result rather than inside
the generated domain result type. Set `Tool.Bounds` when the scenario must
assert the returned count, total count, truncation state, refinement hint, or
continuation cursor:

```go
alarms := evidence.ExpectCall(ada.ListAlarmsTool, nil, nil)
alarms.Bounds = func(bounds *agent.Bounds) error {
    if bounds == nil || bounds.Truncated {
        return errors.New("expected a complete alarm inventory")
    }
    return nil
}
```

## Run the suite

```go
suite, err := genevals.New(&hooks{client: client}, genevals.Inputs{
    AlarmInventory: &genevals.ChatEvalInput{
        UserID: userID,
        Prompt: "List every alarm in the requested window.",
    },
})
if err != nil {
    return err
}

grader, err := judge.New(modelClient, maxOutputTokens)
if err != nil {
    return err
}
runner, err := eval.NewRunner(grader, eval.RunnerConfig{
    MaxConcurrency: 5,
    Reporter:       reporter,
})
if err != nil {
    return err
}
report, err := runner.Run(ctx, suite)
```

`MaxConcurrency` is required and must be positive: at most that many scenarios
run at the same time. One scenario failing does not stop the others. The
report always lists scenarios in the order the design declares them, no matter
which finished first. Because scenarios run in parallel, hooks and the judge
must be safe to call concurrently.

The optional `Reporter` receives a callback when each scenario starts and when
it finishes, so an application can print progress without scheduling anything
itself. Every selected scenario gets exactly one finished callback — including
scenarios that never started because the run was canceled (those have a zero
start time and no started callback).

Canceling the context stops new scenarios from starting and cancels the ones
in flight through their own contexts; `Run` then returns the context error
together with the partial report. Hooks must honor cancellation.

Pass a nil judge only when no hook returns claims:

```go
runner, err := eval.NewRunner(nil, eval.RunnerConfig{MaxConcurrency: 2})
```

If a hook returns a claim and the judge is nil, that scenario fails with an
error saying a judge is required.

### Select scenarios

The runner validates every selection before calling the agent or a model:

```go
report, err := runner.Run(ctx, suite)
report, err := runner.RunScenarios(ctx, suite, "alarm_inventory", "solar_analysis")
report, err := runner.RunTags(ctx, suite, "smoke", "alarm")
```

`RunScenarios` runs exact scenario names. `RunTags` runs every scenario
carrying at least one of the given tags. Both reject empty selections, empty
values, duplicates, and names or tags that do not exist, so a typo fails
loudly instead of silently running nothing.

## How judging works

`eval/judge` builds a judge from any validated `model.Client`, the same opaque
client the rest of Goa-AI uses, so it works with any configured provider. Tests
that need a deterministic judge client should implement `model.Provider` and
pass it through `model.NewClient`; application code cannot implement
`model.Client` directly.

The application must supply a positive `maxOutputTokens` to `judge.New` and
handle its error. Read this value from application configuration before running
the suite. Zero and negative values fail construction without calling the
model; there is no default.

The value is an inclusive output-token ceiling for **one complete model
response**, including all judgments and their JSON structure. It is not a
per-claim allowance or a total budget for the scenario or suite. Goa-AI sends
the same value on the initial request and every permitted correction request,
regardless of claim count. Choose a value supported by your configured provider
and model; unsupported values remain errors, not silently reduced limits. A
finite ceiling does not guarantee that a response will finish within it.

### Shared reference and judge migration

Put factual context shared by several claims in the optional `Result.Reference`
string, instead of repeating it inside each claim. Keep `Output` as the answer
being evaluated:

```go
result := eval.Result{
    Output:    answer,
    Reference: "Supported export formats: CSV and JSON.",
    Claims: []eval.Claim{{
        ID:   "export_formats",
        Text: "The answer lists the supported export formats.",
    }},
}
```

The runner passes the reference separately from the unchanged answer. The
model-backed judge includes it once in each request, including existing
correction requests. Reference facts help establish whether the answer is
accurate; they never supply content missing from the answer. In this example,
listing the formats only in the reference does not satisfy the claim. An empty
`Output` still gives every claim `not_addressed` without calling the judge,
even when the reference contains the answer.

Custom judges implement the new four-argument interface:

```go
Judge(ctx context.Context, output string, claims []eval.Claim, reference string) ([]eval.Judgment, error)
```

Update direct calls to `grader.Judge(ctx, output, claims, reference)`. Pass `""`
when no additional context is needed; calibration also uses an empty reference.
The runner retains a nonempty reference as `reference` in the JSON report and
omits the field when empty. Existing reports without it still mean no additional
context. Strict external report readers must accept the new field before reading
reports that include it. No saved-report migration, generated suite change, or
product service contract change is required. This change adds no model call and
does not change model selection, token limits, labels, or correction counts.

### Labels and response validation

For each scenario the judge receives the answer and the scenario's claims, and
returns exactly one label and a short rationale per claim:

- `entailed`: the answer establishes the claim is true;
- `contradicted`: the answer establishes the claim is false;
- `not_addressed`: the answer talks about something else;
- `indeterminate`: the answer is too ambiguous or conflicting to decide.

Only `entailed` counts as passing.

Before any scenario runs, the runner tests the judge with four fixed examples,
one per label. This step is called calibration. A judge that cannot tell the
labels apart — for example one that answers `entailed` for everything, which
would make every evaluation pass — fails calibration and the suite stops
before touching the application. Calibration runs under a two-minute deadline
owned by the runner, so an unreachable or stalled model endpoint fails the
suite with a clear error instead of blocking it forever.

The prompt asks for the supplied grading tool exactly once, without spelling a
provider-specific name. Its schema requires a property named for each claim ID,
containing a label and nonempty rationale. The judge returns judgments in claim
order by looking up their names, not by restoring response positions. Missing,
unknown, or duplicate names, extra fields, and invalid labels are rejected.

Structural field metadata lets the validator explain independently invalid
fields, such as a claim encoded as a string where an object is required. Full
claim text remains in the schema and reference evidence remains in the request;
neither is copied into this correction metadata. A claim named `requests` is
valid when required by the schema. The judge supplies no example verdicts.

The existing bounded correction flow may request a replacement, but never
repairs invalid output. Labels, model selection, token limits, and correction
counts remain unchanged; clearer guidance does not guarantee compliance. If
correction is exhausted, the caller receives an error rather than invented
judgments. See the [framework judge contract](https://github.com/goadesign/goa-ai/blob/main/docs/evals.md#how-judging-works).

## Read the report

The report and everything in it use stable JSON field names, so tooling can
depend on them. A scenario's duration covers the hook call, result validation,
and judging.

Failures land at two levels:

- **Suite-level** failures — an invalid selection, a calibration failure, or
  cancellation — are returned as the error from `Run` and recorded on the
  report's `error` field.
- **Scenario-level** failures — a hook error, an invalid result, a timeout, or
  a judging failure — are recorded on that scenario's report so the remaining
  scenarios still finish.

After a run without a suite-level error, check `report.Passed`: it is true
only when every selected scenario passed all of its checks and claims. A false
value must fail the calling command or CI job.

## Upgrade judge construction

`judge.New(client, opts...) *Judge` is replaced by
`judge.New(client, maxOutputTokens, opts...) (*Judge, error)`. Update every
caller to supply its configured positive response limit and handle the error
before creating the runner. Existing options such as `WithModelClass` follow
the required limit and keep their meaning.

The former `256 × claim count` calculation is removed. This is a Go source
change: existing callers must be updated to compile against the new version.
It does not change the judge's model selection, prompt, labels, strict response
validation, or correction count. No saved-report migration is required.

## Upgrade from string-input suites

Earlier versions passed a single string to every hook. Typed inputs replace
that:

- replace `Input("some literal")` with a Goa input type and move the literal
  into the generated `Inputs` value;
- use Goa v3 `Description` and `Timeout`, plus Goa-AI `Tags`; `eval/dsl` now
  declares only `Suite`, `Scenario`, and `Input`;
- update hooks from `(context.Context, string)` to their generated typed
  signatures; and
- update `New(hooks)` to `New(hooks, inputs)` and handle its validation error.

Regenerate before compiling application code. Generated suite packages and
application hooks live in one Go binary, so there is no version-mixing concern
across a network: a mismatch is a compile error, not a runtime surprise.

## Remote Judge Models

Evaluation suites use the same opaque validated `model.Client` as planners. If
the judge model runs in another process, expose the provider with
`gateway.NewServer` and connect with `gateway.NewRemoteClient` or
`gateway.NewCountingRemoteClient`. The counting client is required when an
evaluation policy needs exact input-token counts. See
[Remote Model Gateways](./runtime/#remote-model-gateways) for the transport and
validation contract.
