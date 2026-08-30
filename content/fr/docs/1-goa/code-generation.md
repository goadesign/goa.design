---
title: Génération de codes
weight: 3
description: "Complete guide to Goa's code generation - commands, process, generated code structure, and customization options."
llm_optimized: true
aliases:
---

La génération de code de Goa transforme votre conception en contrats de service,
transports, clients et documentation prêts pour la production. `goa example`
crée un assemblage de démarrage exécutable, tandis que votre application fournit
la logique métier.



## Outils de ligne de commande

### Installation

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

{{< alert title="Tester une version préliminaire de la génération" color="info" >}}
Les versions préliminaires sont facultatives. Fixez le module Goa et la
commande `goa` au même commit. Le travail actuel se trouve sur la
[branche préliminaire `fix/goa-generation-plan`](https://github.com/goadesign/goa/tree/fix/goa-generation-plan),
au commit
[`d176af09226076f90f22d0b4c8e8fbd2a46a1595`](https://github.com/goadesign/goa/commit/d176af09226076f90f22d0b4c8e8fbd2a46a1595).
Régénérez l'intégralité du répertoire `gen/`, ne mélangez jamais une sortie
stable avec une sortie préliminaire, puis compilez et testez l'application
complète. Coordonnez les mises à jour du client et du serveur lorsque le guide
signale une modification du format échangé. Pour revenir à la version stable,
fixez ensemble le module et la commande stables, puis régénérez tout.
{{< /alert >}}

### Commandes

Toutes les commandes s'appuient sur les chemins d'importation des paquets Go, et non sur les chemins d'accès au système de fichiers :

```bash
# ✅ Correct: using Go package import path
goa gen goa.design/examples/calc/design

# ❌ Incorrect: using filesystem path
goa gen ./design
```

#### Générer du code (`goa gen`)

```bash
goa gen <design-package-import-path> [-o <output-dir>]
```

La commande principale pour la génération de code :
- Traite votre paquetage de conception et génère le code d'implémentation
- Recrée à chaque fois l'intégralité du répertoire `gen/` à partir de zéro
- Exécution après chaque modification de la conception

#### Créer un exemple (`goa example`)

```bash
goa example <design-package-import-path> [-o <output-dir>]
```

Commande d'échafaudage :
- Crée une implémentation d'exemple unique
- Génère des stubs de handler avec la logique de l'exemple
- S'exécute une fois lors du démarrage d'un nouveau projet
- N'écrase PAS l'implémentation personnalisée existante

#### Afficher la version

```bash
goa version
```

### Workflow de développement

1. Création de la conception initiale
2. Exécuter `goa gen` pour générer le code de base
3. Exécuter `goa example` pour créer des stubs d'implémentation
4. Implémentez votre logique de service
5. Exécutez `goa gen` après chaque changement de conception

**Meilleure pratique:** Engagez le code généré dans le contrôle de version plutôt que de le générer pendant la CI/CD. Cela garantit des constructions reproductibles et permet de suivre les changements dans le code généré.

---

## Processus de génération

Lorsque vous exécutez `goa gen`, Goa suit un processus systématique :

### 1. Phase d'amorçage

Goa crée un `main.go` temporaire qui :
- Importe les paquets Goa et votre paquetage de conception
- Exécute l'évaluation du DSL
- Déclenche la génération de code

### 2. Évaluation de la conception

- Les fonctions DSL s'exécutent pour créer des objets d'expression
- Les expressions se combinent en un modèle API complet
- Les relations entre les expressions sont établies
- Les règles et contraintes de conception sont validées

### 3. Génération du code

- Les expressions validées sont transmises aux générateurs de code
- Les modèles sont rendus pour produire des fichiers de code
- La sortie est écrite dans le répertoire `gen/`

Avant le rendu, Goa détermine les paquets, les déclarations, les noms, les
importations, les chemins de champs et les branches connues à partir de la
conception complète et validée. Les modèles écrivent directement ces choix. Les
programmes générés ne choisissent une branche qu'en fonction des valeurs reçues
pendant l'exécution.

---

## Structure du code généré

Un projet typique généré :

```
myservice/
├── cmd/                    # Generated example commands
│   └── calc/
│       ├── grpc.go
│       └── http.go
├── design/                 # Your design files
│   └── design.go
├── gen/                    # Generated code (don't edit)
│   ├── calc/               # Service-specific code
│   │   ├── client.go
│   │   ├── endpoints.go
│   │   └── service.go
│   ├── http/               # HTTP transport layer
│   │   ├── calc/
│   │   │   ├── client/
│   │   │   └── server/
│   │   └── openapi.json
│   └── grpc/               # gRPC transport layer
│       └── calc/
│           ├── client/
│           ├── server/
│           └── pb/
└── myservice.go            # Your service implementation
```

### Interfaces de service

Générées dans `gen/<service>/service.go` :

```go
// Service interface defines the API contract
type Service interface {
    Add(context.Context, *AddPayload) (res int, err error)
    Multiply(context.Context, *MultiplyPayload) (res int, err error)
}

// Payload types
type AddPayload struct {
    A int32
    B int32
}

// Constants for observability
const ServiceName = "calc"
var MethodNames = [2]string{"add", "multiply"}
```

### Couche d'extrémité

Généré dans `gen/<service>/endpoints.go` :

```go
// Endpoints wraps service methods in transport-agnostic endpoints
type Endpoints struct {
    Add      goa.Endpoint
    Multiply goa.Endpoint
}

// NewEndpoints creates endpoints from service implementation
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        Add:      NewAddEndpoint(s),
        Multiply: NewMultiplyEndpoint(s),
    }
}

// Use applies middleware to all endpoints
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.Add = m(e.Add)
    e.Multiply = m(e.Multiply)
}
```

Exemple d'intergiciel de point final :

```go
func LoggingMiddleware(next goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req any) (res any, err error) {
        log.Printf("request: %v", req)
        res, err = next(ctx, req)
        log.Printf("response: %v", res)
        return
    }
}

endpoints.Use(LoggingMiddleware)
```

### Code client

Généré dans `gen/<service>/client.go` :

```go
// Client provides typed methods for service calls
type Client struct {
    AddEndpoint      goa.Endpoint
    MultiplyEndpoint goa.Endpoint
}

func NewClient(add, multiply goa.Endpoint) *Client {
    return &Client{
        AddEndpoint:      add,
        MultiplyEndpoint: multiply,
    }
}

func (c *Client) Add(ctx context.Context, p *AddPayload) (res int, err error) {
    ires, err := c.AddEndpoint(ctx, p)
    if err != nil {
        return
    }
    return ires.(int), nil
}
```

---

## Génération de code HTTP

### Mise en œuvre du serveur

Généré dans `gen/http/<service>/server/server.go` :

```go
func New(
    e *calc.Endpoints,
    mux goahttp.Muxer,
    decoder func(*http.Request) goahttp.Decoder,
    encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
    errhandler func(context.Context, http.ResponseWriter, error),
    formatter func(ctx context.Context, err error) goahttp.Statuser,
) *Server

// Server exposes handlers for modification
type Server struct {
    Mounts   []*MountPoint
    Add      http.Handler
    Multiply http.Handler
}

// Use applies HTTP middleware to all handlers
func (s *Server) Use(m func(http.Handler) http.Handler)
```

Configuration complète du serveur :

```go
func main() {
    svc := calc.New()
    endpoints := gencalc.NewEndpoints(svc)
    mux := goahttp.NewMuxer()
    server := genhttp.New(
        endpoints,
        mux,
        goahttp.RequestDecoder,
        goahttp.ResponseEncoder,
        nil, nil)
    genhttp.Mount(mux, server)
    http.ListenAndServe(":8080", mux)
}
```

### Mise en œuvre du client

Généré dans `gen/http/<service>/client/client.go` :

```go
func NewClient(
    scheme string,
    host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restoreBody bool,
) *Client
```

Configuration complète du client :

```go
func main() {
    httpClient := genclient.NewClient(
        "http",
        "localhost:8080",
        http.DefaultClient,
        goahttp.RequestEncoder,
        goahttp.ResponseDecoder,
        false,
    )

    client := gencalc.NewClient(
        httpClient.Add(),
        httpClient.Multiply(),
    )

    result, err := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
}
```

---

## Génération de code gRPC

### Définition de Protobuf

Généré dans `gen/grpc/<service>/pb/` :

```protobuf
syntax = "proto3";
package calc;

service Calc {
    rpc Add (AddRequest) returns (AddResponse);
    rpc Multiply (MultiplyRequest) returns (MultiplyResponse);
}

message AddRequest {
    int64 a = 1;
    int64 b = 2;
}
```

### Implémentation du serveur

```go
func main() {
    svc := calc.New()
    endpoints := gencalc.NewEndpoints(svc)
    svr := grpc.NewServer()
    gensvr := gengrpc.New(endpoints, nil)
    genpb.RegisterCalcServer(svr, gensvr)
    lis, _ := net.Listen("tcp", ":8080")
    svr.Serve(lis)
}
```

### Implémentation du client

```go
func main() {
    conn, _ := grpc.Dial("localhost:8080",
        grpc.WithTransportCredentials(insecure.NewCredentials()))
    defer conn.Close()

    grpcClient := genclient.NewClient(conn)
    client := gencalc.NewClient(
        grpcClient.Add(),
        grpcClient.Multiply(),
    )

    result, _ := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
}
```

---

## Personnalisation

### Contrôle de la génération des types

Force la génération de types qui ne sont pas directement référencés par les méthodes :

```go
var MyType = Type("MyType", func() {
    // Force generation in specific services
    Meta("type:generate:force", "service1", "service2")
    
    // Or force generation in all services
    Meta("type:generate:force")
    
    Attribute("name", String)
})
```

### Organisation du paquet

Générer des types dans un paquetage partagé :

```go
var CommonType = Type("CommonType", func() {
    Meta("struct:pkg:path", "types")
    Meta("type:generate:force")
    Attribute("id", String)
})
```

Crée :
```
gen/
└── types/
    └── common_type.go
```

`struct:pkg:path` attribue au type défini dans la conception une seule
déclaration dans le paquet généré choisi, et chaque utilisation générée importe
cette déclaration. Le nom du paquet Go est le dernier segment du chemin en
minuscules. Si le type déplacé contient un autre type défini dans la conception,
cette dépendance doit elle aussi déclarer explicitement `struct:pkg:path`, en
général avec le même paquet. Les types imbriqués créés par le compilateur
restent avec le type défini dans la conception auquel ils appartiennent.

Une déclaration définie dans la conception est réutilisée entre les services et
entre ses utilisations comme charge utile, résultat et erreur. Lorsque ce type
exact est une erreur personnalisée, Goa ajoute les méthodes d'erreur à la même
déclaration au lieu de générer un second type.

### Personnalisation des champs

```go
var Message = Type("Message", func() {
    Attribute("id", String, func() {
        // Override field name
        Meta("struct:field:name", "ID")
        
        // Add custom struct tags
        Meta("struct:tag:json", "id,omitempty")
        Meta("struct:tag:msgpack", "id,omitempty")
        
        // Override type
        Meta("struct:field:type", "bson.ObjectId", "github.com/globalsign/mgo/bson", "bson")
    })
})
```

### Personnalisation de la mémoire tampon du protocole

```go
var MyType = Type("MyType", func() {
    // Override protobuf message name
    Meta("struct:name:proto", "CustomProtoType")
    
    Field(1, "status", Int32, func() {
        // Override protobuf field type
        Meta("struct:field:proto", "int32")
    })

    // Use Google's timestamp type
    Field(2, "created_at", String, func() {
        Meta("struct:field:proto", 
            "google.protobuf.Timestamp",
            "google/protobuf/timestamp.proto",
            "Timestamp",
            "google.golang.org/protobuf/types/known/timestamppb")
    })
})

// Specify protoc include paths
var _ = API("calc", func() {
    Meta("protoc:include", "/usr/include", "/usr/local/include")
})
```

### Personnalisation de l'OpenAPI

Par défaut, Goa génère les documents OpenAPI 2.0 et 3.0. Pour générer aussi une
description OpenAPI 3.2.0, sélectionnez-la explicitement au niveau de l'API :

```go
var _ = API("MyAPI", func() {
    Meta("openapi:versions", "2.0", "3.0", "3.2")
    Meta("openapi:path:3.2", "docs/openapi")
})
```

Les versions sélectionnées sont écrites en JSON et en YAML. L'exemple ci-dessus
génère `gen/docs/openapi.json` et `gen/docs/openapi.yaml` pour OpenAPI 3.2 ;
sans remplacement du chemin, Goa écrit `gen/http/openapi3.2.json` et
`gen/http/openapi3.2.yaml`. La sélection des versions ne modifie pas le code de
service généré.

```go
var _ = API("MyAPI", func() {
    // Control generation
    Meta("openapi:generate", "false")
    
    // Format JSON output
    Meta("openapi:json:prefix", "  ")
    Meta("openapi:json:indent", "  ")
    
    // Disable example generation
    Meta("openapi:example", "false")
})

var _ = Service("UserService", func() {
    // Add tags
    HTTP(func() {
        Meta("openapi:tag:Users")
        Meta("openapi:tag:Backend:desc", "Backend API Operations")
    })
    
    Method("CreateUser", func() {
        // Custom operation ID
        Meta("openapi:operationId", "{service}.{method}")
        
        // Custom summary
        Meta("openapi:summary", "Create a new user")
        
        HTTP(func() {
            // Add extensions
            Meta("openapi:extension:x-rate-limit", `{"rate": 100}`)
            POST("/users")
        })
    })
})

var User = Type("User", func() {
    // Override type name in OpenAPI spec
    Meta("openapi:typename", "CustomUser")
})
```

---

## Types et validation

### Application de la validation

Goa valide les données aux limites du système :
- **Côté serveur** : Validation des requêtes entrantes
- **Côté client** : Valide les réponses entrantes
- **Code interne** : Confiance dans le maintien des invariants

### Règles de pointeur pour les champs de structure

Les types de service représentent des valeurs déjà validées. Les types de
transport décodés doivent aussi conserver l'absence d'un champ entrant.

| Champ | Type de service | Corps HTTP/JSON-RPC | Requête ou réponse protobuf |
|---|---|---|---|
| Primitif requis ou avec valeur par défaut | Valeur | Pointeur au décodage pour valider la présence ; valeur à l'encodage | Pointeur pour les champs singuliers dont la présence doit être conservée |
| Primitif facultatif sans valeur par défaut | Pointeur | Pointeur | Pointeur |
| Objet | Pointeur | Pointeur | Pointeur |
| Tableau ou map | Valeur | Valeur | Valeur |

Pour HTTP et JSON-RPC, une entrée décodée est une requête côté serveur ou une
réponse côté client. Les requêtes encodées par le client et les réponses
encodées par le serveur utilisent des valeurs. Dans les structs protobuf, les
booléens, nombres, strings, enums et leurs alias singuliers requis sont des
pointeurs dans les requêtes comme dans les réponses. La validation distingue
ainsi un champ absent d'une valeur zéro explicite. Les slices d'octets restent
des slices, les messages restent des pointeurs et les structs de service
conservent leur structure.

Exemple :
```go
type Person struct {
    Name     string             // required, direct value
    Age      *int               // optional, pointer
    Hobbies  []string           // array, no pointer
    Metadata map[string]string  // map, no pointer
}
```

`ArrayOfRequired` utilise des pointeurs pour les éléments primitifs et leurs
alias uniquement dans les corps HTTP et JSON-RPC entrants afin de refuser
`[null]`. Le service et les réponses générées utilisent des slices de valeurs.

### Traitement des valeurs par défaut

- **Marshaling** : Les valeurs par défaut initialisent les tableaux/maps nuls
- **Les valeurs par défaut s'appliquent aux champs optionnels manquants (et non aux champs obligatoires manquants) : Les valeurs par défaut s'appliquent aux champs optionnels manquants (et non aux champs obligatoires manquants)

---

## Vues et types de résultats

Les vues contrôlent la manière dont les types de résultats sont affichés dans les réponses.

### Fonctionnement des vues

1. La méthode de service comprend un paramètre de vue
2. Un paquet de vues est généré au niveau du service
3. La validation spécifique à la vue est automatiquement générée

### Réponse côté serveur

1. Le type de résultat visualisé est marshallé
2. Les attributs Nil sont omis
3. Le nom de la vue est transmis dans l'en-tête "Goa-View"

### Réponse côté client

1. La réponse est unmarshalled
2. Transformée en type de résultat visualisé
3. Nom de la vue extrait de l'en-tête "Goa-View"
4. Validation spécifique à la vue effectuée
5. Reconverti en type de résultat de service

### Vue par défaut

Si aucune vue n'est définie, Goa ajoute une vue "par défaut" qui comprend tous les champs de base.

---

## Système de plugin

Le système de plugins de Goa étend la génération de code. Les plugins peuvent :

1. **Ajouter de nouveaux DSL** - Constructions de langage de conception supplémentaires
2. **Modifier le code généré** - Inspecter et modifier les fichiers, ajouter de nouveaux fichiers

Exemple utilisant le plugin CORS :

```go
import (
    . "goa.design/goa/v3/dsl"
    cors "goa.design/plugins/v3/cors/dsl"
)

var _ = Service("calc", func() {
    cors.Origin("/.*localhost.*/", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
    })
})
```

Cas d'utilisation courants des plugins :
- Prise en charge des protocoles (CORS, etc.)
- Formats de documentation supplémentaires
- Règles de validation personnalisées
- Questions transversales (journalisation, métriques)
- Génération de fichiers de configuration

Les fonctions de rappel publiées restent adaptées aux plugins qui modifient des
valeurs ou des fichiers générés. Un plugin qui déclare un nom au niveau d'un
paquet doit utiliser la phase de planification de la fabrique afin que Goa
puisse réserver ce nom avec toutes les autres déclarations avant le rendu.
Consultez [l'architecture de la génération de code](https://github.com/goadesign/goa/blob/d176af09226076f90f22d0b4c8e8fbd2a46a1595/codegen/ARCHITECTURE.md)
et le
[guide de mise à niveau de la version préliminaire](https://github.com/goadesign/goa/blob/d176af09226076f90f22d0b4c8e8fbd2a46a1595/UPGRADING.md)
pour le contrat détaillé des plugins et les étapes de migration.

---

## Voir aussi

- [DSL Reference](dsl-reference/) - Référence DSL complète pour les fichiers de conception
- [Guide HTTP](http-guide/) - Fonctionnalités de transport HTTP et personnalisation
- [Guide gRPC](grpc-guide/) - Fonctionnalités de transport gRPC et tampons de protocole
- [Quickstart](quickstart/) - Démarrage avec la génération de code
