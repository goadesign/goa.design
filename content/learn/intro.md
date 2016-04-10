+++
date = "2016-04-10T11:01:06-05:00" 
title = "Introduction to goa"
+++

# What is goa?

goa provides a novel approach for developing microservices that saves time when working on
independent services and helps with keeping the overall system consistent. goa uses code generation
to handle both the boilerplate and ancillary artifacts such as documentation, client modules and
client tools. The content of the generated artifacts is computed from the *design* of the
microservice. The design is thus the Single Source of Truth (SSOT) from which API implementation,
documentation, clients and other generated artifacts are derived. Any change made to the design is
reflected automatically throughout considerably simplifying the maintenance of the service.

The goa framework can be divided into three parts:

* The goa *design language* is the built-in DSL that allows describing the design of the
  microservice.
* The *code generator* uses the output of the DSL to generate artifacts.
* The *goa package* provides a complete pluggable framework leveraged by both generated and user
  code to implement the service.

Both the design language and code generators are extensible via [plugins](/extend/), for example
the [gorma plugin](/extend/gorma/) allows defining database models in the design and generates
code to both create and render them automatically. Plugins help with keeping the design the single
source of truth.

### The goa Design Language

The design of microservices is described using the built-in goa design language optionally
supplemented with plugin DSLs. The language itself is implemented in Go, each "keyword" consisting
of a package function. This makes the syntax familiar and allows for mixing in actual Go code when
necessary. The [design](/design/) section introduces the language.

### Artifact Generation

goa comes with the [goagen](/implement/goagen/) tool which produces various outputs from the
microservice design. The way code generation works is that the DSL consisting of function calls is
executed in order to build data structures that describe the microservice API in-memory. goagen puts
together a complete program that contains the DSL functions with the output generation code specific
to the generated artifact all wrapped into a single executable. It then runs the program which ends
up generating the actual output. goagen is thus a *meta-generator*.

### The goa Package

The [goa package and its sub-packages](/reference/) provide the service implementation scaffolding
including data structures that represent the actual service, its controllers and router. The
generated code takes advantage of these data structures and others to provide a completely working
service out of the box. goa follows the "battery included" principle and makes it possible to swap
out the logger, encoders, decoders, middleware or even the router itself. You get to keep your
logging package of choice and still benefit from the design first approach. The
[implement](/implement/) section describes these components.
