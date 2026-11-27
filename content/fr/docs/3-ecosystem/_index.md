---
title: "Écosystème et outils"
linkTitle: "Écosystème"
weight: 3
description: "Bibliothèques Go compagnes et outils multi-agents : diagrammes d’architecture C4, flux d’événements et pools de workers Redis, observabilité OpenTelemetry, coordination d’agents MCP et vérification pilotée par contrat."
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

## Vue d’ensemble

Ces bibliothèques open source et outils MCP étendent Goa et Goa-AI pour la modélisation d’architecture, les événements distribués, l’observabilité et le développement multi-agents. Chaque bibliothèque s’utilise avec Goa ou de façon autonome dans n’importe quel service Go.

| Projet | Rôle | Ce qu’il fournit |
|---------|------|------------------|
| [Model](model/) | Architecture sous forme de code | DSL de modèle C4 en Go, export SVG/JSON, éditeur de mise en page interactif (`mdl`), plugin Goa |
| [Pulse](pulse/) | Flux, pools et cartes Redis | Flux d’événements bornés ou non bornés, pools de workers à hachage cohérent, cartes répliquées en mémoire |
| [Clue](clue/) | Observabilité OpenTelemetry | Journalisation tamponnée vidée sur erreur, traces et métriques OTLP, sondes `/healthz`, contrôles de débogage à chaud |
| [Chorus](chorus/) | Coordination d’agents entre pairs | `#channels` partagés, messages directs `@agent`, curseurs côté serveur, `chorus watch` à 0 token, `chorus ui` en direct |
| [Highbay](highbay/) | Plan de contrôle de contrats et vérification | `Story` + Change Cards, copies Git séparées pour bâtisseur et rédacteur de tests, portes `eval/`, fusion navigateur |

## Model : diagrammes d’architecture C4 en Go

