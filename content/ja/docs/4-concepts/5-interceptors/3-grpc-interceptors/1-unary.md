---
title: ユナリーインターセプター
weight: 1
description: >
  実践的な一般的パターンの例を通じて、GoaサービスのユナリーgRPCインターセプターの実装方法を学びます。
---

# ユナリーgRPCインターセプター

ユナリーインターセプターは、gRPCサービスにおける単一のリクエスト/レスポンスRPCを処理します。
これらは、メタデータの処理、ロギング、モニタリングなどのプロトコルレベルの関心事に理想的です。
このガイドでは、Goaサービスのための効果的なユナリーインターセプターの実装方法を説明します。

## 基本構造

ユナリーインターセプターは以下のパターンに従います：

```go
func UnaryInterceptor(ctx context.Context,
    req any,
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler) (any, error) {
    
    // 1. ハンドラー前の操作
    // - メタデータの抽出
    // - プロトコル要件の検証
    // - タイミングの開始
    
    // 2. ハンドラーの呼び出し
    resp, err := handler(ctx, req)
    
    // 3. ハンドラー後の操作
    // - メトリクスの記録
    // - エラーの変換
    // - レスポンスメタデータの追加
    
    return resp, err
}
```

この構造により以下が可能になります：
- ハンドラーに到達する前のリクエストの処理
- ハンドラー実行後のレスポンスの変更または記録
- プロトコルレベルでのエラー処理
- gRPC固有のメタデータとコンテキストの管理

## 一般的なパターン

### 1. メタデータの処理

このインターセプターは適切なメタデータの伝播を示します：

```go
func MetadataInterceptor(ctx context.Context,
    req any,
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler) (any, error) {
    
    // 受信メタデータの抽出
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        md = metadata.New(nil)
    }
    
    // メタデータの追加または変更
    requestID := md.Get("x-request-id")
    if len(requestID) == 0 {
        requestID = []string{uuid.New().String()}
        md = metadata.Join(md, metadata.Pairs("x-request-id", requestID[0]))
    }
    
    // メタデータ付きの新しいコンテキストを作成
    ctx = metadata.NewIncomingContext(ctx, md)
    
    // ハンドラーを呼び出し
    resp, err := handler(ctx, req)
    
    // レスポンスにメタデータを追加
    header := metadata.Pairs("x-request-id", requestID[0])
    grpc.SetHeader(ctx, header)
    
    return resp, err
}
```

この例はいくつかの重要なメタデータ処理機能を示しています。受信リクエストからメタデータを
抽出して検証し、必要な値が存在することを確認する方法を示しています。リクエストIDなどの値が
欠けている場合、トレーサビリティを維持するために新しい値を生成します。インターセプターは
コンテキストを通じてメタデータを適切に伝播し、下流のハンドラーで利用できるようにします。
最後に、リクエストのエンドツーエンドの追跡を可能にするために、レスポンスに関連する
メタデータを追加します。

### 2. モニタリング

このインターセプターはRPCメトリクスを収集します：

```go
func MonitoringInterceptor(ctx context.Context,
    req any,
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler) (any, error) {
    
    start := time.Now()
    
    // 呼び出し元の情報を抽出
    peer, _ := peer.FromContext(ctx)
    method := info.FullMethod
    
    // ハンドラーを呼び出し
    resp, err := handler(ctx, req)
    
    // メトリクスを記録
    duration := time.Since(start)
    status := status.Code(err)
    
    metrics.RecordRPCMetrics(method, peer.Addr.String(), status, duration)
    
    return resp, err
}
```

このパターンはいくつかの重要なモニタリング機能を示しています。ハンドラー呼び出しの前後で
タイムスタンプを取得することで、RPC実行時間を正確に測定します。インターセプターは
コンテキストから重要な呼び出し元の情報を抽出し、どのクライアントがリクエストを行っているかを
追跡できるようにします。モニタリングとアラートに使用できる標準化されたメトリクスを記録します。
最後に、エラーステータスコードを適切に処理し、失敗がメトリクスに正確に記録されることを
保証します。

### 3. プロトコルエラー処理

サービスメソッドの外部で発生するプロトコルレベルのエラーを処理します：

