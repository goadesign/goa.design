# Highbay — {{ T "highbay_heading" }} {{ T "highbay_heading_second" }}

{{ T "highbay_intro" }}

- {{ T "highbay_hero_point_1" }}
- {{ T "highbay_hero_point_2" }}
- {{ T "highbay_hero_point_3" }}

GitHub: [github.com/goadesign/highbay](https://github.com/goadesign/highbay) · Docs: [Ecosystem Guide]({{ relref . "/docs/3-ecosystem/highbay/" }})

## {{ T "highbay_install_heading" }}

{{ T "highbay_install_intro" }}

```bash
# Homebrew (macOS or Linux)
brew install goadesign/tap/highbay
highbay up

# npx (Linux or macOS, Node.js 18+)
npx @goadesign/highbay up

# Go 1.27.3+
go install github.com/goadesign/highbay/cmd/highbay@latest
highbay up
```

{{ T "highbay_install_prereq" }}

{{ T "highbay_install_next" }}

> {{ T "highbay_install_prompt" }}

{{ T "highbay_install_hint" }}

- {{ T "highbay_fit_agents" }}
- {{ T "highbay_fit_scope" }}
- {{ T "highbay_fit_local" }}

## {{ T "highbay_contrast_heading" }} {#contrast}
{{ range slice "1" "2" "3" "4" }}
### {{ . }}. {{ T (printf "highbay_solo_row_%s_title" .) }}
- **{{ T "highbay_solo_title" }} ({{ T "highbay_solo_chip_gate" }}):** {{ T (printf "highbay_solo_row_%s_text" .) }}
- **{{ T "highbay_with_title" }} ({{ T "highbay_with_suite" }}):** {{ T (printf "highbay_with_row_%s_text" .) }}
{{ end -}}

## {{ T "highbay_showcase_heading" }} {#views}

- **{{ T "highbay_tab_agree" }}:** {{ T "highbay_agree_pin_1" }}
- **{{ T "highbay_tab_arch" }}:** {{ T "highbay_arch_pin_1" }}
- **{{ T "highbay_tab_check" }}:** {{ T "highbay_check_pin_1" }}
- **{{ T "highbay_tab_approve" }}:** {{ T "highbay_approve_pin_1" }}

*{{ T "highbay_showcase_caption" }} ([{{ T "highbay_showcase_method" }}](https://github.com/goadesign/goa.design/tree/main/scripts/highbay-example))*

## {{ T "highbay_walkthrough_heading" }} {#codegen}

### {{ T "highbay_role_guide" }}

{{ T "highbay_role_guide_caption" }}

```go
// design/agents.go
Tool("query_pod_logs", func() {
    Inject("org_id")
    BoundedResult()
    BindTo("Ops", "QueryPodLogs")
})
Tool("rollback_service", func() {
    Inject("org_id")
    Confirmation("On-call approval")
    BindTo("Ops", "RollbackService")
})
```

{{ T "highbay_card_choice" }}

### {{ T "highbay_role_codegen" }}

{{ T "highbay_role_codegen_caption" }}

```go
// gen/ops/service.go
type Service interface {
    QueryPodLogs(context.Context,
        *LogsPayload) (*LogsPage, error)
    RollbackService(context.Context,
        *RollbackPayload) (*Result, error)
}
// + HTTP & MCP servers, OpenAPI 3 spec
// + Tool JSON (org_id omitted)
// + BoundedResult log cursors
```

{{ T "highbay_codegen_check" }}

### {{ T "highbay_role_tests" }}

{{ T "highbay_role_tests_caption" }}

```go
// eval/acceptance/incidents.go
run, err := h.startRollback(ctx, "prod", "api")
if err != nil {
    return eval.Result{}, err
}
res, err := h.approveAs(ctx, run.ID, "viewer")
if err != nil {
    return eval.Result{}, err
}
return eval.Result{Checks: []eval.Check{
    // eval.Check helper for named assertions
    check("paused", run.PendingConfirmation),
    check("non_oncall_approval_rejected",
        res.StatusCode == 403),
}}, nil
```

{{ T "highbay_builder_check" }}

### Guardrails & repository references {#llm-stack}
{{ range slice "codegen" "playbook" "suite" }}
- **{{ T (printf "highbay_proof_%s_title" .) }}:** {{ T (printf "highbay_proof_%s_body" .) }}
{{- end }}

## {{ T "highbay_cap_heading" }} {#capabilities}
{{ range slice "auth" "obs" "stream" "durable" }}
- **{{ T (printf "highbay_cap_%s_title" .) }}:** {{ T (printf "highbay_cap_%s_body" .) }}
{{- end }}

## {{ T "highbay_compare_heading" }}
{{ range slice "solo" "speckit" "workspaces" }}
### {{ T (printf "highbay_compare_%s" .) }}

{{ T (printf "highbay_compare_%s_text" .) }}
{{ end }}

## {{ T "home_faq_heading" }}
{{ range slice "scope" "holdouts" "local" "sandbox" }}
### {{ T (printf "highbay_faq_%s_q" .) }}

{{ T (printf "highbay_faq_%s_a" .) }}
{{ end }}

## {{ T "highbay_bottom_heading" }}

{{ T "highbay_bottom_intro" }}
