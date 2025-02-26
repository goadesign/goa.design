---
title: "実装"
linkTitle: "実装"
weight: 5
description: "サーバーとクライアントの実装を含む、Goaの生成コードを使用したgRPCサービスの実装方法を学ぶ"
---

このガイドでは、Goaが生成したコードを使用してgRPCサービスを実装する方法について説明します。完全なgRPCサービスの作成に関するステップバイステップのガイドについては、[gRPCサービスチュートリアル](../../3-tutorials/2-grpc-service/2-implementing)を参照してください。

## トランスポートの独立性

Goaの重要な特徴は、ビジネスロジックの実装がトランスポートプロトコルから独立していることです。`gen/service`で生成されるサービスインターフェースはプロトコルに依存しないため、以下が可能です：

1. トランスポートの詳細を気にすることなく、コアビジネスロジックの実装に集中できる
2. 同じサービス実装で複数のトランスポート（gRPC、HTTPなど）をサポートできる
3. トランスポートの懸念事項から切り離してビジネスロジックをテストできる

トランスポート固有のコード（この場合はgRPC）は別個に生成され、サービス実装を特定のプロトコル要件に適応させます。

## コード生成の概要

`goa gen`を実行すると、Goaは以下のコンポーネントを生成します：

```
gen/
├── grpc/
│   ├── pb/                   # Protocol Buffer生成コード
│   │   └── service.pb.go
│   ├── client/              # gRPCクライアントコード
│   │   └── client.go
│   └── server/              # gRPCサーバーコード
│       └── server.go
└── service/                 # サービスインターフェースと型
    └── service.go
```

これらのコンポーネントの生成と理解に関する詳細な手順については、[サービスの実装](../../3-tutorials/2-grpc-service/2-implementing/#1-generate-the-grpc-artifacts)チュートリアルのセクションを参照してください。

## gRPC固有の機能

### ストリーミング

gRPCはサーバーサイド、クライアントサイド、双方向ストリーミングをサポートしています。Goaでのストリーミングの実装に関する詳細情報、例、ベストプラクティスについては、専用の[ストリーミング](../3-streaming)ガイドを参照してください。

## ベストプラクティス

### エラー処理

gRPC固有のエラーコードを使用し、意味のあるメタデータを含めます：

```go
import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

func (s *calculator) Divide(ctx context.Context, p *calc.DividePayload) (*calc.DivideResult, error) {
    if p.Divisor == 0 {
        return nil, status.Error(codes.InvalidArgument, "ゼロによる除算")
    }
    
    quotient := float64(p.Dividend) / float64(p.Divisor)
    return &calc.DivideResult{Quotient: quotient}, nil
}
```

### コンテキストの使用

gRPCコンテキストのキャンセルとタイムアウトを処理します：

```go
func (s *calculator) LongOperation(ctx context.Context, p *calc.LongOperationPayload) (*calc.LongOperationResult, error) {
    select {
    case <-ctx.Done():
        return nil, status.Error(codes.Canceled, "操作がキャンセルされました")
    case result := <-s.processAsync(p):
        return result, nil
    }
}
```

### リソース管理

gRPC接続とリソースを適切に管理します：

```go
type grpcServer struct {
    server *grpc.Server
    lis    net.Listener
}

func NewGRPCServer(svc calc.Service) (*grpcServer, error) {
    srv := grpc.NewServer()
    calcsvr.Register(srv, svc)
    
    lis, err := net.Listen("tcp", ":8080")
    if err != nil {
        return nil, err
    }
    
    return &grpcServer{
        server: srv,
        lis:    lis,
    }, nil
}

func (s *grpcServer) Start() error {
    return s.server.Serve(s.lis)
}

func (s *grpcServer) Stop() {
    s.server.GracefulStop()
    s.lis.Close()
}
```

適切なエラー処理、ロギング、グレースフルシャットダウンを備えたgRPCサーバーのセットアップの完全な例については、チュートリアルの[サーバーのセットアップ](../../3-tutorials/2-grpc-service/2-implementing/#4-setting-up-the-grpc-server)セクションを参照してください。 