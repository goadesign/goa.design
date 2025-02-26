---
title: ストリームインターセプター
weight: 2
description: >
  実践的な一般的パターンの例を通じて、GoaサービスのストリーミングgRPCインターセプターの実装方法を学びます。
---

# ストリームgRPCインターセプター

ストリームインターセプターは、gRPCサービスにおけるストリーミングRPCを処理します。これらは、
クライアント、サーバー、または両方が単一の接続を通じて複数のメッセージを送信する場合に
使用されます。このガイドでは、Goaサービスのための効果的なストリームインターセプターの
実装方法を説明します。

## 基本構造

ストリームインターセプターは以下のパターンに従います：

```go
func StreamInterceptor(srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler) error {
    
    // 1. ストリーム前の操作
    // - メタデータの抽出
    // - プロトコル要件の検証
    // - ストリーム状態の初期化
    
    // 2. モニタリング用にストリームをラップ
    wrappedStream := &wrappedServerStream{
        ServerStream: ss,
        // ストリーム状態を追跡するためのフィールドを追加
    }
    
    // 3. ストリームを処理
    err := handler(srv, wrappedStream)
    
    // 4. ストリーム後の操作
    // - メトリクスの記録
    // - リソースのクリーンアップ
    // - エラーの処理
    
    return err
}
```

この構造により以下が可能になります：
- ストリーム全体のコンテキストと状態の設定
- メッセージフローの監視
- ストリームライフサイクルイベントの処理
- ストリーム固有のリソースの管理

## ストリームラッパー

gRPCサーバーストリームインターフェースは基本的なメッセージ処理機能を提供しますが、
インターセプターは元のストリームを変更せずに機能を追加する必要がよくあります。
ここでストリームラッパーが不可欠になります。ストリームラッパーは`grpc.ServerStream`
インターフェースを実装し、コンポジションを通じてカスタム動作を追加します。

以下は標準的な実装パターンです：

```go
type wrappedServerStream struct {
    grpc.ServerStream                // 元のインターフェースを埋め込み
    msgCount   int64                 // メッセージ数を追跡
    startTime  time.Time             // ストリーム期間を追跡
    method     string                // RPCメソッド名を保存
}

func (w *wrappedServerStream) SendMsg(m interface{}) error {
    err := w.ServerStream.SendMsg(m)
    if err == nil {
        atomic.AddInt64(&w.msgCount, 1)  // スレッドセーフなカウンター
    }
    return err
}

func (w *wrappedServerStream) RecvMsg(m interface{}) error {
    err := w.ServerStream.RecvMsg(m)
    if err == nil {
        atomic.AddInt64(&w.msgCount, 1)  // 受信メッセージも追跡
    }
    return err
}
```

このラッパーパターンはいくつかの重要な目的を果たします：

1. **メッセージ追跡**：ラッパーは送受信されるすべてのメッセージを傍受し、以下を
   可能にします：
   - 処理されたメッセージの総数のカウント
   - レート制限の実装
   - メッセージサイズまたは内容のログ記録
   - 変換の適用

2. **状態管理**：ラッパーはストリーム固有の状態を維持します：
   - タイミング情報の追跡
   - ストリームメタデータの保存
   - リソース使用量の管理
   - 複数のゴルーチンの調整

3. **エラー処理**：ラッパーは以下によってエラー処理を強化できます：
   - エラーへのコンテキストの追加
   - リトライロジックの実装
   - エラーメトリクスの記録
   - リソースのクリーンアップ

以下は、本番環境で一般的に必要とされる機能を追加したより高度なラッパーの例です：

