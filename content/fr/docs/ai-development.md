---
title: "Développer avec un agent de code"
linkTitle: "Développer avec un agent"
weight: 1
description: "Donnez un contrat explicite à votre agent de code, générez le code répétitif et appuyez-vous sur le compilateur pour guider l’implémentation."
---

Goa accompagne deux missions complémentaires : **construire un logiciel avec un agent de code** et **intégrer des agents IA dans ce logiciel**. La même méthode orientée conception sert les deux. Goa génère les contrats de service ; Goa-AI étend la génération aux outils, aux sorties structurées et à l’intégration d’agents.

## Pourquoi la génération transforme le workflow

Lorsqu’un LLM rédige séparément les gestionnaires, le code client, les schémas JSON et la validation, il doit maintenir ces représentations alignées. Goa les dérive de la conception. Le modèle peut se concentrer sur les exigences, les décisions métier et l’implémentation.

- **Moins de code répétitif à rédiger.** Le générateur produit les fichiers sans demander au LLM d’écrire chacun d’eux. Cela réduit le travail en tokens de sortie ; le gain global dépend du contexte, des itérations et de la relecture nécessaires à la tâche.
- **Un point de départ ciblé.** La conception rassemble types, descriptions, exemples, contraintes et opérations. Chargez la conception et l’interface pertinentes avant de demander à l’agent d’explorer une base de code plus vaste.
- **Des responsabilités prévisibles.** Modifiez la conception et le code applicatif. Régénérez `gen/`. Un agent de code n’a pas besoin d’inventer un nouveau modèle de transport pour chaque service ni une convention de schéma distincte pour chaque outil.
- **Un retour immédiat du compilateur.** Toute modification d’une signature générée rend immédiatement visibles au compilateur Go les implémentations et appelants incompatibles. Les changements de comportement exigent toujours des tests.
- **Des contrats de services et d’outils reliés.** Goa-AI réutilise les types Goa et relie les outils aux méthodes de service. Les schémas, codecs et transformations générés maintiennent ces représentations synchronisées.

## Installer la skill Goa service designer {#install-the-skill}

