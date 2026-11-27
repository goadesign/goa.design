# Highbay: {{ T "highbay_heading" }} {{ T "highbay_heading_second" }}

- **{{ T "highbay_for_you_label" }}:** {{ T "highbay_for_you_text" }}
- **{{ T "highbay_for_model_label" }}:** {{ T "highbay_for_model_text" }}

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

{{ T "highbay_install_next" }}

> {{ T "highbay_install_prompt" }}

## {{ T "highbay_showcase_heading" }} {#views}

{{ T "highbay_showcase_intro" }}

- **{{ T "highbay_tab_agree" }}:** {{ T "highbay_agree_pin_1" }}
- **{{ T "highbay_tab_arch" }}:** {{ T "highbay_arch_pin_1" }}
- **{{ T "highbay_tab_check" }}:** {{ T "highbay_check_pin_1" }}
- **{{ T "highbay_tab_approve" }}:** {{ T "highbay_approve_pin_1" }}

## {{ T "highbay_contrast_heading" }} {#contrast}
{{ range slice "1" "2" "3" }}
### {{ . }}. {{ T (printf "highbay_solo_row_%s_title" .) }}
- **{{ T "highbay_solo_title" }}:** {{ T (printf "highbay_solo_row_%s_text" .) }}
- **{{ T "highbay_with_title" }}:** {{ T (printf "highbay_with_row_%s_text" .) }}
{{ end -}}

## {{ T "highbay_walkthrough_heading" }} {#codegen}

{{ T "highbay_walkthrough_intro" }}

### {{ T "highbay_role_guide" }}

{{ T "highbay_role_guide_caption" }}

```go
// design/agents.go (illustrative excerpt)
var opsTools = Toolset("ops", func() {
    Tool("query_pod_logs", "Read pod logs.", func() {
        Args(LogsArgs)
        Return(LogLines)
        BindTo("ops", "query_pod_logs")
        Inject("org_id")
        BoundedResult(func() {
            Cursor("cursor")
            NextCursor("next_cursor")
        })
    })
    Tool("rollback_staging", "Roll back staging.", func() {
        BindTo("ops", "rollback_staging")
        Inject("org_id")
    })
    Tool("rollback_production", "Roll back prod.", func() {
        BindTo("ops", "rollback_production")
        Inject("org_id")
        Confirmation(func() {
            Title("Approve production rollback")
            PromptTemplate(`Roll back {{"{{"}} .service {{"}}"}} in prod?`)
            DeniedResultTemplate(`{"status":"denied"}`)
        })
    })
})
```

### {{ T "highbay_role_codegen" }}

{{ T "highbay_role_codegen_caption" }}

```go
// gen/ops/service.go
type Service interface {
    QueryPodLogs(context.Context,
        *LogsArgs) (*LogsPage, error)
    RollbackStaging(context.Context,
        *RollbackArgs) (*RollbackOutcome, error)
    RollbackProduction(context.Context,
        *RollbackArgs) (*RollbackOutcome, error)
}
// + HTTP & MCP servers, OpenAPI 3 spec
// + Tenant ID bound server-side
// + Enforced log page cursors
```

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
    check("paused", run.PendingConfirmation),
    check("non_oncall_approval_rejected",
        res.StatusCode == 403),
}}, nil
```

## {{ T "highbay_cap_heading" }} {#capabilities}

{{ T "highbay_cap_intro" }}
{{ range slice "auth" "obs" "stream" "durable" }}
- **{{ T (printf "highbay_cap_%s_title" .) }}:** {{ T (printf "highbay_cap_%s_body" .) }}
{{- end }}

## {{ T "highbay_compare_heading" }}

| {{ T "highbay_compare_col_dim" }} | {{ T "highbay_with_title" }} | {{ T "highbay_compare_solo" }} | {{ T "highbay_compare_speckit" }} | {{ T "highbay_compare_workspaces" }} |
| --- | --- | --- | --- | --- |
{{- range slice "r1" "r2" "r3" "r4" }}
| {{ T (printf "highbay_matrix_%s_label" .) }} | {{ T (printf "highbay_matrix_%s_hb" .) }} | {{ T (printf "highbay_matrix_%s_solo" .) }} | {{ T (printf "highbay_matrix_%s_sdk" .) }} | {{ T (printf "highbay_matrix_%s_wt" .) }} |
{{- end }}

## {{ T "home_faq_heading" }}
{{ range slice "scope" "holdouts" "local" "sandbox" }}
### {{ T (printf "highbay_faq_%s_q" .) }}

{{ T (printf "highbay_faq_%s_a" .) }}
{{ end }}
