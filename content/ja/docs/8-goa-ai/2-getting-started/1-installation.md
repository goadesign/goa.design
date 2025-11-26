---
title: "インストール"
linkTitle: "インストール"
weight: 1
description: "Goa-AIをインストールし、開発環境をセットアップします。"
---

## 前提条件

Goa-AIをインストールする前に、以下を確認してください：

- **Go 1.24+** がインストールされ、設定されていること
- **Goa v3.23.0+** CLIがインストールされていること
- **Temporal**（オプション、耐久性のあるワークフロー用）- 開発にはインメモリエンジンを使用可能

## Goa CLIのインストール

Goa CLIは設計からコードを生成するために必要です：

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

インストールを確認：

```bash
goa version
```

## Goa-AIのインストール

Goモジュールに Goa-AIを追加：

```bash
go get goa.design/goa-ai@latest
```

または`go.mod`に追加：

```bash
go get goa.design/goa-ai
```

## オプション：Temporalセットアップ

本番環境で耐久性のあるワークフローを使用するには、Temporalが必要です。開発では、インメモリエンジンを使用できます（Temporal不要）。

### 開発（インメモリエンジン）

ランタイムはデフォルトでインメモリエンジンを使用するため、Temporalなしですぐに開発を開始できます：

```go
rt := runtime.New() // インメモリエンジンを使用
```

### 本番環境（Temporalエンジン）

本番デプロイメントでは、Temporalをセットアップします：

**オプション1：Docker（クイックスタート）**

```bash
docker run --rm -d --name temporal-dev -p 7233:7233 temporalio/auto-setup:latest
```

**オプション2：Temporalite（ローカル開発）**

```bash
go install go.temporal.io/server/cmd/temporalite@latest
temporalite start
```

**オプション3：Temporal Cloud**

[temporal.io](https://temporal.io)でサインアップし、クラウド認証情報でクライアントを設定します。

## インストールの確認

すべてが動作することを確認する簡単なテストを作成：

```go
package main

import (
    "context"
    
    "goa.design/goa-ai/runtime/agent/runtime"
)

func main() {
    rt := runtime.New()
    // ランタイムが正常に作成されました
    _ = rt
}
```

実行：

```bash
go run main.go
```

エラーなしで実行されれば、エージェントの構築を始める準備ができています！

## 次のステップ

Goa-AIをインストールしたら、[最初のエージェント](./2-first-agent/)ガイドに従って最初のエージェントを作成しましょう。
