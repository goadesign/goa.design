---
nav_group: reference
title: "Registre des outils internes"
linkTitle: "Registre"
weight: 110
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

- **Partager les inscriptions des outils** en lisant directement leur état dans Redis
- **Coordonner les pings de santé** avec des baux Redis à expiration, acquis séparément pour chaque ensemble d'outils
- **Partager l'état de santé du fournisseur** sur tous les nœuds

Cela permet une mise à l’échelle horizontale et une haute disponibilité. Les clients peuvent se connecter à n'importe quel nœud et voir le même état du registre.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## Démarrage rapide

### Utilisation de la bibliothèque

Créez et exécutez un nœud de registre par programme. `registry.New` initialise
le catalogue et les enregistrements d'appels dans Redis, les flux Pulse et
l'ordonnanceur de santé. `Run` démarre le serveur gRPC et attend l'arrêt.
L'exemple utilise des adresses de développement locales ; configurez les
identifiants Redis et gRPC adaptés à votre déploiement.

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
| **Catalogue** | Schémas d'outils, jetons d'admission, baux de fournisseurs et historique des retraits stockés dans Redis |
| **Suivi de la santé** | Surveille la vivacité du fournisseur via ping/pong |
| **Gestionnaire de flux** | Gère les flux Pulse pour le routage des appels d'outils |
| **Magasin des appels** | Conserve l'identité de la requête, l'affectation au fournisseur, les échéances, l'état de publication et le résultat terminal canonique |

### Flux d'appels d'outils

Lorsque `CallTool` est appelé, le registre effectue ces étapes dans l'ordre :

1. **Validation de l'identité et du schéma** : le registre valide la charge
   utile et dérive un `tool_use_id` unique dans l'exécution. Une nouvelle
   tentative identique rejoint l'enregistrement conservé.
2. **Attente d'un fournisseur** : un appel non publié attend qu'un fournisseur
   sain serve l'ensemble d'outils actif, dans la limite de son échéance
   d'exécution existante.
3. **Publication atomique** : une seule opération Redis vérifie que le
   fournisseur choisi est toujours courant et ne se draine pas, puis ajoute la
   requête exactement une fois. Si un déploiement a changé de fournisseur après
   le contrôle de santé, l'appel non publié choisit le remplaçant et réessaie
   dans la même échéance.
4. **Exécution immuable** : la publication réussie fixe l'affectation au
   fournisseur. L'appel ne peut plus être déplacé, car un effet externe peut
   avoir commencé.
5. **Livraison du résultat** : `CallTool` renvoie le jeton exact du fournisseur,
   l'identité du flux de résultat, l'échéance d'exécution et celle de
   conservation. L'exécuteur lit ce flux jusqu'au résultat terminal ou jusqu'à
   ce que l'échéance règle l'appel.

Si l'échéance expire avant la publication, le registre enregistre
`call_not_admitted`, ce qui permet à l'exécuteur de choisir un autre plan.
Un appel publié dont le résultat reste incertain renvoie `outcome_unknown`
et ne peut pas être remplacé.

## Intégration du fournisseur (côté service)

Le routage du registre ne représente que la moitié du problème : **les fournisseurs doivent exécuter une boucle d'exécution d'outils** dans le processus de service propriétaire de l'ensemble d'outils.
Avant d'invoquer un gestionnaire, le fournisseur appelle `ClaimToolCall` avec le
contexte lié au cycle de vie de son worker et le délai maximal existant pour cet
appel, indépendamment de l'échéance d'exécution du message. Le registre détermine
si l'appel a expiré, dispose déjà d'un résultat final ou si une autre livraison
en détient l'exécution. Dans ces cas, le fournisseur accuse réception du message
sans invoquer le gestionnaire ni arrêter sa boucle d'exécution. Ce n'est qu'après une
décision `execute` qu'il invoque le gestionnaire avec l'échéance d'exécution
initiale du message, sans la prolonger.

Pour les ensembles d'outils appartenant au service et basés sur des méthodes (outils déclarés avec `BindTo(...)`), la génération de code émet un adaptateur de fournisseur à l'adresse :

- `gen/<service>/toolsets/<toolset>/provider.go`

Le fournisseur généré :

