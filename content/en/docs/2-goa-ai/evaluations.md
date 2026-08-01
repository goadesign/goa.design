---
title: Generated Evaluations
weight: 10
description: "Define evaluation suites in a DSL, generate typed hooks, and judge model answers with strict semantic contracts."
llm_optimized: true
---

Goa-AI evaluations keep stable test intent in design while leaving product
execution and evidence with the application. The framework owns the DSL,
generated hook interface, orchestration, semantic judge, and report contract.
The application owns the live target, protocol interaction, deterministic
checks, answer claims, and diagnostic artifacts.

## Define a suite

Import `goa.design/goa-ai/eval/dsl` in a Goa design package:

```go
var _ = Suite("chat", func() {
    Description("Exercises complete Chat outcomes.")
    Timeout("2m")

    Scenario("alarm_inventory", func() {
        Description("Retrieves complete alarm history for a fixed window.")
        Input("List every alarm in the requested window.")
        Tags("production", "alarm")
        Timeout("3m")
    })

    Calibration("entailed", func() {
        Answer("Compressor 1 is running.")
        Claim("Compressor 1 is running.")
        Want(eval.Entailed)
    })
})
```

Suite, scenario, calibration, and tag IDs use `lower_snake_case`. Descriptions,
scenario inputs, and positive timeouts are required. A scenario timeout
overrides the suite default. Calibrations use the closed labels `entailed`,
`contradicted`, `not_addressed`, and `indeterminate`.

Running `goa gen` emits `gen/evals/<suite>/suite.go` with a direct interface:

```go
type Hooks interface {
    AlarmInventory(context.Context, string) (eval.Result, error)
}

func New(hooks Hooks) eval.Suite
```

There is no adapter registry or reflection. Generated methods make every
scenario a compile-time obligation, and ordinary receiver fields or closures
capture application dependencies and targets.

## Implement evidence hooks

Each hook performs the complete product interaction and returns typed eval
evidence:

```go
func (h *hooks) AlarmInventory(ctx context.Context, input string) (eval.Result, error) {
    answer, evidence, err := h.client.Run(ctx, h.target, input)
    if err != nil {
        return eval.Result{}, err
    }
    return eval.Result{
        Checks: []eval.Check{{
            Name:   "all_pages_retrieved",
            Passed: evidence.Exhausted,
        }},
        Claims: []eval.Claim{{
            ID:   "total",
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

Checks assert deterministic facts from typed application evidence. Claims are
independent propositions judged against `Output`. Infrastructure and protocol
failures are returned as errors. The runner rejects empty results, duplicate
IDs, claims without output, malformed checks, malformed artifacts, and
non-bijective judge responses.

## Calibrate and run

`eval/judge` accepts a provider-neutral `model.Client`. It makes one tool-free,
structured-output request per assertion batch and requires exactly one label
and rationale for every claim ID. It never repairs, retries, or substitutes
model output.

```go
suite := genevals.New(hooks)
runner := eval.NewRunner(judge.New(modelClient))
report, err := runner.Run(ctx, suite)
```

The runner proves all calibrations before executing any scenario. It then runs
selected scenarios sequentially under their generated timeouts. A scenario
passes only when every deterministic check passes and every semantic claim is
`entailed`. Reports use stable JSON field names for CI and artifact retention.

Pass tags to `Runner.Run` to select classes of scenarios. Product CLIs may
select exact generated IDs before invoking the runner, but should reject
unknown or duplicate IDs before execution and preserve declaration order.

