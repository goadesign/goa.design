---
title: "HTTPルーティング"
linkTitle: "ルーティング"
weight: 2
description: "Goaがパスパターン、パラメータ、ワイルドカード、クリーンなURLを設計するためのベストプラクティスを含むHTTPルーティングを処理する方法を学びます。"
menu:
  main:
    parent: "HTTP高度なトピック"
    weight: 2
---

Goaは、HTTPリクエストをサービスメソッドにマッピングする強力なルーティングシステムを提供します。このガイドでは以下をカバーします：

- 基本的なルーティングの概念とサービス定義
- HTTPメソッドとURLパターン
- パラメータ処理（パス、クエリ、ワイルドカード）
- レスポンスステータスコード
- APIデザインのベストプラクティス
- サービスの関係性とネストされたリソース

## 基本的なルーティング

Goaでは、ルートはサービス定義内の`HTTP`関数を使用してデザインで定義されます。`HTTP`関数を使用すると、
サービスメソッドがHTTP経由でどのように公開されるかを指定できます。

基本的な例を示します：

```go
var _ = Service("calculator", func() {
    // サービス全体のHTTP設定を定義
    HTTP(func() {
        // このサービスのすべてのエンドポイントのベースパスを設定
        Path("/calculator")
    })

    Method("add", func() {
        // メソッドのペイロードを定義
        Payload(func() {
            // フィールドの順序が重要 - タグ1が最初
            Field(1, "a", Int, "最初のオペランド")
            Field(2, "b", Int, "2番目のオペランド")
        })
        // メソッドの結果を定義
        Result(Int)
        // HTTPトランスポートを定義
        HTTP(func() {
            POST("/add")     // POST /calculator/addを処理
        })
    })
})
```

上記の例は：
1. "calculator"という名前のサービスを作成
2. すべてのエンドポイントに対して"/calculator"というベースパスを設定
3. "add"メソッドを定義し：
   - 2つの整数を入力として受け取る
   - 整数を返す
   - "/calculator/add"でHTTP POSTを介してアクセス可能

## HTTPメソッドとパス

Goaは、専用のDSL関数を通じてすべての標準HTTPメソッドをサポートしています：`GET`、`POST`、`PUT`、`DELETE`、`PATCH`、`HEAD`、`OPTIONS`、`TRACE`。
単一のサービスメソッドで複数のHTTPメソッドやパスを処理できます：

```go
Method("manage_user", func() {
    Description("ユーザーの作成または更新")
    Payload(User)
    Result(User)
    HTTP(func() {
        POST("/users")          // ユーザーの作成
        PUT("/users/{user_id}") // 既存ユーザーの更新
        Response(StatusOK)      // 更新の場合は200
        Response(StatusCreated) // 作成の場合は201
    })
})
```

## パラメータ処理

### パスパラメータ

URLパスから動的な値を取得するためにパラメータを使用できます。パスパラメータは中括弧`{parameter_name}`を使用して定義され、
自動的にペイロードフィールドにマッピングされます。

```go
Method("get_user", func() {
    Description("IDによるユーザーの取得")
    Payload(func() {
        // user_idフィールドはURLパスから設定される
        Field(1, "user_id", String, "URLパスからのユーザーID")
    })
    Result(User)
    HTTP(func() {
        GET("/users/{user_id}")  // {user_id}をpayload.UserIDにマッピング
    })
})
```

### パラメータの型とマッピング

Goaでは、パラメータの型はURLパターンではなく、ペイロード定義で定義されます。URLパターンは、
トランスポート名をペイロードフィールドにマッピングする方法のみを定義します。

1. **プリミティブ型の単純なペイロード**
   ```go
   Method("get_user", func() {
       // ペイロードがプリミティブ型の場合、パスパラメータに直接マッピング
       Payload(String, "ユーザーID")
       Result(User)
       HTTP(func() {
           GET("/users/{user_id}")  // user_idの値がペイロードになる
       })
   })
   ```

