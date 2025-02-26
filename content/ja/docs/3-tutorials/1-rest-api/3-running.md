---
title: コンサートサービスの実行
linkTitle: 実行
weight: 3
description: "Goaベースのコンサートサービスの実行方法、HTTPリクエストを使用したRESTエンドポイントのテスト、自動生成されたOpenAPIドキュメントの探索方法を学びます。"
---

APIを設計し、サービスメソッドを実装しました。次は、コンサートサービスを
実行し、そのエンドポイントをテストする段階です。

## 1. サーバーの起動

プロジェクトのルートから、アプリケーションをビルドして実行します：

```bash
go run concerts/cmd/concerts
```

サービスはデフォルトでポート8080でリッスンします（`main.go`で変更していない場合）。

## 2. エンドポイントのテスト

新しいAPIを探索しましょう！以下の一般的なHTTPツールを使用してサービスと対話できます：

- クイックなコマンドラインテスト用の`curl`
- より使いやすいCLIエクスペリエンスを提供する[HTTPie](https://httpie.org)
- リクエスト履歴とコレクションを備えた強力なGUIインターフェースの[Postman](https://www.postman.com/)

お好みのツールを選んで、リクエストを開始しましょう！🚀
これらの例では、ほとんどのシステムで利用可能な`curl`を使用します。
ただし、お好みのHTTPクライアントに例を適応させることもできます。
使用するツールに関係なく、概念は同じです。

以下をテストします：
- 新しいコンサートの作成（`POST`）
- ページネーション付きのすべてのコンサートの一覧表示（`GET`）
- 特定のコンサートの取得（`GET`）
- コンサートの詳細の更新（`PUT`）
- コンサートの削除（`DELETE`）

### コンサートの作成

新しいコンサートを作成しましょう！このリクエストは、JSON形式でコンサートの
詳細を含むPOSTを送信します。サーバーは一意のIDを生成し、完全な
コンサートオブジェクトを返します：

```bash
curl -X POST http://localhost:8080/concerts \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "The Rolling Stones",
    "date": "2025-05-01",
    "venue": "Wembley Stadium",
    "price": 150
  }'
```

ページネーションを説明するために、もう1つ作成しましょう：

```bash
curl -X POST http://localhost:8080/concerts \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "Pink Floyd",
    "date": "2025-07-15", 
    "venue": "Madison Square Garden",
    "price": 200
  }'
```

### コンサートの一覧表示

オプションのページネーションパラメータを使用してすべてのコンサートを取得：

- `page`: ページ番号（デフォルト：1）
- `limit`: 1ページあたりの結果数（デフォルト：10、最大：100）

一覧エンドポイントは、大量のコンサートデータを効率的に管理するためのページネーションをサポートしています。1ページあたりの結果数と表示するページを制御できます。

すべてのコンサートを取得（デフォルトのページネーションを使用）：

```bash
curl http://localhost:8080/concerts
```

1ページあたり1件の結果を取得：

```bash
curl "http://localhost:8080/concerts?page=1&limit=1"
```

### コンサートの表示

特定のコンサートに関する詳細情報が必要な場合は、表示エンドポイントを使用します。これは、個々のコンサートの詳細を表示したり、作成/更新後の情報を確認したりする場合に便利です。

`<concertID>`を作成時に返されたIDに置き換えてください：
```bash
curl http://localhost:8080/concerts/<concertID>
```

### コンサートの更新

コンサートの詳細を変更する必要がありますか？更新エンドポイントを使用すると、既存のコンサート情報を変更できます。更新したいフィールドのみを含める必要があります - 他のフィールドは現在の値を保持します。

```bash
curl -X PUT http://localhost:8080/concerts/<concertID> \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "The Beatles",
    "venue": "Madison Square Garden"
  }'
```

### コンサートの削除

コンサートをシステムから削除する必要がある場合（キャンセルされたり、誤って入力されたりした場合など）は、削除エンドポイントを使用します。この操作は永続的なので、注意して使用してください！

```bash
curl -X DELETE http://localhost:8080/concerts/<concertID>
```

## 3. APIドキュメントへのアクセス

GoaはAPIのOpenAPIドキュメントをバージョン2.xと3.0.0の両方の形式で自動生成します。これらのファイルは`gen/http/`ディレクトリにあります。

### Swagger UIの使用

{{< alert title="クイックセットアップ" color="primary" >}}
1. **前提条件**
   - システムにDockerがインストールされていること

2. **Swagger UIの起動**
   ```bash
   docker run -p 8081:8080 swaggerapi/swagger-ui
   ```

3. **ドキュメントの表示**
   - ブラウザで`http://localhost:8081`を開く
   - Swagger UIで`http://localhost:8080/openapi3.yaml`を入力
{{< /alert >}}

### 代替ドキュメントツール

- **Redoc**: もう1つの人気のあるOpenAPIドキュメントビューア
- **OpenAPI Generator**: 様々な言語でクライアントライブラリを生成
- **Speakeasy**: 開発者エクスペリエンスを向上させたSDKを生成

## 次のステップ

基本的なAPI操作を探索したので、リクエストとレスポンスがどのように処理されるかを理解するために、Goaの[HTTPエンコーディングとデコーディング](../4-encoding)についてさらに学びましょう。 