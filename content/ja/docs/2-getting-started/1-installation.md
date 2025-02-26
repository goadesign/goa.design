---
title: インストール
weight: 1
description: "Goaのインストールと開発環境のセットアップのステップバイステップガイド。前提条件と検証手順を含みます。"
---

## 前提条件

GoaではGoモジュールの使用が必要です。Go環境でモジュールが有効になっていることを確認してください。

- **Go 1.18以上**を使用（推奨）。
- **Goモジュール**を有効化：環境で有効になっていることを確認（例：`GO111MODULE=on`または Go 1.16以降のデフォルト設定）。

## Goaのインストール

```bash
# Goaパッケージの取得
go get goa.design/goa/v3/...

# Goa CLIのインストール
go install goa.design/goa/v3/cmd/goa@latest

# インストールの確認
goa version
```

現在のGoaバージョン（例：`v3.x.x`）が表示されるはずです。

---

[最初のサービス](./2-first-service/)に進んで、最初のサービスの作成方法を学びましょう。 