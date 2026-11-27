{{- $raw := .RawContent -}}
{{- $raw = $raw | replaceRE `\{\{<\s*figure\s+src="([^"]+)"\s+alt="([^"]+)"[^>]*>\}\}` "![$2]($1)" -}}
{{- $raw = $raw | replaceRE `\{\{<\s*highbay-views\s*>\}\}\n?` "" -}}
{{- $raw = $raw | replaceRE `\{\{<\s*ref\s+"([^"]+)\.md"\s*>\}\}` "$1/" -}}
{{- $raw = $raw | replaceRE `\{\{<\s*alert\s+title="([^"]+)"[^>]*>\}\}` "> **$1**" -}}
{{- $raw = $raw | replaceRE `\{\{<\s*/alert\s*>\}\}` "" -}}
# {{ .Title }}

{{ with .Description }}{{ . }}

{{ end }}Source: {{ .Permalink }}

Relative links resolve against the source URL above.

{{ $raw }}
