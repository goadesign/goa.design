---
title: "Command Line Tools"
linkTitle: "Command Line Tools"
weight: 1
description: "Learn about Goa's command-line tools for code generation, including installation, usage, and best practices."
---

## Installation

Install Goa's command-line tools using:

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

## Available Commands

### Generate Code (`goa gen`)

```bash
goa gen <design-package-import-path> [-o <output-dir>]
```

The `goa gen` command is the primary tool for code generation in Goa. When run,
it processes your design package and generates the complete implementation code
for your services. It recreates the entire `gen/` directory from scratch,
ensuring all generated code stays in sync with your design. You should run this
command every time you make changes to your design to regenerate the
implementation code.

### Create Example (`goa example`)

```bash
goa example <design-package-import-path> [-o <output-dir>]
```

The `goa example` command helps you scaffold your initial service
implementation. It creates example implementations and generates handler stubs
with placeholder logic to get you started. This command is meant to be run just
once when starting a new project, as it provides a foundation for your custom
implementation. Importantly, it's designed to be safe - it won't overwrite any
custom code you've already written, preserving your existing work.

### Show Version (`goa version`)

```bash
goa version
```

Displays the installed version of Goa.

## Usage Guidelines

### Package Paths vs File Paths

All commands expect Go package import paths, not filesystem paths:

```bash
# ✅ Correct: using Go package import path
goa gen goa.design/examples/calc/design

# ❌ Incorrect: using filesystem path
goa gen ./design
```

### Development Workflow

1. Create initial design
2. Run `goa gen` to generate base code
3. Run `goa example` to create implementation stubs
4. Implement your service logic
5. Run `goa gen` after design changes
6. Test and iterate

## Best Practices

{{< alert title="Command Line Tips" color="primary" >}}
- Run `goa gen` after every design change
- Use version control to track generated code
- Keep design package separate from implementation
- Use consistent package paths across team
{{< /alert >}}
