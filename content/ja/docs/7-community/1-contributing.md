---
title: "Goaへの貢献"
linkTitle: "貢献"
weight: 1
description: "Goaの開発とドキュメントへの貢献方法を学ぶ"
---

## 貢献方法

Goaへの貢献方法には以下のようなものがあります：

### コード貢献

1. **イシューを選ぶ**
   - [GitHubイシュー](https://github.com/goadesign/goa/issues)をチェック
   - `help wanted`や`good first issue`タグのついたイシューを探す
   - 興味のあるイシューにコメントする

2. **開発環境のセットアップ**
   - [Goaリポジトリ](https://github.com/goadesign/goa)をフォーク
   - フォークをクローン：`git clone https://github.com/YOUR-USERNAME/goa`
   - Go 1.21以降をインストール
   - テストを実行：`go test ./...`

3. **変更を加える**
   - 新しいブランチを作成：`git checkout -b feature/your-feature`
   - 明確で慣用的なGoコードを書く
   - 新機能にはテストを追加
   - すべてのテストが通ることを確認
   - テンプレートを変更した場合は`go generate ./...`を実行

4. **変更を提出する**
   - フォークにプッシュ
   - プルリクエストを提出
   - 変更内容を明確に説明
   - 関連するイシューへリンク

### ドキュメント

1. **Webサイトのドキュメント**
   - [goa.designリポジトリ](https://github.com/goadesign/goa.design)をフォーク
   - READMEに従ってHugoをセットアップ
   - 変更を加える
   - 改善点をプルリクエストとして提出

2. **例とチュートリアル**
   - 既存のセクションに例を追加
   - 新しいチュートリアルを作成
   - 既存のドキュメントを改善
   - 翻訳を追加

### コミュニティサポート

- [#goa Slackチャンネル](https://gophers.slack.com/messages/goa/)で他の人を助ける
- [GitHub Discussions](https://github.com/goadesign/goa/discussions)で質問に答える
- バグやイシューを報告
- Goaでの経験を共有

## 開発ガイドライン

### コードスタイル

- 標準的なGo規約に従う
- `gofmt`でフォーマットする
- 明確なgodocコメントを書く
- 新しいコードにはテストを含める
- 変更は焦点を絞って原子的に

### プルリクエストのプロセス

1. **提出前の確認**
   - すべてのテストを実行
   - 必要に応じてドキュメントを更新
   - 必要な場合はコードを生成
   - 破壊的変更をチェック

2. **PRのガイドライン**
   - 明確で説明的なタイトルを使用
   - 関連するイシューを参照
   - 変更内容を説明
   - フィードバックに対応する

### ドキュメントのガイドライン

- 明確でシンプルな言葉を使用
- 動作するコード例を含める
- すべてのコード例をテスト
- 例は焦点を絞ってシンプルに

## ヘルプを得る

- [#goa Slackチャンネル](https://gophers.slack.com/messages/goa/)に参加
- [GitHub Discussions](https://github.com/goadesign/goa/discussions)を使用
- 既存のドキュメントを確認 