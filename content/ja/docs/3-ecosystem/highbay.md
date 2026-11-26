---
title: "Highbay"
weight: 5
description: "コーディングエージェントの役割を分離して API・MCP サーバー・AI エージェントを構築・検証します。ブラウザで仕様判断を確定し、コードの約 70% を決定論的に生成し、マージ前に独立したシナリオテストを実行します。"
llm_optimized: true
---

[Highbay](https://github.com/goadesign/highbay) は、普段使っているコーディングエージェントを API・MCP サーバー・AI エージェント向けの規律あるエンジニアリングワークフローへと変えるツールです。統一されたプロジェクト構成（`design/`、`gen/`、`cmd/`、`internal/`、`eval/`）、認証・[Clue](/ja/docs/3-ecosystem/clue/) による OpenTelemetry トレース・[Pulse](/ja/docs/3-ecosystem/pulse/) による Redis Streams やワーカープールを網羅した Golden Path ルール（`highbay://golden-path`）、[Goa](/ja/docs/1-goa/) と [Goa-AI](/ja/docs/2-goa-ai/) の決定論的コード生成、および別エージェントによるシナリオ検証を組み合わせます。未決の仕様判断はあなたがブラウザで確定し、1 つのエージェントが生成された Go インターフェースに対して実装し、別のエージェントが独立した作業コピーでシナリオテストを書き、承認・マージの前に Highbay がそれらを検証します。

マルチテナント障害対応基盤 `ops-copilot` のウォークスルーは [Highbay ページ](/ja/highbay/)を参照してください。

## インストール

Highbay は macOS または Linux で動作し、**Go 1.27.3 以上**、**Git 2.45 以上**（`user.name` と `user.email` 設定済み）、および **Docker**（`check_project` が Linux コンテナ内で実装者のコンパイル・単体テストを実行するために使用）を使用します。

Homebrew、`npx`、または `go install` で `highbay` をインストールし、コーディングエージェントを登録します：

```bash
# macOS または Linux (Homebrew)
brew install goadesign/tap/highbay
highbay up

# Linux または macOS (Node.js 18+)
npx @goadesign/highbay up

# または Go 1.27.3+
go install github.com/goadesign/highbay/cmd/highbay@latest
highbay up
```

`highbay up` は検出されたコーディングエージェント（Claude Code、Codex、Cursor、Antigravity、Gemini CLI、Windsurf、GitHub Copilot CLI、VS Code）に `highbay stdio` MCP サーバーと `/highbay`（Codex では `$highbay`）スキルを登録し、[Chorus](/ja/docs/3-ecosystem/chorus/) がインストールされていれば起動します。`highbay update` を実行すれば、バイナリ、スキル、MCP 登録、Herdr コンパニオンをその場で最新化できます（Chorus を起動せずに MCP とスキルだけ登録する場合は `highbay setup -global` を使います）。Highbay は Official MCP Registry（`io.github.goadesign/highbay`）、Glama、Serverdex、および Claude Code プラグイン（`/plugin marketplace add goadesign/highbay`）にも登録されています。すでにコーディングエージェントを開いていた場合は再読み込みするか新しいセッションを開始してください。

[Herdr](https://herdr.dev) の設定フォルダ（`$HERDR_APP_HOME` または `~/.config/herdr-app`）がある場合、フローティングコンパニオン `mods/highbay/` もインストールされ、macOS でショートカットが空いていれば **Command–Option–Shift–H**（`⌥⌘⇧H`）が割り当てられます。

---

## プロジェクトの開始 {#blank-and-example}

新しいサービスフォルダ（または既存の Goa リポジトリ）をコーディングエージェントで開き、`/highbay`（Codex では `$highbay`）を実行します：

```text
/highbay Pod ログ取得とオンコール承認付きロールバックの MCP ツールを備えたマルチテナント障害対応プラットフォームを構築して。
```

最初の Highbay MCP 呼び出しでプロジェクトのローカル Highbay サーバーが起動（または接続）され、現在のセッションが `guide` として登録され、`open_views` によってブラウザ画面が開きます。

まだ初期化されていないフォルダでは、エージェントが `init_project(dir: ".")` を呼び出します（Go モジュールパスを指定しなかった場合はフォルダ名から `example.com/<folder>` を導出します。初回は Go モジュールの取得とコンパイルに数分かかります）：

- **新規ワークスペース（`worked_example: false`、デフォルト）**: `init_project` と `highbay init` は、Goa・Goa-AI・Model・Story を `go.mod` に固定した 2 モジュール構成（`<module>` と `<module>/eval`）と起動確認チェックを初期化し、自分の `Story` と `design/` をすぐ書き始められる状態にします。
- **動作するサンプル（`worked_example: true` / `-example`）**: Goa-AI エージェント、ツール、`Story` フロー、スクリプト評価スイートの一式を先に試したい場合は、CLI で `-example` を渡すかエージェントに `worked_example: true` を指定します：

```bash
highbay init -dir ./demo-shop -module example.com/shop -example
```

- **既存の Goa リポジトリ**: 既存の Goa / Goa-AI リポジトリで Highbay を使うには、少なくとも 1 つの Git コミットと、Highbay 形式の `<module>/eval` スイートまたは `highbay verification set` で登録した独自のテストプログラムが必要です（保存済みの検証スイートを設定した場合、Highbay はテスト作成者を起動せず変更ごとにそのスイートを実行します）。詳しくは [What a build adds](https://github.com/goadesign/highbay/blob/main/docs/HOW_IT_WORKS.md#what-a-build-adds) を参照してください。なお、`highbay gen` と `generate_code` が対応するのは Goa の HTTP・JSON-RPC・MCP 設計であり、`protoc` による最終処理は同梱していないため gRPC トランスポートを含む設計は拒否されます。

{{< highbay-views >}}

---

## 役割と責務 {#workflow}

1 つのコーディングエージェントがアプリケーションとそれを検査するテストの両方を書くと、未決の仕様判断が黙って推測され、両側に同じ前提が埋め込まれます。Highbay は作業コピーと MCP 資格情報を分けて責務を分離します：

| 参加者 | 接続経路 | 役割 |
|--------|----------|------|
| **あなた** | ブラウザ画面 | Change Card の質問への回答、アーキテクチャプレビューの確認、ビルド開始、合格レポートへの承認記録、ローカルブランチへのマージ |
| **Guide** | `highbay` MCP（`guide` ロール） | 作業中のエージェントセッション。空フォルダの初期化、`Story` フローと Goa 設計の作成、Change Card の提案・改訂を担当 |
| **Test Writer** | `highbay` MCP（`.highbay-tests` 作業コピー） | 確定した Change Card から、完了済み `Story` フローごとに 1 つのシナリオテストを `eval/` に作成（サービスコードは編集しない） |
| **Builder** | `highbay` MCP（`.highbay-build` 作業コピー） | `generate_code` で合意済み設計と `gen/` を反映し、ビジネスロジックを実装して Linux コンテナで検査後、検証を依頼 |
| **Highbay サーバー** | プロジェクト単位のローカルプロセス | ロール権限の強制、`eval/` スイートのコンパイル・受理、ダイジェスト固定候補バイナリのビルド、検証実行、承認記録を担当 |

---

## コーディングエージェントにおけるコード生成の効果 {#codegen}

HTTP ルーター、JSON-RPC ハンドラー、MCP サーバー、入力検証、ツールの JSON スキーマをコーディングエージェントが手書きすると、Goa が生成できる作業にトークンを消費し、ターンごとに実装規約もばらつきます。Highbay は責務ごとに分かれた仕組みでコード生成を合意済みビルドに組み込みます：

- **サービス側の `gen/`（`generate_code`）**: 実装者が `generate_code` を実行すると、Highbay は進行中ビルドの合意済み `design/` を `.highbay-build` に書き込み、固定バージョンの Goa・Goa-AI ジェネレーターを実行して候補の `gen/` を置き換えます（宣言された HTTP・JSON-RPC・MCP トランスポート向けのハンドラー、型付きクライアント、コーデック、構造バリデーションに加え、Goa-AI ツールの JSON スキーマ、メソッド接続、注入フィールド、承認宣言、および無効化されていない限りモジュール直下の `AGENTS_QUICKSTART.md` を出力）。Goa はモデルの出力トークンを使わずにこれらを書き出しますが、全体の削減量は必要なコンテキストや反復回数、レビュー量によって変わります。
- **焦点を絞った開始コンテキスト**: 編集の出発点は `design/` と関連する生成済み Go インターフェースになり、トランスポートやスキーマの全ファイルを毎回プロンプトに読み込ませずに済みます。
- **モデルを問わない一貫した生成構造**: 単一のコンパイラから `gen/` を再生成するため、周辺の実装を Claude・Codex・Gemini のどれが担当してもトランスポートや検証、ツールスキーマの構造が揃います。
- **ロールをまたぐコンパイル検査とサーバー検査**: メソッドに新しい戻り値の型を与えて再生成すると、古い型を返すハンドラーは `go build` で失敗します（モデルが組み立てた不正なツール呼び出しは実行時に拒否されます）。これとは別に、Highbay はテスト作成者の割り当て準備・検査時に必須 `Story` フローを `eval/design/story_tests.go` に書き出し、Go の実行コードを `eval/gen/` に生成したうえでテストプログラムをビルドしてシナリオ一覧を検査し、`verify_change` では合意リビジョンと `design/` が異なるコミットを拒否します。

エージェント向けの契約設計の詳細は [コーディングエージェントと開発する](/ja/docs/ai-development/) を参照してください。

---

## 5 つのチェックポイント（`CP1`〜`CP5`） {#checkpoints}

設計プレビュー、受理されたテストコミット、ライブターゲット、検証実行、承認はすべて Change Card の厳密な `request_revision` ダイジェストに紐づきます：

1. **`CP1` — Change Card で合意する**: コーディングエージェントが隔離されたドラフトで `Story`（`github.com/goadesign/highbay/story/dsl`）を評価し、変更の要約・未決の仕様質問・具体的な受け入れ例・維持する挙動をまとめた Change Card を提案します。ブラウザで質問に答えてカードを確定します。
2. **`CP2` — アーキテクチャをプレビューする**: ワーカーを起動する前に、合意した Goa と [Model](/ja/docs/3-ecosystem/model/) 設計で宣言された C4 コンテナ、Goa-AI エージェントのポリシー設定、ツールのガードレールを **Architecture** で確認します。
3. **`CP3` — ライブ環境でプロンプトを調整する（任意）**: サービスに Goa-AI エージェントが含まれ、モデルプロバイダーキーまたはゲートウェイを設定している場合、実装者はコミット前に候補コミットのライブコピーを起動して実行時プロンプトの上書きを試せます。
4. **`CP4` — 独立した検証を実行する**: Highbay はテスト作成者の `eval/` モジュールをブランチ `highbay/tests-<n>` 上でコンパイル・検査してからテストコミットとして受理し、続いて実装者の候補コミットをビルドして受理済みテストコミットを実行します（`eval/` スイートがライブプロバイダーを呼ばない限りモデル API キーは不要です）。オペレーターがホールドアウト付きの別評価器を設定している場合、Highbay は実装者向けレポート（`Report.ForBuilders()`）で各ホールドアウトの結果を匿名名で表示し、シナリオ名・チェック内容・診断情報を除外します（テスト作成者はホールドアウトを提出できません）。
5. **`CP5` — 承認してマージする**: **Approve** でシナリオレポートを確認し、承認を記録して（プロモーション設定がある場合はリリースバイナリのダイジェスト照合も可能）、**Merge into current branch** をクリックすると検証済みの候補コミットとテストコミットがローカルブランチにマージされます。

---

## Herdr の並列ペインとバックグラウンドワーカー {#herdr}

**Build** 画面では、各ワーカーロールのコーディングエージェントとモデルをその場で選択できます（選択はプロジェクトごとに記憶されます）。複数のコーディングエージェントファミリー（例：Claude Code と Codex）がインストールされている場合、Highbay は実装者とテスト作成者に異なるファミリーを優先して割り当てますが、1 つの CLI で両方の役割を担うこともできます：

| 実行モード | 使用される条件 | 動作 |
|------------|----------------|------|
| **Herdr + Chorus** | [Herdr](https://herdr.dev)（`herdr-core`、`herdr-app`）と [Chorus](/ja/docs/3-ecosystem/chorus/)（`chorus up`）が利用可能 | 対応する作業中エージェントペインを引き継ぎ、**Build** 中に `builder` と `test_writer` ペインを隣に分割表示し、マージまたは破棄後に自動で閉じます。macOS では **⌥⌘⇧H** で Highbay コンパニオンを開き、ペインのフォーカスやブラウザの再表示を行えます。 |
| **バックグラウンドワーカー** | Herdr が未インストールまたは未起動 | **Build** でバックグラウンド実行を確認すると、Herdr や Chorus なしでサーバー管理下の非対話 CLI プロセスとして `builder` と `test_writer` を実行します。 |

---

## アーキテクチャとプロセス境界 {#architecture}

{{< figure src="/images/diagrams/HighbayArchitecture.svg" alt="Guide Agent、Browser Page、Highbay Server、Test Writer、Builder、Verifier を示す Highbay アーキテクチャ" class="img-fluid" >}}

1. **ポータブルな `Story` DSL（`github.com/goadesign/highbay/story/dsl`）**: `design/` と並べてアクター、フロー（`StartsWith`、`Step`、`Outcome`）、未決の `Question` を Go で宣言します。ビルドが有効になるには、完了したすべてのフローに対応するシナリオテストが `eval/` に必要です（Highbay は必須シナリオが宣言されていることを確認して実行しますが、テスト内のアサーションが十分かどうかまでは判定しません）。
2. **Goa / Goa-AI コード生成（`generate_code`）**: Highbay が合意済みの `design/` を `.highbay-build` に反映し、固定バージョンの Goa / Goa-AI ジェネレーターを不可分に実行するため、どのエージェントも `gen/` を手編集しません。
3. **テストモジュールの受理（`internal/testwriter`）**: テストが有効になる前に、Highbay が Story テスト表を再生成し、`eval/` 以外のファイルが変更されていないことを確認してテストバイナリをコンパイルし、受理コミットを `highbay/tests-<n>` に記録します。
4. **候補検証とローカル実行（`verify/candidate`）**: ロール別の資格情報は Highbay 内で各ロールが呼べる操作を制限し、Change Card の確定・承認記録・マージを行えるのはあなただけです。エージェント、設計評価、候補バイナリ、`eval/` スイートは現在のユーザーアカウント権限の通常のローカルプロセスグループとしてファイルとネットワークへのアクセスを持って動作し、実装者の `check_project` はローカルの Docker コンテナ内でコンパイルと単体テストを実行します。

## 関連リンク

- [Highbay GitHub リポジトリ](https://github.com/goadesign/highbay) — ソースコード、`HOW_IT_WORKS.md`、`REFERENCE.md`、`story/dsl`
- [Highbay ページ](/ja/highbay/) — インタラクティブなポリシー比較と 4 画面のブラウザウォークスルー
- [Chorus ドキュメント](/ja/docs/3-ecosystem/chorus/) — Herdr ワーカーペインで使われる `#channel` と `@agent` 連携
- [コーディングエージェントと開発する](/ja/docs/ai-development/) — Goa と Goa-AI の設計ファースト開発フロー
