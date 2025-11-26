---
title: "メモリ永続化"
linkTitle: "メモリ永続化"
weight: 3
description: "Goa-AIで会話とコンテキストのための永続的なストレージを設定する。"
---

Goa-AIはセッション、ラン、メモリのための永続的なストレージをサポートし、エージェントがインタラクション間でコンテキストを維持できるようにします。

## ストレージインターフェース

Goa-AIはストレージの3つの主要なインターフェースを定義しています：

- **`session.Store`** – 会話セッションを永続化
- **`run.Store`** – 個々のランとそのメタデータを永続化
- **`memory.Store`** – 長期的なエージェントメモリを永続化

## MongoDBの例

Goa-AIは`features/`パッケージにMongoDB実装を同梱しています：

```go
import (
    "goa.design/goa-ai/features/session/mongo"
    "goa.design/goa-ai/features/run/mongo"
    "goa.design/goa-ai/features/memory/mongo"
)

// MongoDBに接続
client, err := mongodb.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
if err != nil {
    log.Fatal(err)
}
db := client.Database("myapp")

// ストアを作成
sessionStore := sessionmongo.New(db)
runStore := runmongo.New(db)
memoryStore := memorymongo.New(db)

// ストアでランタイムを作成
rt, err := agent.NewRuntime(ctx, &agent.RuntimeStores{
    Session: sessionStore,
    Run:     runStore,
    Memory:  memoryStore,
}, nil)
```

## カスタム実装

それぞれのストアインターフェースを実装して独自のバックエンドを提供できます。

### session.Store

```go
type Store interface {
    Create(ctx context.Context, session *Session) error
    Get(ctx context.Context, id string) (*Session, error)
    Update(ctx context.Context, session *Session) error
    List(ctx context.Context, filter Filter) ([]*Session, error)
}
```

### run.Store

```go
type Store interface {
    Create(ctx context.Context, run *Record) error
    Get(ctx context.Context, id string) (*Record, error)
    Update(ctx context.Context, run *Record) error
    ListBySession(ctx context.Context, sessionID string) ([]*Record, error)
}
```

## 次のステップ

- [セッション、ラン、メモリ](./4-sessions-runs-memory.md)でこれらの概念の連携方法を理解する


