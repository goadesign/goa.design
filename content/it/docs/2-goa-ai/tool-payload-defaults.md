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

## Generator maintainer contract (do not break this)

When changing codegen that touches any of the following:

- tool payload type materialization
- decode-body helper generation
- adapter transforms (tool payload → service method payload)

you must keep default semantics consistent across:

- the tool payload type generation, and
- any transforms that read tool payload fields.

If you mismatch them, Goa’s transform generator can emit uncompilable code such as:

- `if in.Field != nil { ... }` when `Field` is a value
- `out.Field = "x"` when `Field` is a `*T`


