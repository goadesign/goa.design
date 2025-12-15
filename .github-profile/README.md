<div align="center">
  
![Goa Design](banner.svg)

[![Documentation](https://img.shields.io/badge/📖_Docs-goa.design-5bc0eb?style=for-the-badge&labelColor=0d1117)](https://goa.design)
[![Gitter](https://img.shields.io/badge/💬_Chat-Gitter-fb4fcf?style=for-the-badge&labelColor=0d1117)](https://gitter.im/goadesign/goa)
[![Twitter](https://img.shields.io/badge/🐦_Follow-@goadesign-1DA1F2?style=for-the-badge&labelColor=0d1117)](https://twitter.com/goadesign)

**Stop writing boilerplate. Start designing.**

</div>

---

## 🎯 The Ecosystem

<table>
<tr>
<td width="50%" valign="top">

### ⚡ [Goa](https://github.com/goadesign/goa) &nbsp; ![Stars](https://img.shields.io/github/stars/goadesign/goa?style=flat&color=5bc0eb&labelColor=0d1117)

**Design-first API framework for Go**

Write your API design in an elegant DSL. Get HTTP servers, gRPC services, OpenAPI specs, and type-safe clients — all generated, all in sync.

```go
var _ = Service("users", func() {
    Method("show", func() {
        Payload(func() {
            Attribute("id", Int, "User ID")
            Required("id")
        })
        Result(User)
        HTTP(func() { GET("/users/{id}") })
        GRPC(func() {})
    })
})
```

</td>
<td width="50%" valign="top">

### 🤖 [Goa-AI](https://github.com/goadesign/goa-ai) &nbsp; ![Stars](https://img.shields.io/github/stars/goadesign/goa-ai?style=flat&color=fb4fcf&labelColor=0d1117)

**AI Agent framework for Go**

Build production-ready AI agents with the same design-first philosophy. Define tools, prompts, and workflows — generate the runtime.

```go
var _ = Agent("assistant", func() {
    Description("AI-powered assistant")
    Model("claude-sonnet-4-20250514")
    Toolset("search", func() {
        Tool("query", QueryPayload, QueryResult,
            "Search the knowledge base")
    })
})
```

</td>
</tr>
</table>

<table>
<tr>
<td width="33%" valign="top">

### 📐 [Model](https://github.com/goadesign/model)

**Architecture diagrams as code**

C4 model diagrams written in Go. Interactive editor, SVG export, always in sync with your codebase.

![Stars](https://img.shields.io/github/stars/goadesign/model?style=flat&color=9d89e8&labelColor=0d1117)

</td>
<td width="33%" valign="top">

### 🔍 [Clue](https://github.com/goadesign/clue)

**Observability made simple**

Structured logging, metrics, and distributed tracing. OpenTelemetry compatible. Drop-in middleware for Goa services.

![Stars](https://img.shields.io/github/stars/goadesign/clue?style=flat&color=58a6ff&labelColor=0d1117)

</td>
<td width="33%" valign="top">

### ⚡ [Pulse](https://github.com/goadesign/pulse)

**Event streaming at scale**

In-memory shared maps, adaptive streams, and worker pools. Build event-driven architectures that scale.

![Stars](https://img.shields.io/github/stars/goadesign/pulse?style=flat&color=faff00&labelColor=0d1117)

</td>
</tr>
</table>

---

## 💡 Why Design-First?

| Traditional Approach | Goa Design-First |
|:---------------------|:-----------------|
| ❌ Write API code, then docs, then clients | ✅ **Design once** → everything generated |
| ❌ Docs drift from implementation | ✅ **Always in sync** — guaranteed |
| ❌ HTTP and gRPC handled separately | ✅ **Single design** → both transports |
| ❌ Manual validation everywhere | ✅ **Automatic validation** from design |
| ❌ Breaking changes discovered in production | ✅ **Compile-time safety** for contracts |

---

## 🚀 Get Started in 60 Seconds

```bash
# Install the Goa CLI
go install goa.design/goa/v3/cmd/goa@latest

# Create your design
mkdir myapi && cd myapi
cat > design/design.go << 'EOF'
package design

import . "goa.design/goa/v3/dsl"

var _ = API("myapi", func() {
    Title("My API")
})

var _ = Service("hello", func() {
    Method("greet", func() {
        Payload(String)
        Result(String)
        HTTP(func() {
            GET("/greet/{name}")
        })
    })
})
EOF

# Generate everything
goa gen myapi/design

# That's it — you now have HTTP server, OpenAPI spec, and client code!
```

📖 **[Full documentation at goa.design →](https://goa.design)**

---

## 🏢 Trusted By

<p align="center">
  <a href="https://incident.io"><img src="https://raw.githubusercontent.com/goadesign/goa.design/master/static/img/sponsors/incidentio.png" alt="incident.io" height="50"/></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://speakeasy.com"><img src="https://raw.githubusercontent.com/goadesign/goa.design/master/static/img/sponsors/speakeasy.png" alt="Speakeasy" height="50"/></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://flexera.com"><img src="https://raw.githubusercontent.com/goadesign/goa.design/master/static/img/companies/flexera.svg" alt="Flexera" height="40"/></a>
</p>

---

## 💬 Join the Community

<table>
<tr>
<td align="center" width="33%">
<a href="https://gitter.im/goadesign/goa"><strong>💬 Gitter Chat</strong></a><br/>
Get help, share ideas
</td>
<td align="center" width="33%">
<a href="https://twitter.com/goadesign"><strong>🐦 Twitter</strong></a><br/>
Follow for updates
</td>
<td align="center" width="33%">
<a href="https://github.com/goadesign/goa/blob/v3/CONTRIBUTING.md"><strong>🤝 Contribute</strong></a><br/>
Help build Goa
</td>
</tr>
</table>

---

<div align="center">
  <sub>Made with ❤️ by the Goa Design team and <a href="https://github.com/goadesign/goa/graphs/contributors">contributors</a></sub>
</div>








