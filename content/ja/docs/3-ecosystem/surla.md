---
title: "Surla"
weight: 5
description: "意図の合意、テスト作成、実装、検証を分離する Goa / Goa-AI 向け契約駆動マルチエージェント制御プレーン。"
llm_optimized: true
---

[Surla](https://github.com/goadesign/surla) は、コーディングエージェントを使って [Goa](/ja/docs/1-goa/) および [Goa-AI](/ja/docs/2-goa-ai/) サービスを構築・検証・進化させるローカル制御プレーンです。普段使っているコーディングエージェントを 1 つのコンパイル済み契約のもとで別々の役割に編成し、承認前に独立した検証を実行し、承認済みコミットをブラウザからローカルブランチへマージします。

1 つの変更が各役割を進む具体的な流れは、[Surla ページ](/ja/surla/)も参照してください。

## 概要 {#workflow}

1 つのコーディングエージェントが実装とそれを判定するテストの両方を書くと、同じ思い込みがそのまま通り、手書きのトランスポートやスキーマも機能追加のたびにずれていきます。Surla は役割の分離と Goa / Goa-AI の決定論的なコード生成を組み合わせます：

| 参加者 | 接続経路 | 役割 |
|--------|----------|------|
| **あなた** | ブラウザ画面 | Change Card の確定、アーキテクチャの確認、ビルド開始、検証結果の承認、ローカルブランチへのマージ |
| **Guide** | `surla` MCP（`guide` ロール） | 作業中のエージェントセッション。空フォルダの初期化、`Story` フローと Goa 設計の作成、Change Card の提案・改訂を担当 |
| **Test Writer** | `surla` MCP（`.surla-tests` 作業コピー） | 確定した Change Card と完了済み `Story` フローごとに `eval/` へシナリオテストを作成（アプリ実装は編集しない） |
| **Builder** | `surla` MCP（`.surla-build` 作業コピー） | `generate_code` で合意済み `design/` と `gen/` を反映し、ドメインロジックを実装して Linux コンテナで検査後、検証を依頼 |
| **Surla サーバー** | プロジェクト単位のローカルプロセス | ロール別の権限管理、`eval/` スイートの検査・受理、ダイジェスト固定バイナリのビルドと検証実行、承認記録を担当 |

## 5 つのチェックポイント（`CP1`〜`CP5`） {#checkpoints}

設計プレビュー、受理テスト、ライブターゲット、検証実行、承認はすべて Change Card の厳密な `request_revision` ダイジェストに紐づきます：

1. **`CP1` — Change Card で合意する**: エージェントは隔離されたドラフトで `Story`（`github.com/goadesign/surla/story/dsl`）を評価し、要約・未決の仕様質問・具体的な受け入れ例・維持する挙動を平易な言葉でまとめた Change Card を提案します。ブラウザ画面で質問に答えて確定します。
2. **`CP2` — アーキテクチャを確認する**: ワーカーを動かす前に、合意した Goa と [Model](/ja/docs/3-ecosystem/model/) 設計から生成された C4 図を **Architecture** で確認します。
3. **`CP3` — ライブターゲットでプロンプトを調整する（任意）**: サービスが Goa-AI エージェントを持ち、プロバイダーキーまたはモデルゲートウェイを設定している場合、実装者は候補コミットのライブコピーを起動してプロンプト文言を試せます。
4. **`CP4` — 独立した検証**: Surla はテスト作成者の `eval/` レポートを再ビルド・検査して `surla/tests-<n>` として受理したあと、実装者の候補コミットをビルドして受理済み `eval/` スイートを実行します（`eval/` スイートがライブプロバイダーを呼ばない限り API キーは不要。`-example` サンプルはスクリプトモデルを同梱し、空シェルの初期チェックはモデルを使用しません）。オペレーター設定の評価スイートでは、ホールドアウトのシナリオ名・判定・ログが `Report.ForBuilders()` によって実装者向けツール結果から除外されます（テスト作成者はホールドアウトを提出できません）。
5. **`CP5` — 承認してマージする**: **Approve** でシナリオ結果を確認して承認を記録し、**Merge into current branch** を押して検証済みの実装コミットとテストコミットをローカルブランチへマージします。

## インストール

Surla は macOS または Linux で動作し、**Go 1.27.3 以上**、**Git 2.45 以上**（`user.name` と `user.email` 設定済み）、および **Docker**（`check_project` が Linux コンテナ内でビルド・単体テストを実行するために使用）を必要とします。

`surla` バイナリをインストールし、コーディングエージェントを登録します：

```bash
go install github.com/goadesign/surla/cmd/surla@latest
surla up
```

`surla up` は検出されたコーディングエージェント（Claude Code、Codex、Cursor、Antigravity、Gemini CLI、Windsurf、GitHub Copilot CLI、VS Code）に `surla stdio` MCP サーバーと `/surla`（Codex では `$surla`）スキルを登録し、[Chorus](/ja/docs/3-ecosystem/chorus/) があれば起動します。Chorus を起動せずに登録だけ行う場合は `surla setup -global` を使います。

Herdr の設定フォルダ（`$HERDR_APP_HOME` または `~/.config/herdr-app`）がある場合、フローティングコンパニオン `mods/surla/` もインストールされ、macOS でショートカットが空いていれば **Command–Option–Shift–S**（`⌥⌘⇧S`）が設定されます。

---

## プロジェクトの開始：デフォルトでクリーンな構成 {#blank-and-example}

空のフォルダをコーディングエージェントで開き、`/surla`（Codex では `$surla`）を実行します：

```text
/surla — build a refund assistant: refunds up to $50 get instant store credit; larger ones wait for a manager.
```

未初期化のフォルダでは、エージェントが `init_project(dir: ".")` を呼び出します（モジュールパス未指定時はフォルダ名から `example.com/<folder>` を導出）：

- **デフォルトはクリーンな空シェル（`worked_example: false`）**: `init_project` と `surla init` は、Goa・Goa-AI・Model・Story を `go.mod` に固定したドメイン中立の 2 モジュール構成（`<module>` と `<module>/eval`）を作成します。不要なサンプルエンドポイントやデモエージェントは含まれず、最初の Change Card にはあなたのプロダクトだけが記述されます。
- **動作するサンプルの明示指定（`worked_example: true` / `-example`）**: Goa-AI エージェント、ツール、`Story` フロー、スクリプト評価スイートの一式を先に試したい場合は、CLI で `-example` を渡すか `worked_example: true` を指定します：

```bash
surla init -dir ./demo-shop -module example.com/shop -example
```

- **既存の Goa リポジトリ**: 既存のリポジトリで Surla を使うには、初期 Git コミットに加えて、Surla 形式の `<module>/eval` スイートまたは保存済みの検証設定（`surla verification set`）が必要です。詳しくは [What a build adds](https://github.com/goadesign/surla/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds) を参照してください。

---

## Herdr の並列ペインとバックグラウンド実行 {#herdr}

**Build** 画面では、各ワーカーのエージェント・モデル・権限モードをその場で選択できます（選択はプロジェクトごとに記憶されます）：

| 実行モード | 使用される条件 | 動作 |
|------------|----------------|------|
| **Herdr + Chorus** | `herdr-core`、`herdr-app`、Chorus（`chorus up`）が利用可能 | 作業中のエージェントペインをリンクし、**Build** 中に `builder` と `test_writer` ペインを隣に開き、マージまたは破棄時に自動で閉じます。macOS では **⌥⌘⇧S** で Surla コンパニオンを開けます。 |
| **バックグラウンドワーカー** | Herdr が未インストールまたは未使用 | **Build** でバックグラウンド実行に同意すると、Herdr や Chorus なしでサーバー管理下の非対話 CLI プロセスとして `builder` と `test_writer` を実行します。 |

---

## アーキテクチャと信頼境界 {#architecture}

{{< figure src="/images/diagrams/SurlaArchitecture.svg" alt="Guide Agent、Browser Page、Surla Server、Test Writer、Builder、Verifier を示す Surla アーキテクチャ" class="img-fluid" >}}

1. **ポータブルな `Story` DSL（`github.com/goadesign/surla/story/dsl`）**: `design/` と並べてアクター、フロー（`StartsWith`、`Step`、`Outcome`）、未決の `Question` を Go で記述します。完了したフローごとに `eval/` のシナリオテストが必須となります。
2. **Goa / Goa-AI コード生成（`generate_code`）**: 合意済みの `design/` を `.surla-build` に反映し、固定バージョンのジェネレーターを実行するため、`gen/` の手編集は発生しません。
3. **テストの検査と受理（`internal/testwriter`）**: Story テスト表を再生成し、`eval/` 以外が変更されていないことを確認してテストバイナリをコンパイルし、`surla/tests-<n>` に記録します。
4. **候補検証とプロセス境界（`verify/candidate`）**: ロール別の資格情報で MCP 権限を分離し、オペレーター設定の評価スイートではホールドアウトのシナリオ名・判定・ログを実装者向けツール結果から除外します（テスト作成者はホールドアウトを提出できません）。エージェント・設計評価・候補バイナリ・`eval/` スイートは現在のユーザー権限の通常プロセスグループとして動作しローカルファイルを読み取れます。実装者の `check_project` はローカルの Docker コンテナ内で実行されます。

## 関連リンク

- [Surla GitHub リポジトリ](https://github.com/goadesign/surla) — ソースコード、`HOW_IT_WORKS.md`、`REFERENCE.md`、`story/dsl`
- [Surla ページ](/ja/surla/) — 3 つの役割を進む変更のウォークスルー
- [Chorus ドキュメント](/ja/docs/3-ecosystem/chorus/) — Herdr ワーカーペインで使われるマルチエージェント連携
- [コーディングエージェントと開発する](/ja/docs/ai-development/) — Goa と Goa-AI の設計ファースト開発フロー
