---
title: "サービスの実装"
linkTitle: "実装"
weight: 2
description: "コード生成、サービス実装、サーバーセットアップ、生成されたgRPCアーティファクトの理解を含む、GoaでのgRPCサービスの実装ガイド。"
---

GoaのDSLでgRPCサービスを設計した後は、それを実際に動作させる時です！このガイドでは、サービスの実装を段階的に説明します。以下の方法を学びます：

1. gRPCのスキャフォールディングを生成する
2. 生成されたコードの構造を理解する
3. サービスロジックを実装する
4. gRPCサーバーをセットアップする

## 1. gRPCアーティファクトの生成

まず、必要なgRPCコードをすべて生成しましょう。プロジェクトのルート（例：`grpcgreeter/`）から以下を実行します：

```bash
goa gen grpcgreeter/design
go mod tidy
```

このコマンドはgRPCの設計（`greeter.go`）を分析し、`gen/`ディレクトリに必要なコードを生成します。以下のものが作成されます：

```
gen/
├── grpc/
│   └── greeter/
│       ├── pb/           # Protocol Buffersの定義
│       ├── server/       # サーバーサイドのgRPCコード
│       └── client/       # クライアントサイドのgRPCコード
└── greeter/             # サービスインターフェースと型
```

{{< alert title="重要" >}}
設計を変更した場合は、必ず`goa gen`を再実行して、生成されたコードをサービス定義と同期させてください。
{{< /alert >}}

## 2. 生成されたコードの理解

Goaが生成したものを見ていきましょう：

### Protocol Buffer定義（gen/grpc/greeter/pb/）

- **`greeter.proto`**: Protocol Buffersのサービス定義
  ```protobuf
  service Greeter {
    rpc SayHello (SayHelloRequest) returns (SayHelloResponse);
  }
  ```
- **`greeter.pb.go`**: `.proto`ファイルからコンパイルされたGoコード

### サーバーサイドコード（gen/grpc/greeter/server/）

- **`server.go`**: サービスメソッドをgRPCハンドラーにマッピング
- **`encode_decode.go`**: サービスの型とgRPCメッセージ間の変換
- **`types.go`**: サーバー固有の型定義

### クライアントサイドコード（gen/grpc/greeter/client/）

- **`client.go`**: gRPCクライアントの実装
- **`encode_decode.go`**: クライアントサイドのシリアライゼーションロジック
- **`types.go`**: クライアント固有の型定義

## 3. サービスの実装

いよいよ楽しい部分 - サービスロジックの実装です！サービスパッケージに`greeter.go`という新しいファイルを作成します：

```go
package greeter

import (
    "context"
    "fmt"

    // 生成されたパッケージに説明的なエイリアスを使用
    gengreeter "grpcgreeter/gen/greeter"
)

// GreeterServiceはServiceインターフェースを実装します
type GreeterService struct{}

// NewGreeterServiceは新しいサービスインスタンスを作成します
func NewGreeterService() *GreeterService {
    return &GreeterService{}
}

// SayHelloは挨拶のロジックを実装します
func (s *GreeterService) SayHello(ctx context.Context, p *gengreeter.SayHelloPayload) (*gengreeter.SayHelloResult, error) {
    // 必要に応じて入力バリデーションを追加
    if p.Name == "" {
        return nil, fmt.Errorf("名前を空にすることはできません")
    }

    // 挨拶を構築
    greeting := fmt.Sprintf("こんにちは、%sさん！", p.Name)
    
    // 結果を返す
    return &gengreeter.SayHelloResult{
        Greeting: greeting,
    }, nil
}
```

### 実装のベストプラクティス

1. **エラー処理**: 適切なgRPCステータスコードを使用する
2. **バリデーション**: 早期に入力を検証する
3. **コンテキストの使用**: コンテキストのキャンセルを尊重する
4. **ロギング**: デバッグのための意味のあるログを追加する
5. **テスト**: サービスロジックのユニットテストを作成する

## 4. gRPCサーバーのセットアップ

`cmd/greeter/main.go`にサーバーのエントリーポイントを作成します：

