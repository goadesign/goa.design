---
title: "Registre des outils internes"
linkTitle: "Registre"
weight: 9
description: "Deploy a clustered gateway for cross-process toolset discovery and invocation."
llm_optimized: true
---

Le **registre d'outils interne** est un service de passerelle en cluster qui permet la découverte et l'invocation d'ensembles d'outils à travers les frontières des processus. Il est conçu pour les scénarios dans lesquels les ensembles d'outils sont fournis par des services distincts qui peuvent évoluer indépendamment des agents qui les consomment.

## Vue d'ensemble

Le registre agit à la fois comme un **catalogue** et une **passerelle** :

- **Catalogue** : Les agents découvrent les ensembles d'outils disponibles, leurs schémas et leur état de santé
- **Passerelle** : Les appels d'outils sont acheminés par le registre vers les fournisseurs via les flux Pulse

Les agents sont ainsi dissociés des fournisseurs d'outils, ce qui permet une mise à l'échelle, un déploiement et une gestion du cycle de vie indépendants.

{{< figure src="/images/diagrams/RegistryTopology.svg" alt="Agent-Registry-Provider Topology" >}}

## Mise en grappe de plusieurs nœuds

Plusieurs nœuds de registre peuvent participer au même registre logique en utilisant le même `Name` dans leur configuration et en se connectant à la même instance Redis.

Les nœuds portant le même nom se connectent automatiquement :

- **partagent les enregistrements de jeux d'outils** via les cartes répliquées Pulse
- **Coordonner les pings de contrôle de santé** via des tickers distribués (un seul nœud ping à la fois)
- **Partage de l'état de santé du fournisseur** entre tous les nœuds

Cela permet une mise à l'échelle horizontale et une haute disponibilité. Les clients peuvent se connecter à n'importe quel nœud et voir le même état du registre.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## Démarrage rapide

### Utilisation de la bibliothèque

Créez et exécutez un nœud de registre par programme. Lorsque `New()` est appelé, le registre se connecte à Redis et initialise plusieurs composants Pulse : un nœud de pool pour la coordination distribuée, deux cartes répliquées pour l'état de santé et le suivi de l'ensemble d'outils, et des gestionnaires de flux pour l'acheminement des appels d'outils. La méthode `Run()` démarre le serveur gRPC et se bloque jusqu'à l'arrêt, en gérant automatiquement la terminaison gracieuse.

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

### Exemple Binaire

Le paquetage du registre comprend un binaire d'exemple pour un déploiement rapide. Tous les nœuds ayant le même `REGISTRY_NAME` pointant vers la même instance Redis forment automatiquement un cluster - ils partagent les enregistrements de jeux d'outils et coordonnent les contrôles de santé sans configuration supplémentaire.

```bash
# Single node (development)
REDIS_URL=localhost:6379 go run ./registry/cmd/registry

# Multi-node cluster (production)
REGISTRY_NAME=prod REGISTRY_ADDR=:9090 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9091 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9092 REDIS_URL=redis:6379 ./registry
```

### Variables d'environnement

| Variable | Description | Valeur par défaut
|----------|-------------|---------|
| `REGISTRY_ADDR` | Adresse d'écoute gRPC | `:9090` | `REGISTRY_NAME` Nom de la grappe d'enregistrement
| `REGISTRY_NAME` Nom du cluster du registre | `registry` | `registry` | Nom du cluster du registre
| `REDIS_URL` | URL de connexion Redis | `localhost:6379` | `REDIS_PASSWORD` `REDIS_PASSWORD` `REDIS_PASSWORD` | URL de connexion Redis
| `REDIS_PASSWORD` | Mot de passe Redis | (none) |
| `PING_INTERVAL` | Intervalle de ping de vérification de l'état de santé


## Architecture

{{< figure src="/images/diagrams/RegistryArchitecture.svg" alt="Registry Internal Architecture" >}}

### Composants

