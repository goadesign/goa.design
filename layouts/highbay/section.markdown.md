# Highbay

{{ T "highbay_intro" }}

{{ T "highbay_clients" }}

{{ T "highbay_facts" }}

GitHub: [Highbay](https://github.com/goadesign/highbay)

Source: {{ .Permalink }}

## {{ T "highbay_install_heading" }}

{{ T "highbay_install_intro" }}

```bash
go install github.com/goadesign/highbay/cmd/hbay@latest && hbay up
```

{{ T "highbay_install_chorus" }}:

```bash
brew install goadesign/tap/chorus && chorus up
```

{{ T "highbay_install_next" }}

> {{ T "highbay_install_prompt" }}

{{ T "highbay_install_hint" }}

## {{ T "highbay_showcase_heading" }}

{{ T "highbay_showcase_intro" }}

- **{{ T "highbay_tab_agree" }} ({{ T "highbay_tab_agree_sub" }}):** {{ T "highbay_agree_pin_2" }}
- **{{ T "highbay_tab_build" }} ({{ T "highbay_tab_build_sub" }}):** {{ T "highbay_build_pin_1" }} · {{ T "highbay_build_pin_2" }}
- **{{ T "highbay_tab_approve" }} ({{ T "highbay_tab_approve_sub" }}):** {{ T "highbay_approve_pin_1" }} ({{ T "highbay_approve_pin_3" }})

## {{ T "highbay_pillars_heading" }}

{{ T "highbay_pillars_intro" }}
{{ range slice "contract" "card" "split" "verify" }}
### {{ T (printf "highbay_pillar_%s" .) }}

{{ T (printf "highbay_pillar_%s_text" .) }}
{{ end }}

## {{ T "highbay_steps_heading" }}

{{ T "highbay_steps_intro" }}
{{ range $i, $s := slice "describe" "agree" "build" "merge" }}
{{ add $i 1 }}. **{{ T (printf "highbay_step_%s" $s) }}.** {{ T (printf "highbay_step_%s_text" $s) }}{{ end }}

## {{ T "highbay_walkthrough_heading" }}

{{ T "highbay_walkthrough_intro" }}

### {{ T "highbay_role_guide" }}

{{ T "highbay_role_guide_caption" }}

```go
package design

import . "github.com/goadesign/highbay/story/dsl"

var _ = Story("Refunds", func() {
    Actor("customer", "Customer")
    Actor("manager", "Support manager")

    Flow("instant-credit", "Refund within the limit", func() {
        StartsWith("request-refund", "customer", "Requests a refund up to $50.00")
        Outcome("credit-issued", "customer", "Receives instant store credit")
    })
})
```

- **{{ T "highbay_card_question_label" }}:** {{ T "highbay_card_question" }}
- {{ T "highbay_card_choice" }}

### {{ T "highbay_role_tests" }}

{{ T "highbay_role_tests_caption" }}

```go
func (h *Hooks) InstantCredit(ctx context.Context) (eval.Result, error) {
    // $50.00 subtotal + $4.50 tax
    out, err := h.refund(ctx, 5000, 450)
    if err != nil {
        return eval.Result{}, err
    }
    return eval.Result{
        Checks: []eval.Check{
            check("50_subtotal", out.Status == "credit"),
            check("cents", out.Cents == 5450),
        },
    }, nil
}
```

{{ T "highbay_tests_check" }}

### {{ T "highbay_role_builder" }}

{{ T "highbay_role_builder_caption" }}

```text
1. generate_code(target: "candidate") -> writes agreed design/ and regenerates gen/
2. check_project() -> builds and unit-tests inside a Linux container
3. verify_change(change_id, request_revision, candidate_commit) -> server runs accepted highbay/tests-1 against candidate_commit
```

{{ T "highbay_builder_check" }}

## {{ T "highbay_arch_heading" }}

{{ T "highbay_arch_intro" }}

{{ T "highbay_arch_caption" }}

## {{ T "highbay_modes_heading" }}

{{ T "highbay_modes_intro" }}
{{ range slice "herdr" "headless" "models" }}
### {{ T (printf "highbay_mode_%s" .) }}

{{ T (printf "highbay_mode_%s_text" .) }}
{{ end }}

## {{ T "home_faq_heading" }}
{{ range slice "blank" "keys" "isolation" "docs" }}
### {{ T (printf "highbay_faq_%s_q" .) }}

{{ T (printf "highbay_faq_%s_a" .) }}
{{ end }}
