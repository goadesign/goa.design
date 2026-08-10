---
title: Generated Evaluations
weight: 10
description: "Define evaluation scenarios in Goa design, generate typed hooks, and produce trustworthy reports."
llm_optimized: true
---

Goa-AI evaluations let a Goa application define stable scenarios in design and
implement product-specific work in ordinary Go code. Goa-AI owns generation,
scenario selection, bounded execution, semantic judging, and reports. Your
application owns the system it calls, the account or facility it targets, the
facts it checks, and the diagnostic artifacts it saves.

## Define scenarios

Add the eval DSL to a design package in an application that already uses the Goa
v3 DSL:

```go
package design

import . "goa.design/goa-ai/eval/dsl"

var _ = Suite("chat", func() {
    Description("Exercises production Chat outcomes.")
    Timeout("2m")

    Scenario("alarm_inventory", func() {
        Description("Retrieves every alarm in a fixed window.")
        Input("List every alarm in the requested window.")
        Tags("production", "alarm")
        Timeout("3m")
    })
})
```

The application must also contain its normal Goa service design. The Goa CLI
uses that design to identify the Goa version before loading extension DSLs.

Suite, scenario, and tag IDs use `lower_snake_case`. Descriptions, scenario
inputs, and positive suite timeouts are required. A scenario timeout replaces
the suite timeout for that scenario.

Normal `goa gen` emits `gen/evals/<suite>/suite.go`:

```go
type Hooks interface {
    AlarmInventory(context.Context, string) (eval.Result, error)
}

func New(hooks Hooks) eval.Suite
```

There is one method for each scenario. Adding a scenario therefore creates a
compile-time obligation for the application that runs the suite. Generated
code contains the final names, inputs, tags, and timeouts. It does not use
reflection or runtime registration.

## Implement checks and claims

Implement the generated interface on a normal application type:

```go
type hooks struct {
    client *Client
    target Target
}

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

A check compares typed evidence with a fact your application can determine
exactly. A claim is a short statement that must be supported by the model's
answer. Use checks for tool names, IDs, counts, states, and other exact values.
Use claims only for meaning that requires reading the answer.

Return infrastructure and protocol failures as errors. A failed check must
include a diagnostic. The runner rejects empty results, duplicate check or
claim IDs, claims without an answer, malformed artifacts, and incomplete judge
responses.

## Create a runner

Concurrency is explicit and bounded:

```go
runner, err := eval.NewRunner(
    judge.New(modelClient),
    eval.RunnerConfig{MaxConcurrency: 5},
)
if err != nil {
    return err
}
suite := genevals.New(hooks)
report, err := runner.Run(ctx, suite)
```

`MaxConcurrency` is required and must be positive. At most that many scenarios
run at once. One scenario failure does not stop the others. Reports always use
the suite's declaration order, regardless of completion order. Hook
implementations and semantic judges must therefore support concurrent calls up
to this limit.

Pass a nil judge when every hook returns deterministic checks and no semantic
claims:

```go
runner, err := eval.NewRunner(nil, eval.RunnerConfig{MaxConcurrency: 2})
```

## Select scenarios

The runner owns selection and validates it before any product or model call:

```go
report, err := runner.Run(ctx, suite)
report, err := runner.RunScenarios(ctx, suite, "alarm_inventory", "solar_analysis")
report, err := runner.RunTags(ctx, suite, "smoke", "alarm")
```

`RunScenarios` runs exact IDs. `RunTags` runs every scenario carrying at least
one requested tag. Both reject empty selections, empty values, duplicates, and
unknown IDs or tags. Selected scenarios remain in suite declaration order.

## Semantic judging

`eval/judge` accepts a provider-neutral `model.Client`. Before any scenario
runs, the runner checks the judge with four framework-owned examples:

- `entailed`: the answer establishes the claim;
- `contradicted`: the answer establishes that the claim is false;
- `not_addressed`: the answer discusses something else; and
- `indeterminate`: conflicting information prevents a conclusion.

All four labels must be returned correctly. This prevents a judge that always
answers `entailed` from making every evaluation pass. A calibration failure
stops the suite before it calls your application.

For scenario claims, the judge makes one tool-free structured-output request
and returns exactly one label and rationale for each claim ID. Only `entailed`
passes. Unknown fields, missing or duplicate IDs, unsupported labels, multiple
JSON answers, and trailing JSON are errors. The judge never retries or repairs
its output.

## Read the report

`Report` and its nested values have stable JSON field names. Scenario duration
includes the application call, result validation, and semantic judging.

Selection and calibration failures are returned as errors and recorded on the
suite report. Hook, validation, timeout, and judging failures are recorded on
their scenario reports so the remaining scenarios can finish. After a run with
no suite-level error, check `report.Passed`; a false value must make the calling
test or CI command fail.