| Composant | Description |
|-----------|-------------|
| Service** - Gestionnaire gRPC pour la découverte et l'invocation des outils
| Le service de gestion de l'accès à l'information et de l'invocation (gRPC)
| Le gestionnaire de flux de données est un gestionnaire de flux de données qui permet de gérer les flux de données
| Gestionnaire de flux de résultats **Gestionnaire de flux de résultats **Gestionnaire de flux de résultats **Gestionnaire de flux de résultats **Gestionnaire de flux de résultats **Gestionnaire de flux de résultats


### Flux d'appel d'outil

Lorsque `CallTool` est invoqué, le registre effectue les étapes suivantes dans l'ordre :

1. **Validation du schéma** : La charge utile est validée par rapport au schéma JSON de l'outil à l'aide d'un validateur de schéma compilé
2. **Vérification de l'état de santé** : Le registre vérifie si l'ensemble d'outils a répondu à des pings récents - les ensembles d'outils en mauvaise santé renvoient immédiatement `service_unavailable`
3. **Création d'un flux de résultats** : Un flux Pulse temporaire est créé avec un `tool_use_id` unique, et le mappage est stocké dans Redis pour la livraison des résultats entre les nœuds
4. **Publication de la demande** : L'appel d'outil est publié dans le flux de demandes de l'ensemble d'outils (`toolset:<name>:requests`)
5. **Attente du résultat** : La passerelle s'abonne au flux de résultats et se bloque jusqu'à ce que le fournisseur réponde ou que le délai de 30 secondes expire

Cette conception garantit que les appels d'outils échouent rapidement lorsque les fournisseurs ne sont pas en bonne santé, plutôt que d'attendre des délais d'attente.

## Configuration

### Config

Le champ `Name` est particulièrement important : il détermine les noms des ressources Pulse utilisées pour la coordination. Le pool est nommé `<name>`, la carte de santé `<name>:health` et la carte de registre `<name>:toolsets`. Les nœuds dont les noms et les connexions Redis correspondent se découvrent automatiquement.

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

### Implémentations de magasins

Le registre prend en charge les backends de stockage enfichables. Le magasin conserve les métadonnées des jeux d'outils (nom, description, version, balises et schémas d'outils). Notez que l'état de santé et la coordination des flux sont toujours gérés par Redis/Pulse, quel que soit le magasin choisi - le magasin n'affecte que la persistance des métadonnées de l'ensemble d'outils.

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

Le registre surveille automatiquement l'état de santé du fournisseur à l'aide de messages ping/pong sur les flux Pulse.

### Comment ça marche

1. Le registre envoie des messages périodiques `ping` au flux de chaque ensemble d'outils enregistré
2. Les fournisseurs répondent par des messages `pong` via la méthode `Pong` gRPC
3. Si un fournisseur manque `MissedPingThreshold` pings consécutifs, il est marqué comme étant en mauvaise santé
4. Les ensembles d'outils malsains sont exclus du routage `CallTool`

Le tracker de santé utilise un seuil de staleness calculé comme `(MissedPingThreshold + 1) × PingInterval`. Avec les valeurs par défaut (3 pings manqués, intervalle de 10s), un toolset devient malsain après 40 secondes sans pong. Cela donne aux fournisseurs suffisamment de temps pour réagir tout en détectant les défaillances assez rapidement.

### Coordination distribuée

Dans un cluster à plusieurs nœuds, les pings de contrôle de santé sont coordonnés par l'intermédiaire des tickers distribués par Pulse. Si ce nœud tombe en panne, un autre nœud prend automatiquement le relais dans un intervalle de ping.

Tous les nœuds partagent l'état de santé via une carte répliquée par Pulse. Lorsqu'un nœud reçoit un ping, il met à jour la carte partagée avec l'horodatage actuel. Lorsqu'un nœud vérifie l'état de santé, il lit cette carte partagée, de sorte que tous les nœuds disposent d'une vue cohérente de l'état de santé du fournisseur.

