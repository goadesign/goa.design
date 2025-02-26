---
title: REST APIの設計
linkTitle: 設計
weight: 1
description: "Goaを使用してコンサート管理のための完全なREST APIを設計する方法を学びます。CRUD操作、ページネーション、適切なHTTPマッピング、エラー処理を含みます。"
---

このチュートリアルでは、Goaを使用して音楽コンサートを管理するためのREST APIを設計する手順を説明します。一般的な操作、適切なHTTPマッピング、エラー処理を含む完全なAPI設計の作成方法を学びます。

## 作成するもの

以下の標準的なREST操作を提供する`concerts`サービスを作成します：

| 操作 | HTTPメソッド | パス | 説明 |
|-----------|------------|------|-------------|
| 一覧表示 | GET | /concerts | ページネーション付きですべてのコンサートを取得 |
| 作成 | POST | /concerts | 新しいコンサートを追加 |
| 表示 | GET | /concerts/{id} | 単一のコンサートを取得 |
| 更新 | PUT | /concerts/{id} | コンサートを変更 |
| 削除 | DELETE | /concerts/{id} | コンサートを削除 |

## 設計ファイル

まず、サービスをホストするための新しいGoモジュールを作成します。

```bash
mkdir concerts
cd concerts
go mod init concerts
```

`design/concerts.go`に以下の内容で新しいファイルを作成します：

```go
package design

import (
  . "goa.design/goa/v3/dsl"
)

// サービス定義
var _ = Service("concerts", func() {
  Description("コンサートサービスは音楽コンサートのデータを管理します。")

  Method("list", func() {
    Description("オプションのページネーション付きで今後のコンサートを一覧表示します。")
    
    Payload(func() {
      Attribute("page", Int, "ページ番号", func() {
        Minimum(1)
        Default(1)
      })
      Attribute("limit", Int, "1ページあたりの項目数", func() {
        Minimum(1)
        Maximum(100)
        Default(10)
      })
    })

    Result(ArrayOf(Concert))

    HTTP(func() {
      GET("/concerts")

      // ページネーションのクエリパラメータ
      Param("page", Int, "ページ番号", func() {
        Minimum(1)
      })
      Param("limit", Int, "1ページあたりの項目数", func() {
        Minimum(1)
        Maximum(100)
      })

      Response(StatusOK) // Bodyを指定する必要はありません、Resultから推論されます
    })
  })

  Method("create", func() {
    Description("新しいコンサートエントリーを作成します。")
    
    Payload(ConcertPayload)
    Result(Concert)

    HTTP(func() {
      POST("/concerts")
      Response(StatusCreated)
    })
  })

  Method("show", func() {
    Description("IDで単一のコンサートを取得します。")
    
    Payload(func() {
      Attribute("concertID", String, "コンサートのUUID", func() {
        Format(FormatUUID)
      })
      Required("concertID")
    })

    Result(Concert)
    Error("not_found")

    HTTP(func() {
      GET("/concerts/{concertID}")
      Response(StatusOK)
      Response("not_found", StatusNotFound)
    })
  })

  Method("update", func() {
    Description("IDで既存のコンサートを更新します。")

    Payload(func() {
      Extend(ConcertPayload)
      Attribute("concertID", String, "更新するコンサートのID", func() {
        Format(FormatUUID)
      })
      Required("concertID")
    })

    Result(Concert, "更新されたコンサート")

    Error("not_found", ErrorResult, "コンサートが見つかりません")

    HTTP(func() {
      PUT("/concerts/{concertID}")

      Response(StatusOK)
      Response("not_found", StatusNotFound)
    })
  })

  Method("delete", func() {
    Description("IDでシステムからコンサートを削除します。")

    Payload(func() {
      Attribute("concertID", String, "削除するコンサートのID", func() {
        Format(FormatUUID)
      })
      Required("concertID")
    })

    Error("not_found", ErrorResult, "コンサートが見つかりません")

    HTTP(func() {
      DELETE("/concerts/{concertID}")

      Response(StatusNoContent)
      Response("not_found", StatusNotFound)
    })
  })
})

// データ型
var ConcertPayload = Type("ConcertPayload", func() {
  Description("コンサートの作成/更新に必要なデータ")

  Attribute("artist", String, "出演アーティスト/バンド", func() {
    MinLength(1)
    Example("The Beatles")
  })
  Attribute("date", String, "コンサート日付（YYYY-MM-DD）", func() {
    Pattern(`^\d{4}-\d{2}-\d{2}$`)
    Example("2024-01-01")
  })
  Attribute("venue", String, "コンサート会場", func() {
    MinLength(1)
    Example("The O2 Arena")
  })
  Attribute("price", Int, "チケット価格（USD）", func() {
    Minimum(1)
    Example(100)
  })
})

var Concert = Type("Concert", func() {
  Description("すべての詳細を含むコンサート")
  Extend(ConcertPayload)
  
  Attribute("id", String, "一意のコンサートID", func() {
    Format(FormatUUID)
  })
  Required("id", "artist", "date", "venue", "price")
})
```

## 設計の理解

このチュートリアルで使用されているすべてのDSL関数の完全なリファレンスについては、
[Goa DSLドキュメント](https://pkg.go.dev/goa.design/goa/v3/dsl)を参照してください。
各関数は詳細な説明と実践的な例で徹底的にドキュメント化されています。

### 1. 基本構造
設計は3つの主要な部分で構成されています：
- サービス定義（`Service("concerts")`）
- メソッド（`list`、`create`、`show`など）
- データ型（`Concert`と`ConcertPayload`）

### 2. 主要な機能

#### HTTPマッピング
APIはRESTfulな規則に従い、直感的なHTTPマッピングを提供します：
- データの取得には`GET`リクエスト（コンサートの一覧表示と表示）
- 新しいコンサートの作成には`POST`
- 既存のコンサートの更新には`PUT`
- コンサートの削除には`DELETE`
- ページネーションはクエリパラメータ（`page`と`limit`）で処理
- リソースIDはパスパラメータで取得（例：`/concerts/{concertID}`）

#### データバリデーション
Goaはデータの整合性を確保するための組み込みのバリデーションを提供します：
- コンサートIDは有効なUUIDである必要がある
- アーティストと会場名は空にできない
- コンサート日付はYYYY-MM-DD形式に従う必要がある
- チケット価格は正の数である必要がある
- ページネーションパラメータには適切な制限がある（例：1ページあたり最大100項目）

#### エラー処理
APIは以下の方法で適切にエラーを処理します：
- 何が問題かを明確に示す名前付きエラータイプ（例：「not_found」）
- 適切なHTTPステータスコード（見つからない場合は404、作成時は201など）
- すべてのエンドポイントで一貫したエラーレスポンス形式

#### 型の再利用
重複を避けるために型を構造化しています：
- `ConcertPayload`は作成/更新に必要な共通フィールドを定義
- `Concert`は`ConcertPayload`を拡張しIDフィールドを追加
- このアプローチにより、入力データと保存データの間の一貫性を確保

## 次のステップ

完全なAPI設計ができたので、[実装チュートリアル](./2-implementing)に進んで、
Goaのコード生成を使用してこの設計を実現する方法を学びましょう。 