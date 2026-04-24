---
title: "Registre des outils internes"
linkTitle: "Registre"
weight: 9
description: "Deploy a clustered gateway for cross-process toolset discovery and invocation."
llm_optimized: true
---

Le **Internal Tool Registry** est un service de passerelle en cluster qui permet la découverte et l'appel d'un ensemble d'outils au-delà des limites des processus. Il est conçu pour les scénarios dans lesquels les ensembles d'outils sont fournis par des services distincts qui peuvent évoluer indépendamment des agents qui les utilisent.

## Aperçu

Le registre fait office à la fois de **catalogue** et de **passerelle** :

- **Catalogue** : les agents découvrent les ensembles d'outils disponibles, leurs schémas et leur état de santé
- **Passerelle** : les appels d'outils sont acheminés via le registre vers les fournisseurs via les flux Pulse.

Cela dissocie les agents des fournisseurs d'outils, permettant une mise à l'échelle, un déploiement et une gestion du cycle de vie indépendants.

### Registre d'outils vs registre d'invites

Il s’agit de différents systèmes avec des responsabilités différentes :

- **Registre d'outils interne** (cette page) : découverte/invocation inter-processus d'ensembles d'outils et d'appels d'outils.
- **Runtime Prompt Registry** (`runtime.PromptRegistry`) : enregistrement et rendu des spécifications d'invite en cours,
éventuellement soutenu par un magasin de remplacement d'invite (`runtime.WithPromptStore`).

Le registre d'outils ne stocke pas les modèles d'invite et ne résout pas les remplacements d'invite. Le rendu rapide reste activé
la couche d'exécution/planificateur et émet des événements d'observabilité `prompt_rendered`.

{{< figure src="/images/diagrams/RegistryTopology.svg" alt="Agent-Registry-Provider Topology" >}}

## Clustering multi-nœuds

Plusieurs nœuds de registre peuvent participer au même registre logique en utilisant le même `Name` dans leur configuration et en se connectant à la même instance Redis.

Nœuds portant le même nom automatiquement :

- **Partager les enregistrements des jeux d'outils** via les cartes répliquées Pulse
- **Coordonner les pings de vérification de l'état** via des tickers distribués (un seul ping de nœud à la fois)
- **Partager l'état de santé du fournisseur** sur tous les nœuds

Cela permet une mise à l’échelle horizontale et une haute disponibilité. Les clients peuvent se connecter à n'importe quel nœud et voir le même état du registre.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## Démarrage rapide

### Utilisation de la bibliothèque

Créez et exécutez un nœud de registre par programme. Lorsque `New()` est appelé, le registre se connecte à Redis et initialise plusieurs composants Pulse : un nœud de pool pour la coordination distribuée, deux cartes répliquées pour le suivi de l'état d'intégrité et de l'ensemble d'outils, et des gestionnaires de flux pour le routage des appels d'outils. La méthode `Run()` démarre le serveur gRPC et le bloque jusqu'à l'arrêt, gérant automatiquement la terminaison en douceur.

```go
package main

import (
    "context"
    "log"

    "github.com/redis/go-redis/v9"
    "goa.design/goa-ai/registry"
)

func main() {
    ctx := context.Background()

    // Connect to Redis
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    defer rdb.Close()

    // Create the registry
    reg, err := registry.New(ctx, registry.Config{
        Redis: rdb,
        Name:  "my-registry",  // Nodes with same name form a cluster
    })
    if err != nil {
        log.Fatal(err)
    }

    // Run the gRPC server (blocks until shutdown)
    log.Println("starting registry on :9090")
    if err := reg.Run(ctx, ":9090"); err != nil {
        log.Fatal(err)
    }
}
```

### Exemple binaire

Le package de registre comprend un exemple de binaire pour un déploiement rapide. Tous les nœuds avec le même `REGISTRY_NAME` pointant vers la même instance Redis forment automatiquement un cluster : ils partagent les enregistrements d'ensemble d'outils et coordonnent les contrôles d'état sans configuration supplémentaire.