```go
func ProtocolErrorInterceptor(ctx context.Context,
    req any,
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler) (any, error) {
    
    // コンテキストエラーを処理
    if err := ctx.Err(); err != nil {
        switch err {
        case context.DeadlineExceeded:
            return nil, status.Error(codes.DeadlineExceeded, "リクエストタイムアウト")
        case context.Canceled:
            return nil, status.Error(codes.Canceled, "リクエストがキャンセルされました")
        }
    }
    
    // ハンドラーを呼び出し（Goaは設計エラーのgRPCコードへのマッピングを処理）
    resp, err := handler(ctx, req)
    if err != nil {
        return nil, err
    }
    
    // プロトコル固有の検証を処理
    if err := validateProtocolRequirements(resp); err != nil {
        return nil, status.Error(codes.FailedPrecondition, err.Error())
    }
    
    return resp, nil
}
```

この例は、gRPCインターセプターにおけるプロトコルエラー処理のいくつかの重要な側面を示して
います。RPC呼び出し中に発生する可能性のあるタイムアウトやキャンセルなどのプロトコル固有の
エラーを適切に処理する方法を示しています。インターセプターは、設計エラーに対するGoaの
組み込みエラーマッピング機能を保持しながら、プロトコルレベルの検証を追加します。また、
プロトコルレベルの問題が発生した場合に適切なgRPCステータスコードが使用されることを保証し、
gRPCのベストプラクティスとの一貫性を維持します。

## テスト

gRPCインターセプターのテストでは、gRPCコンテキスト、メタデータ処理、エラー伝播を慎重に
考慮する必要があります。以下は、Clueのモックパッケージを使用してインターセプターを効果的に
テストする方法です：

```go
// テスト用のモック実装
type mockUnaryHandler struct {
    *mock.Mock
}

func newMockUnaryHandler(t *testing.T) *mockUnaryHandler {
    return &mockUnaryHandler{mock.New()}
}

func (m *mockUnaryHandler) Handle(ctx context.Context, req interface{}) (interface{}, error) {
    if f := m.Next("Handle"); f != nil {
        return f.(func(context.Context, interface{}) (interface{}, error))(ctx, req)
    }
    return nil, nil
}

func TestMetadataInterceptor(t *testing.T) {
    tests := []struct {
        name        string
        setup       func(context.Context, *mockUnaryHandler)
        incomingMD  metadata.MD
        wantReqID   bool
        wantErr     bool
    }{
        {
            name: "リクエストIDが欠けている場合に追加",
            setup: func(ctx context.Context, h *mockUnaryHandler) {
                h.Set("Handle", func(ctx context.Context, req interface{}) (interface{}, error) {
                    md, ok := metadata.FromIncomingContext(ctx)
                    if !ok {
                        return nil, fmt.Errorf("コンテキストにメタデータがありません")
                    }
                    if ids := md.Get("x-request-id"); len(ids) == 0 {
                        return nil, fmt.Errorf("リクエストIDが追加されていません")
                    }
                    return "テストレスポンス", nil
                })
            },
            incomingMD: metadata.New(nil),
            wantReqID:  true,
            wantErr:    false,
        },
        {
            name: "既存のリクエストIDを保持",
            setup: func(ctx context.Context, h *mockUnaryHandler) {
                h.Set("Handle", func(ctx context.Context, req interface{}) (interface{}, error) {
                    md, _ := metadata.FromIncomingContext(ctx)
                    ids := md.Get("x-request-id")
                    if len(ids) != 1 || ids[0] != "test-id" {
                        return nil, fmt.Errorf("リクエストIDが保持されていません")
                    }
                    return "テストレスポンス", nil
                })
            },
            incomingMD: metadata.Pairs("x-request-id", "test-id"),
            wantReqID:  true,
            wantErr:    false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // メタデータ付きのテストコンテキストを作成
            ctx := metadata.NewIncomingContext(context.Background(), tt.incomingMD)
            
            // モックハンドラーを作成
            handler := newMockUnaryHandler(t)
            if tt.setup != nil {
                tt.setup(ctx, handler)
            }
            
            // インターセプターをテスト
            resp, err := MetadataInterceptor(ctx, "テストリクエスト", &grpc.UnaryServerInfo{
                FullMethod: "/test.Service/TestMethod",
            }, handler.Handle)
            
            // 結果を検証
            if (err != nil) != tt.wantErr {
                t.Errorf("エラー = %v, wantErr = %v", err, tt.wantErr)
            }
            
            if tt.wantReqID {
                md, ok := metadata.FromIncomingContext(ctx)
                if !ok || len(md.Get("x-request-id")) == 0 {
                    t.Error("リクエストIDが見つかりません")
                }
            }
        })
    }
}
``` 