Exécutez cette commande dans le dépôt de votre application. La [Skills CLI](https://github.com/vercel-labs/skills) installe la skill complète et vous permet de sélectionner votre outil de développement. Elle nécessite Node.js et npm.

```bash
npx skills add goadesign/goa --skill goa-service-designer
```

La skill apprend à l’agent à inspecter le projet, modifier d’abord la conception, lancer le générateur correspondant, implémenter hors de `gen/`, mettre à jour les consommateurs concernés et vérifier le changement. Elle couvre les contrats de service, HTTP/gRPC, la validation, les erreurs et les intercepteurs. Pour Goa-AI, fournissez également le fichier généré `AGENTS_QUICKSTART.md` ; la skill `goa-service-designer` cible spécifiquement les services Goa.

Pour sélectionner des outils précis sans les invites interactives :

```bash
npx --yes skills add goadesign/goa --skill goa-service-designer \
  -a codex -a cursor -a claude-code --yes
```

L’installation est locale au projet par défaut. Ajoutez `--global` pour une installation personnelle ou `--copy` si votre environnement ne prend pas en charge les liens symboliques. Sans Node.js, copiez l’intégralité du [répertoire `goa-service-designer`](https://github.com/goadesign/goa/tree/v3/skills/goa-service-designer) dans le dossier de skills pris en charge par votre outil.

## La boucle de développement

### 1. Fournir le contexte pertinent

Donnez à l’agent de code l’objectif, les fichiers de conception et l’implémentation qu’il doit modifier. Pour un service, installez la [skill Goa service designer](https://github.com/goadesign/goa/tree/v3/skills) selon les instructions propres à votre outil.

Pour Goa-AI, faites-lui également lire **`AGENTS_QUICKSTART.md`** à la racine de l’application. Goa-AI génère ce guide à partir de la conception de l’agent sauf si `DisableAgentDocs()` est activé. Il décrit les packages générés et le travail d’implémentation restant.

Utilisez les pages Markdown de ce site ou l’[index de documentation](/fr/llms.txt) pour fournir une documentation de référence ciblée. Évitez de charger par défaut tous les transports générés dans le contexte du modèle ; inspectez-les uniquement lorsque la tâche l’exige.

### 2. Modifier d’abord la conception

Décrivez les opérations, charges utiles, résultats, erreurs et contraintes dans `design/`. Placez la validation structurelle dans la conception. Conservez l’autorisation et les règles métier dans la couche applicative qui en est responsable.

Pour un outil d’agent, rédigez une description qui précise quand l’utiliser et ce qu’il renvoie. Donnez une description utile à chaque champ. Réutilisez les types de service existants lorsqu’ils expriment le même contrat métier.

### 3. Générer et implémenter

```bash
goa gen example.com/catalog/design
```

Implémentez ou mettez à jour les interfaces générées dans les fichiers appartenant à l’application. `goa example` crée les fichiers de départ une seule fois ; il ne met pas à jour la logique métier existante lorsque la conception évolue. Ne modifiez jamais `gen/` pour faire taire une erreur de compilation : corrigez la conception ou l’implémentation applicative, puis régénérez.

### 4. Vérifier l’ensemble du changement

```bash
gofmt -w design
go test ./...
```

Relisez le diff de la conception et le contrat public résultant. Ajoutez des tests de comportement couvrant ce que les appelants doivent observer. Pour les applications IA, exécutez des évaluations vérifiant les résultats et l’usage des outils : des arguments conformes au schéma ne prouvent pas que le modèle a choisi le bon outil ni produit une réponse pertinente.

La génération n’établit pas l’autorisation, ne rend pas les effets externes idempotents et ne prouve pas la compatibilité avec les clients déjà déployés. Testez ces propriétés là où l’application les porte.

## Une conception, deux points d’entrée {#one-design-two-entry-points}

Ce catalogue expose la même opération via **HTTP, gRPC et JSON-RPC**, et fournit à un agent un outil lié à celle-ci. `LookupPayload` et `Product` définissent les deux contrats. Les champs numérotés définissent également la correspondance Protocol Buffer. Implémentez la recherche de produits et le planificateur dans le code applicatif.

Créez un module et installez les versions utilisées pour cet exemple :

Ce guide utilise la version `v0.90.0` de Goa-AI (nécessitant Go 1.27.3 ou ultérieur). Son module Go sélectionne automatiquement une dépendance Goa `v3.35+` compatible (ou lancez `go get goa.design/goa/v3@v3.36.0` pour épingler la dernière version de Goa). Exécutez le générateur via `go run` afin d’utiliser la version sélectionnée par le module.

```bash
mkdir catalog && cd catalog
go mod init example.com/catalog
go get goa.design/goa-ai@v0.90.0
mkdir design
```

Enregistrez le code suivant dans `design/catalog.go` :

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

Générez les contrats et les fichiers applicatifs initiaux :

```bash
go mod tidy
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy
go test ./...
```

Inspectez l’interface de service générée, le serveur et le client HTTP, les spécifications OpenAPI, les schémas et codecs d’outils de l’agent ainsi qu’`AGENTS_QUICKSTART.md`. Sur ce fichier `design/catalog.go` de 54 lignes, `goa gen` produit 57 fichiers dans `gen/` (~5 400 lignes de Go ainsi que les schémas OpenAPI, Protobuf et JSON d’outils) et `AGENTS_QUICKSTART.md` sans dépenser de tokens de sortie modèle. Le squelette applicatif généré constitue un point de départ : implémentez la recherche et remplacez le planificateur d’exemple avant toute mise en production.

## Un prompt de tâche efficace

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

Ajoutez-y l’objectif utilisateur concret et les critères d’acceptation. Ce prompt encadre une méthode de travail ; il ne remplace ni un besoin clairement formulé ni le jugement d’ingénierie.

## Coordonner plusieurs agents de code avec Chorus {#coordinate-multiple-agents}

Lorsqu’une tâche mobilise plusieurs rôles ou familles de modèles — par exemple un agent révisant les contrats et la sécurité (`arch`), un deuxième implémentant le service Goa (`api`) et un troisième exécutant des tests concurrents `-race` et d’intégration (`qa`) — utilisez [Chorus](/fr/docs/3-ecosystem/chorus/) (`github.com/goadesign/chorus`) pour relier leurs sessions via un serveur MCP local partagé (`http://localhost:9440/mcp`).

Installez et démarrez Chorus (enregistre MCP et la skill `chorus` dans vos agents de code) :

```bash
brew install goadesign/tap/chorus && chorus up
```

Ou sans Homebrew (`curl` ou `npx` avec Node.js 18+) :

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

```bash
npx @goadesign/chorus up
```

Indiquez ensuite à chaque session d’agent son identifiant et son canal dans votre prompt :

```text
Use Chorus as arch in #catalog and review the LookupPayload contract with api and qa.
```

Les agents rejoignent des `#channels`, échangent des messages directs `@agent`, reçoivent les réponses non lues jointes aux appels `send` et attendent en arrière-plan via `chorus watch <handle>` jusqu’à ce qu’un pair les mentionne ou leur réponde. Consultez le [guide Chorus](/fr/docs/3-ecosystem/chorus/) pour la référence complète des outils et l’architecture.

## Séparer l’écriture des tests et la vérification avec Highbay {#build-and-verify-with-highbay}

Lorsque vous souhaitez qu’un agent de code écrive les tests d’acceptation et qu’un second agent écrive l’implémentation — avec un serveur qui vérifie les deux par rapport à un contrat convenu avant toute fusion — utilisez [Highbay](/fr/docs/3-ecosystem/highbay/) (`github.com/goadesign/highbay`).

Installez Highbay et enregistrez le serveur MCP `highbay` ainsi que la skill `/highbay` (`$highbay` dans Codex) dans vos agents de code :

```bash
go install github.com/goadesign/highbay/cmd/highbay@latest
highbay up
```

Invoquez ensuite `/highbay` dans un dossier vide (ou dans un dépôt Goa existant disposant déjà d’un commit Git et soit d’une suite `<module>/eval`, soit de paramètres de vérification enregistrés) :

```text
/highbay — build a refund assistant: refunds up to $50 get instant store credit; larger ones wait for a manager.
```

Votre agent de code initialise une coquille Go et `eval/` propre et neutre lorsque le dossier est vide (`highbay init -example` ou `worked_example: true` ajoute un exemple exécutable si vous le souhaitez), rédige les flux métier dans `design/story.go` et ouvre une Change Card dans votre navigateur. Une fois la carte confirmée, Highbay affecte le rédacteur de tests (`.highbay-tests`) et le bâtisseur (`.highbay-build`) à des copies de travail distinctes, valide et accepte la suite `eval/`, vérifie le commit du bâtisseur face à celle-ci et vous permet de fusionner les commits approuvés dans votre branche locale en un clic. Consultez la [page Highbay](/fr/highbay/) et le [guide Highbay de l’écosystème](/fr/docs/3-ecosystem/highbay/).

## Mesurer l’avantage sur votre projet

Comparez la même tâche, les mêmes critères d’acceptation, le même modèle et la même base de code initiale sur plusieurs exécutions. Relevez les tokens d’entrée et de sortie, le temps écoulé, la durée de régénération et de test, les corrections manuelles, l’effort de relecture et les défauts de comportement. Incluez la mise en place et les tentatives échouées. Le nombre de lignes générées illustre le travail accompli par le générateur, non un benchmark universel d’économie de tokens ou de productivité.

Il n’y a ici aucune promesse universelle de gain « 10× ». L’avantage concret tient au fait que la génération déterministe retire le code répétitif des contrats de la rédaction par le modèle et offre aux équipes comme aux agents de code une cible d’implémentation plus nette.

Poursuivez avec le [démarrage rapide Goa](../1-goa/quickstart/) ou le [démarrage rapide Goa-AI](../2-goa-ai/quickstart/).