## Intégration du client

Les agents se connectent au registre à l'aide du client gRPC généré. Le `GRPCClientAdapter` enveloppe le client gRPC brut et fournit une interface plus propre pour la découverte et l'invocation. Comme tous les nœuds du registre partagent l'état, les clients peuvent se connecter à n'importe quel nœud - utilisez un équilibreur de charge en production pour un basculement automatique.

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

## API gRPC

Le registre expose les méthodes gRPC suivantes :

### Opérations du fournisseur

| Méthode | Description |
|--------|-------------|
| `Register` | Enregistrer un jeu d'outils dans le registre. Valide les schémas d'outils, crée le flux de requêtes et démarre le suivi de la santé. Renvoie l'identifiant du flux auquel le fournisseur doit s'abonner. |
| `Unregister` | Supprimer un jeu d'outils du registre. Arrête les pings de santé et supprime les métadonnées, mais ne détruit pas le flux sous-jacent. |
| `EmitToolResult` | Émettre le résultat de l'exécution d'un outil. Recherche le flux de résultats dans Redis (permettant la livraison entre nœuds) et publie le résultat. |
| `Pong` | Répond à un ping de contrôle de santé. Met à jour l'horodatage du dernier ping dans la carte de santé partagée. |

### Opérations de découverte

| Méthode | Description |
|--------|-------------|
`ListToolsets` | Liste de tous les ensembles d'outils enregistrés (avec filtrage optionnel des balises). Retourne uniquement les métadonnées, pas les schémas complets. |
`GetToolset` | Obtenir le schéma complet d'un jeu d'outils spécifique, y compris tous les schémas d'entrée/sortie des outils. |
`Search` | Recherche de jeux d'outils par mot-clé correspondant au nom, à la description ou aux balises. |

### Opérations d'invocation

| Méthode | Description |
|--------|-------------|
| `CallTool` | Invocation d'un outil par le biais de la passerelle de registre. Valide la charge utile, vérifie l'état de santé de l'outil, l'achemine vers le fournisseur et attend le résultat (délai de 30 secondes). 

## Meilleures pratiques

### Déploiement

- **Utilisez le même `Name`** pour tous les nœuds d'un cluster - cela détermine les noms des ressources Pulse partagées
- **Utilisez la même instance Redis** pour la coordination de l'état
- **Déployer derrière un équilibreur de charge** pour les connexions des clients - tous les nœuds servent un état identique
- **Utiliser le magasin MongoDB** en production pour la persistance à travers les redémarrages (le magasin en mémoire perd les enregistrements au redémarrage)

### Surveillance de la santé

- **Définissez un `PingInterval`** approprié en fonction de vos exigences en matière de latence (par défaut : 10s). Des valeurs plus faibles détectent les défaillances plus rapidement mais augmentent le trafic Redis.
- **Ajustez `MissedPingThreshold`** pour équilibrer les faux positifs et la vitesse de détection (par défaut : 3). Le seuil de staleness est `(threshold + 1) × interval`.
- **Surveillez l'état de santé** via les métriques ou les journaux - les ensembles d'outils en mauvaise santé provoquent des erreurs immédiates `service_unavailable` plutôt que des dépassements de délai

### Mise à l'échelle

- **Ajouter des nœuds** pour gérer plus de connexions gRPC - chaque nœud peut répondre à n'importe quelle demande
- **Les nœuds partagent le travail** via les téléscripteurs distribués par Pulse - un seul nœud interroge chaque ensemble d'outils à la fois
- **Pas de sessions collantes** requises - les flux de résultats utilisent Redis pour la livraison entre nœuds, de sorte qu'un appel d'outil peut être initié sur un nœud et achevé sur un autre

## Prochaines étapes

- Découvrez les [Toolsets](./toolsets/) pour définir les outils
- Explorer [Production](./production/) pour les modèles de déploiement
- Découvrez [Composition de l'agent](./agent-composition/) pour le partage d'outils entre agents
