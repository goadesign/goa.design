---
title: Tool Payload Defaults
linkTitle: Tool Payload Defaults
weight: 9
description: "How Goa-AI applies Goa-style defaults to tool payloads (decode-body + transform) and what codegen contracts must hold."
llm_optimized: true
aliases:
---

Goa-AI generates **typed tool payload structs**, **JSON Schemas**, and **codecs** from your Goa design. This page documents a critical behavior: **how default values are applied for tool payloads**, and why this is coupled to pointer vs value field shapes.

This is implemented to match Goa’s own HTTP pattern: **decode-body → transform**.

## Model arguments and execution payloads

A tool can accept fewer arguments from the model than its executor needs.
Each input has its own JSON schema and codec (the generated functions that
validate, decode, and encode that input):

- `ToolSpec.Payload.Codec` matches `Payload.Schema` and its authored example.
  Use it to validate arguments written by the model.
- `ToolSpec.ExecutionPayloadCodec` matches `ExecutionPayloadSchema`.
  Use it for complete execution payloads and when restoring saved tool work.

For a dedicated continuation tool that retains the original query, the model
sends `{}` to request the next page. The runtime restores the query and the provider's cursor before
execution. The model codec therefore accepts `{}`, while the execution codec
requires the retained query fields and cursor. An empty example must not fail
registration merely because execution needs those additional fields.

Both codecs are required when registering a tool. When the two inputs have the
same shape, generation reuses one codec implementation. Fields declared with
`Inject` appear in neither JSON input; the provider fills them from runtime
context. Generated typed payload codecs and typed tool descriptors still
represent execution payloads. A model codec may return the same Go payload type
with fields left unset for the runtime to supply; that value is not yet ready
for execution.

### Upgrading tool specifications

Regenerate tool specifications with the updated framework before starting
workers. Handwritten specifications must also supply
`ExecutionPayloadCodec`, including its encoder and decoder. Update consumers
that decode executed or saved payloads to use this codec; model-input
validation continues to use `Payload.Codec`. There is no fallback to the model
codec for execution.

This changes the in-process Go contract, not registry messages, model schemas,
or saved payload formats. No wire-format or stored-data migration is required.

## Summary

- **Decode JSON into a helper type** with pointer fields (the “decode-body” shape) so the codec can distinguish **missing** from **zero**.
- **Transform helper → final payload** using Goa’s `codegen.GoTransform`.
- For **tool payloads**, the final payload struct is generated with Goa-style default semantics so that optional primitives with defaults can become **values** (non-pointers) and `GoTransform` can inject defaults deterministically.

If these contexts do not match, the generator can emit invalid nil checks or invalid assignments and the generated code will not compile.

## The two shapes

### 1) JSON decode-body helper (pointer fields)

Incoming JSON is decoded into a helper struct whose primitive fields are pointers:

- missing field → `nil`
- provided field → non-nil pointer

This is the shape used for:

- required-field checks
- validation error attribution
- “did the caller provide this field?”

### 2) Final tool payload type (default-aware)

The final tool payload type is what adapters and executors consume.

For payloads, defaulted optional primitives are emitted as **values** so defaults can be applied deterministically during transformation.

## How defaults are applied

Defaults are applied during **helper → payload transformation**:

- The helper contains `nil` pointers for missing fields.
- The target payload has default-aware field shapes.
- Goa’s `codegen.GoTransform` emits code that:
  - copies values when helper pointers are non-nil
  - assigns default literals when helper pointers are nil (and a default exists)

## Boundary validation and retry guidance

Generated tool codecs are the boundary between model-authored JSON and typed
Goa-AI tool values. They do more than call `json.Unmarshal`:

- closed object payloads and results reject unknown fields
- unknown fields produce structured `unknown_field` issues that include the
  allowed keys at that object path
- JSON type mismatches produce structured `invalid_field_type` issues with
  generated expected and actual JSON type names
- bounded result codecs accept only the semantic result fields plus Goa-AI's
  canonical bounded fields (`returned`, `total`, `truncated`,
  `refinement_hint`, and optional `next_cursor`)

At runtime, these structured validation errors become planner retry guidance
that is restricted back to the same tool. Planners can then remove an unexpected
field, correct a scalar type, or provide a missing value without parsing Go
decoder error strings.

## Generator maintainer contract (do not break this)

When changing codegen that touches any of the following:

- tool payload type materialization
- decode-body helper generation
- closed-object key metadata and validation enrichment
- adapter transforms (tool payload → service method payload)

you must keep default semantics consistent across:

- the tool payload type generation, and
- the generated codecs and transforms that read tool payload fields.

If you mismatch them, Goa’s transform generator can emit uncompilable code such as:

- `if in.Field != nil { ... }` when `Field` is a value
- `out.Field = "x"` when `Field` is a `*T`
