---
title: "トランスポートとストリーミングの組み合わせ"
linkTitle: "トランスポート"
weight: 6
description: "サービスおよびメソッドごとの許可されるトランスポートの組み合わせと、各ストリーミングモードの制約。"
---

このページでは、Goa のサービスとメソッドがどのトランスポートの組み合わせを公開できるか、また各トランスポートで有効なストリーミングモードが何かを説明します。Goa における「トランスポートの混在」の意味と、許可/禁止の組み合わせをわかりやすくまとめたリファレンスです。

内容:
- 利用可能なトランスポート: HTTP（通常）、HTTP Server‑Sent Events（SSE）、HTTP WebSocket、JSON‑RPC 2.0（HTTP/SSE/WebSocket）、gRPC。
- ストリーミングモード: 非ストリーム、クライアントストリーム、サーバーストリーム、双方向。
- 1つのサービス内で同時に公開できるトランスポート。
- 1つのメソッドが各トランスポート上で公開できる形。


## 用語

- 非ストリーム: 通常のリクエスト/レスポンス（ユニタリ）。
- クライアントストリーム: クライアントが連続してペイロードを送信。
- サーバーストリーム: サーバーが連続して結果を送信。
- 双方向: 双方がストリーム。
- 混在結果（Mixed results）: `Result` と `StreamingResult` を異なる型で両方定義。通常レスポンスとストリーミングレスポンスの切り替え（SSE のみ対応）を可能にします。


## サービスレベル: 同一サービスで混在可能なトランスポート

次の表において「yes」は同一 Goa サービス内で共存可能であることを示します。注記に制約を示します。

| 同一サービス内のトランスポート | HTTP（通常） | HTTP（WS） | HTTP（SSE） | JSON‑RPC（HTTP） | JSON‑RPC（WS） | JSON‑RPC（SSE） | gRPC |
|-------------------------------|--------------|------------|-------------|------------------|----------------|-----------------|------|
| HTTP（通常）                  | —            | yes        | yes         | yes              | no [S2]        | yes             | yes  |
| HTTP（WebSocket）             | yes          | —          | yes         | yes              | no [S2]        | yes             | yes  |
| HTTP（SSE）                   | yes          | yes        | —           | yes              | no [S2]        | yes             | yes  |
| JSON‑RPC（HTTP）              | yes          | yes        | yes         | —                | no [S1]        | yes             | yes  |
| JSON‑RPC（WebSocket）         | no [S2]      | no [S2]    | no [S2]     | no [S1]          | —              | no [S1]         | yes  |
| JSON‑RPC（SSE）               | yes          | yes        | yes         | yes              | no [S1]        | —               | yes  |
| gRPC                          | yes          | yes        | yes         | yes              | yes            | yes             | —    |

注記:
- [S1] JSON‑RPC WebSocket は、同一サービス内で他の JSON‑RPC トランスポート（HTTP/SSE）と混在できません。JSON‑RPC サービスは WebSocket のみ、または HTTP/SSE（共存可）のいずれかです。
- [S2] JSON‑RPC WebSocket と「純粋な HTTP WebSocket」は同一サービスで混在できません。JSON‑RPC はサービスに対して 1 本の WS コネクションを共有し、HTTP はエンドポイントごとに WS コネクションを作成するためです。

補足（サービスレベル）:
- JSON‑RPC HTTP と JSON‑RPC SSE は同一 POST エンドポイントを共有でき、`Accept` ヘッダー（`text/event-stream` / `application/json`）で切り替えます。
- gRPC は独立しており、HTTP/JSON‑RPC と自由に組み合わせ可能です。


## メソッドレベル: トランスポートごとの有効なモード

次の表において「yes」はそのトランスポート上でメソッドに対して有効であることを示します。「yes（mixed）」は混在結果（`Result` と `StreamingResult` が異なる型）かつ SSE 有効時に有効です。「no」は禁止です。

| トランスポート        | 非ストリーム         | クライアント | サーバー            | 双方向 |
|-----------------------|----------------------|--------------|---------------------|--------|
| HTTP（通常）          | yes                  | no           | yes（mixed）[M1]    | no     |
| HTTP（SSE）           | yes（mixed）[M2]     | no           | yes [M3]            | no     |
| HTTP（WebSocket）     | no                   | yes [M4]     | yes [M4]            | yes [M4] |
| JSON‑RPC（HTTP）      | yes                  | no           | yes（mixed）[M1,M5] | no     |
| JSON‑RPC（SSE）       | yes（mixed）[M2,M5]  | no           | yes [M6]            | no     |
| JSON‑RPC（WebSocket） | no                   | yes [M7]     | yes [M8]            | yes [M7] |
| gRPC                  | yes                  | yes          | yes                 | yes    |

