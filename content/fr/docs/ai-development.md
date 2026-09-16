---
title: "Développer avec un agent de code"
linkTitle: "Développer avec un agent"
weight: 1
description: "Fournissez un contrat explicite, générez le code répétitif et utilisez le compilateur pour guider l’implémentation."
---

Goa aide à **développer un logiciel avec un agent de code** et à **intégrer des agents IA au logiciel**. Goa génère les contrats de service ; Goa-AI étend la génération aux outils, sorties structurées et intégrations d’agents.

## Pourquoi la génération change le travail

Un LLM qui rédige séparément gestionnaires, clients, schémas et validation doit les maintenir cohérents. Goa les dérive de la conception ; le modèle se concentre sur exigences, décisions métier et implémentation.

- **Moins de rédaction répétitive.** Le générateur produit les fichiers sans les faire écrire au LLM. L’économie totale dépend du contexte, des itérations et de la revue.
- **Un contexte ciblé.** Types, descriptions, exemples et contraintes sont réunis. Lisez conception et interface avant d’explorer toute l’implémentation.
- **Des responsabilités prévisibles.** Modifiez conception et application ; régénérez `gen/`. Réutilisez schémas et conventions.
- **Le retour du compilateur.** Les signatures générées rendent visibles les appels et implémentations incompatibles. Les changements de comportement exigent des tests.
- **Des contrats reliés.** Goa-AI réutilise les types et relie les outils aux méthodes grâce aux schémas, codecs et transformations générés.

## Installer la skill Goa service designer {#install-the-skill}

