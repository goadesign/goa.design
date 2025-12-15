---
title: "Ecosystème et outils"
linkTitle: "Écosystème"
weight: 3
description: "Companion libraries that extend Goa: architecture diagrams, distributed events, and observability."
llm_optimized: true
content_scope: "Goa Ecosystem Overview"
---

## Aperçu

L'écosystème Goa comprend des bibliothèques complémentaires qui répondent à des besoins communs en matière de développement de microservices. Ces outils sont conçus pour fonctionner de manière transparente avec Goa mais peuvent également être utilisés indépendamment.

## Bibliothèques compagnons

| Bibliothèque - Objectif - Fonctionnalités principales - Fonctionnalités principales - Fonctionnalités principales - Fonctionnalités principales - Fonctionnalités principales - Fonctionnalités principales
|---------|---------|--------------|
| [Model](model/) | Diagrammes d'architecture | Diagrammes C4 sous forme de code, contrôle de version, éditeur interactif |
| Pulse](pulse/) | Événements distribués | Flux d'événements, pools de travailleurs, cartes répliquées |
| [Clue](clue/) | Observabilité | Traçage, journalisation, métriques, bilans de santé |

## Modèle - Diagrammes d'architecture en tant que code

Model fournit un DSL Go pour décrire l'architecture logicielle en utilisant le [modèle C4](https://c4model.com). Au lieu de dessiner des diagrammes dans des outils graphiques, vous définissez votre architecture dans le code :

```go
var _ = Design("My System", "System description", func() {
    var System = SoftwareSystem("My System", "Does something useful")
    
    Person("User", "A user of the system", func() {
        Uses(System, "Uses")
    })
    
    Views(func() {
        SystemContextView(System, "Context", "System context diagram", func() {
            AddAll()
            AutoLayout(RankLeftRight)
        })
    })
})
```

**Avantages:**
- Documentation de l'architecture contrôlée par version
- Génération automatique de diagrammes (SVG, JSON)
- Editeur graphique interactif pour le positionnement
- Plugin Goa pour les conceptions combinées API + architecture

**En savoir plus:** [Documentation du modèle](model/)

## Pulse - Infrastructure d'événements distribués

Pulse fournit des primitives pour construire des systèmes distribués pilotés par les événements. Il est agnostique au niveau du transport et fonctionne avec ou sans les services Goa :

- **Streaming** : Routage d'événements pub/sub à travers des microservices
- **Pools de travailleurs** : Travailleurs dédiés avec un hachage cohérent pour la répartition des tâches
- **Cartes répliquées** : État partagé éventuellement cohérent entre les nœuds

```go
// Publish events to a stream
stream.Add(ctx, "user.created", userEvent)

// Subscribe to events
reader.Subscribe(ctx, func(event *Event) error {
    return processEvent(event)
})
```

**Cas d'utilisation:**
- Traitement asynchrone des événements
- Files d'attente de travaux en arrière-plan
- Mise en cache distribuée
- Notifications en temps réel

**En savoir plus:** [Pulse Documentation](pulse/)

## Indice - Observabilité des microservices

Clue fournit une instrumentation pour les services Goa construits sur OpenTelemetry. Il couvre les trois piliers de l'observabilité :

```go
// Configure OpenTelemetry
cfg := clue.NewConfig(ctx, "myservice", "1.0.0", metricExporter, spanExporter)
clue.ConfigureOpenTelemetry(ctx, cfg)

// Context-based logging
log.Info(ctx, "processing request", log.KV{"user_id", userID})

// Health checks
checker := health.NewChecker(health.NewPinger("db", dbAddr))
```

**Caractéristiques:**
- Traçage distribué avec propagation automatique de la portée
- Journalisation structurée avec mise en mémoire tampon intelligente
- Collecte et exportation de métriques
- Points d'extrémité pour les bilans de santé
- Points d'extrémité de débogage pour le dépannage en cours d'exécution

**En savoir plus:** [Clue Documentation](clue/)

## Guides de documentation

| Guide d'utilisation de l'outil de recherche d'indices - Description de l'outil de recherche d'indices - ~Tokens - ~Tokens
|-------|-------------|---------|
| [Modèle](model/) | Diagrammes C4, référence DSL, CLI mdl | ~2,500 |
| [Pulse](pulse/) | Streaming, worker pools, replicated maps | ~2,200 |
| [Clue](clue/) | Logging, tracing, metrics, health checks | ~2,800 |

**Section totale:** ~7 500 jetons

## Démarrage

Choisissez la bibliothèque qui correspond à vos besoins :

- **Documentation d'architecture?** Commencez par [Model](model/)
- **Construire des systèmes pilotés par les événements?** Commencez avec [Pulse](pulse/)
- **Ajouter de l'observabilité aux services Goa?** Commencez avec [Clue](clue/)

Toutes les bibliothèques sont disponibles via `go get` :

```bash
go get goa.design/model
go get goa.design/pulse
go get goa.design/clue
```
