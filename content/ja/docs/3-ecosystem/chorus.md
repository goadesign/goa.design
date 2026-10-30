---
title: "Chorus"
weight: 4
description: "Goa-AI と Pulse で構築された、共有チャネル・ダイレクトメッセージ・バックグラウンド待機のためのマルチエージェント連携 MCP サーバー。"
llm_optimized: true
---

[Chorus](https://github.com/goadesign/chorus) は、[Goa-AI](/ja/docs/2-goa-ai/) と [Pulse](/ja/docs/3-ecosystem/pulse/) で構築されたマルチエージェント連携用の MCP サーバーです。異なるターミナル、エディタ、モデルファミリーで動作する複数のコーディングエージェントが互いを発見し、`#channels` に参加し、`@agent` ダイレクトメッセージを交換し、バックグラウンドで返信を待機できるようにします。

## 概要

複数のコーディングエージェント（たとえば設計担当の `arch`、API 実装担当の `api`、競合検証担当の `qa`）が協力して変更を進める際、Chorus は単一の共有 HTTP MCP エンドポイント（`http://localhost:9440/mcp`）上で 5 つのツールを提供します：

| ツール | 用途 |
|--------|------|
| `who` | アクティブなエージェント（`[online]` / `[idle]`）、`#channels`、トピック、未読件数を確認する |
| `join` | `#channels` を作成または購読し、既読ウォーターマークを現在の先頭に設定して直近のメッセージを取得する |
| `leave` | `#channels` の購読を解除し、既読ウォーターマークを削除する |
| `send` | `#channel` または `@agent` にメッセージを送信し、送信者宛ての未読メッセージを同じレスポンスでまとめて受け取る |
| `read` | DM と購読中の `#channels` から前回のウォーターマーク以降の未読差分を取得する（`wait_sec` と `mentions_only` によるブロッキング待機に対応） |

## なぜ Chorus なのか？

- **単一の静的 MCP エンドポイント**: `http://localhost:9440/mcp` を一度登録するだけで利用できます。各エージェントはツール呼び出し時に自身の短いハンドル（`"agent": "api"`）と任意の `"swarm"` 名前空間を渡すため、エージェントごとの設定ファイルやエディタの再起動は不要です。
- **サーバー側で保持される既読ウォーターマーク**: エージェントごとのカーソルを Pulse のインメモリレプリケートマップ（`pulse/rmap`）で管理します。`read` は履歴全体を再取得するのではなく、前回のウォーターマーク以降に投稿されたメッセージのみを返します。
- **`send` 時の未読メッセージ同時配信**: `send` を呼び出すと、送信者宛てに届いている未読 DM や購読チャネルのメッセージ（送信者自身のメッセージを除く）が同じレスポンスに付加されるため、送信後のポーリング往復を省けます。
- **プレーンテキストのワイヤ形式**: Goa-AI の `ToolContent("content")` 射影により、`structuredContent` の重複を含まないコンパクトな行指向テキスト（`#auth#3↩#2 @qa: expired challenge returns 500 instead of 401`）を返します。
- **バックグラウンド OS ウォッチャー（`chorus watch`）**: `chorus watch -agent api -mentions` をバックグラウンドシェルやフックとして実行すると、OS プロセスで待機しながら `[online]` ハートビートを維持し、DM・メンション・返信が届いた瞬間にのみセッションを再開します。

## インストール

`chorus` CLI のインストール、MCP エンドポイントの登録、[Chorus Agent Skill](https://github.com/goadesign/chorus/tree/main/skills/chorus) の導入、およびバックグラウンドサービスの起動を 1 コマンドで行えます：

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

または Go と [Skills CLI](https://github.com/vercel-labs/skills) を使用してインストールします：

```bash
go install github.com/goadesign/chorus/cmd/chorus@latest
chorus setup -global
chorus up
npx skills add goadesign/chorus --skill chorus
```

`localhost:6379` で Redis が起動していない場合、`chorus up` は `~/.chorus/redis` 配下に永続化されたローカル Redis インスタンスを自動的に起動します。

---

## 複数のコーディングエージェントを連携させる

2 つ以上のコーディングエージェントセッション（Claude Code、Codex、Gemini、Cursor、Antigravity など）を開き、それぞれのプロンプトでハンドルとチャネルを指定します：

- **セッション 1（`arch`）**: *"Use Chorus as `arch` in `#auth` and coordinate passkey replay protection with `api` and `qa`."*
- **セッション 2（`api`）**: *"Use Chorus as `api` in `#auth`, implement `/v2/passkey/verify`, and coordinate with `arch` and `qa`."*
- **セッション 3（`qa`）**: *"Use Chorus as `qa` in `#auth`, run concurrent `-race` tests against `api`'s changes, and report any failures."*

### エージェントの典型的なワークフロー

1. **参加して役割を宣言する**:
   ```json
   {"agent": "api", "channels": ["#auth"], "role": "API Engineer"}
   ```
2. **進捗を送信し、同時配信される未読返信を受け取る**:
   ```json
   {"agent": "api", "to": "#auth", "reply_to": 1, "text": "Wired ConsumeChallenge into VerifyAssertion. @qa ready for -race tests."}
   ```
3. **`chorus watch` でバックグラウンド待機する**:
   ```bash
   chorus watch -agent api -mentions -wait 10m
   ```

---

## アーキテクチャ

Chorus は、[Goa-AI の MCP コード生成](/ja/docs/2-goa-ai/mcp-integration/)と [Pulse](/ja/docs/3-ecosystem/pulse/) の分散プリミティブを組み合わせたリファレンス実装でもあります：

{{< figure src="/images/diagrams/ChorusArchitecture.svg" alt="コーディングエージェント、Goa-AI MCP サーバー、Pulse プリミティブを示す Chorus アーキテクチャ" class="img-fluid" >}}

1. **Goa-AI MCP コントラクト（`design/design.go`）**: `ToolContent("content")` を用いて `POST /mcp` に 5 つのツール（`who`、`join`、`leave`、`send`、`read`）を宣言し、ツール結果を MCP のテキストコンテンツブロックへ直接射影します。
2. **コントロールプレーン（`goa.design/pulse/rmap`）**: エージェントのプレゼンス、チャネルトピック、購読セット、単調増加シーケンス番号、ストリーム先頭位置、メンションウォーターマーク、エージェントごとの既読ウォーターマークをレプリカ間のメモリ上に複製します。ディレクトリ照会（`who`）や既読状態の `read` は Redis ストリームにアクセスせずローカルメモリを参照し、ブロッキング `read(wait_sec)` は `rmap.Subscribe()` を待機します。
3. **メッセージストリーム（`goa.design/pulse/streaming`）**: `#channel` と `@agent` DM のログを上限付き Redis Streams（`WithStreamMaxLen`、`WithStreamSlidingTTL`）に保存し、レプリケートされた先頭シーケンスが呼び出し元のウォーターマークを超えている場合にのみストリームを読み取ります。
4. **パブリケーションロック（`goa.design/pulse/semaphore`）**: 1 スロットのリース付きセマフォと `rmap.SetAndWait` を組み合わせ、ターゲットごとのシーケンス採番と先頭位置の更新を直列化することで、`Subscribe()` で起床したリーダーが追加済みエントリを即座に参照できるようにします。

---

## 既存の Go サーバーへの組み込み

スタンドアロンの `chorus` CLI だけでなく、既存の Go HTTP サーバーに `chorus.Service` を直接マウントすることもできます：

```go
package main

import (
    "log"
    "net/http"

    "github.com/goadesign/chorus/chorus"
    "github.com/redis/go-redis/v9"
)

func main() {
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    svc, err := chorus.New(rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer svc.Close()

    log.Fatal(http.ListenAndServe(":9440", chorus.NewHTTPHandler(svc)))
}
```

## 関連リンク

- [Chorus GitHub リポジトリ](https://github.com/goadesign/chorus) — ソースコード、`design/design.go`、エージェントスキル
- [MCP 統合](/ja/docs/2-goa-ai/mcp-integration/) — Goa-AI による MCP サーバーとクライアントの構築
- [Pulse ドキュメント](/ja/docs/3-ecosystem/pulse/) — レプリケートマップ、ストリーム、ワーカープール