- Décode la charge utile de l'outil entrant JSON à l'aide du codec de charge utile généré
- Construit la charge utile de la méthode Goa à l'aide des transformations générées
- Appelle la méthode de service liée
- Encode le résultat de l'outil JSON avec toutes les données de serveur déclarées à l'aide du codec de résultat généré

L'exemple ci-dessous utilise le module `example.com/registry-provider`, le
service `catalog` et son ensemble d'outils `search`, lié aux méthodes du service
et enregistré sous `catalog.search`. Remplacez les deux chemins d'import de
l'application et le nom de l'ensemble d'outils par vos valeurs générées.
`NewProvider`, `ToolSchemas` et `SchemaFingerprint` proviennent du package
d'outils généré ; conservez les schémas générés intacts. Les callbacks
d'enregistrement suivent l'exemple **Service-Side Tool Providers** du fichier
`AGENTS_QUICKSTART.md` généré à la racine du module
([Démarrage rapide](../quickstart/)).

Fournissez votre implémentation du service, un client Pulse construit avec
`pulse.New(pulse.Options{Redis: rdb})` et une connexion gRPC au registre créée
avec `grpc.NewClient` et les identifiants de votre déploiement. Fournissez un
`providerID` stable pour ce processus et cet ensemble d'outils, unique parmi
les réplicas actifs, ainsi que l'`admissionRevision` obligatoire fournie par
le déploiement et partagée par les réplicas du même enregistrement. `Serve`
crée l'identifiant d'incarnation et le transmet aux callbacks. Les méthodes
de service liées doivent respecter l'annulation du contexte. Exécutez
`serveTools` dans le cycle de vie du service et attendez son retour avant de
fermer l'un des clients. À l'arrêt, le fournisseur cesse d'accepter du travail
et finalise les appels dont il détient l'exécution, leurs résultats et les
accusés de réception dans la limite de `Options.ShutdownTimeout`. Seule une
finalisation réussie permet de libérer le bail exact, avec le délai distinct
`Registration.ReleaseTimeout`. En cas d'échec de finalisation, l'expiration
du bail met fin à cette autorité. Conservez et signalez les erreurs de
finalisation ou de libération, même si l'erreur renvoyée correspond aussi à
`context.Canceled`. Tous les callbacks d'enregistrement requis sont configurés
ci-dessous :

