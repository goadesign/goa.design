---
title: "Contributing to Goa"
linkTitle: "Contributing"
weight: 1
description: "Learn how to contribute to Goa's development and documentation"
---

Welcome to the Goa contributor's guide! This document will help you understand how you
can contribute to making Goa better. Whether you're interested in improving code,
documentation, or helping other users, there's a place for you in our community.

## Getting Started

Before diving into contributions, we recommend:

1. Joining our [Gophers Slack](https://gophers.slack.com/messages/goa/) community
2. Browsing our [GitHub Discussions](https://github.com/goadesign/goa/discussions)
3. Exploring the [examples repository](https://github.com/goadesign/examples)
4. Familiarizing yourself with the [DSL Reference](https://pkg.go.dev/github.com/goadesign/goa/v3/dsl)

## Code Contributions

### Setting Up Your Development Environment

To contribute code to Goa, you'll need:

1. Go 1.21 or later installed on your system
2. A fork of the [Goa repository](https://github.com/goadesign/goa)
3. A local clone of your fork:
   ```
   git clone https://github.com/YOUR-USERNAME/goa
   ```

After cloning, set up your development environment:

1. Install dependencies and tools:
   ```
   make depend
   ```
   This will:
   - Download Go module dependencies
   - Install protoc compiler
   - Install linting tools
   - Install other development dependencies

2. Run the test suite to verify your setup:
   ```
   make test
   ```

3. Run the linter to ensure code quality:
   ```
   make lint
   ```

The default `make all` command will run both linting and tests in sequence.

### Finding Something to Work On

The best way to start contributing is to:

1. Browse our [GitHub issues](https://github.com/goadesign/goa/issues)
2. Look for issues tagged with `help wanted` or `good first issue`
3. Comment on an issue you'd like to work on to avoid duplicate efforts

### Development Workflow

When working on a feature or fix:

1. Create a new branch for your work:
   ```
   git checkout -b feature/your-feature
   ```

2. Write clear, idiomatic Go code following these guidelines:
   - Use standard Go conventions
   - Format code with `gofmt`
   - Write comprehensive godoc comments
   - Include tests for new functionality
   - Keep changes focused and atomic

3. Before submitting your changes:
   - Run `make test` to run the test suite
   - Run `make lint` to ensure code quality
   - Update relevant documentation
   - Generate code if required
   - Check for breaking changes

### Submitting Your Changes

When your changes are ready:

1. Push your changes to your fork
2. Submit a Pull Request with:
   - A clear, descriptive title
   - References to related issues
   - A detailed explanation of your changes
3. Be responsive to review feedback

## Documentation Contributions

Documentation is crucial for Goa's success. You can contribute to our documentation
in several ways:

### Website Documentation

To improve the website documentation:

1. Fork the [goa.design repository](https://github.com/goadesign/goa.design)
2. Set up Hugo following the README instructions
3. Make your improvements following these guidelines:
   - Use clear, simple language
   - Include working, tested code examples
   - Keep examples focused and minimal
   - Ensure proper formatting and organization

### Other Documentation Opportunities

- Add new examples to existing sections
- Create new tutorials
- Improve existing documentation
- Add translations to other languages
- Review and update documentation for accuracy

## Community Support

A vibrant community is essential for Goa's growth. You can contribute by:

- Helping others in the [#goa Slack channel](https://gophers.slack.com/messages/goa/)
- Answering questions in [GitHub Discussions](https://github.com/goadesign/goa/discussions)
- Reporting bugs and issues
- Sharing your experiences using Goa
- Writing blog posts or creating content about Goa

Remember that every contribution, whether it's code, documentation, or community
support, is valuable to the Goa project. Thank you for considering contributing to
Goa!

