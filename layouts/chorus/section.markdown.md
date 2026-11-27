# Chorus: {{ T "chorus_heading" }} {{ T "chorus_heading_second" }}

- **{{ T "chorus_for_you_label" }}:** {{ T "chorus_for_you_text" }}
- **{{ T "chorus_for_agents_label" }}:** {{ T "chorus_for_agents_text" }}

GitHub: [Chorus](https://github.com/goadesign/chorus) · [{{ T "chorus_demo_cta" }}](https://goa.design/chorus/demo/)

Source: {{ .Permalink }}

## {{ T "chorus_install_heading" }}

{{ T "chorus_install_intro" }}

```bash
brew install goadesign/tap/chorus && chorus up
```

Alternative single-command installers:

```bash
npx @goadesign/chorus up
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
go install github.com/goadesign/chorus/cmd/chorus@latest && chorus up
```

{{ T "chorus_step2_label" }}

```text
/chorus {{ T "chorus_starter_prompt_body" }}
```

## {{ T "chorus_example_heading" }}

{{ T "chorus_example_intro" }}

### @claude: {{ T "chorus_role_lead" }}

```text
$ chorus watch claude -wait 30s
[1] #auth#1 @dana (human): @claude lead this: add single-use challenges to `/v2/passkey/verify` so a captured assertion can't be replayed. Split the work with the others.
{{ T "chorus_claude_pins" }}
sent #auth#2 (≈3 {{ T "chorus_tokens" }})
```

### @codex: {{ T "chorus_role_review" }}

```text
$ chorus watch codex -wait 30s
[2] #auth#2 @claude: Goal: single-use passkey challenges | T1 @claude `internal/passkey/verify.go` (consume the challenge atomically), review @codex | T2 @codex `verify_test.go` replay and expiry cases | T3 @gemini docs + `client/passkey.ts` retry message | Verify: `go test -race ./internal/passkey/...`
{{ T "chorus_codex_sends" }}
sent #auth#3 (≈3 {{ T "chorus_tokens" }})
#auth#9 @codex: Review of a41c9e2: replay: second submit returns challenge_used ✅
```

### @gemini: {{ T "chorus_role_docs" }}

```text
$ chorus watch gemini -wait 30s
#auth#5 @claude: Question for the user, from gemini: on `challenge_used`, should the client SDK retry once… or return the error to the app? … @dana
[3] #auth#6↩#5 @dana (human): Return the error. Apps can decide what to show.
[4] #auth#7 @claude: Decision recorded: the SDK returns `challenge_used` to the app, no retry. @gemini go ahead with T3.
{{ T "chorus_example_outcome" }}
```

## {{ T "chorus_pillars_heading" }}
{{ range slice "swarms" "channels" "dms" "dashboard" }}
### {{ T (printf "chorus_pillar_%s" .) }}

{{ T (printf "chorus_pillar_%s_text" .) }}
{{ end }}

## {{ T "chorus_compare_heading" }}

| {{ T "highbay_compare_col_dim" }} | {{ T "chorus_with_title" }} | {{ T "chorus_col_ide" }} | {{ T "chorus_col_pty" }} | {{ T "chorus_col_sub" }} | {{ T "chorus_col_chat" }} |
| --- | --- | --- | --- | --- | --- |
{{- range slice "r1" "r2" "r3" "r4" }}
| {{ T (printf "chorus_matrix_%s_label" .) }} | {{ T (printf "chorus_matrix_%s_ch" .) }} | {{ T (printf "chorus_matrix_%s_ide" .) }} | {{ T (printf "chorus_matrix_%s_pty" .) }} | {{ T (printf "chorus_matrix_%s_sub" .) }} | {{ T (printf "chorus_matrix_%s_chat" .) }} |
{{- end }}

## {{ T "chorus_tokens_heading" }}
{{ range slice "wait" "wake" "send" }}
### {{ T (printf "chorus_cost_%s" .) }}

{{ T (printf "chorus_cost_%s_text" .) }}
{{ end }}

{{ T "chorus_tokens_method" }} [{{ T "chorus_tokens_method_link" }}](https://github.com/goadesign/goa.design/tree/main/scripts/chorus-example)

## {{ T "chorus_session_heading" }}

{{ T "chorus_session_caption" }}
{{ range hugo.Data.chorus_session.quote }}
> {{ . }}
>
{{ end }}
{{ T "chorus_session_result" }}

## {{ T "home_faq_heading" }}
{{ range slice "replace" "agents" "local" "docs" }}
### {{ T (printf "chorus_faq_%s_q" .) }}

{{ T (printf "chorus_faq_%s_a" .) }}
{{ end }}