```go
package providers

import (
	"context"
	"encoding/json"
	"time"

	gencatalog "example.com/registry-provider/gen/catalog"
	gensearch "example.com/registry-provider/gen/catalog/toolsets/search"
	"goa.design/goa-ai/features/stream/pulse/clients/pulse"
	genregistrygrpc "goa.design/goa-ai/registry/gen/grpc/registry/client"
	genregistry "goa.design/goa-ai/registry/gen/registry"
	registrywire "goa.design/goa-ai/runtime/toolregistry"
	"goa.design/goa-ai/runtime/toolregistry/provider"
	"google.golang.org/grpc"
)

// serveTools runs the generated catalog provider until shutdown or a provider error.
// The caller owns the clients, service implementation, and deployment identifiers.
func serveTools(ctx context.Context, pulseClient pulse.Client, conn *grpc.ClientConn,
	serviceImpl gencatalog.Service, providerID, admissionRevision string) error {
	const toolsetID = "catalog.search"
	transport := genregistrygrpc.NewClient(conn, grpc.WaitForReady(true))
	registryClient := genregistry.NewClient(
		transport.Register(),
		transport.RenewProvider(),
		transport.ReleaseProvider(),
		transport.DrainProvider(),
		transport.Unregister(),
		transport.Pong(),
		transport.ListToolsets(),
		transport.GetToolset(),
		transport.ResolveToolset(),
		transport.CheckAdmission(),
		transport.Search(),
		transport.CallTool(),
		transport.CallResolvedTool(),
		transport.RetryTool(),
		transport.CompleteToolCall(),
		transport.PublishToolOutputDelta(),
		transport.ReportToolCallOverload(),
		transport.ClaimToolCall(),
	)
	toolSchemas := gensearch.ToolSchemas()
	handler := gensearch.NewProvider(serviceImpl)
	return provider.Serve(ctx, pulseClient, toolsetID, handler,
		provider.Registration{
			AdmissionRevision: admissionRevision,
			Register: func(ctx context.Context, toolset, providerID, incarnationID, admissionRevision string) (provider.RegistrationLease, error) {
				schemaFingerprint, err := gensearch.SchemaFingerprint(toolset)
				if err != nil {
					return provider.RegistrationLease{}, err
				}
				result, err := registryClient.Register(ctx, &genregistry.RegisterPayload{
					Name:                  toolset,
					Tools:                 toolSchemas,
					ProviderID:            providerID,
					ProviderIncarnationID: incarnationID,
					AdmissionRevision:     admissionRevision,
					WireProtocolVersion:   registrywire.WireProtocolVersion,
					SchemaFingerprint:     schemaFingerprint,
				})
				if err != nil {
					return provider.RegistrationLease{}, err
				}
				return provider.RegistrationLease{
					RegistrationToken: result.RegistrationToken,
					Duration:          time.Duration(result.LeaseDurationMs) * time.Millisecond,
				}, nil
			},
			Renew: func(ctx context.Context, toolset, providerID, incarnationID, expectedToken string) (time.Duration, error) {
				result, err := registryClient.RenewProvider(ctx, &genregistry.RenewProviderPayload{
					Name: toolset,
					ProviderID: providerID,
					ProviderIncarnationID: incarnationID,
					ExpectedRegistrationToken: expectedToken,
				})
				if err != nil {
					return 0, err
				}
				return time.Duration(result.LeaseDurationMs) * time.Millisecond, nil
			},
			Drain: func(ctx context.Context, toolset, providerID, incarnationID, expectedToken string, settlementDuration time.Duration) error {
				return registryClient.DrainProvider(ctx, &genregistry.DrainProviderPayload{
					Name:                      toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ExpectedRegistrationToken: expectedToken,
					SettlementDurationMs:      settlementDuration.Milliseconds(),
				})
			},
			Release: func(ctx context.Context, toolset, providerID, incarnationID, expectedToken string) error {
				return registryClient.ReleaseProvider(ctx, &genregistry.ReleaseProviderPayload{
					Name:                      toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ExpectedRegistrationToken: expectedToken,
				})
			},
			Complete: func(ctx context.Context, toolset, providerID, incarnationID, providerToken, requestEventID string, result registrywire.ToolResultMessage) error {
				resultJSON, err := json.Marshal(result)
				if err != nil {
					return err
				}
				return registryClient.CompleteToolCall(ctx, &genregistry.CompleteToolCallPayload{
					Toolset:                   toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					RegistrationToken:         result.RegistrationToken,
					ToolUseID:                 result.ToolUseID,
					ResultJSON:                resultJSON,
					RequestEventID:            requestEventID,
					ProviderRegistrationToken: providerToken,
				})
			},
			PublishOutputDelta: func(ctx context.Context, toolset, providerID, incarnationID, providerToken, callToken, toolUseID, requestEventID, stream, delta string) error {
				return registryClient.PublishToolOutputDelta(ctx, &genregistry.PublishToolOutputDeltaPayload{
					Toolset:                   toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ProviderRegistrationToken: providerToken,
					CallRegistrationToken:     callToken,
					ToolUseID:                 toolUseID,
					RequestEventID:            requestEventID,
					Stream:                    stream,
					Delta:                     delta,
				})
			},
			ReportOverload: func(ctx context.Context, toolset, providerID, incarnationID, providerToken, callToken, toolUseID, requestEventID string) error {
				return registryClient.ReportToolCallOverload(ctx, &genregistry.ProviderToolCallClaimPayload{
					Toolset:                   toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ProviderRegistrationToken: providerToken,
					CallRegistrationToken:     callToken,
					ToolUseID:                 toolUseID,
					RequestEventID:            requestEventID,
				})
			},
			Claim: func(ctx context.Context, claim provider.ClaimRequest) (provider.ClaimDisposition, error) {
				result, err := registryClient.ClaimToolCall(ctx, &genregistry.ClaimToolCallPayload{
					Toolset:                   claim.Toolset,
					ProviderID:                claim.ProviderID,
					ProviderIncarnationID:     claim.ProviderIncarnationID,
					ProviderRegistrationToken: claim.ProviderRegistrationToken,
					CallRegistrationToken:     claim.CallRegistrationToken,
					ToolUseID:                 claim.ToolUseID,
					RequestEventID:            claim.RequestEventID,
					ClaimOperationID:          claim.OperationID,
				})
				if err != nil {
					return "", err
				}
				return provider.ClaimDisposition(result.Disposition), nil
			},
		},
		provider.Options{
			ProviderID: providerID,
			Pong: func(ctx context.Context, providerID, incarnationID, pingID string) error {
				return registryClient.Pong(ctx, &genregistry.PongPayload{
					PingID:                pingID,
					Toolset:               toolsetID,
					ProviderID:            providerID,
					ProviderIncarnationID: incarnationID,
				})
			},
		},
	)
}
```

