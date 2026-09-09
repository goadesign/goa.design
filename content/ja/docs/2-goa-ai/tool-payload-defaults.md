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

## モデルの引数と実行用ペイロード

ツールがモデルから受け取る引数は、実行側が必要とする引数より少ない場合があります。
それぞれの入力には、専用の JSON スキーマとコーデック（入力の検証、デコード、
エンコードを行う生成関数）があります。

- `ToolSpec.Payload.Codec` は `Payload.Schema` と設計で指定した例に対応します。
  モデルが作成した引数の検証に使います。
- `ToolSpec.ExecutionPayloadCodec` は `ExecutionPayloadSchema` に対応します。
  完全な実行用ペイロードや、保存されたツール処理の復元に使います。

元のクエリを保持する継続専用ツールでは、モデルは次のページを要求するために `{}` を送ります。
実行前に、ランタイムが元のクエリとプロバイダーのカーソルを復元します。
そのため、モデル用コーデックは `{}` を受け入れますが、実行用コーデックは
保持されたクエリのフィールドとカーソルを必須とします。実行時に追加のフィールドが
必要だからといって、空の例でツールの登録が失敗してはいけません。

ツールの登録には両方のコーデックが必要です。入力の構造が同じ場合、生成処理は
単一の実装を共有します。`Inject` で宣言したフィールドは、どちらの JSON 入力にも
含まれません。プロバイダーが実行コンテキストから値を設定します。生成された型付き
ペイロードのコーデックと型付きツール記述子は、引き続き実行用ペイロードを表します。
モデル用コーデックは同じ Go 型を返すことがありますが、ランタイムが設定する
フィールドは未設定のままです。その値はまだ実行できる状態ではありません。

### ツール仕様のアップグレード

ワーカーを起動する前に、更新後のフレームワークでツール仕様を再生成してください。
手書きの仕様にも、エンコーダーとデコーダーを備えた `ExecutionPayloadCodec` が
必要です。実行済みまたは保存済みのペイロードをデコードするコードは、この
コーデックを使うよう変更してください。モデル入力の検証には引き続き
`Payload.Codec` を使います。実行時にモデル用コーデックで代用することはありません。

この変更はプロセス内の Go 契約に関するもので、レジストリのメッセージ、モデルの
スキーマ、保存されたペイロードの形式は変わりません。通信形式や保存データの
移行は不要です。

継続専用ツールがある場合、初回ペイロード用に生成された名前付きコーデックは、
既に宣言されている実行契約を厳密に適用するようになります。初回リクエストは
カーソルを受け付けません。後続ページのリクエストは、実際に呼び出された
継続ツールの実行用コーデックでデコードしてください。初回リクエストとして
名前を付け替えてはいけません。以前は受け付けられていたカーソル付きの
初回リクエストは契約外であり、このアップグレードでは受け付けられなくなります。
宣言済みの実行スキーマと、契約に適合する保存済み履歴は変わりません。

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
