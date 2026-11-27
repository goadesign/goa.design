{{- $page := . -}}
{{- $raw := .RawContent -}}
{{- $raw = $raw | replaceRE `\{\{<\s*figure\s+src="([^"]+)"\s+alt="([^"]+)"[^>]*>\}\}` "![$2]($1)" -}}
{{- $raw = $raw | replaceRE `\{\{<\s*highbay-views\s*>\}\}\n?` "" -}}
{{- $raw = $raw | replaceRE `\{\{<\s*anchors\s+[^>]*>\}\}\n?` "" -}}
{{- range findRE `\{\{<\s*(?:rel)?ref\s+"[^"]+"\s*>\}\}` $raw -}}
  {{- $target := replaceRE `^\{\{<\s*(?:rel)?ref\s+"([^"]+)"\s*>\}\}$` "$1" . -}}
  {{- $raw = replace $raw . (relref $page $target) -}}
{{- end -}}
{{- $raw = $raw | replaceRE `\{\{<\s*alert\s+title="([^"]+)"[^>]*>\}\}` "> **$1**" -}}
{{- $raw = $raw | replaceRE `\{\{<\s*/alert\s*>\}\}` "" -}}
# {{ .Title }}

{{ with .Description }}{{ . }}

{{ end }}Source: {{ .Permalink }}

Relative links resolve against the source URL above.

{{ $raw }}
