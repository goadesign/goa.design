---
title: "Command Line Tool"
linkTitle: "Command Line Tool"
weight: 1
description: "Learn about Goa's command-line tool for code generation, including installation, usage, and best practices."
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

Initialization steps for a new Goa project:

1. Create initial design
2. Run `goa gen` to generate base code
3. Run `goa example` to create implementation stubs
4. Deploy the stub service

Deploying the stub service early aligns your initial development with regular
maintenance workflows. This approach lets you:
- Validate deployment procedures before adding complex logic
- Set up monitoring and observability from day one
- Follow the same development cycle for both new and existing services

Once your stub service is deployed, the regular development cycle begins. This
involves implementing your actual service logic in the generated handlers,
running `goa gen` whenever you make changes to your design, and continuously
testing and iterating on your implementation. This cycle ensures your
implementation stays in sync with your design while allowing you to focus on
building the core business logic of your service.

## Best Practices

Generated code should be committed to version control rather than generated during CI/CD pipelines. Here's why:

- **Reproducible Builds**: Committed generated code ensures consistent builds across environments
- **Dependency Resolution**: Tools like `go get` work reliably with committed code in repositories
- **Version Control Benefits**: 
  - Track changes in generated code over time
  - Review generated code changes during code review
  - Roll back to previous versions if needed
- **CI/CD Efficiency**: Avoid running generators in CI/CD, making pipelines faster and more reliable

{{< alert title="Command Line Tips" color="primary" >}}
- Deploy stub service early in development to validate design
- Run `goa gen` after every design change to keep implementation in sync
- Use version control to track generated code changes systematically
{{< /alert >}}
