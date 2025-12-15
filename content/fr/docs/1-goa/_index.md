---
title: "Cadre de Goa"
linkTitle: "Goa"
weight: 1
description: "Design-first API development with automatic code generation for Go microservices."
llm_optimized: true
content_scope: "Complete Goa Documentation"
aliases:
---

## Aperçu

Goa est un framework de conception pour construire des microservices en Go. Définissez votre API à l'aide du puissant DSL de Goa et laissez Goa générer le code de base, la documentation et les bibliothèques client.

### Caractéristiques principales

- **Conception d'abord** - Définissez votre API à l'aide d'un puissant DSL avant d'écrire le code d'implémentation
- **Génération de code** - Génère automatiquement le code du serveur, du client et de la documentation
- **Sécurité de type** - Sécurité de type de bout en bout, de la conception à la mise en œuvre
- **Multi-Transport** - Prise en charge de HTTP et gRPC à partir d'une seule conception
- **Validation** - Validation intégrée des requêtes basée sur votre conception
- **Documentation** - Spécifications OpenAPI auto-générées

## Comment fonctionne Goa

Goa suit un flux de travail en trois phases qui sépare la conception de l'API de sa mise en œuvre, garantissant ainsi la cohérence et réduisant les tâches répétitives.

{{< figure src="/images/diagrams/GoaWorkflow.svg" alt="Goa three-phase workflow: Design → Generate → Implement" class="img-fluid" >}}

### Phase 1 : Conception (vous écrivez)

Dans la phase de conception, vous définissez votre API en utilisant le DSL de Goa dans des fichiers Go (généralement dans un répertoire `design/`) :

- **Types** : Définir des structures de données avec des règles de validation
- **Services** : Les services** : regroupent les méthodes apparentées
- **Méthodes** : Définir des opérations avec des charges utiles et des résultats
- **Transports** : Correspondance entre les méthodes et les points d'extrémité HTTP et/ou les procédures gRPC
- **Sécurité** : Définir les schémas d'authentification et d'autorisation

**Ce que vous créez** : fichiers `design/*.go` contenant la spécification de votre API sous forme de code Go.

### Phase 2 : Générer (Automatisé)

Exécutez `goa gen` pour générer automatiquement tout le code de base :

```bash
goa gen myservice/design
```

**Ce que Goa crée** (dans le répertoire `gen/`) :
- Échafaudage de serveur avec routage et validation des requêtes
- Bibliothèques client à sécurité de type
- Spécifications OpenAPI/Swagger
- Définitions des tampons de protocole (pour gRPC)
- Encodeurs/décodeurs de transport

**Important** : Ne modifiez jamais les fichiers dans `gen/` - ils sont régénérés chaque fois que vous exécutez `goa gen`.

### Phase 3 : Mise en œuvre (vous écrivez)

Écrivez votre logique commerciale en mettant en œuvre les interfaces de service générées :

```go
// service.go - You write this
type helloService struct{}

func (s *helloService) SayHello(ctx context.Context, p *hello.SayHelloPayload) (string, error) {
    return fmt.Sprintf("Hello, %s!", p.Name), nil
}
```

**Ce que vous créez** : Les fichiers d'implémentation des services qui contiennent votre logique métier réelle.

### Ce qui est écrit à la main et ce qui est généré automatiquement

| Vous écrivez, Goa génère
|-----------|---------------|
`design/*.go` - Définitions de l'API | `gen/` - Code de transport
| `service.go` - Logique d'entreprise | Spécifications OpenAPI |
| `cmd/*/main.go` - Démarrage du serveur | Définitions de la mémoire tampon du protocole |
| Tests et intergiciels personnalisés | Validation des requêtes |

## Documentation Guides

| Guide | Description | ~Tokens |
|-------|-------------|---------|
| [Quickstart](quickstart/) | Installez Goa et construisez votre premier service | ~1,100 |
| Référence DSL](dsl-reference/) | Référence complète pour le langage de conception de Goa | ~2,900 |
| [Génération de code](code-generation/) | Comprendre le processus de génération de code de Goa | ~2,100 |
| Guide HTTP](http-guide/) | Caractéristiques, routage et modèles du transport HTTP | ~1 700 |
| Guide gRPC](grpc-guide/) | Fonctionnalités de transport gRPC et streaming | ~1,800 |
| [Gestion des erreurs](error-handling/) | Définition et gestion des erreurs | ~1 800 |
| Intercepteurs](interceptors/) | Intercepteurs et modèles d'intergiciels | ~1 400 |
| Production](production/) | Observabilité, sécurité et déploiement | ~1 300 |

**Section totale:** ~14 500 jetons

## Exemple rapide

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("hello", func() {
    Method("sayHello", func() {
        Payload(String, "Name to greet")
        Result(String, "Greeting message")
        HTTP(func() {
            GET("/hello/{name}")
        })
    })
})
```

Générer et exécuter :

```bash
goa gen hello/design
goa example hello/design
go run ./cmd/hello
```

## Démarrage

Commencez par le guide [Quickstart](quickstart/) pour installer Goa et créer votre premier service en quelques minutes.

Pour une couverture complète du DSL, consultez la [Référence DSL](dsl-reference/).
