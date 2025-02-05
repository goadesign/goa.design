---
title: "What is Goa and Why Use It?"
linkTitle: "What is Goa?"
weight: 1
---

# What is Goa?

**Goa** is a design-first framework for building microservices and APIs in Go. It uses a **domain-specific language (DSL)** to define every aspect of your service:

- **Services & Methods** – The core behavior your API provides.  
- **Data Structures** – Payloads, results, error types, etc.  
- **Transport Mappings** – How each service method is exposed (HTTP, gRPC, etc.).

From these definitions, Goa **generates boilerplate code** that cleanly **separates transport logic** from your **business logic**, making it straightforward to:

1. **Add or change transports** (e.g., switch from REST to gRPC or support both).  
2. **Evolve the service contract** without worrying about low-level networking details.  
3. **Enforce consistency** across services, thanks to a single source of truth in the DSL.

## Why Design-First?

The design-first approach means you **define your APIs** before implementing them. This ensures:

- **Clear Boundaries & Contracts** – Teams agree on service definitions and data formats early.  
- **Maintainable Code** – Consistent patterns across all services, reducing duplicate effort.  
- **Reduced Boilerplate** – The generated code handles routing, serialization, error responses, and more.

By defining the service contract in the DSL, both backend and frontend (UI or other consumer teams) can **review and validate** the API interface **before any code is written**. This approach ensures alignment with business requirements, minimizes confusion, and reduces the likelihood of breaking changes later in development.

## How Does It Work?

1. **Define your service design** in Goa's DSL  
   You describe each service's methods, payloads, results, and error types in a `design` package (typically `design/design.go` or similar).

2. **Generate the code**  
   Running `goa gen` creates a **`gen`** package containing all the **transport scaffolding** (HTTP, gRPC, etc.) and interface definitions for your service.  
   - **No editing** needed or recommended in `gen`—treat it as **read-only** generated code.

3. **Integrate your business logic**  
   In your **`main.go`** (or equivalent application entry point), you:
   - **Instantiate** the objects from the `gen` package (e.g., controllers, servers).  
   - **Inject** your custom business logic by implementing the interfaces that the generated code expects.  
   - **Compose** everything together to run the final service.

The result is a **clean separation** of generated transport code (in `gen`) from your application's **business logic**. This architecture keeps your domain-specific code easy to maintain and free from low-level boilerplate, while still offering flexibility if you decide to add or change transports in the future.

---

Ready to see **why** Goa might be the right fit for your project? Head over to [Why Goa?](./2-why-goa/) to learn more about its benefits and comparisons to other popular Go frameworks.