```bash
# Single node (development)
REDIS_URL=localhost:6379 go run ./registry/cmd/registry

# Multi-node cluster (production)
REGISTRY_NAME=prod REGISTRY_ADDR=:9090 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9091 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9092 REDIS_URL=redis:6379 ./registry
```

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|---------|
| `REGISTRY_ADDR` | Adresse d'écoute gRPC | `:9090` |
| `REGISTRY_NAME` | Nom du cluster de registre | `registry` |
| `REDIS_URL` | URL de connexion Redis | `localhost:6379` |
| `REDIS_PASSWORD` | Mot de passe Redis | (aucun) |
| `PING_INTERVAL` | Intervalle de ping du contrôle de santé | `10s` |
| `MISSED_PING_THRESHOLD` | Pings manqués avant un mauvais fonctionnement | `3` |

## Architecture

{{< figure src="/images/diagrams/RegistryArchitecture.svg" alt="Registry Internal Architecture" >}}

### Composants

| Composant | Description |
|-----------|-------------|
| **Service** | Gestionnaires gRPC pour la découverte et l’invocation |
| **Magasin** | Couche de persistance pour les métadonnées du jeu d'outils (mémoire ou MongoDB) |
| ** Suivi de la santé ** | Surveille la vivacité du fournisseur via ping/pong |
| **Gestionnaire de flux** | Gère les flux Pulse pour le routage des appels d'outils |
| **Gestionnaire de flux de résultats** | Gère la livraison des résultats de l’outil |

### Flux d'appels d'outils

Lorsque `CallTool` est appelé, le registre effectue ces étapes dans l'ordre :

1. **Validation du schéma** : la charge utile est validée par rapport au schéma JSON de l'outil à l'aide du validateur de schéma de registre d'outils d'exécution.
2. **Bilan de santé** : le registre vérifie si l'ensemble d'outils a répondu aux pings récents. Les ensembles d'outils défectueux renvoient immédiatement `service_unavailable`.
3. **Création de flux de résultats** : un flux Pulse temporaire est créé avec un `tool_use_id` unique et le mappage est stocké dans Redis pour la livraison des résultats entre nœuds.
4. **Publication de demande** : l'appel d'outil est publié dans le flux de demande de l'ensemble d'outils (`toolset:<name>:requests`).
5. **Attendez le résultat** : la passerelle s'abonne au flux de résultats et bloque jusqu'à ce que le fournisseur réponde ou que le délai d'attente de 30 secondes expire.

Cette conception garantit que les appels d’outils échouent rapidement lorsque les fournisseurs ne sont pas opérationnels, plutôt que d’attendre des délais d’attente.

## Intégration du fournisseur (côté service)

Le routage du registre ne représente que la moitié du problème : **les fournisseurs doivent exécuter une boucle d'exécution d'outils** dans le processus de service propriétaire de l'ensemble d'outils.

Pour les ensembles d'outils appartenant au service et basés sur des méthodes (outils déclarés avec `BindTo(...)`), la génération de code émet un adaptateur de fournisseur à l'adresse :

- `gen/<service>/toolsets/<toolset>/provider.go`

Le fournisseur généré :

- Décode la charge utile de l'outil entrant JSON à l'aide du codec de charge utile généré
- Construit la charge utile de la méthode Goa à l'aide des transformations générées
- Appelle la méthode de service liée
- Encode le résultat de l'outil JSON avec toutes les données de serveur déclarées à l'aide du codec de résultat généré

Pour servir les appels d'outils depuis la passerelle de registre, connectez le fournisseur généré à
la boucle du fournisseur d'exécution (`goa.design/goa-ai/runtime/toolregistry/provider`) :

```go
handler := toolsetpkg.NewProvider(serviceImpl)
go func() {
    err := provider.Serve(ctx, pulseClient, toolsetID, handler, provider.Options{
        Pong: func(ctx context.Context, pingID string) error {
            return registryClient.Pong(ctx, &registry.PongPayload{
                PingID:  pingID,
                Toolset: toolsetID,
            })
        },
    })
    if err != nil {
        panic(err)
    }
}()
```

Les ID de flux sont déterministes :

- Appels d'outil : `toolset:<toolsetID>:requests`
- Résultats : `result:<toolUseID>`

## Configuration

### Structure de configuration

Le champ `Name` est particulièrement important : il détermine les noms de ressources Pulse utilisés pour la coordination. Le pool est nommé `<name>`, la carte de santé `<name>:health` et la carte de registre `<name>:toolsets`. Les nœuds dont les noms correspondent et les connexions Redis se découvrent automatiquement.