```go
type enhancedServerStream struct {
    grpc.ServerStream
    ctx       context.Context    // 強化されたコンテキスト
    method    string            // RPCメソッド名
    startTime time.Time         // ストリーム開始時間
    msgCount  int64            // メッセージカウンター
    msgSize   int64            // 処理された総バイト数
    metadata  metadata.MD       // キャッシュされたメタデータ
    mu        sync.RWMutex      // 並行アクセスの保護
    logger    *zap.Logger       // 構造化ロギング
}

func newEnhancedServerStream(ss grpc.ServerStream, method string) *enhancedServerStream {
    return &enhancedServerStream{
        ServerStream: ss,
        ctx:         ss.Context(),
        method:      method,
        startTime:   time.Now(),
        metadata:    metadata.MD{},
        logger:      zap.L().With(zap.String("method", method)),
    }
}

func (s *enhancedServerStream) Context() context.Context {
    return s.ctx
}

func (s *enhancedServerStream) SendMsg(m interface{}) error {
    // 送信前の処理
    msgSize := proto.Size(m.(proto.Message))
    
    s.mu.Lock()
    s.msgSize += int64(msgSize)
    s.mu.Unlock()
    
    // 大きなメッセージをログ
    if msgSize > maxMessageSize {
        s.logger.Warn("大きなメッセージを検出",
            zap.Int("size", msgSize))
    }
    
    // タイミング付きで送信
    start := time.Now()
    err := s.ServerStream.SendMsg(m)
    duration := time.Since(start)
    
    // 送信後の処理
    if err == nil {
        atomic.AddInt64(&s.msgCount, 1)
        metrics.RecordMessageMetrics(s.method, "send",
            msgSize, duration)
    } else {
        s.logger.Error("送信失敗",
            zap.Error(err))
    }
    
    return err
}

func (s *enhancedServerStream) RecvMsg(m interface{}) error {
    // 受信も同様のパターンで強化...
}

func (s *enhancedServerStream) Stats() StreamStats {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    return StreamStats{
        Method:      s.method,
        Duration:    time.Since(s.startTime),
        MessageCount: atomic.LoadInt64(&s.msgCount),
        TotalBytes:   s.msgSize,
    }
}
```

この強化されたラッパーはいくつかの本番環境対応の機能を示しています：

1. **メトリクス収集**：ラッパーは以下を自動的に記録します：
   - メッセージ数とサイズ
   - 処理時間
   - エラー率
   - カスタムビジネスメトリクス

2. **ロギング統合**：以下を含む構造化ロギングを提供します：
   - メソッドレベルのコンテキスト
   - サイズ警告
   - エラー詳細
   - タイミング情報

3. **リソース追跡**：ラッパーは以下を維持します：
   - 処理された総バイト数
   - ストリーム期間
   - メッセージ統計
   - リソース使用パターン

4. **スレッドセーフ**：以下を通じて並行アクセスを適切に処理します：
   - カウンター用のアトミック操作
   - 共有状態のミューテックス保護
   - 安全なコンテキスト管理
   - スレッドセーフなロギング

これらのラッパーは以下のようにインターセプターで使用できます：

```go
func StreamInterceptor(srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler) error {
    
    // 強化されたストリームを作成
    ws := newEnhancedServerStream(ss, info.FullMethod)
    
    // ハンドラーでラッパーを使用
    err := handler(srv, ws)
    
    // 最終統計を記録
    stats := ws.Stats()
    metrics.RecordStreamStats(stats)
    
    return err
}
```

これらのラッパーパターンはgRPCサービスでは標準的な実践であり、多くの本番システムで
同様の実装が見られます。追加する具体的な強化はサービスの要件によって異なりますが、
機能を追加するためにストリームをラップするという基本的なパターンは一貫しています。

## 一般的なパターン

### 1. ストリームモニタリング

ストリーミングRPCのパフォーマンスと動作を監視します：

```go
func MonitoringStreamInterceptor(srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler) error {
    
    // モニタリング用のラッパーを作成
    ws := &monitoredServerStream{
        ServerStream: ss,
        startTime:   time.Now(),
        method:      info.FullMethod,
    }
    
    // ストリームを処理
    err := handler(srv, ws)
    
    // メトリクスを記録
    duration := time.Since(ws.startTime)
    metrics.RecordStreamMetrics(
        ws.method,
        ws.MessageCount(),
        ws.BytesProcessed(),
        duration,
        err,
    )
    
    return err
}
```

このパターンは以下を可能にします：
- ストリーム期間の測定
- メッセージスループットの追跡
- エラー率の監視
- リソース使用量の分析

### 2. レート制限

ストリーミングRPCのレートを制御します：

