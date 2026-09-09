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

## Argomenti del modello e dati di esecuzione

Uno strumento può accettare dal modello meno argomenti di quanti ne richieda
il suo esecutore. Ogni input ha il proprio schema JSON e codec (le funzioni
generate che validano, decodificano e codificano quell'input):

- `ToolSpec.Payload.Codec` corrisponde a `Payload.Schema` e all'esempio
  definito nel design. Usalo per validare gli argomenti scritti dal modello.
- `ToolSpec.ExecutionPayloadCodec` corrisponde a `ExecutionPayloadSchema`.
  Usalo per i dati di esecuzione completi e per ripristinare il lavoro salvato.

Per uno strumento di continuazione che conserva la query originale, il modello invia `{}` per
richiedere la pagina successiva. Prima dell'esecuzione, il runtime ripristina
la query originale e il cursore del provider. Il codec del modello accetta
quindi `{}`, mentre quello di esecuzione richiede i campi conservati della
query e il cursore. Un esempio vuoto non deve impedire la registrazione dello
strumento solo perché l'esecuzione richiede quei campi aggiuntivi.

Entrambi i codec sono obbligatori alla registrazione. Quando i due input hanno
la stessa struttura, il generatore riutilizza una sola implementazione. I campi
dichiarati con `Inject` non compaiono in nessuno dei due input JSON; il provider
li compila dal contesto di esecuzione. I codec dei payload tipati e i descrittori
degli strumenti tipati generati continuano a rappresentare dati di esecuzione.
Un codec del modello può restituire lo stesso tipo Go lasciando non compilati
alcuni campi che il runtime fornirà; quel valore non è ancora pronto per
l'esecuzione.

### Aggiornare le specifiche degli strumenti

Rigenera le specifiche con il framework aggiornato prima di avviare i worker.
Anche le specifiche scritte a mano devono fornire `ExecutionPayloadCodec`,
con codificatore e decodificatore. I consumatori che decodificano dati eseguiti
o salvati devono usare questo codec; la validazione degli input del modello
continua a usare `Payload.Codec`. L'esecuzione non usa il codec del modello
come alternativa.

La modifica riguarda il contratto Go all'interno del processo, non i messaggi
del registro, gli schemi del modello o i formati dei dati salvati. Non occorre
migrare i formati di scambio o i dati archiviati.

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