```go
type Config struct {
    // Redis is the Redis client for Pulse operations. Required.
    Redis *redis.Client

    // Store is the persistence layer for toolset metadata.
    // Defaults to an in-memory store if not provided.
    Store store.Store

    // Name is the registry cluster name.
    // Nodes with the same Name and Redis connection form a cluster.
    // Defaults to "registry" if not provided.
    Name string

    // PingInterval is the interval between health check pings.
    // Defaults to 10 seconds if not provided.
    PingInterval time.Duration

    // MissedPingThreshold is the number of consecutive missed pings
    // before marking a toolset as unhealthy.
    // Defaults to 3 if not provided.
    MissedPingThreshold int

    // ResultStreamMappingTTL is the TTL for tool_use_id to stream_id mappings.
    // Defaults to 5 minutes if not provided.
    ResultStreamMappingTTL time.Duration

    // PoolNodeOptions are additional options for the Pulse pool node.
    PoolNodeOptions []pool.NodeOption
}
```

### Implémentations de magasin

Le registre prend en charge les backends de stockage enfichables. Le magasin conserve les métadonnées de l'ensemble d'outils (nom, description, version, balises et schémas d'outils). Notez que l'état d'intégrité et la coordination des flux sont toujours gérés via Redis/Pulse, quel que soit le magasin que vous choisissez : le magasin n'affecte que la persistance des métadonnées de l'ensemble d'outils.

```go
import (
    "goa.design/goa-ai/registry/store/memory"
    "goa.design/goa-ai/registry/store/mongo"
)

// In-memory store (default, for development)
reg, _ := registry.New(ctx, registry.Config{
    Redis: rdb,
    // Store defaults to memory.New()
})

// MongoDB store (for production persistence)
mongoStore, _ := mongo.New(mongoClient, "registry", "toolsets")
reg, _ := registry.New(ctx, registry.Config{
    Redis: rdb,
    Store: mongoStore,
})
```

## Surveillance de la santé

Le registre surveille automatiquement l'état du fournisseur à l'aide de messages ping/pong sur les flux Pulse.

### Comment ça marche

1. Le registre envoie des messages `ping` périodiques au flux de chaque ensemble d'outils enregistré.
2. Les fournisseurs répondent avec des messages `pong` via la méthode `Pong` gRPC
3. Si un fournisseur manque des pings consécutifs `MissedPingThreshold`, il est marqué comme étant défectueux.
4. Les ensembles d'outils défectueux sont exclus du routage `CallTool`

Le tracker de santé utilise un seuil d’obsolescence calculé comme `(MissedPingThreshold + 1) × PingInterval`. Avec les valeurs par défaut (3 pings manqués, intervalle de 10 secondes), un ensemble d'outils devient malsain après 40 secondes sans pong. Cela donne aux fournisseurs suffisamment de temps pour réagir tout en détectant les pannes assez rapidement.

### Coordination distribuée

Dans un cluster multi-nœuds, les pings de vérification de l'état sont coordonnés via des tickers distribués Pulse. Le ticker garantit qu'exactement un nœud envoie des pings à un moment donné : si ce nœud tombe en panne, un autre nœud prend automatiquement le relais dans un intervalle de ping.

Tous les nœuds partagent l’état d’intégrité via une carte répliquée Pulse. Lorsqu'un pong est reçu sur n'importe quel nœud, il met à jour la carte partagée avec l'horodatage actuel. Lorsqu'un nœud vérifie l'état de santé, il lit cette carte partagée afin que tous les nœuds aient une vue cohérente de l'état du fournisseur.

## Intégration client

Les agents se connectent au registre à l'aide du client gRPC généré. Le `GRPCClientAdapter` enveloppe le client gRPC brut et fournit une interface plus propre pour la découverte et l'invocation. Étant donné que tous les nœuds de registre partagent l'état, les clients peuvent se connecter à n'importe quel nœud : utilisez un équilibreur de charge en production pour le basculement automatique.

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    
    registrypb "goa.design/goa-ai/registry/gen/grpc/registry/pb"
    runtimeregistry "goa.design/goa-ai/runtime/registry"
)