```go
func RateLimitStreamInterceptor(limit rate.Limit) grpc.StreamServerInterceptor {
    limiter := rate.NewLimiter(limit, 1)
    
    return func(srv interface{},
        ss grpc.ServerStream,
        info *grpc.StreamServerInfo,
        handler grpc.StreamHandler) error {
        
        // レート制限付きのラッパーを作成
        ws := &rateLimitedServerStream{
            ServerStream: ss,
            limiter:     limiter,
        }
        
        return handler(srv, ws)
    }
}

type rateLimitedServerStream struct {
    grpc.ServerStream
    limiter *rate.Limiter
}

func (s *rateLimitedServerStream) SendMsg(m interface{}) error {
    if err := s.limiter.Wait(s.Context()); err != nil {
        return status.Error(codes.ResourceExhausted, "レート制限を超過")
    }
    return s.ServerStream.SendMsg(m)
}

func (s *rateLimitedServerStream) RecvMsg(m interface{}) error {
    if err := s.limiter.Wait(s.Context()); err != nil {
        return status.Error(codes.ResourceExhausted, "レート制限を超過")
    }
    return s.ServerStream.RecvMsg(m)
}
```

このパターンは以下を提供します：
- メッセージレベルのレート制限
- バックプレッシャーの制御
- リソース保護
- 公平な帯域幅分配

### 3. エラー処理

ストリーミングRPCのエラーを適切に処理します：

```go
func ErrorHandlingStreamInterceptor(srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler) error {
    
    // エラー処理付きのラッパーを作成
    ws := &errorHandlingServerStream{
        ServerStream: ss,
        method:      info.FullMethod,
    }
    
    // パニックをキャッチ
    defer func() {
        if r := recover(); r != nil {
            log.Printf("ストリーム処理でパニック: %v", r)
            metrics.RecordStreamPanic(ws.method)
        }
    }()
    
    // ストリームを処理
    err := handler(srv, ws)
    
    // エラーを変換
    if err != nil {
        if _, ok := status.FromError(err); !ok {
            // 不明なエラーをgRPCステータスに変換
            err = status.Error(codes.Internal, "内部ストリームエラー")
        }
        // エラーメトリクスを記録
        metrics.RecordStreamError(ws.method, err)
    }
    
    return err
}
```

このパターンは以下を保証します：
- 一貫したエラー報告
- パニックからの回復
- エラーメトリクスの収集
- 適切なgRPCステータスコードの使用

## テスト

ストリームインターセプターのテストには、ストリームライフサイクル、メッセージフロー、
エラー条件の考慮が必要です：

```go
func TestMonitoringStreamInterceptor(t *testing.T) {
    tests := []struct {
        name          string
        messageCount  int
        wantDuration bool
        wantErr      bool
    }{
        {
            name:         "正常なストリーム",
            messageCount: 5,
            wantDuration: true,
            wantErr:     false,
        },
        {
            name:         "エラーのあるストリーム",
            messageCount: 2,
            wantDuration: true,
            wantErr:     true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // モックストリームを設定
            ms := newMockServerStream()
            
            // テストハンドラー
            handler := func(srv interface{}, stream grpc.ServerStream) error {
                for i := 0; i < tt.messageCount; i++ {
                    if err := stream.SendMsg(fmt.Sprintf("msg-%d", i)); err != nil {
                        return err
                    }
                }
                if tt.wantErr {
                    return status.Error(codes.Internal, "テストエラー")
                }
                return nil
            }
            
            // インターセプターをテスト
            err := MonitoringStreamInterceptor(nil, ms,
                &grpc.StreamServerInfo{FullMethod: "/test.Service/TestStream"},
                handler)
            
            // 結果を検証
            if (err != nil) != tt.wantErr {
                t.Errorf("エラー = %v, wantErr = %v", err, tt.wantErr)
            }
            
            // メトリクスを検証
            metrics := getRecordedMetrics()
            if tt.wantDuration && metrics.Duration <= 0 {
                t.Error("期間が記録されていません")
            }
            if got := metrics.MessageCount; got != tt.messageCount {
                t.Errorf("メッセージ数 = %v, want %v", got, tt.messageCount)
            }
        })
    }
}
```

このテストパターンは以下を検証します：
- メッセージ処理の正確性
- メトリクス収集
- エラー処理
- タイミング測定 