```go
package main

import (
    "context"
    "log"
    "net"
    "os"
    "os/signal"
    "syscall"
    
    "grpcgreeter"
    gengreeter "grpcgreeter/gen/greeter"
    genpb "grpcgreeter/gen/grpc/greeter/pb"
    genserver "grpcgreeter/gen/grpc/greeter/server"
    
    "google.golang.org/grpc"
    "google.golang.org/grpc/reflection"
)

func main() {
    // TCPリスナーを作成
    lis, err := net.Listen("tcp", ":8090")
    if err != nil {
        log.Fatalf("リッスンに失敗しました: %v", err)
    }

    // オプション付きで新しいgRPCサーバーを作成
    srv := grpc.NewServer(
        grpc.UnaryInterceptor(loggingInterceptor),
    )

    // サービスを初期化
    svc := greeter.NewGreeterService()
    
    // エンドポイントを作成
    endpoints := gengreeter.NewEndpoints(svc)
    
    // gRPCサーバーにサービスを登録
    genpb.RegisterGreeterServer(srv, genserver.New(endpoints, nil))
    
    // デバッグツール用にサーバーリフレクションを有効化
    reflection.Register(srv)

    // グレースフルシャットダウンを処理
    go func() {
        sigCh := make(chan os.Signal, 1)
        signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
        <-sigCh
        log.Println("gRPCサーバーをシャットダウンしています...")
        srv.GracefulStop()
    }()

    // サービスを開始
    log.Printf("gRPCサーバーが:8090でリッスンしています")
    if err := srv.Serve(lis); err != nil {
        log.Fatalf("サービスの提供に失敗しました: %v", err)
    }
}

// ロギングインターセプターの例
func loggingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    log.Printf("%sを処理中", info.FullMethod)
    return handler(ctx, req)
}
```

### サーバーコードの理解

gRPCサーバーの主要なコンポーネントを見ていきましょう：

1. **TCPリスナーのセットアップ**:
   ```go
   lis, err := net.Listen("tcp", ":8090")
   ```
   gRPC接続用にポート8090を開きます。ここでサービスがクライアントリクエストをリッスンします。

2. **サーバーの作成**:
   ```go
   srv := grpc.NewServer(
       grpc.UnaryInterceptor(loggingInterceptor),
   )
   ```
   ミドルウェア（インターセプター）サポート付きの新しいgRPCサーバーを作成します。ロギングインターセプターは全ての受信リクエストをログに記録します。

3. **サービスの登録**:
   ```go
   svc := greeter.NewGreeterService()
   endpoints := gengreeter.NewEndpoints(svc)
   genpb.RegisterGreeterServer(srv, genserver.New(endpoints, nil))
   ```
   - サービス実装を作成
   - Goaのトランスポート非依存のエンドポイントでラップ
   - 受信リクエストを処理できるようgRPCサーバーに登録

4. **サーバーリフレクション**:
   ```go
   reflection.Register(srv)
   ```
   gRPCリフレクションを有効化し、`grpcurl`のようなツールがサービスメソッドを動的に発見できるようにします。

5. **グレースフルシャットダウン**:
   ```go
   go func() {
       sigCh := make(chan os.Signal, 1)
       signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
       <-sigCh
       srv.GracefulStop()
   }()
   ```
   - 割り込みシグナル（Ctrl+C）または終了リクエストをリッスン
   - シャットダウン前に実行中のリクエストの完了を保証
   - 接続の切断やデータ損失を防止

6. **リクエストロギング**:
   ```go
   func loggingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
       log.Printf("%sを処理中", info.FullMethod)
       return handler(ctx, req)
   }
   ```
   - サービスに到達する前に全てのgRPCコールをインターセプト
   - 呼び出されているメソッドをログに記録
   - デバッグとモニタリングに有用
   - メトリクス、認証、その他の横断的関心事のために拡張可能

### サーバーの機能

- **グレースフルシャットダウン**: 終了シグナルを適切に処理
- **ロギング**: 基本的なリクエストロギングインターセプターを含む
- **リフレクション**: `grpcurl`のようなツールがサービスを発見可能
- **エラー処理**: クライアントへの適切なエラー伝播
- **拡張性**: 認証、メトリクスなどのインターセプターを簡単に追加可能

## 5. ビルドと実行

1. **サービスをビルド**:
   ```bash
   go build -o greeter cmd/greeter/main.go
   ```

2. **サーバーを実行**:
   ```bash
   ./greeter
   ```

これでgRPCサービスが実行され、ポート8090で接続を受け付ける準備ができました！

## 次のステップ

サービスが実装され実行されたので、以下のことができます：

- [実行チュートリアル](../3-running)に進んでサービスをテストする
- メトリクスとモニタリングを追加する
- 追加のサービスメソッドを実装する
- 認証と認可を追加する
- CI/CDパイプラインをセットアップする

より高度なトピックについては、[gRPCの概念](../../4-concepts/4-grpc)セクションをチェックしてください。ストリーミング、ミドルウェア、エラー処理などについて説明しています。 