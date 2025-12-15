---
title: "Model"
weight: 1
description: "C4 モデルを用いたアーキテクチャ図をコードとして管理 — バージョン管理され、自動生成でき、インタラクティブに編集できます。"
llm_optimized: true
---

Model は、[C4 model](https://c4model.com) に従ってソフトウェアアーキテクチャを記述するための Go DSL を提供します。アーキテクチャをコードで定義し、ソフトウェアと一緒にバージョン管理し、図を自動生成できます。

## なぜ「コードとしての図」なのか？

従来のアーキテクチャ図は陳腐化しがちです。GUI ツールで作られ、コードベースと切り離され、すぐに実態と乖離してしまいます。Model は、アーキテクチャをリポジトリの第一級の成果物にすることで、これを解決します：

- **バージョン管理**: アーキテクチャの変更は git コミットとして履歴が残る
- **一貫性**: 図全体でスタイルとコンポーネントを共有できる
- **自動化**: CI/CD で図を生成でき、手作業のスクリーンショットが不要
- **合成可能**: Go パッケージとして部品を共有し、プロジェクト間で再利用できる
- **レビュー可能**: 他のコードと同様にコードレビューの対象にできる

---

## C4 モデル

C4 は 4 つの抽象度レベルを定義します。Model は最初の 3 つをサポートします：

| レベル | 表すもの | 例 |
|-------|---------------|------------------|
| **コンテキスト** | 環境の中のシステム | ソフトウェアシステム、人 |
| **コンテナ** | システム内のアプリケーション | Web アプリ、API、データベース、メッセージキュー |
| **コンポーネント** | コンテナ内のモジュール | サービス、コントローラ、リポジトリ |

第 4 レベル（Code）は実際のクラスや関数に対応します。そこは IDE がすでに示してくれます。

---

## インストール

```bash
go install goa.design/model/cmd/mdl@latest
go install goa.design/model/cmd/stz@latest
```

Go 1.23+ が必要です。

---

## クイックスタート

### 1. Model パッケージを作成する

```go
// model/model.go
package model

import . "goa.design/model/dsl"

var _ = Design("My System", "A description of the overall design", func() {
    // Define elements
    var System = SoftwareSystem("My System", "Does useful things", func() {
        Tag("primary")
    })
    
    Person("User", "Someone who uses the system", func() {
        Uses(System, "Uses")
        Tag("external")
    })
    
    // Define views
    Views(func() {
        SystemContextView(System, "Context", "Shows the system in context", func() {
            AddAll()
            AutoLayout(RankLeftRight)
        })
        
        Styles(func() {
            ElementStyle("primary", func() {
                Background("#1168bd")
                Color("#ffffff")
            })
            ElementStyle("external", func() {
                Shape(ShapePerson)
                Background("#08427b")
                Color("#ffffff")
            })
        })
    })
})
```

### 2. エディタを起動する

```bash
mdl serve ./model -dir gen
```

`http://localhost:8080` を開きます。要素をドラッグして位置を調整し、保存します。SVG は `gen/` ディレクトリに書き出されます。

### 3. CI で図を生成する

```bash
mdl svg ./model -dir gen --all
```

ヘッドレスブラウザを起動して自動レイアウトを行い、すべてのビューを SVG ファイルとして保存します。

---

## コアコンセプト

### 要素の階層

Model は C4 の階層に従います。要素は親の中にネストします：

```
Design
├── Person (top-level)
├── SoftwareSystem (top-level)
│   └── Container
│       └── Component
└── DeploymentEnvironment
    └── DeploymentNode
        ├── InfrastructureNode
        ├── ContainerInstance
        └── DeploymentNode (nested)
```

### 要素の参照

多くの DSL 関数は要素の参照を受け取ります。参照の方法は 2 つあります：

**変数で参照**（参照を持っている場合）:

```go
var API = Container("API", "Backend service", "Go")
var DB = Container("Database", "Stores data", "PostgreSQL")

// Reference by variable
API.Uses(DB, "Reads from", "SQL")
```

**パスで参照**（要素が別の場所で定義されている場合）:

```go
// Same container, reference sibling by name
Uses("Database", "Reads from", "SQL")

// Different software system, use full path
Uses("Other System/API", "Calls")

// Component in another container
Uses("My System/Other Container/Service", "Invokes")
```

パスの区切りは `/` です。相対パスはスコープ内で機能します（同一システム内のコンテナ、同一コンテナ内のコンポーネントなど）。

### 要素のマージ

同じ要素を 2 回定義すると（同じ階層で同名）、Model はそれらをマージします：

```go
var User = Person("User", "First definition", func() {
    Uses("System A", "Uses")
})

var User2 = Person("User", "Updated description", func() {
    Uses("System B", "Also uses")
})
// Result: One "User" person with "Updated description" and both relationships
```

これにより、共有モデルをインポートしつつ、ローカルな関係を追加して拡張できます。

---

## ソフトウェアシステム

デプロイ可能なソフトウェアシステムを表すトップレベル要素：

```go
var ECommerce = SoftwareSystem("E-Commerce", "Online shopping platform", func() {
    // Mark as external to the enterprise
    External()
    
    // Documentation link
    URL("https://docs.example.com/ecommerce")
    
    // Custom metadata
    Prop("owner", "Platform Team")
    Prop("tier", "1")
    
    // Tags for styling
    Tag("critical", "public-facing")
})
```

### コンテナ

ソフトウェアシステム内のアプリケーション、サービス、またはデータストア：

```go
var _ = SoftwareSystem("E-Commerce", "Online store", func() {
    var WebApp = Container("Web Application", "Customer UI", "React", func() {
        Tag("frontend")
    })
    
    var API = Container("API", "Backend REST API", "Go/Goa", func() {
        Tag("backend")
        URL("https://api.example.com")
    })
    
    var Database = Container("Database", "Order and product data", "PostgreSQL", func() {
        Tag("database")
    })
    
    var Queue = Container("Message Queue", "Async processing", "RabbitMQ", func() {
        Tag("infrastructure")
    })
    
    // Relationships between containers
    WebApp.Uses(API, "Makes requests to", "HTTPS/JSON")
    API.Uses(Database, "Reads/writes", "SQL")
    API.Uses(Queue, "Publishes events to", "AMQP")
})
```

Goa では、サービス定義をそのまま使えます：

```go
// Goa service definition
var OrdersService = Service("orders", func() { /* ... */ })

// Use it as a container
var _ = SoftwareSystem("E-Commerce", func() {
    Container(OrdersService, func() {
        // Name, description, and "Go and Goa v3" technology come from the service
        Tag("api")
    })
})
```

### コンポーネント

コンテナ内のモジュール。技術的な詳細ドキュメントに使います：

```go
var _ = Container("API", "Backend API", "Go", func() {
    var OrderService = Component("Order Service", "Handles order lifecycle", "Go package")
    var PaymentService = Component("Payment Service", "Processes payments", "Go package")
    var NotificationService = Component("Notification Service", "Sends emails/SMS", "Go package")
    
    OrderService.Uses(PaymentService, "Calls for payment")
    OrderService.Uses(NotificationService, "Triggers confirmations")
    PaymentService.Uses("Stripe/API", "Processes cards via", "HTTPS")
})
```

---

## 人（Person）

システムとやり取りするユーザー、アクター、ロール：

```go
var Customer = Person("Customer", "A customer placing orders", func() {
    External()  // Outside the enterprise
    Tag("user")
    Uses("E-Commerce", "Places orders using", "HTTPS")
})

var Admin = Person("Administrator", "Manages the platform", func() {
    // Internal by default
    Tag("internal")
    Uses("E-Commerce/Admin Portal", "Manages products via")
})

var Support = Person("Support Agent", "Handles customer issues", func() {
    InteractsWith(Customer, "Helps")  // Person-to-person relationship
    Uses("E-Commerce/Support Tools", "Uses")
})
```

---

## 関係（Relationship）

### 種類

| 関数 | From | To | 用途 |
|----------|------|----|---------| 
| `Uses` | 任意の要素 | 任意の要素 | 一般的な依存関係 |
| `Delivers` | System/Container/Component | Person | ユーザーへの出力 |
| `InteractsWith` | Person | Person | 人同士の相互作用 |

### 構文

すべての関係関数は、同じオプション引数を受け取ります：

```go
// Minimal
Uses(Target, "description")

// With technology
Uses(Target, "description", "technology")

// With interaction style
Uses(Target, "description", Synchronous)  // or Asynchronous

// With technology and style
Uses(Target, "description", "technology", Synchronous)

// With properties
Uses(Target, "description", "technology", func() {
    Tag("async")
})
```

### 例

```go
// System uses system
PaymentSystem.Uses(BankAPI, "Processes payments via", "REST/JSON", Synchronous)

// Container uses external system
API.Uses("Stripe/API", "Charges cards", "HTTPS", Asynchronous)

// System delivers to person
NotificationSystem.Delivers(Customer, "Sends order updates to", "Email")
```

---

## ビュー（View）

ビューは、モデルの一部を異なる詳細度でレンダリングします。

### System Landscape View

すべてのシステムと人を表示（全体像）：

```go
SystemLandscapeView("Landscape", "Enterprise overview", func() {
    Title("Company Systems")
    AddAll()
    AutoLayout(RankTopBottom)
    EnterpriseBoundaryVisible()  // Shows internal vs external
})
```

### System Context View

特定のシステムと、その直接の依存関係を表示：

```go
SystemContextView(ECommerce, "Context", "E-Commerce in context", func() {
    AddAll()                      // Add system + all related elements
    Remove(InternalTooling)       // Exclude specific elements
    AutoLayout(RankLeftRight)
    EnterpriseBoundaryVisible()
})
```

### Container View

システム内のコンテナを表示：

```go
ContainerView(ECommerce, "Containers", "E-Commerce containers", func() {
    AddAll()
    SystemBoundariesVisible()  // Shows external system boundaries
    AutoLayout(RankTopBottom)
})
```

### Component View

コンテナ内のコンポーネントを表示：

```go
ComponentView(API, "Components", "API internals", func() {
    AddAll()
    ContainerBoundariesVisible()  // Shows external container boundaries
    AutoLayout(RankLeftRight)
})
```

### Dynamic View

特定のフローやシナリオを、順序付きの相互作用として表示：

```go
DynamicView(ECommerce, "OrderFlow", "Order placement flow", func() {
    Title("Customer places an order")
    
    Link(Customer, WebApp, func() {
        Description("1. Submits order")
        Order("1")
    })
    Link(WebApp, API, func() {
        Description("2. Creates order")
        Order("2")
    })
    Link(API, PaymentService, func() {
        Description("3. Processes payment")
        Order("3")
    })
    Link(API, Database, func() {
        Description("4. Saves order")
        Order("4")
    })
    
    AutoLayout(RankLeftRight)
})
```

スコープは `Global`（任意の要素）、ソフトウェアシステム（そのコンテナ）、またはコンテナ（そのコンポーネント）を指定できます。

### Deployment View

コンテナがインフラ上にどのようにデプロイされるかを表示：

```go
DeploymentView(Global, "Production", "ProdDeployment", "Production setup", func() {
    AddAll()
    AutoLayout(RankLeftRight)
})
```

### Filtered View

タグに基づいて別のビューをフィルタしたバージョンを作成：

```go
// Base view
SystemContextView(System, "AllContext", "Everything", func() {
    AddAll()
})

// Filtered to show only external elements
FilteredView("AllContext", func() {
    FilterTag("external")
})

// Filtered to exclude infrastructure
FilteredView("AllContext", func() {
    FilterTag("infrastructure")
    Exclude()
})
```

---

## ビュー操作

### 要素を追加する

| 関数 | 挙動 |
|----------|----------|
| `AddAll()` | スコープ内のすべてを追加する |
| `AddDefault()` | 文脈上、妥当な要素を追加する |
| `Add(element)` | 特定の要素を追加する |
| `AddNeighbors(element)` | 要素とその直接の接続先を追加する |
| `AddContainers()` | すべてのコンテナを追加する（ContainerView/ComponentView） |
| `AddComponents()` | すべてのコンポーネントを追加する（ComponentView） |
| `AddInfluencers()` | コンテナ + 外部依存を追加する（ContainerView） |

**AddAll と AddDefault の違い**: `AddAll` はスコープ内で可能な限りすべてを追加します。`AddDefault` は典型的に関連性のあるものを追加します（SystemContextView なら、システムと直接関係するシステム・人であり、無関係な要素は含めません）。

### 要素を削除する

```go
SystemContextView(System, "key", "desc", func() {
    AddAll()
    Remove(InternalTool)              // Remove specific element
    RemoveTagged("internal")          // Remove by tag
    RemoveUnrelated()                 // Remove elements with no relationships
    RemoveUnreachable(MainSystem)     // Remove elements not reachable from MainSystem
})
```

### 関係を管理する

```go
// Explicitly add a relationship
Link(Source, Destination, func() {
    Vertices(100, 200, 100, 400)  // Waypoints for line routing
    Routing(RoutingOrthogonal)    // RoutingDirect, RoutingCurved, RoutingOrthogonal
    Position(50)                  // Label position (0-100 along line)
})

// Remove a relationship
Unlink(Source, Destination)
Unlink(Source, Destination, "specific description")  // When multiple relationships exist

// Merge multiple relationships into one (Context/Landscape views only)
CoalesceRelationships(Customer, System, "Interacts with")  // Explicit merge
CoalesceAllRelationships()  // Auto-merge all duplicates
```

### 要素の位置指定

要素を追加する際、正確な座標を指定できます：

```go
Add(Customer, func() {
    Coord(100, 200)      // X, Y position
    NoRelationship()     // Don't render relationships for this element
})
```

---

## AutoLayout

AutoLayout はグラフレイアウトアルゴリズムを使って要素を自動配置します：

```go
AutoLayout(RankTopBottom, func() {
    Implementation(ImplementationDagre)  // or ImplementationGraphviz
    RankSeparation(300)   // Pixels between ranks (default: 300)
    NodeSeparation(600)   // Pixels between nodes in same rank (default: 600)
    EdgeSeparation(200)   // Pixels between edges (default: 200)
    RenderVertices()      // Create waypoints on edges
})
```

**方向**: `RankTopBottom`, `RankBottomTop`, `RankLeftRight`, `RankRightLeft`

---

## スタイル

スタイルはタグを介して適用されます。要素と関係は複数のタグを持て、スタイルはカスケードします。

### 要素スタイル

```go
Styles(func() {
    ElementStyle("database", func() {
        Shape(ShapeCylinder)
        Background("#438DD5")
        Color("#ffffff")
        Stroke("#2E6295")
        FontSize(24)
        Border(BorderSolid)  // BorderSolid, BorderDashed, BorderDotted
        Opacity(100)         // 0-100
        Width(450)           // Pixels
        Height(300)          // Pixels
        Icon("https://example.com/db-icon.png")
        ShowMetadata()       // Show technology
        ShowDescription()    // Show description text
    })
})
```

**利用可能な形状**: `ShapeBox`, `ShapeRoundedBox`, `ShapeCircle`, `ShapeEllipse`, `ShapeHexagon`, `ShapeCylinder`, `ShapePipe`, `ShapePerson`, `ShapeRobot`, `ShapeFolder`, `ShapeWebBrowser`, `ShapeMobileDevicePortrait`, `ShapeMobileDeviceLandscape`, `ShapeComponent`

### 関係スタイル

```go
RelationshipStyle("async", func() {
    Dashed()                    // or Solid()
    Thickness(2)                // Line thickness in pixels
    Color("#707070")
    FontSize(18)
    Width(200)                  // Label width
    Routing(RoutingOrthogonal)  // RoutingDirect, RoutingCurved, RoutingOrthogonal
    Position(50)                // Label position (0-100)
    Opacity(100)
})
```

### CSS テーマ対応

出力される SVG には、フォールバック値付きの CSS カスタムプロパティが含まれます。これにより、図を再生成せずにライト/ダークテーマを適用できます。`ElementStyle` と `RelationshipStyle` で定義した色は、タグ名に基づく CSS 変数へ変換されます。

**変数名の規約:**

- 要素背景: `--mdl-<tag>-bg`
- 要素テキスト色: `--mdl-<tag>-color`
- 要素ストローク: `--mdl-<tag>-stroke`
- 関係の色: `--mdl-rel-<tag>-color`

たとえば、このスタイル定義：

```go
Styles(func() {
    ElementStyle("database", func() {
        Background("#438DD5")
        Color("#ffffff")
    })
    RelationshipStyle("async", func() {
        Color("#707070")
    })
})
```

は、次のような SVG を生成します：

```html
<rect fill="var(--mdl-database-bg, #438DD5)" ... />
<text fill="var(--mdl-database-color, #ffffff)" ... />
<path stroke="var(--mdl-rel-async-color, #707070)" ... />
```

**サイトにテーマを実装する:**

```css
/* Light theme (defaults from SVG) */
:root {
  --mdl-database-bg: #438DD5;
  --mdl-database-color: #ffffff;
  --mdl-rel-async-color: #707070;
}

/* Dark theme overrides */
[data-theme="dark"] {
  --mdl-database-bg: #3a7bc8;
  --mdl-database-color: #f0f0f0;
  --mdl-rel-async-color: #9ca3af;
}
```

SVG は単体でも動作し（フォールバック値で正しく描画されます）、これらの CSS 変数が定義されたページに埋め込むと自動的に適応します。

**重要:** CSS カスタムプロパティが効くのは、SVG が HTML にインライン展開される場合のみです。`<img src="...">` で読み込んだ SVG は親ページの CSS を継承しません。Hugo サイトでは、`diagram` ショートコードで SVG をインライン化します：

```markdown
{{</* diagram name="MyDiagram" */>}}
{{</* diagram name="MyDiagram" caption="System architecture" */>}}
```

---

## デプロイメントのモデリング

インフラと実行環境をモデル化します：

```go
var _ = Design("System", "desc", func() {
    var System = SoftwareSystem("My System", func() {
        var API = Container("API", "Backend", "Go")
        var DB = Container("Database", "Storage", "PostgreSQL")
    })
    
    DeploymentEnvironment("Production", func() {
        DeploymentNode("AWS", "Amazon Web Services", "Cloud Provider", func() {
            DeploymentNode("us-east-1", "US East Region", "AWS Region", func() {
                
                DeploymentNode("ECS Cluster", "Container orchestration", "AWS ECS", func() {
                    Instances("3")  // Can be number or range like "1..N"
                    
                    ContainerInstance("My System/API", func() {
                        InstanceID(1)
                        HealthCheck("API Health", func() {
                            URL("https://api.example.com/health")
                            Interval(30)      // Seconds
                            Timeout(5000)     // Milliseconds
                            Header("Authorization", "Bearer token")
                        })
                    })
                })
                
                DeploymentNode("RDS", "Managed database", "AWS RDS", func() {
                    ContainerInstance("My System/Database")
                })
                
                InfrastructureNode("ALB", "Load balancer", "AWS ALB", func() {
                    Tag("infrastructure")
                    URL("https://docs.aws.amazon.com/elasticloadbalancing/")
                })
            })
        })
    })
    
    Views(func() {
        DeploymentView(Global, "Production", "ProdDeploy", "Production deployment", func() {
            AddAll()
            AutoLayout(RankLeftRight)
        })
    })
})
```

---

## `mdl` CLI

### `mdl serve` — インタラクティブエディタ

```bash
mdl serve ./model -dir gen -port 8080
```

`http://localhost:8080` で Web ベースのエディタを起動します。主な機能：

- 要素をドラッグして配置できる
- ELK.js による複数のレイアウトアルゴリズム（Layered, Force, Tree, Radial）
- 整列と分配ツール
- Undo/Redo（Ctrl+Z / Ctrl+Shift+Z）
- SVG エクスポート
- DSL の変更をホットリロード

**主なショートカット**（Mac は Cmd を使用）:

| 操作 | ショートカット |
|--------|----------|
| 保存 | Ctrl+S |
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z |
| すべて選択 | Ctrl+A |
| ズーム in/out | Ctrl++/- または Ctrl+scroll |
| 画面にフィット | Ctrl+9 |
| ズーム 100% | Ctrl+0 |
| 自動レイアウト | Ctrl+L |
| グリッド切替 | Ctrl+G |
| グリッドにスナップ | Ctrl+Shift+G |
| 水平整列 | Ctrl+Shift+H |
| 垂直整列 | Ctrl+Shift+A |
| 頂点を追加 | Alt+Click |

### `mdl gen` — JSON エクスポート

```bash
mdl gen ./model -out design.json
```

モデルを JSON として書き出します。他ツールとの連携に便利です。

### `mdl svg` — ヘッドレス SVG 生成

```bash
# Generate all views
mdl svg ./model -dir gen --all

# Generate specific views
mdl svg ./model -dir gen --view Context --view Containers

# With layout options
mdl svg ./model -dir gen --all --direction LEFT --compact --timeout 30s
```

ヘッドレスブラウザで自動レイアウトして保存します。CI/CD に最適です。

---

## `stz` CLI

[Structurizr](https://structurizr.com) にモデルをアップロードします：

```bash
# Generate Structurizr workspace JSON
stz gen ./model

# Upload to Structurizr
stz put workspace.json -id WORKSPACE_ID -key API_KEY -secret API_SECRET

# Download from Structurizr
stz get -id WORKSPACE_ID -key API_KEY -secret API_SECRET -out workspace.json
```

---

## Goa プラグイン

Model を Goa と一緒に使う場合、design パッケージで DSL を import します：

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/model/dsl"
)

// API definition
var _ = API("orders", func() {
    Title("Orders API")
})

var _ = Service("orders", func() {
    Method("create", func() { /* ... */ })
})

// Architecture model
var _ = Design("Orders", "Order management system", func() {
    var OrdersAPI = SoftwareSystem("Orders API", "Manages orders", func() {
        Container(OrdersService)  // Uses Goa service
    })
    
    Person("Customer", "Places orders", func() {
        Uses(OrdersAPI, "Creates orders via", "HTTPS")
    })
    
    Views(func() {
        SystemContextView(OrdersAPI, "Context", "System context", func() {
            AddAll()
            AutoLayout(RankTopBottom)
        })
    })
})
```

`goa gen` を実行すると、API コードとアーキテクチャ図（`design.json` と `workspace.json`）の両方が生成されます。

---

## CI/CD 連携

### GitHub Actions

```yaml
name: Generate Architecture Diagrams
on: [push]

jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      
      - name: Install mdl
        run: go install goa.design/model/cmd/mdl@latest
      
      - name: Generate SVGs
        run: mdl svg ./model -dir docs/architecture --all
      
      - name: Commit diagrams
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add docs/architecture/
          git diff --cached --quiet || git commit -m "Update architecture diagrams"
          git push
```

---

## ベストプラクティス

### 大規模モデルの整理

複数ファイルへ分割します：

```go
// model/systems.go
package model

import . "goa.design/model/dsl"

var ECommerce = SoftwareSystem("E-Commerce", "Online store", func() {
    // containers...
})

var Payments = SoftwareSystem("Payments", "Payment processing", func() {
    // containers...
})
```

```go
// model/views.go
package model

import . "goa.design/model/dsl"

var _ = Design("Platform", func() {
    Views(func() {
        SystemLandscapeView("Landscape", "All systems", func() {
            AddAll()
        })
        // more views...
    })
})
```

### タグ付けの一貫性

タグの規約を決め、統一します：

```go
// Element types
Tag("database")
Tag("api")
Tag("frontend")
Tag("queue")

// Visibility
Tag("external")
Tag("internal")

// Criticality
Tag("critical")
Tag("tier-1")
```

### 共有コンポーネントのインポート

```go
// shared/infrastructure.go
package shared

import . "goa.design/model/dsl"

var Stripe = SoftwareSystem("Stripe", "Payment processing", func() {
    External()
    Tag("external", "payments")
})
```

```go
// myservice/model.go
package model

import (
    . "goa.design/model/dsl"
    _ "mycompany/shared"  // Import shared elements
)

var _ = Design("My Service", func() {
    var Service = SoftwareSystem("My Service", func() {
        Uses("Stripe", "Processes payments via")  // Reference by name
    })
})
```

---

## リファレンス

- [DSL Package Documentation](https://pkg.go.dev/goa.design/model/dsl) — DSL の全体リファレンス
- [Model GitHub Repository](https://github.com/goadesign/model) — ソースコードと例
- [C4 Model](https://c4model.com) — C4 モデルのドキュメント
- [Structurizr](https://structurizr.com) — 図のホスティングサービス


