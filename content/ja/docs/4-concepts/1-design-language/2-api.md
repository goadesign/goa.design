---
title: "API定義"
linkTitle: "API"
weight: 2
description: >
  GoaのAPI DSLを使用してAPIのグローバルプロパティを定義します。メタデータ、ドキュメント、サーバー、グローバル設定を構成します。
---

## API定義

`API`関数は、サービスのグローバルプロパティを定義するトップレベルのDSLです。デザインの
ルートとして機能し、他のすべてのコンポーネントの基礎を確立します。各デザインパッケージ
には1つのAPI宣言のみを含めることができ、これがサービス定義のエントリーポイントとして
機能します。

### 目的と使用法

API定義は以下の重要な目的を果たします：
- APIドキュメントのメタデータを提供
- サーバーエンドポイントと変数を設定
- すべてのサービスのグローバル設定を確立
- ドキュメントとライセンス情報を定義
- 連絡先とサポートの詳細を設定

### 基本構造

以下は最小限のAPI定義です：

```go
var _ = API("calculator", func() {
    Title("電卓API")
    Description("シンプルな電卓サービス")
    Version("1.0.0")
})
```

これは"calculator"という名前のAPIを基本的なドキュメントと共に作成します。API名は
生成されるコードで使用されるため、有効なGo識別子である必要があります。

### 完全な例

以下は、利用可能なすべてのAPIオプションを詳細な説明付きで示す包括的な例です：

```go
var _ = API("bookstore", func() {
    // 基本的なAPI情報 - OpenAPIドキュメントで使用
    Title("書店API")
    Description(`現代的な書店管理API。
    
このAPIは以下のエンドポイントを提供します：
- 書籍と在庫の管理
- 注文の処理
- 顧客管理
- 分析とレポート`)
    Version("2.0.0")
    
    // サービス利用規約 - 法的要件と使用条件
    TermsOfService("https://example.com/terms")
    
    // 連絡先情報 - サポートの問い合わせ先
    Contact(func() {
        Name("APIサポート")
        Email("support@example.com")
        URL("https://example.com/support")
    })
    
    // ライセンス情報 - APIの使用方法
    License(func() {
        Name("Apache 2.0")
        URL("https://www.apache.org/licenses/LICENSE-2.0.html")
    })
    
    // ドキュメント - 詳細なガイドとリファレンス
    Docs(func() {
        Description(`包括的なAPIドキュメントには以下が含まれます：
- 入門ガイド
- 認証の詳細
- APIリファレンス
- ベストプラクティス
- サンプルコード`)
        URL("https://example.com/docs")
    })
    
    // サーバー定義 - APIにアクセスできる場所
    Server("production", func() {
        Description("本番サーバー")
        
        // 変数を持つ複数のホスト
        Host("production", func() {
            Description("本番ホスト")
            // URI内の変数は実行時に置き換えられます
            URI("https://{version}.api.example.com")
            URI("grpcs://{version}.grpc.example.com")
            
            // バージョン変数を定義
            Variable("version", String, "APIバージョン", func() {
                Default("v2")
                Enum("v1", "v2")
            })
        })
    })
    
    // テスト用の開発サーバー
    Server("development", func() {
        Description("開発サーバー")
        
        Host("localhost", func() {
            // ローカル開発エンドポイント
            URI("http://localhost:8000")
            URI("grpc://localhost:8080")
        })
    })
})
```

### API プロパティの詳細

#### 基本メタデータ
これらのプロパティはAPIのドキュメントと発見に不可欠です：

- `Title`: APIの短く説明的な名前
- `Description`: APIの機能の詳細な説明
- `Version`: APIバージョン、通常はセマンティックバージョニングに従う
- `TermsOfService`: サービス利用規約へのリンク

マークダウンをサポートする例：
```go
Title("注文管理API")
Description(`
# 注文管理API

このAPIでは以下が可能です：
- 注文の作成と管理
- 出荷の追跡
- 返品の処理
- 請求書の生成

## レート制限
- 認証済みユーザーは1時間あたり1000リクエスト
- 匿名ユーザーは1時間あたり100リクエスト
`)
```

#### 連絡先情報
連絡先情報は、APIユーザーがサポートを求める際に役立ちます：

```go
Contact(func() {
    Name("APIチーム")
    Email("api@example.com")
    URL("https://example.com/contact")
})
```

この情報はAPIドキュメントに表示され、ユーザーが必要な時に支援を得るのに役立ちます。

#### ライセンス情報
APIの使用方法を指定します：

```go
License(func() {
    Name("MIT")
    URL("https://opensource.org/licenses/MIT")
})
```

ライセンス情報は、ユーザーが使用権と制限を理解するために重要です。

#### ドキュメントリンク
追加のドキュメントリソースを提供します：

```go
Docs(func() {
    Description(`詳細なドキュメントには以下が含まれます：
- APIリファレンス
- 統合ガイド
- ベストプラクティス
- サンプルコード`)
    URL("https://example.com/docs")
})
```

### サーバー設定

サーバーは、APIにアクセスできるエンドポイントを定義します。異なる環境用に複数の
サーバーを定義できます：

```go
Server("main", func() {
    Description("メインAPIサーバー")
    
    // 本番ホスト
    Host("production", func() {
        Description("本番エンドポイント")
        // HTTPとgRPCの両方をサポート
        URI("https://api.example.com")
        URI("grpcs://grpc.example.com")
    })
    
    // 変数を持つリージョナルホスト
    Host("regional", func() {
        Description("リージョナルエンドポイント")
        URI("https://{region}.api.example.com")
        
        // リージョン変数を定義
        Variable("region", String, "地理的リージョン", func() {
            Description("APIエンドポイントのAWSリージョン")
            Default("us-east")
            Enum("us-east", "us-west", "eu-central")
        })
    })
})
```

URI内の変数により、柔軟な設定が可能になり、以下のために使用できます：
- 複数のリージョンをサポート
- 異なるAPIバージョンを処理
- 環境固有の設定を構成
- 複数のテナントを管理

### ベストプラクティス

{{< alert title="APIデザインガイドライン" color="primary" >}}
**ドキュメント**
- 明確で簡潔なタイトルと説明を提供
- リッチなドキュメントにマークダウン形式を使用
- 包括的な連絡先情報を含める
- 詳細な外部ドキュメントへリンク
- ライセンスとサービス利用規約を明確に指定

**バージョニング**
- セマンティックバージョニング（MAJOR.MINOR.PATCH）を使用
- APIバージョニング用にサーバーURLにバージョンを含める
- バージョン移行と後方互換性を計画
- バージョン間の破壊的変更を文書化

**サーバー設定**
- すべての本番環境と開発環境のサーバーを定義
- 柔軟な設定に変数を使用
- 必要に応じてHTTPとgRPCの両方のエンドポイントを含める
- サーバー環境とその目的を文書化
- 変数に適切なデフォルト値を提供
- リージョナルおよびスケーリング要件を考慮

**一般的なヒント**
- 説明を焦点を絞って関連性のあるものに保つ
- 一貫した命名規則を使用
- 将来の拡張を計画
- セキュリティの影響を考慮
- レート制限と使用割り当てを文書化
{{< /alert >}}

### APIレベルのエラー

API DSLを使用すると、すべてのサービスとメソッドで再利用できるAPIレベルのエラーを
定義できます。これにより、エラー処理の一貫性が促進され、デザインの重複が減少します。 