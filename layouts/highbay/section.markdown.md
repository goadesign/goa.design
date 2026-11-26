# Highbay — {{ T "highbay_heading" }} {{ T "highbay_heading_second" }}

{{ T "highbay_intro" }}

{{ T "highbay_clients" }} {{ T "highbay_facts" }}

GitHub: [Highbay](https://github.com/goadesign/highbay)

Source: {{ .Permalink }}

## {{ T "highbay_install_heading" }}

{{ T "highbay_install_intro" }}

```bash
go install github.com/goadesign/highbay/cmd/hbay@latest && hbay up
```

{{ T "highbay_install_next" }}

> {{ T "highbay_install_prompt" }}

{{ T "highbay_install_hint" }}

## {{ T "highbay_contrast_heading" }}

{{ T "highbay_contrast_intro" }}

> {{ T "highbay_contrast_request" }}

{{ T "highbay_contrast_order" }}

- **{{ T "highbay_solo_title" }} ({{ T "highbay_solo_suite" }} · {{ T "highbay_solo_tag" }}):** {{ T "highbay_solo_step_1" }} `if order.TotalCents <= 5000`. {{ T "highbay_solo_step_2" }}
  - *{{ T "highbay_contrast_opt_pretax" }}:* **{{ T "highbay_solo_chip_pretax" }}** — {{ T "highbay_solo_verdict_pretax" }}
  - *{{ T "highbay_contrast_opt_withtax" }}:* **{{ T "highbay_solo_chip_withtax" }}** — {{ T "highbay_solo_verdict_withtax" }}
- **{{ T "highbay_with_title" }} ({{ T "highbay_with_tag" }}):** {{ T "highbay_with_step_1" }}
  - *{{ T "highbay_contrast_opt_pretax" }} ({{ T "highbay_with_suite_pretax" }}):*
    - {{ T "highbay_with_run1_pretax" }}
    - {{ T "highbay_with_run2_pretax" }}
    - **{{ T "highbay_with_chip_pretax" }}** — {{ T "highbay_with_verdict_pretax" }}
  - *{{ T "highbay_contrast_opt_withtax" }} ({{ T "highbay_with_suite" }}):*
    - {{ T "highbay_with_run_withtax" }}
    - **{{ T "highbay_with_chip" }}** — {{ T "highbay_with_verdict_withtax" }}

{{ T "highbay_contrast_summary" }} {{ T "highbay_contrast_note" }}

## {{ T "highbay_trial_heading" }} ({{ T "highbay_trial_kicker" }})

- **{{ T "highbay_trial_stat_1_val" }}** {{ T "highbay_trial_stat_1_lbl" }}
- **{{ T "highbay_trial_stat_2_val" }}** {{ T "highbay_trial_stat_2_lbl" }}
- **{{ T "highbay_trial_stat_3_val" }}** {{ T "highbay_trial_stat_3_lbl" }}
- **{{ T "highbay_trial_stat_4_val" }}** {{ T "highbay_trial_stat_4_lbl" }}

{{ T "highbay_trial_body" }}

*{{ T "highbay_trial_note" }}*

## {{ T "highbay_showcase_heading" }}

{{ T "highbay_showcase_intro" }}

- **{{ T "highbay_tab_agree" }} ({{ T "highbay_tab_agree_sub" }}):** {{ T "highbay_agree_pin_1" }} · {{ T "highbay_agree_pin_2" }} · {{ T "highbay_agree_pin_3" }}
- **{{ T "highbay_tab_arch" }} ({{ T "highbay_tab_arch_sub" }}):** {{ T "highbay_arch_pin_1" }} · {{ T "highbay_arch_pin_2" }} · {{ T "highbay_arch_pin_3" }}
- **{{ T "highbay_tab_build" }} ({{ T "highbay_tab_build_sub" }}):** {{ T "highbay_build_pin_1" }} · {{ T "highbay_build_pin_2" }} · {{ T "highbay_build_pin_3" }}
- **{{ T "highbay_tab_approve" }} ({{ T "highbay_tab_approve_sub" }}):** {{ T "highbay_approve_pin_1" }} · {{ T "highbay_approve_pin_2" }} · {{ T "highbay_approve_pin_3" }}

## {{ T "highbay_walkthrough_heading" }}

{{ T "highbay_walkthrough_intro" }}

### {{ T "highbay_role_guide" }}

{{ T "highbay_role_guide_caption" }}

```go
package design

import . "github.com/goadesign/highbay/story/dsl"

var _ = Story("Refunds", func() {
    Actor("customer", "Customer")
    Flow("instant_credit", "Up to $50 subtotal", func() {
        StartsWith("ask", "customer", "$48.00 + $4.32 tax")
        Outcome("credit", "customer", "Instant $52.32 credit")
    })
})
```

{{ T "highbay_card_choice" }}

### {{ T "highbay_role_tests" }}

{{ T "highbay_role_tests_caption" }}

```go
func (h *Hooks) InstantCredit(ctx context.Context) (eval.Result, error) {
    out, err := h.refund(ctx, 4800, 432)
    if err != nil {
        return eval.Result{}, err
    }
    return eval.Result{
        Checks: []eval.Check{
            check("status", out.Status == "credit"),
            check("cents", out.Cents == 5232),
        },
    }, nil
}
```

{{ T "highbay_tests_check" }}

### {{ T "highbay_role_builder" }}

{{ T "highbay_role_builder_caption" }}

```go
func (s *Service) RequestRefund(
    ctx context.Context,
    req *genrefunds.RequestPayload,
) (*genrefunds.RefundResult, error) {
    total := req.SubtotalCents + req.TaxCents
    if req.SubtotalCents <= 5000 {
        return s.issueCredit(ctx, req.OrderID, total)
    }
    return s.queueReview(ctx, req.OrderID, total)
}
```

{{ T "highbay_builder_check" }}

## {{ T "highbay_compare_heading" }}

{{ T "highbay_compare_intro" }}
{{ range slice "solo" "speckit" "workspaces" }}
### {{ T (printf "highbay_compare_%s" .) }}

{{ T (printf "highbay_compare_%s_text" .) }}
{{ end }}

{{ T "highbay_compare_summary" }}

## {{ T "home_faq_heading" }}
{{ range slice "scope" "tdd" "existing" "holdouts" "local" "sandbox" }}
### {{ T (printf "highbay_faq_%s_q" .) }}

{{ T (printf "highbay_faq_%s_a" .) }}
{{ end }}