2. **直接マッピングを使用した構造化ペイロード**
   ```go
   Method("get_user", func() {
       Payload(func() {
           // パラメータの型（Int）はここでペイロードで定義
           Field(1, "user_id", Int, "ユーザーID")
       })
       Result(User)
       HTTP(func() {
           GET("/users/{user_id}")  // payload.UserIDに直接マッピング
       })
   })
   ```

3. **トランスポート名のマッピング**
   ```go
   Method("get_user", func() {
       Payload(func() {
           // 内部フィールド名は"id"
           Field(1, "id", Int, "ユーザーID")
       })
       HTTP(func() {
           // URLではuser_idを使用するがpayload.IDにマッピング
           GET("/users/{user_id:id}")
       })
   })
   ```

パスパターンの`{name:field}`構文は名前のマッピングにのみ使用されます：
- `name`はURLに表示される名前
- `field`はペイロード内のフィールド名

プリミティブペイロードの場合、パスパラメータの値がペイロード全体になります：

```go
Method("download", func() {
    // ペイロード全体がファイルパスを表す文字列
    Payload(String, "ファイルへのパス")
    HTTP(func() {
        GET("/files/{*path}")  // 取得したパスがペイロードになる
    })
}

Method("get_version", func() {
    // ペイロードは単純な整数
    Payload(Int, "APIバージョン番号")
    HTTP(func() {
        GET("/api/{version}")  // バージョン番号がペイロードになる
    })
})
```

構造化ペイロードを使用する場合、パスパラメータを他のペイロードフィールドと組み合わせることができます：

```go
Method("update_user_profile", func() {
    Payload(func() {
        // パスパラメータ
        Field(1, "id", Int, "ユーザーID")
        // ボディフィールド
        Field(2, "name", String, "ユーザー名")
        Field(3, "email", String, "ユーザーのメールアドレス")
    })
    HTTP(func() {
        PUT("/users/{user_id:id}")  // URLのuser_idをpayload.IDにマッピング
        Body("name", "email")       // これらのフィールドはリクエストボディから取得
    })
})
```

### クエリパラメータ

クエリ文字列パラメータは`Param`関数を使用して定義され、ペイロードフィールドに対応している必要があります。
デフォルト値とバリデーションルールを設定できます：

```go
Method("list_users", func() {
    Description("ページネーション付きユーザー一覧")
    Payload(func() {
        Field(1, "page", Int, "ページ番号", func() {
            Default(1)        // デフォルトは1ページ目
            Minimum(1)        // ページは正の数でなければならない
        })
        Field(2, "per_page", Int, "1ページあたりの項目数", func() {
            Default(20)       // デフォルトは20項目
            Minimum(1)
            Maximum(100)      // 最大項目数を制限
        })
    })
    Result(CollectionOf(User))
    HTTP(func() {
        GET("/users")
        // ペイロードフィールドをクエリパラメータにマッピング
        Param("page")
        Param("per_page")
    })
})
```

### ワイルドカードとキャッチオールルート

柔軟なパスマッチングのために、アスタリスク構文（`*path`）を使用して残りのすべてのパスセグメントを取得できます。
取得した値はペイロードで利用可能です：

```go
Method("serve_files", func() {
    Description("ディレクトリから静的ファイルを提供")
    Payload(func() {
        // pathフィールドには/files/以降のすべてのセグメントが含まれる
        Field(1, "path", String, "ファイルへのパス")
    })
    HTTP(func() {
        GET("/files/*path")    // /files/docs/image.pngなどにマッチ
    })
})
```

## APIデザインのベストプラクティス

### リソースの命名

リソースを表すには名詞を使用し、HTTPメソッドでアクションを定義します：

```go
HTTP(func() {
    // 良い例 - HTTPメソッドがアクションを示す
    GET("/articles")        // 記事一覧
    POST("/articles")       // 記事作成
    GET("/articles/{id}")   // 記事1件取得
    PUT("/articles/{id}")   // 記事更新
    DELETE("/articles/{id}") // 記事削除

    // 避けるべき例 - URLにアクションが含まれている
    GET("/list-articles")
    POST("/create-article")
})
```

### 一貫した複数形の使用

コレクションエンドポイントには複数形の名詞を使用し、一貫性を維持します： 