// Connect to the registry
conn, _ := grpc.NewClient("localhost:9090",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
defer conn.Close()

// Create the client adapter
client := runtimeregistry.NewGRPCClientAdapter(
    registrypb.NewRegistryClient(conn),
)

// Discover toolsets
toolsets, _ := client.ListToolsets(ctx)
for _, ts := range toolsets {
    fmt.Printf("Toolset: %s (%d tools)\n", ts.Name, ts.ToolCount)
}

// Get full schema for a toolset
schema, _ := client.GetToolset(ctx, "data-tools")
for _, tool := range schema.Tools {
    fmt.Printf("  Tool: %s - %s\n", tool.Name, tool.Description)
}
```

## gRPC API

Le registre expose les méthodes gRPC suivantes :

### Opérations du fournisseur

| Méthode | Description |
|--------|-------------|
| `Register` | Enregistrez un ensemble d'outils auprès du registre. Valide les schémas d'outils, crée le flux de requêtes et démarre le suivi de l'état. Renvoie l'ID de flux auquel le fournisseur doit s'abonner. |
| `Unregister` | Supprimez un ensemble d'outils du registre. Arrête les pings de santé et supprime les métadonnées, mais ne détruit pas le flux sous-jacent. |
| `EmitToolResult` | Émettre un résultat d’exécution d’outil. Recherche le flux de résultats de Redis (permettant la livraison entre nœuds) et publie le résultat. |
| `Pong` | Répondez à un ping de contrôle de santé. Met à jour l’horodatage du dernier pong dans la carte de santé partagée. |

### Opérations de découverte

| Méthode | Description |
|--------|-------------|
| `ListToolsets` | Répertoriez tous les ensembles d’outils enregistrés (avec filtrage de balises facultatif). Renvoie uniquement les métadonnées, pas les schémas complets. |
| `GetToolset` | Obtenez le schéma complet pour un ensemble d'outils spécifique, y compris tous les schémas d'entrée/sortie des outils. |
| `Search` | Recherchez des ensembles d’outils par mot-clé correspondant au nom, à la description ou aux balises. |

### Opérations d'appel

| Méthode | Description |
|--------|-------------|
| `CallTool` | Appelez un outil via la passerelle de registre. Valide la charge utile, vérifie l’état, achemine vers le fournisseur et attend le résultat (délai d’expiration de 30 s). |

## Meilleures pratiques

### Déploiement

- **Utilisez le même `Name`** pour tous les nœuds d'un cluster : cela détermine les noms de ressources Pulse partagées.
- **Pointez vers la même instance Redis** pour la coordination de l'État
- **Déployer derrière un équilibreur de charge** pour les connexions client : tous les nœuds servent un état identique
- **Utilisez le magasin MongoDB** en production pour la persistance après les redémarrages (le magasin en mémoire perd les enregistrements au redémarrage)

### Surveillance de la santé

- **Définissez le `PingInterval`** approprié en fonction de vos exigences de latence (par défaut : 10 s). Les valeurs inférieures détectent les pannes plus rapidement mais augmentent le trafic Redis.
- **Réglez `MissedPingThreshold`** pour équilibrer entre les faux positifs et la vitesse de détection (par défaut : 3). Le seuil d'obsolescence est `(threshold + 1) × interval`.
- **Surveillez l'état de santé** via des métriques ou des journaux : des ensembles d'outils malsains provoquent des erreurs `service_unavailable` immédiates plutôt que des délais d'attente.

### Mise à l'échelle

- **Ajoutez des nœuds** pour gérer davantage de connexions gRPC : chaque nœud peut répondre à n'importe quelle requête.
- **Les nœuds partagent le travail** via les tickers distribués Pulse : un seul nœud envoie une requête ping à chaque ensemble d'outils à la fois.
- **Aucune session persistante** n'est requise : les flux de résultats utilisent Redis pour la livraison entre nœuds, de sorte qu'un appel d'outil peut être lancé sur un nœud et terminé sur un autre.

## Prochaines étapes

- En savoir plus sur les [Ensembles d'outils](./toolsets/) pour définir des outils
- Explorez [Production](./production/) pour les modèles de déploiement
- En savoir plus sur la [Composition d'agent](./agent-composition/) pour le partage d'outils entre agents