Les ID de flux sont déterministes :

- Appels d'outil : `toolset:<toolsetID>:requests`
- Résultats : `result:<toolUseID>`

## Configuration

### Options du registre {#structure-de-configuration}

L'[exemple de la bibliothèque](#utilisation-de-la-bibliothèque) montre la
configuration minimale : passez le client Redis de l'application dans `Redis`
et choisissez un `Name` partagé pour le cluster. Les nœuds utilisant le même
nom et la même base Redis partagent le catalogue, les enregistrements d'appels
et la coordination des contrôles de santé. Chaque nœud lit directement l'état compact du catalogue dans Redis ; les
définitions complètes sont stockées séparément.

Consultez [registry.Config](https://pkg.go.dev/goa.design/goa-ai/registry#Config) pour l'API complète et les valeurs par défaut.
`PingInterval` et `MissedPingThreshold` règlent les contrôles de santé ;
`ExecutionTimeout` borne les nouvelles exécutions admises ; `ResultStreamTTL`
règle la conservation des résultats ; `ProviderLeaseDuration` règle le
renouvellement des inscriptions des fournisseurs. `ExpectedToolsets` signale
les noms requis dans la télémétrie sans rejeter d'inscription ni d'appel.
`Logger` reçoit les erreurs de finalisation des appels. Définissez ces options
lors de la construction du registre.

### Stockage Redis {#implémentations-de-magasin}

Redis conserve les schémas d'outils, les identités d'admission, les baux des
fournisseurs, les horodatages de santé et l'historique des retraits dans le
catalogue. Les enregistrements d'appels et les flux Pulse de requêtes et de
résultats utilisent aussi Redis. Utilisez un Redis durable pour que les
répliques et les processus redémarrés observent les mêmes inscriptions et
décisions d'appel. L'application possède le client Redis et le ferme après
l'arrêt du registre.

### Renouvellement des fournisseurs et mise à niveau du stockage {#provider-renewal-and-storage-upgrades}

Les fournisseurs envoient les schémas générés une fois au démarrage. Le callback
obligatoire `Renew` appelle `RenewProvider` avec le nom de l'ensemble d'outils,
l'identifiant du fournisseur, celui de son incarnation et le jeton d'inscription
attendu. Il renvoie uniquement la durée accordée au bail. Le renouvellement ne
crée aucun bail, ne change pas son jeton et n'annule pas le drainage. Un bail
absent, expiré, remplacé ou retiré renvoie `provider_lease_lost` et `Serve`
s'arrête. Les erreurs de communication temporaires sont réessayées uniquement
avant la limite du bail existant. La réparation des flux, groupes et pings reste
prise en charge.

Le registre sépare l'état compact d'admission, des baux, de santé et de découverte
des définitions complètes et des jetons définitivement retirés. L'inscription
met à jour les données concernées atomiquement. Les contrôles de santé et les
opérations sur les baux ne transfèrent que l'état compact. Chaque processus
réutilise les définitions par empreinte et conserve les validateurs compilés ;
Get et Resolve renvoient des valeurs complètes indépendantes.

La migration de l'ancien catalogue combiné exige une maintenance coordonnée.
Arrêtez les nouvelles demandes, terminez les appels acceptés, arrêtez proprement
les fournisseurs pendant que l'ancien registre peut encore drainer et libérer
leurs baux, puis arrêtez tous les processus écrivant dans l'ancien registre.
Sauvegardez et convertissez le catalogue hors ligne en préservant chaque
définition, identité, bail, horodatage et jeton retiré. Conservez les appels,
flux, index de finalisation et échéances de rétention. Démarrez le nouveau
registre et les fournisseurs mis à jour ; reprenez après validation stricte au
démarrage et réussite des contrôles `CheckAdmission` exacts. Les empreintes des
outils et la version des messages fournisseurs ne changent pas. Ajoutez `Renew`
et régénérez les clients. Ne mélangez jamais les anciens et nouveaux processus
d'écriture. Restaurez la sauvegarde intacte uniquement tant que tous sont arrêtés
et qu'aucune nouvelle écriture n'a repris ; ensuite, corrigez avec une nouvelle
version. Le démarrage normal ne décode pas l'ancien format.

## Surveillance de la santé

Le registre envoie les pings de santé sur les flux Pulse. Les fournisseurs répondent par la méthode gRPC `Pong`.

### Comment ça marche

1. L'ordonnanceur de santé lit les ensembles d'outils actifs dans le catalogue partagé.
2. Le nœud détenant le bail de ping d'un ensemble d'outils envoie un ping tant qu'un fournisseur actif accepte les appels.
3. `Pong` met à jour le catalogue uniquement si la réponse correspond à l'inscription, au processus fournisseur et à l'identité du contrôle de santé actuels.
4. Le routage exige un bail fournisseur non expiré acceptant de nouveaux appels et un pong accepté suffisamment récent.

La santé est déduite du catalogue à partir de l'heure Redis. L'âge du dernier
pong accepté ne doit pas dépasser `(MissedPingThreshold + 1) × PingInterval`.
Un appel non publié attend un fournisseur sain uniquement dans la limite de
son échéance d'exécution existante.

### Coordination distribuée

Chaque nœud exécute un ordonnanceur local et tente d'acquérir un bail Redis
à expiration pour chaque ensemble d'outils. Le nœud qui obtient le bail
effectue ce contrôle de santé ; après expiration, un autre peut l'acquérir.
Les noms des baux sont propres au cluster du registre.

Les baux fournisseurs, l'identité actuelle du contrôle de santé et le dernier
pong accepté sont conservés ensemble dans le catalogue. Chaque nœud déduit
la santé de cet enregistrement : une réponse tardive d'un ancien fournisseur
ne peut donc pas rendre l'inscription actuelle saine.

## Intégration client

Utilisez le client de service généré du registre pour les API fournisseur et
d'invocation. Pour découvrir le catalogue, `runtime/registry.NewClient`
enveloppe ce même client et expose `ListToolsets`, `GetToolset` et `Search`,
avec les types de ressources utilisés par `runtime/registry.Manager`.

L'exemple liste le catalogue et récupère le schéma complet d'un ensemble
d'outils nommé. Passez une connexion créée avec `grpc.NewClient` et les
identifiants de votre déploiement ; l'appelant conserve la propriété de cette
connexion. Tous les endpoints du client généré sont connectés, comme dans
l'exemple fournisseur ci-dessus.

```go
package discovery

import (
	"context"

	genregistrygrpc "goa.design/goa-ai/registry/gen/grpc/registry/client"
	genregistry "goa.design/goa-ai/registry/gen/registry"
	runtimeregistry "goa.design/goa-ai/runtime/registry"
	"google.golang.org/grpc"
)

// discoverTools lists the catalog and retrieves the schema of the named toolset.
// The caller creates the gRPC connection and keeps it open during discovery.
func discoverTools(ctx context.Context, conn *grpc.ClientConn, toolsetName string) (
	[]*runtimeregistry.ToolsetInfo, *runtimeregistry.ToolsetSchema, error,
) {
	transport := genregistrygrpc.NewClient(conn, grpc.WaitForReady(true))
	generated := genregistry.NewClient(
		transport.Register(),
		transport.RenewProvider(),
		transport.ReleaseProvider(),
		transport.DrainProvider(),
		transport.Unregister(),
		transport.Pong(),
		transport.ListToolsets(),
		transport.GetToolset(),
		transport.ResolveToolset(),
		transport.CheckAdmission(),
		transport.Search(),
		transport.CallTool(),
		transport.CallResolvedTool(),
		transport.RetryTool(),
		transport.CompleteToolCall(),
		transport.PublishToolOutputDelta(),
		transport.ReportToolCallOverload(),
		transport.ClaimToolCall(),
	)
	client := runtimeregistry.NewClient(generated)
	toolsets, err := client.ListToolsets(ctx)
	if err != nil {
		return nil, nil, err
	}
	schema, err := client.GetToolset(ctx, toolsetName)
	if err != nil {
		return nil, nil, err
	}
	return toolsets, schema, nil
}
```

## gRPC API

Le registre expose les méthodes gRPC suivantes :

### Opérations du fournisseur

| Méthode | Description |
|--------|-------------|
| `Register` | Admet un fournisseur au démarrage avec ses définitions générées. Un contrat différent attend la fin des anciens baux. |
| `RenewProvider` | Prolonge le bail exact non expiré sans envoyer les définitions. Préserve le drainage et toute échéance de finalisation plus longue ; la perte du bail renvoie `provider_lease_lost`. |
| `DrainProvider` | Rend un bail indisponible pour les nouveaux appels tout en conservant son autorité sur les appels déjà admis. |
| `ReleaseProvider` | Retire le bail exact après que le processus a réglé le travail accepté. |
| `Unregister` | Retire intentionnellement l'admission active exacte, la supprime de la découverte et du routage et empêche définitivement le retour du même jeton. Ce n'est pas une opération de déploiement. |
| `Pong` | Enregistre la santé pour le bail et l'époque de contrôle exacts. |
| `ClaimToolCall` | Accorde l'exécution d'une requête publiée à un bail exact. |
| `CompleteToolCall` | Valide le résultat terminal canonique d'un appel réclamé et le publie dans le flux de résultat. |
| `PublishToolOutputDelta` | Publie un fragment de progression limité et au mieux pour un appel réclamé. |
| `ReportToolCallOverload` | Enregistre une commande de nouvelle tentative limitée avant l'exécution d'un appel en surcharge. |

### Opérations de découverte

| Méthode | Description |
|--------|-------------|
| `ListToolsets` | Répertoriez tous les ensembles d’outils enregistrés (avec filtrage de balises facultatif). Renvoie uniquement les métadonnées, pas les schémas complets. |
| `GetToolset` | Obtenez le schéma complet pour un ensemble d'outils spécifique, y compris tous les schémas d'entrée/sortie des outils. |
| `Search` | Recherchez des ensembles d’outils par mot-clé correspondant au nom, à la description ou aux balises. |

### Opérations d'appel

| Méthode | Description |
|--------|-------------|
| `CallTool` | Appelle un outil via le registre, rejoint une tentative identique, attend un fournisseur sain dans l'échéance existante, publie atomiquement puis renvoie l'identité exacte nécessaire pour lire le résultat. |

## Meilleures pratiques

### Déploiement

- **Utilisez le même `Name`** pour tous les nœuds d'un cluster afin de partager le catalogue et les appels et de coordonner les contrôles de santé
- **Pointez vers la même instance Redis** pour la coordination de l'État
- **Déployer derrière un équilibreur de charge** pour les connexions client : tous les nœuds servent un état identique
- **Utilisez un Redis durable** pour le catalogue, les enregistrements d'appels et les flux Pulse afin que les répliques et les processus redémarrés observent les mêmes décisions

### Surveillance de la santé

- **Configurez `PingInterval` et `MissedPingThreshold`** selon la fréquence des contrôles et l'âge de pong toléré. Consultez `registry.Config` pour les valeurs par défaut.
- **Observez la télémétrie du catalogue et de santé** pour distinguer les ensembles d'outils absents des fournisseurs temporairement indisponibles pour de nouveaux appels.
- **Conservez l'échéance d'exécution** : les appels non publiés attendent le rétablissement d'un fournisseur uniquement jusqu'à leur échéance existante.

### Mise à l'échelle

- **Ajoutez des nœuds** pour gérer davantage de connexions gRPC : chaque nœud peut répondre à n'importe quelle requête.
- **Les nœuds coordonnent les contrôles de santé** avec des baux Redis à expiration pour chaque ensemble d'outils
- **Aucune session persistante** n'est requise : les flux de résultats utilisent Redis pour la livraison entre nœuds, de sorte qu'un appel d'outil peut être lancé sur un nœud et terminé sur un autre.

## Prochaines étapes

- En savoir plus sur les [Ensembles d'outils](./toolsets/) pour définir des outils
- Explorez [Production](./production/) pour les modèles de déploiement
- En savoir plus sur la [Composition d'agent](./agent-composition/) pour le partage d'outils entre agents


Consultez [Recherche d’outils et catalogues dynamiques](../tool-search/) pour la résolution actuelle, les contrats générés, les fournisseurs et la migration.