注記:
- [M1] 混在結果は SSE 必須で、`StreamingPayload` は不可。通常レスポンスと SSE ストリームのコンテンツネゴシエーションに利用します。
- [M2] 非ストリームメソッドで SSE を使うのは混在結果のときのみ有効（SSE 側がストリーミング結果を提供、非 SSE 側が通常結果）。
- [M3] SSE はサーバー→クライアントの一方向のみ。クライアントストリーム/双方向には使用できません。
- [M4] 純粋な HTTP WebSocket エンドポイントは GET を使用し、リクエストボディを持てません。入力はヘッダー/パラメータでマッピングします（JSON‑RPC WS は例外）。
- [M5] JSON‑RPC HTTP と JSON‑RPC SSE は混在結果で共存可能。サーバーは `Accept` で切り替えます。
- [M6] JSON‑RPC SSE は共有 JSON‑RPC エンドポイントで POST を使用し、SSE の `id` は結果の ID 属性に対応します。
- [M7] JSON‑RPC WebSocket はクライアント/サーバー/双方向ストリームをサポート。非ストリームメソッドは WS では非対応です。
- [M8] JSON‑RPC WebSocket のサーバーストリームでは、要求データはメソッドの `Payload` に定義し、`StreamingPayload` を併用しないでください。


## JSON‑RPC の詳細

- WebSocket:
  - サービスごとに 1 本の WS コネクションを全メソッドで共有。
  - WS エンドポイントではヘッダー/クッキー/パラメータのマッピング不可。
  - サポートされるパターン:
    - `StreamingPayload()` のみ（クライアント→サーバー通知）。
    - `StreamingResult()` のみ（サーバー→クライアント通知、`id` なし）。
    - 両方（双方向）。
  - 非ストリームメソッドは JSON‑RPC WebSocket では非対応。

- HTTP と SSE:
  - 同じ JSON‑RPC ルート（POST）を共有。サーバーは `Accept` に基づき動作を選択。
  - 混在結果で通常の JSON‑RPC レスポンスと SSE イベントストリームの切替が可能。

- ID 取り扱い:
  - 非ストリーム: フレームワークが要求 `id` を結果の `ID` フィールドへコピー（未設定時）。
  - ストリーム（WS）: サーバー応答は元の要求 `id` を再利用。サーバー発通知は `id` なし。
  - SSE: `SendAndClose` は JSON‑RPC 応答を送出。`id` は結果の ID があればそれを、なければ要求 `id`。


## HTTP の詳細

- WebSocket エンドポイントは GET 必須。SSE は GET/POST のいずれも可（JSON‑RPC SSE は POST）。
- WebSocket（HTTP 純粋）ではリクエストボディ不可。入力はヘッダー/パラメータで渡します（JSON‑RPC WS は WS 内でメッセージを運ぶため例外）。


## gRPC の詳細

gRPC は Goa における HTTP/JSON‑RPC との組み合わせに追加制約はありません。ユニタリ、クライアントストリーム、サーバーストリーム、双方向の全てに対応し、他トランスポートと自由に併用可能です。


## 実装上の参照先

- `expr/method.go`: ストリーム種別のヘルパー、混在結果の検出。
- `dsl/payload.go`, `dsl/result.go`: `StreamingPayload`/`StreamingResult` によるストリーム種別の設定。
- `expr/http_endpoint.go`: SSE の制約、混在結果の要件、純粋 HTTP WS の検証、JSON‑RPC エンドポイントの検証。
- `expr/http_service.go`: JSON‑RPC の混在ルール、JSON‑RPC WS と純粋 HTTP WS の衝突、JSON‑RPC ルートの準備とメソッド制約（WS は GET、その他は POST）。
- `dsl/jsonrpc.go`, `jsonrpc/README.md`: JSON‑RPC のトランスポート動作（バッチ、通知、WS/SSE のセマンティクス）、WS にはストリーミング必須/HTTP+SSE のコンテンツネゴシエーション。


## すぐに使えるミニ例

```go
// JSON‑RPC SSE + HTTP（混在結果）
Method("monitor", func() {
    Result(ResultType)
    StreamingResult(EventType)
    JSONRPC(func() { ServerSentEvents() })
})
```

```go
// JSON‑RPC WebSocket（双方向）
Method("chat", func() {
    StreamingPayload(Message)
    StreamingResult(Message)
    JSONRPC(func() {})
})
```

```go
// 純粋 HTTP SSE（サーバーストリーム）
Method("watch", func() {
    StreamingResult(Event)
    HTTP(func() { ServerSentEvents() })
})
```

上記の例をテンプレートとして、表の制約に従ってサービス/メソッドの組み合わせを選択してください。


