# Goa and Goa-AI

{{ T "home_intro" }}

GitHub: [Goa](https://github.com/goadesign/goa) · [Goa-AI](https://github.com/goadesign/goa-ai)

Source: {{ .Permalink }}

```go
// design/catalog.go -> goa gen example.com/catalog/design
var LookupPayload = Type("LookupPayload", func() {
    Field(1, "sku", String, func() { Pattern("^[A-Z0-9-]+$") })
    Required("sku")
})
var _ = Service("catalog", func() {
    Error("not_found", ErrorResult)
    JSONRPC(func() { POST("/rpc") })
    Method("lookup", func() {
        Payload(LookupPayload)
        Result(Product)
        Error("not_found")
        HTTP(func() { GET("/products/{sku}") })
        GRPC(func() {})
        JSONRPC(func() {})
    })
})
// Generated in gen/catalog/service.go (0 LLM tokens); you implement:
// Lookup(ctx context.Context, p *LookupPayload) (*Product, error)
```

## {{ T "home_skill_heading" }}

{{ T "home_skill_step1" }}

```bash
npx skills add goadesign/goa --skill goa-service-designer
# or standalone Go CLI (Go 1.27+):
go install goa.design/goa/v3/cmd/goa@latest
mkdir catalog && cd catalog && go mod init example.com/catalog && go get goa.design/goa/v3@v3.36.0
```

{{ T "home_skill_next" }}

```text
{{ T "home_skill_prompt" }}
```

{{ T "home_skill_outcome" }}

[{{ T "home_service_cta" }}]({{ absLangURL "docs/1-goa/quickstart/" }}) · [{{ T "home_agent_cta" }}]({{ absLangURL "docs/2-goa-ai/quickstart/" }}) · [{{ T "home_skill_docs" }}]({{ absLangURL "docs/ai-development/" }}#install-the-skill)

## {{ T "home_benefits_heading" }}
{{ range slice "tokens" "context" "feedback" }}
### {{ T (printf "home_benefit_%s" .) }}

{{ T (printf "home_benefit_%s_text" .) }}
{{ end }}

## Goa

{{ T "home_service_text" }}

HTTP, gRPC, JSON-RPC. {{ T "home_service_transports" }}

{{ T "home_service_contracts_text" }}

[{{ T "home_service_docs" }}]({{ absLangURL "docs/1-goa/" }})

## Goa-AI

{{ T "home_agent_text" }}

{{ T "home_agent_contracts_text" }} {{ T "home_agent_composition_text" }}

{{ T "home_agent_execution_text" }}

[{{ T "home_agent_docs" }}]({{ absLangURL "docs/2-goa-ai/" }})

## {{ T "home_mcp_heading" }}

{{ T "home_mcp_design" }} → `goa gen` → {{ T "home_mcp_generated" }}.
{{ range slice "server" "client" "schemas" "validation" }}
- **{{ T (printf "home_mcp_result_%s" .) }}**: {{ T (printf "home_mcp_result_%s_text" .) }}
{{ end }}

**{{ T "home_mcp_humans" }}**: {{ T "home_mcp_humans_text" }}

**{{ T "home_mcp_llms" }}**: {{ T "home_mcp_llms_text" }}

{{ T "home_mcp_capabilities" }}

[{{ T "home_mcp_cta" }}]({{ absLangURL "docs/2-goa-ai/mcp-integration/" }})

## {{ T "home_registry_heading" }}

{{ T "home_registry_text" }}

[{{ T "home_registry_cta" }}]({{ absLangURL "docs/2-goa-ai/registry/" }})

## {{ T "home_compare_heading" }}
{{ range slice "specs" "mcp_sdk" "agent_sdk" }}
### {{ T (printf "home_compare_%s" .) }}

{{ T (printf "home_compare_%s_text" .) }}
{{ end }}
{{ range slice "codegen" "difference" "mcp" "tokens" }}
## {{ T (printf "home_faq_%s_q" .) }}

{{ T (printf "home_faq_%s_a" .) }}
{{ end }}

## {{ T "home_community_heading" }}

- **[Chorus]({{ absLangURL "chorus/" }})**: {{ T "home_eco_chorus" }}
- **[Highbay]({{ absLangURL "highbay/" }})**: {{ T "home_eco_highbay" }}
- **[Pulse]({{ absLangURL "docs/3-ecosystem/pulse/" }}) · [Clue]({{ absLangURL "docs/3-ecosystem/clue/" }}) · [Model]({{ absLangURL "docs/3-ecosystem/model/" }})**: {{ T "home_eco_libs" }}
