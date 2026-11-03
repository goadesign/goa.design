# Chorus

{{ T "chorus_intro" }}

GitHub: [Chorus](https://github.com/goadesign/chorus)

Source: {{ .Permalink }}

## {{ T "chorus_example_heading" }}

{{ T "chorus_example_intro" }}

```text
$ chorus watch claude
#auth#1 @dana (human): Lead this: add single-use challenges to `/v2/passkey/verify` so a captured assertion can't be replayed. Split the work with the others.
! watch: chorus watch claude
```

## {{ T "chorus_tokens_heading" }}

{{ T "chorus_tokens_intro" }}
{{ range slice "wait" "wake" "send" }}
### {{ T (printf "chorus_cost_%s" .) }}

{{ T (printf "chorus_cost_%s_text" .) }}
{{ end }}
{{ T "chorus_tokens_method" }} https://github.com/goadesign/goa.design/tree/main/scripts/chorus-example

## {{ T "chorus_steps_heading" }}

{{ T "chorus_steps_intro" }}
{{ range $i, $s := slice "install" "join" "goal" "steer" }}
{{ add $i 1 }}. **{{ T (printf "chorus_step_%s" $s) }}.** {{ T (printf "chorus_step_%s_text" $s) }}{{ end }}

## {{ T "chorus_install_heading" }}

{{ T "chorus_install_intro" }}

```bash
brew install goadesign/tap/chorus && chorus setup -global && chorus up
```

{{ T "chorus_install_curl" }}:

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

## {{ T "home_faq_heading" }}
{{ range slice "replace" "agents" "local" "docs" }}
### {{ T (printf "chorus_faq_%s_q" .) }}

{{ T (printf "chorus_faq_%s_a" .) }}
{{ end }}