Exécutez cette commande dans le dépôt de votre application. La [Skills CLI](https://github.com/vercel-labs/skills) installe la skill complète et vous permet de choisir votre outil de développement. Elle nécessite Node.js et npm.

```bash
npx skills add goadesign/goa --skill goa-service-designer
```

La skill apprend à l’agent à examiner le projet, modifier d’abord le design, lancer le bon générateur, implémenter hors de `gen/`, mettre à jour les consommateurs concernés et vérifier le résultat. Elle couvre les contrats de service, HTTP/gRPC, la validation, les erreurs et les intercepteurs. Pour Goa-AI, fournissez aussi le fichier généré `AGENTS_QUICKSTART.md` ; cette skill est dédiée aux services Goa.

Pour choisir les outils sans les questions de l’installateur :

```bash
npx --yes skills add goadesign/goa --skill goa-service-designer \
  -a codex -a cursor -a claude-code --yes
```

L’installation est locale au projet par défaut. Ajoutez `--global` pour une installation personnelle ou `--copy` si votre environnement ne gère pas les liens symboliques. Sans Node.js, copiez tout le [répertoire `goa-service-designer`](https://github.com/goadesign/goa/tree/v3/skills/goa-service-designer) dans le dossier de skills de votre outil.

## Le cycle de développement

### 1. Fournir le contexte utile

Donnez à l’agent l’objectif, la conception et l’implémentation à modifier. Installez la [skill Goa service designer](https://github.com/goadesign/goa/tree/v3/skills) selon les instructions de votre outil.

Avec Goa-AI, lisez aussi **`AGENTS_QUICKSTART.md`** à la racine de l’application. Généré depuis la conception sauf avec `DisableAgentDocs()`, il décrit packages et travail restant. Utilisez les pages Markdown ou l’[index](/fr/llms.txt) pour fournir des références ciblées. Ne chargez pas tous les transports générés par défaut ; consultez-les quand la tâche l’exige.

### 2. Modifier d’abord la conception

Définissez opérations, entrées, résultats, erreurs et contraintes dans `design/`. La validation structurelle appartient à la conception ; autorisation et règles métier à leur code applicatif responsable. Expliquez quand utiliser un outil, son résultat et ses champs. Réutilisez les types de service quand ils expriment le même contrat.

### 3. Générer et implémenter

```bash
goa gen example.com/catalog/design
```

Implémentez les interfaces hors de `gen/`. `goa example` crée les fichiers initiaux une fois et ne met pas à jour la logique existante. Ne corrigez pas une erreur de compilation en modifiant `gen/` : corrigez conception ou implémentation, puis régénérez.

### 4. Vérifier le changement complet

```bash
gofmt -w design
go test ./...
```

Examinez le contrat public et testez le comportement observable. Pour l’IA, évaluez résultats et usage des outils. Un schéma valide ne prouve pas le bon choix d’outil. Autorisation, idempotence des effets externes et compatibilité avec les clients déployés restent des responsabilités applicatives.

## Une conception, deux points d’entrée {#one-design-two-entry-points}

Ce catalogue expose la même opération via **HTTP, gRPC et JSON-RPC** et fournit à un agent un outil lié à cette méthode. `LookupPayload` et `Product` définissent les deux contrats. Les champs numérotés définissent aussi la correspondance Protocol Buffer. Implémentez la recherche et le planificateur dans votre application.

Créez le module et installez les versions de l’exemple :

Ce guide utilise un instantané de développement Goa-AI fixé, et non une version stable. Le module Go sélectionne la dépendance Goa compatible. Lancez le générateur avec `go run` pour utiliser cette version. Utilisez la version Go déclarée par le module ou une version ultérieure.

```bash
mkdir catalog && cd catalog
go mod init example.com/catalog
go get goa.design/goa-ai@v0.78.8-0.20260915025548-ae0c418b7e77
mkdir design
```

Enregistrez ce code dans `design/catalog.go` :

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("catalog", func() {
    Title("Product catalog")
    Description("Find products through an API or an agent tool")
})

var LookupPayload = Type("LookupPayload", func() {
    Field(1, "sku", String, "Product stock-keeping unit", func() {
        MinLength(1)
    })
    Required("sku")
    Example(map[string]any{"sku": "BOOK-1"})
})

var Product = Type("Product", func() {
    Field(1, "sku", String, "Product stock-keeping unit")
    Field(2, "name", String, "Product name")
    Required("sku", "name")
    Example(map[string]any{"sku": "BOOK-1", "name": "The Go Book"})
})

var _ = Service("catalog", func() {
    Description("Provides product information to API clients and agents")
    JSONRPC(func() { POST("/rpc") })

    Method("lookup", func() {
        Description("Find a product by SKU")
        Payload(LookupPayload)
        Result(Product)

        HTTP(func() {
            GET("/products/{sku}")
            Response(StatusOK)
        })
        GRPC(func() {})
        JSONRPC(func() {})
    })

    Agent("assistant", "Find products", func() {
        Use("catalog", func() {
            Tool("lookup", "Find a product by SKU", func() {
                Args(LookupPayload)
                Return(Product)
                BindTo("lookup")
            })
        })
    })
})
```

Générez les contrats et fichiers initiaux :

```bash
go mod tidy
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy
go test ./...
```

Examinez interface, serveur et client HTTP, OpenAPI, schémas et codecs d’outils, et `AGENTS_QUICKSTART.md`. Implémentez la recherche et remplacez le planificateur d’exemple avant utilisation dans un produit.

## Une consigne utile

```text
Read design/ and the relevant generated service interface. For Goa-AI,
also read AGENTS_QUICKSTART.md.

Implement the requested behavior by changing the design first when the
contract changes. Regenerate with the project's pinned Goa version.
Do not edit gen/ or maintain a second tool schema by hand.

Update application implementations and callers. Put structural validation
in the design; keep authorization and business rules in their owning code.
Run the project's tests and relevant agent evaluations. Report the contract
changes, checks performed, and any behavior still needing review.
```

Ajoutez le résultat attendu et les critères d’acceptation. Cette consigne définit un processus ; elle ne remplace ni une tâche claire ni le jugement d’ingénierie.

## Mesurer l’avantage

Comparez les mêmes tâche, critères, modèle et code initial sur plusieurs exécutions. Relevez tokens d’entrée et de sortie, durée totale, génération, tests, corrections manuelles, revue et défauts. Incluez préparation et tentatives échouées. Les lignes générées montrent le travail du générateur, pas une mesure d’économie de tokens.

Aucune promesse universelle de 10× : l’avantage concret est de confier le travail répétitif à une génération déterministe et de donner une cible d’implémentation plus claire aux personnes et aux agents.

Continuez avec le [démarrage Goa](../1-goa/quickstart/) ou [Goa-AI](../2-goa-ai/quickstart/).
