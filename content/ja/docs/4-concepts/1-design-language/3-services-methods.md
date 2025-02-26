---
title: "サービスとメソッド"
linkTitle: "サービスとメソッド"
weight: 3
description: >
  Goaのサービス定義DSLを使用してAPIのサービスとメソッドを定義します。型付けされたペイロードと結果を持つ、明確で適切にドキュメント化されたエンドポイントを作成します。
---

## サービス

Goaにおけるサービスは、特定の機能を提供するために協調して動作する関連メソッドの
集合を表します。サービスは、APIを論理的なグループに整理するのに役立ちます。

### サービスDSL

サービスDSLは、サービスを設定しドキュメント化するためのいくつかのオプションを
サポートしています：

```go
var _ = Service("users", func() {
    // 基本的なドキュメント
    Description("ユーザー管理サービス")
    
    // 詳細なドキュメント
    Docs(func() {
        Description("ユーザーサービスの詳細なドキュメント")
        URL("https://example.com/docs/users")
    })

    // サービスレベルのエラー定義
    Error("unauthorized", String, "認証に失敗しました")
    Error("not_found", NotFound, "リソースが見つかりません")
    
    // サービス全体のメタデータ
    Meta("swagger:tag", "Users")
    Meta("rpc:package", "usersvc")
    
    // セキュリティ要件
    Security(OAuth2, func() {
        Scope("read:users")
        Scope("write:users")
    })
    
    // サービスレベルの変数
    Variable("version", String, func() {
        Description("APIバージョン")
        Default("v1")
        Enum("v1", "v2")
    })
    
    // メソッド
    Method("create", func() {
        // ... メソッド定義
    })
    
    Method("list", func() {
        // ... メソッド定義
    })
    
    // サービスが提供するファイル
    Files("/docs", "./swagger", func() {
        Description("APIドキュメント")
    })
})
```

### サービスレベルのエラー

サービス内のすべてのメソッドが返す可能性のあるエラーを定義します：

```go
var _ = Service("orders", func() {
    // サービス内のすべてのメソッドがこのエラーを返す可能性があります
    Error("unauthorized")
})
```

> **注意：** `Error` DSLは、サービス内のすべてのメソッドが返す可能性のあるエラーを
> 定義するために使用されます。一部のメソッドに固有のエラーを定義する場合には適して
> いません。代わりに、この目的にはメソッドまたはAPI定義内で`Error` DSLを使用して
> ください。

### サービスのドキュメント

Docs DSLを使用して詳細なドキュメントを提供します：

```go
var _ = Service("payments", func() {
    Description("決済処理サービス")
    
    Docs(func() {
        Description(`決済サービスはすべての決済関連の操作を処理します。
            
以下のメソッドを提供します：
- 決済の処理
- 取引の返金
- 決済状態の照会
- 決済方法の管理`)
        
        URL("https://example.com/docs/payments")
        
        // 追加のドキュメントメタデータ
        Meta("doc:section", "金融サービス")
        Meta("doc:category", "コアAPI")
    })
})
```

### 複数のサービス

複雑なAPIは複数のサービスに整理できます：

```go
var _ = Service("users", func() {
    Description("ユーザー管理サービス")
    // ... ユーザー関連のメソッド
})

var _ = Service("billing", func() {
    Description("請求と支払いサービス")
    // ... 請求関連のメソッド
})
```

## メソッド

メソッドは、サービス内で実行できる操作を定義します。各メソッドは、その入力
（ペイロード）、出力（結果）、およびエラー条件を指定します。

### 基本的なメソッド構造

```go
Method("add", func() {
    Description("2つの数値を加算します")
    
    // 入力パラメータ
    Payload(func() {
        Field(1, "a", Int32, "最初のオペランド")
        Field(2, "b", Int32, "2番目のオペランド")
        Required("a", "b")
    })
    
    // 成功レスポンス
    Result(Int32)
    
    // エラーレスポンス
    Error("overflow")
})
```

### ペイロードの型

メソッドは異なる型のペイロードを受け入れることができます：

```go
// 既存の型を使用したシンプルなペイロード
Method("getUser", func() {
    Payload(String, "ユーザーID")
    Result(User)
})

// インラインで定義された構造化ペイロード
Method("createUser", func() {
    Payload(func() {
        Field(1, "name", String, "ユーザーのフルネーム")
        Field(2, "email", String, "メールアドレス", func() {
            Format(FormatEmail)
        })
        Field(3, "role", String, "ユーザーロール", func() {
            Enum("admin", "user", "guest")
        })
        Required("name", "email", "role")
    })
    Result(User)
})

// 事前定義されたペイロード型への参照
Method("updateUser", func() {
    Payload(UpdateUserPayload)
    Result(User)
})
```

### 結果の型

メソッドは異なる型の結果を返すことができます：

```go
// シンプルなプリミティブ結果
Method("count", func() {
    Result(Int64)
})

// インラインで定義された構造化結果
Method("search", func() {
    Result(func() {
        Field(1, "items", ArrayOf(User), "マッチしたユーザー")
        Field(2, "total", Int64, "合計数")
        Required("items", "total")
    })
})
```

### エラー処理

メソッドの予期されるエラー条件を定義します：

```go
Method("divide", func() {
    Payload(func() {
        Field(1, "a", Float64, "被除数")
        Field(2, "b", Float64, "除数")
        Required("a", "b")
    })
    Result(Float64)
    
    // メソッド固有のエラー
    Error("division_by_zero", func() {
        Description("ゼロによる除算が試みられました")
    })
})
```

### ストリーミングメソッド

Goaはペイロードと結果の両方でストリーミングをサポートしています：

```go
Method("streamNumbers", func() {
    Description("数値のシーケンスをストリーミングします")
    
    // 入力として整数のストリーム
    StreamingPayload(Int32)
    
    // 出力として整数のストリーム
    StreamingResult(Int32)
})

Method("processEvents", func() {
    Description("イベントのストリームを処理します")
    
    // 構造化データのストリーム
    StreamingPayload(func() {
        Field(1, "event_type", String)
        Field(2, "data", Any)
        Required("event_type", "data")
    })
    
    // サマリー結果を返す
    Result(func() {
        Field(1, "processed", Int64, "処理されたイベント数")
        Field(2, "errors", Int64, "エラー数")
        Required("processed", "errors")
    })
})
``` 