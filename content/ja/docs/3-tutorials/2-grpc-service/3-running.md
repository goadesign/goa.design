---
title: "サービスの実行"
linkTitle: "実行"
weight: 3
description: "gRPC CLI、gRPCurl、カスタムGoクライアントなどの様々なツールを使用してGoa gRPCサービスを実行およびテストする方法を、実践的な例と一般的な使用パターンとともに学びます。"
---

gRPCベースのGoaサービスを設計および実装した後は、ローカルで**実行**し、
期待通りに動作することを確認したいでしょう。このチュートリアルでは：

1. gRPCサーバーを**起動**します。
2. gRPCツールを使用してサービスを**テスト**します。
3. 実際の使用に向けた一般的な次のステップを**確認**します。

## 1. サーバーの起動

プロジェクトのルート（例：`grpcgreeter/`）から、`cmd/greeter/`フォルダに
作成した`main.go`を実行します：

```bash
go run grpcgreeter/cmd/greeter
```

すべてが正しく設定されていれば、サービスはポート`8090`で**リッスン**します
（`main.go`で指定した通り）。

以下のようなログメッセージが表示されるはずです：

```
gRPCサービスが:8090でリッスン中
```

これはサービスがアクティブで、gRPCリクエストを受信する**準備**ができていることを
示しています。

## 2. サービスのテスト

### gRPC CLI

公式のgRPC CLIツールがインストールされている場合（MacOSでは`brew install grpc`）、
以下のように簡単にサービスをテストできます：

```bash
grpc_cli call localhost:8090 SayHello "name: 'Alice'"
```

これは`name`フィールドを`"Alice"`に設定して`SayHello`メソッドにRPCを送信します。
これはサービスがサーバーリフレクションを有効にするように設定されているため機能します。

### gRPCurl

[gRPCurl](https://github.com/fullstorydev/grpcurl)（MacOSでは`brew install grpcurl`）は
gRPCサービスのテストに使用できる別の人気のあるツールです：

```bash
grpcurl -plaintext -d '{"name": "Alice"}' localhost:8090 greeter.Greeter/SayHello
```

### カスタムクライアント

生成されたクライアントコードを使用して**小さなGoクライアント**を作成することもできます。
例えば：

```go
package main

import (
    "context"
    "fmt"
    "log"

    gengreeter "grpcgreeter/gen/greeter"
    genclient "grpcgreeter/gen/grpc/greeter/client"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

func main() {
    // サーバーへの接続をセットアップ
    conn, err := grpc.Dial("localhost:8090", grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatalf("接続に失敗: %v", err)
    }
    defer conn.Close()

    // Goaの生成されたコードを使用してgRPCクライアントを作成
    grpcc := genclient.NewClient(conn)
    c := gengreeter.NewClient(grpcc.SayHello())

    // RPCコールを実行
    res, err := c.SayHello(context.Background(), &gengreeter.SayHelloPayload{"Alice"})
    if err != nil {
        log.Fatalf("SayHelloの呼び出しエラー: %v", err)
    }

    // レスポンスを出力
    fmt.Printf("サーバーレスポンス: %s\n", res.Greeting)
}
```

このクライアントをコンパイルして実行すると、サービスから返された挨拶が表示されるはずです。

---

以上です！これでGoaで構築された**実行中のgRPCサービス**ができ、公式のgRPC CLIまたは
カスタムGoクライアントを介してテストできます。DSLをさらに探索して、**ストリーミング**、
**認証インターセプター**、複数の環境用の**自動コード生成**などの機能を追加してください。
最小限のボイラープレートで**堅牢な**Goベースのマイクロサービスアーキテクチャへの道を
歩み始めました！ 