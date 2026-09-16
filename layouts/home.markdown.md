# Goa and Goa-AI

{{ T "home_intro" }}

GitHub: [Goa](https://github.com/goadesign/goa) · [Goa-AI](https://github.com/goadesign/goa-ai)

Source: {{ .Permalink }}

## {{ T "home_benefits_heading" }}
{{ range slice "tokens" "context" "feedback" }}
### {{ T (printf "home_benefit_%s" .) }}

{{ T (printf "home_benefit_%s_text" .) }}
{{ end }}
## Goa

{{ T "home_service_text" }}

HTTP, gRPC, JSON-RPC. {{ T "home_service_transports" }}

{{ T "home_service_contracts_text" }}

[{{ T "home_service_cta" }}]({{ absLangURL "docs/1-goa/quickstart/" }})

## Goa-AI

{{ T "home_agent_text" }}

{{ T "home_agent_contracts_text" }} {{ T "home_agent_composition_text" }}

{{ T "home_agent_execution_text" }}

[{{ T "home_agent_cta" }}]({{ absLangURL "docs/2-goa-ai/quickstart/" }})

## {{ T "home_mcp_heading" }}

{{ T "home_mcp_text" }}

[{{ T "home_mcp_cta" }}]({{ absLangURL "docs/2-goa-ai/mcp-integration/" }})

## {{ T "home_registry_heading" }}

{{ T "home_registry_text" }}

[{{ T "home_registry_cta" }}]({{ absLangURL "docs/2-goa-ai/registry/" }})

## {{ T "home_skill_heading" }}

{{ T "home_skill_intro" }}

```bash
npx skills add goadesign/goa --skill goa-service-designer
```

{{ T "home_skill_hint" }}

[{{ T "home_skill_docs" }}]({{ absLangURL "docs/ai-development/" }}#install-the-skill)
{{ range slice "codegen" "difference" "mcp" "tokens" }}
## {{ T (printf "home_faq_%s_q" .) }}

{{ T (printf "home_faq_%s_a" .) }}
{{ end }}
