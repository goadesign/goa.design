# Surla

{{ T "surla_intro" }}

{{ T "surla_clients" }}

{{ T "surla_facts" }}

GitHub: [Surla](https://github.com/goadesign/surla)

Source: {{ .Permalink }}

## {{ T "surla_install_heading" }}

{{ T "surla_install_intro" }}

```bash
go install github.com/goadesign/surla/cmd/surla@latest && surla up
```

{{ T "surla_install_chorus" }}:

```bash
brew install goadesign/tap/chorus && chorus up
```

{{ T "surla_install_next" }}

> {{ T "surla_install_prompt" }}

{{ T "surla_install_hint" }}

## {{ T "surla_pillars_heading" }}

{{ T "surla_pillars_intro" }}
{{ range slice "contract" "card" "split" "verify" }}
### {{ T (printf "surla_pillar_%s" .) }}

{{ T (printf "surla_pillar_%s_text" .) }}
{{ end }}

## {{ T "surla_steps_heading" }}

{{ T "surla_steps_intro" }}
{{ range $i, $s := slice "describe" "agree" "build" "merge" }}
{{ add $i 1 }}. **{{ T (printf "surla_step_%s" $s) }}.** {{ T (printf "surla_step_%s_text" $s) }}{{ end }}

## {{ T "surla_walkthrough_heading" }}

{{ T "surla_walkthrough_intro" }}

### {{ T "surla_role_guide" }}

{{ T "surla_role_guide_caption" }}

```go
package design

import . "github.com/goadesign/surla/story/dsl"

var _ = Story("Refunds", func() {
    Actor("customer", "Customer")
    Actor("manager", "Support manager")

    Flow("instant-credit", "Refund within the limit", func() {
        StartsWith("request-refund", "customer", "Requests a refund up to $50.00")
        Outcome("credit-issued", "customer", "Receives instant store credit")
    })
})
```

- **{{ T "surla_card_question_label" }}:** {{ T "surla_card_question" }}
- {{ T "surla_card_choice" }}

### {{ T "surla_role_tests" }}

{{ T "surla_role_tests_caption" }}

```go
func (h *Hooks) InstantCredit(ctx context.Context) (eval.Result, error) {
    out, err := h.requestRefund(ctx, "ORD-42", 5000)
    if err != nil {
        return eval.Result{}, err
    }
    return eval.Result{
        Checks: []eval.Check{
            check("exact_50_gets_credit", out.Status == "instant_credit"),
            check("credit_cents", out.CreditCents == 5000),
        },
    }, nil
}
```

{{ T "surla_tests_check" }}

### {{ T "surla_role_builder" }}

{{ T "surla_role_builder_caption" }}

```text
1. generate_code(target: "candidate") -> writes agreed design/ and regenerates gen/
2. check_project() -> builds and unit-tests inside a Linux container
3. verify_change(change_id, request_revision, candidate_commit) -> runs accepted surla/tests-1 against candidate_commit
```

{{ T "surla_builder_check" }}

## {{ T "surla_arch_heading" }}

{{ T "surla_arch_intro" }}

{{ T "surla_arch_caption" }}

## {{ T "surla_modes_heading" }}

{{ T "surla_modes_intro" }}
{{ range slice "herdr" "headless" "models" }}
### {{ T (printf "surla_mode_%s" .) }}

{{ T (printf "surla_mode_%s_text" .) }}
{{ end }}

## {{ T "home_faq_heading" }}
{{ range slice "blank" "keys" "isolation" "docs" }}
### {{ T (printf "surla_faq_%s_q" .) }}

{{ T (printf "surla_faq_%s_a" .) }}
{{ end }}