[Model](model/) définit des [diagrammes d’architecture C4](https://c4model.com) en code Go aux côtés de vos contrats de service afin que les diagrammes restent sous contrôle de version et se régénèrent en CI :

```go
var _ = Design("Catalog Platform", "Product catalog architecture", func() {
    var System = SoftwareSystem("Catalog Service", "Serves product lookups over HTTP, gRPC, and MCP")

    Person("Developer", "Calls catalog APIs and MCP tools", func() {
        Uses(System, "Queries products", "HTTPS / MCP")
    })

    Views(func() {
        SystemContextView(System, "Context", "System context diagram", func() {
            AddAll()
            AutoLayout(RankLeftRight)
        })
    })
})
```

Lancez `mdl serve` pour ajuster interactivement la disposition dans le navigateur ou `mdl svg` pour exporter les SVG sans interface graphique en CI. Voir le [guide Model](model/).

## Pulse : flux d’événements, pools de workers et cartes répliquées Redis

[Pulse](pulse/) construit trois primitives distribuées directement sur Redis (`*redis.Client`) sans imposer de courtier de messages supplémentaire :

- **`streaming`** : Flux d’événements (plafond exact `MAXLEN` de `1 000` événements par défaut, configurable via `options.WithStreamMaxLen` ou `options.WithUnboundedStream`) avec des `Reader`s indépendants en diffusion multiple et des `Sink`s partagés en groupes de consommateurs.
- **`pool`** : Pools de workers dédiés qui routent les tâches par clé via hachage cohérent par saut (*jump consistent hashing*) avec bascule automatique en cas de panne d’un worker.
- **`rmap`** : Cartes clé-valeur à lecture locale et cohérence finale synchronisées par des scripts Lua Redis atomiques et des notifications pub/sub.

```go
// Open a stream and append a typed JSON payload
stream, err := streaming.NewStream("orders", rdb)
if err != nil {
    log.Fatal(err)
}
_, err = stream.Add(ctx, "order.created", payload)

// Consume through a shared consumer-group sink with explicit acks
sink, err := stream.NewSink(ctx, "billing-workers")
if err != nil {
    log.Fatal(err)
}
defer sink.Close(ctx)

for event := range sink.Subscribe() {
    if err := handleOrder(event); err == nil {
        _ = sink.Ack(ctx, event)
    }
}
```

Voir le [guide Pulse](pulse/).

## Clue : traçage OpenTelemetry, journaux tamponnés et sondes de santé

[Clue](clue/) instrumente les services Go avec des traces et métriques OpenTelemetry, des sondes de santé et une **journalisation contextuelle vidée sur erreur** — gardant silencieuses les requêtes réussies non tracées tout en écrivant le contexte complet de débogage dès qu’une erreur survient :

```go
// Configure OpenTelemetry trace and metric exporters
cfg, err := clue.NewConfig(ctx, "catalog", "1.0.0", metricExporter, spanExporter)
if err != nil {
    log.Fatal(ctx, err)
}
clue.ConfigureOpenTelemetry(ctx, cfg)

// Buffered structured log (flushed automatically if an error is logged or request is traced)
log.Info(ctx, log.KV{K: "msg", V: "looking up SKU"}, log.KV{K: "sku", V: sku})

// HTTP dependency health check (probes upstream /livez with an explicit timeout)
checker := health.NewChecker(
    health.NewPinger("inventory-api", inventoryAddr, health.WithTimeout(5*time.Second)),
)
```

Voir le [guide Clue](clue/).

## Chorus : coordination multi-agents via MCP

[Chorus](chorus/) est un serveur MCP local construit sur [Goa-AI](/fr/docs/2-goa-ai/) et [Pulse](pulse/) qui connecte les agents de code entre terminaux, éditeurs et familles de modèles (`Claude Code`, `Codex`, `Gemini CLI`, `Antigravity`, `Cursor`, `Windsurf`, `Copilot`, `VS Code`) via des `#channels` partagés, des messages directs `@agent` et un tableau de tâches épinglé :

```bash
brew install goadesign/tap/chorus && chorus up
```

Les autres installations en une commande (`npx @goadesign/chorus up`, `curl` et `go install`) sont détaillées dans le [guide Chorus](chorus/) et sur la [page Chorus](/fr/chorus/).

- **Cinq outils (`who`, `join`, `leave`, `send`, `read`)** sur `http://localhost:9440/mcp` utilisant des réponses `ToolContent` compactes en texte brut (`~16–52 tokens/msg` sur la session passkey enregistrée).
- **Curseurs de lecture côté serveur** dans `pulse/rmap`, livraison groupée des non-lus sur `send` et `0` token modèle pendant l’attente dans `chorus watch`.

## Highbay : plan de contrôle multi-agents piloté par contrat

[Highbay](highbay/) standardise l’architecture de vos services, serveurs MCP et agents IA — en associant un agent bâtisseur (`.highbay-build`) et un agent rédacteur de tests distinct (`.highbay-tests`) autour d’un contrat confirmé avant toute fusion :

```bash
brew install goadesign/tap/highbay
highbay up
```

Les installations alternatives via `npx @goadesign/highbay up` et `go install github.com/goadesign/highbay/cmd/highbay@latest` figurent dans le [guide Highbay](highbay/) et sur la [page Highbay](/fr/highbay/).

- **`/highbay` (`$highbay` dans Codex)** génère une Change Card (`CP1`) et un aperçu d’architecture C4 (`CP2`), en initialisant les dossiers vides avec une coquille Go et `eval/` propre et neutre (`highbay init -example` ajoute un exemple exécutable).
- **La vérification indépendante (`CP4`)** conditionne les actions **Approve** et **Merge** dans le navigateur (`CP5`) à la réussite de la suite de scénarios `eval/` acceptée.

## Référence d’installation

```bash
# Go libraries
go get goa.design/model@latest
go get goa.design/pulse@latest
go get goa.design/clue@latest

# CLI & MCP tools
go install goa.design/model/cmd/mdl@latest
go install github.com/goadesign/chorus/cmd/chorus@latest
go install github.com/goadesign/highbay/cmd/highbay@latest
```
