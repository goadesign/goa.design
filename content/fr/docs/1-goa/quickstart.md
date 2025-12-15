---
title: Démarrage rapide
weight: 1
description: "Complete guide to installing Goa and building your first service - from setup to running a working HTTP endpoint."
llm_optimized: true
aliases:
---

Ce guide vous accompagne dans l'installation de Goa et la création de votre premier service. À la fin, vous aurez une API HTTP fonctionnelle que vous pourrez étendre et personnaliser.

## Prérequis

Avant de commencer, assurez-vous que votre environnement répond aux exigences suivantes :

- **Go 1.18 ou plus récent** - Goa exploite les fonctionnalités modernes de Go
- **Modules Go activés** - C'est la valeur par défaut dans Go 1.16+, mais vérifiez avec `GO111MODULE=on` si nécessaire
- **curl ou n'importe quel client HTTP** - Pour tester votre service

## Installation

Installez les paquets Goa et l'outil CLI :

```bash
# Pull the Goa packages
go get goa.design/goa/v3/...

# Install the Goa CLI
go install goa.design/goa/v3/cmd/goa@latest

# Verify the installation
goa version
```

Vous devriez voir la version actuelle de Goa (par exemple, `v3.x.x`). Si la commande `goa` n'est pas trouvée, assurez-vous que votre répertoire Go bin est dans votre PATH :

```bash
export PATH=$PATH:$(go env GOPATH)/bin
```

---

## Créer votre premier service

Construisons maintenant un simple service "hello world" qui démontre l'approche "design-first" de Goa.

### 1. Configuration du projet

Créez un nouveau répertoire et initialisez un module Go :

```bash
mkdir hello-goa && cd hello-goa  
go mod init hello
```

**Note:** Nous utilisons un nom de module simple `hello` pour ce guide. Dans les projets réels, vous utiliserez généralement un nom de domaine comme `github.com/yourusername/hello-goa`. Les concepts fonctionnent exactement de la même manière.

### 2. Concevoir votre API

Goa utilise un puissant DSL (Domain Specific Language) pour décrire votre API. Créez un répertoire et un fichier de conception :

```bash
mkdir design
```

Créez `design/design.go` :

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var _ = Service("hello", func() {
    Description("A simple service that says hello.")

    Method("sayHello", func() {
        Payload(String, "Name to greet")
        Result(String, "A greeting message")

        HTTP(func() {
            GET("/hello/{name}")
        })
    })
})
```

Voyons ce que fait ce modèle :

- **`Service("hello", ...)`** - Définit un nouveau service nommé "hello"
- **`Method("sayHello", ...)`** - Définit une méthode dans le service
- **`Payload(String, ...)`** - Spécifie l'entrée : une chaîne représentant le nom à saluer
- **`Result(String, ...)`** - Spécifie la sortie : un message d'accueil
- **`HTTP(func() { GET("/hello/{name}") })`** - Associe la méthode à un point d'arrivée HTTP GET où `{name}` est automatiquement lié à la charge utile

Cette approche déclarative signifie que vous décrivez *ce que fait* votre API, et Goa se charge des détails de la mise en œuvre : liaison des paramètres, routage, validation et documentation OpenAPI.

### 3. Générer du code

Transformez votre conception en une structure de service entièrement fonctionnelle :

```bash
goa gen hello/design
```

Ceci crée un dossier `gen` contenant :
- Des interfaces de service et des points d'extrémité
- Couche de transport HTTP (gestionnaires, encodeurs, décodeurs)
- Spécifications OpenAPI/Swagger
- Code client

Il s'agit maintenant d'échafauder une implémentation fonctionnelle :

```bash
goa example hello/design
```

**Important:** La commande `gen` régénère le dossier `gen/` chaque fois que vous l'exécutez. La commande `example` crée des fichiers d'implémentation de départ que vous possédez et personnalisez - Goa ne les écrasera pas lors des exécutions suivantes.

La structure de votre projet ressemble maintenant à ceci :

```
hello-goa/
├── cmd/
│   ├── hello/           # Server executable
│   │   ├── http.go
│   │   └── main.go
│   └── hello-cli/       # CLI client
│       ├── http.go
│       └── main.go
├── design/
│   └── design.go        # Your API design
├── gen/                 # Generated code (don't edit)
│   ├── hello/
│   └── http/
└── hello.go             # Your service implementation
```

### 4. Implémenter le service

Ouvrez `hello.go` et trouvez la méthode `SayHello`. Remplacez-la par votre implémentation :

```go
func (s *hellosrvc) SayHello(ctx context.Context, name string) (string, error) {
    log.Printf(ctx, "hello.sayHello")
    return fmt.Sprintf("Hello, %s!", name), nil
}
```

C'est toute la logique commerciale dont vous avez besoin - Goa s'occupe de tout le reste.

### 5. Exécuter et tester

Tout d'abord, téléchargez les dépendances :

```bash
go mod tidy
```

Démarrer le serveur :

```bash
go run ./cmd/hello --http-port=8080
```

Vous devriez voir :

```
INFO[0000] http-port=8080
INFO[0000] msg=HTTP "SayHello" mounted on GET /hello/{name}
INFO[0000] msg=HTTP server listening on "localhost:8080"
```

Testez avec curl (dans un nouveau terminal) :

```bash
curl http://localhost:8080/hello/Alice
```

Réponse :

```
"Hello, Alice!"
```

🎉 Félicitations ! Vous avez créé votre premier service Goa.

#### Utilisation du client CLI généré

Goa a également généré un client en ligne de commande. Essayez-le :

```bash
go run ./cmd/hello-cli --url=http://localhost:8080 hello say-hello -p=Alice
```

Explorez les commandes disponibles :

```bash
go run ./cmd/hello-cli --help
```

---

## Développement en cours

Au fur et à mesure de l'évolution de votre service, vous modifierez la conception et régénérerez le code :

```bash
# After updating design/design.go
goa gen hello/design
```

Points clés :
- **`gen/` dossier** - Régénéré à chaque fois ; ne modifiez jamais ces fichiers directement
- **Vos fichiers d'implémentation** - Vous pouvez les personnaliser ; Goa ne les écrasera pas
- **Nouvelles méthodes** - Ajoutez-les à votre conception, régénérez-les, puis implémentez les nouveaux stubs de méthode

---

## Prochaines étapes

Vous avez appris les principes fondamentaux de l'approche "design-first" de Goa. Poursuivez votre voyage :

- **[Référence DSL](./dsl-reference.md)** - Guide complet du langage de conception de Goa
- **[Guide HTTP](./http-guide.md)** - Plongée en profondeur dans les fonctionnalités de transport HTTP
- **[Guide gRPC](./grpc-guide.md)** - Construire des services gRPC avec Goa
- **[Gestion des erreurs](./error-handling.md)** - Définir et gérer correctement les erreurs
- **[Génération de code](./code-generation.md)** - Comprendre ce que Goa génère et comment le personnaliser
