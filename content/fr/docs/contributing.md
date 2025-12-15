---
title: "Contribuer à la documentation"
linkTitle: "Contribuer"
weight: 100
description: "Guidelines for contributing to Goa documentation: canonical homes, cross-linking, and content strategy."
llm_optimized: true
content_scope: "Documentation Contribution Guide"
---

Ce guide aide les contributeurs de la documentation à maintenir la cohérence de la documentation Goa. Il couvre les maisons canoniques pour les sujets, les modèles de liens croisés et la stratégie de contenu.

## Foyers canoniques

Chaque sujet de documentation a exactement une **foyer canonique** - l'endroit unique qui fait autorité et qui contient tous les détails. Les autres mentions doivent fournir de brefs résumés avec des liens croisés vers l'emplacement canonique.

### Accueil canonique Référence

| Sujet - Accueil canonique - Catégorie - Sujet - Accueil canonique - Catégorie - Sujet - Accueil canonique - Catégorie - Sujet - Accueil canonique - Catégorie - Accueil canonique
|-------|---------------|----------|
| Modélisation des données ** [Référence DSL](1-goa/dsl-reference/#data-modeling) | Modélisation des données ** [Référence DSL](1-goa/dsl-reference/#data-modeling) | Modélisation des données
| **Services & Méthodes** | [DSL Reference](1-goa/dsl-reference/#services-and-methods) | Conception | **Services & Méthodes** | [DSL Reference](1-goa/dsl-reference/#data-modeling)
| **Streaming (Design)** | [DSL Reference](1-goa/dsl-reference/#streaming) | Design | **Fichiers statiques (Design)
| **Fichiers statiques (Conception)** | [Référence DSL](1-goa/dsl-reference/#static-files) | Conception |
| **Gestion des erreurs (Conception)** | [Référence DSL](1-goa/dsl-reference/#error-handling) | Conception |
| **Systèmes de sécurité** | [Référence DSL](1-goa/dsl-reference/#security) | Conception | **Transport HTTP** [Référence DSL](1-goa/dsl-reference/#security)
| Transport **HTTP** | [HTTP Guide](1-goa/http-guide/) | Transport |
| **HTTP Streaming** | [HTTP Guide](1-goa/http-guide/#streaming) | Transport | **HTTP Streaming** | [HTTP Guide](1-goa/http-guide/#streaming) | Transport |
**Réponses d'erreur HTTP** | [Guide HTTP](1-goa/http-guide/#error-responses) | Transport |
| Transport **gRPC** | [Guide gRPC](1-goa/grpc-guide/) | Transport |
**gRPC Streaming** | [gRPC Guide](1-goa/grpc-guide/#streaming) | Transport | **gRPC Status Codes **gRPC Status Codes **gRPC Status Codes
| **Codes d'état gRPC** | [Guide gRPC](1-goa/grpc-guide/#error-handling) | Transport |
**Intercepteurs** | [Intercepteurs](1-goa/interceptors/) | Coupe transversale | **Observabilité** | [Intercepteurs](1-goa/interceptors/)
| **Observabilité** | [Indice](3-ecosystem/clue/) | Ecosystème | **Evénements distribués** | [Indice](3-ecosystem/clue/)
| Événements distribués ** [Pulse](3-ecosystem/pulse/) | Écosystème
| Diagrammes de l'architecture*** - [Modèle](3-ecosystem/model/) - Écosystème - [Diagrammes de l'architecture**] - [Diagrammes de l'architecture

### Définitions des catégories

**Conception** : Définitions d'API agnostiques au niveau du protocole en utilisant le DSL Goa. Le contenu doit se concentrer sur *ce que* vous définissez, et non sur *comment* il se comporte dans un transport spécifique.

**Transport** : Détails d'implémentation spécifiques au protocole HTTP ou gRPC. Le contenu ici couvre le comportement, la configuration et les modèles spécifiques au transport.

**Cross-Cutting** : Fonctionnalités qui s'appliquent à tous les transports (intercepteurs, intergiciels).

**Ecosystème** : Bibliothèques d'accompagnement (model, pulse, clue) qui étendent les capacités de Goa.

## Stratégie de contenu

### Documentation au niveau de la conception

Veillez à ce que la documentation au niveau de la conception soit **concise et ciblée** :

- Expliquer la syntaxe et la sémantique du DSL
- Montrer des exemples utilisant des types structurés
- Indiquer les transports qui prennent en charge la fonctionnalité
- Inclure des liens vers des guides de transport dans la rubrique "Pour en savoir plus"

**Exemple de modèle:**

```markdown
## Streaming

Goa supports streaming for both payloads and results using `StreamingPayload` 
and `StreamingResult`. The same design works for HTTP (WebSocket/SSE) and gRPC.

[code example]

**Further reading:**
- [HTTP Streaming](../http-guide/#streaming) — WebSocket and SSE implementation
- [gRPC Streaming](../grpc-guide/#streaming) — Bidirectional streaming patterns
```

### Documentation au niveau du transport

Les guides de transport doivent être **détaillés et pratiques** :

- Commencer par un appel "Récapitulatif de la conception" qui renvoie à la référence DSL
- Couvrir en profondeur le comportement spécifique au transport
- Inclure des options de configuration et des modèles
- Montrer des exemples complets et exécutables

**Modèle d'appel "Récapitulation de la conception":**

```markdown
{{< alert title="Design Recap" color="info" >}}
Streaming is defined at the design level using `StreamingPayload` and 
`StreamingResult`. See [Streaming in DSL Reference](../dsl-reference/#streaming) 
for design patterns. This section covers HTTP-specific implementation details.
{{< /alert >}}
```

### Documentation sur l'écosystème

Les pages d'outils de l'écosystème doivent être **complètes et autonomes** :

- Fournir un contexte complet sans nécessiter de références externes
- Inclure toutes les importations et configurations nécessaires dans les exemples de code
- Documenter toutes les principales caractéristiques de la bibliothèque
- Faire un lien vers les dépôts GitHub pour plus de détails

## Lignes directrices pour les liens croisés

### Quand créer des liens croisés

Ajoutez des liens croisés lorsque :

- Un sujet est mentionné en dehors de son foyer canonique
- Des concepts connexes aideraient le lecteur
- Une fonctionnalité a un comportement spécifique au transport documenté ailleurs

### Modèles de liens croisés

**Liens en ligne** pour de brèves mentions :

```markdown
Goa supports [streaming](../dsl-reference/#streaming) for real-time data.
```

**Sections "Voir aussi "** pour les sujets connexes :

```markdown
## See Also

- [Streaming Design](../dsl-reference/#streaming) — Design-level streaming concepts
- [gRPC Streaming](../grpc-guide/#streaming) — gRPC-specific streaming patterns
```

**des sections "Autres lectures "** à la fin des thèmes de conception :

```markdown
**Further reading:**
- [HTTP Error Responses](../http-guide/#error-responses) — HTTP status code mapping
- [gRPC Error Handling](../grpc-guide/#error-handling) — gRPC status code mapping
```

## Outils de l'écosystème Mise à jour du flux de travail

Lors de la mise à jour de la documentation des outils de l'écosystème (modèle, impulsion, indice) :

1. **Mettre à jour la page canonique en premier** - Faire des changements dans `3-ecosystem/[tool].md`
2. **Mettre à jour les références croisées** - Vérifier les mentions dans d'autres pages qui ont besoin d'être mises à jour
3. **Maintenir les résumés synchronisés** - Mettre à jour l'index de l'écosystème (`3-ecosystem/_index.md`) si l'objectif ou les principales caractéristiques de l'outil ont changé
4. **Ne pas dupliquer les détails** - Les autres pages doivent comporter un lien vers la page de l'écosystème, et non répéter son contenu

### Source de vérité

La documentation de l'écosystème doit refléter le comportement réel de la bibliothèque :

- **Clue** : [github.com/goadesign/clue](https://github.com/goadesign/clue)
- **Pulse** : [github.com/goadesign/pulse](https://github.com/goadesign/pulse)
- **Modèle** : [github.com/goadesign/model](https://github.com/goadesign/model)

Lorsque le comportement de la bibliothèque change, mettez à jour la documentation pour qu'elle corresponde.

## Contenu optimisé par LLM

Toute la documentation doit être optimisée pour les lecteurs humains et la consommation LLM :

### Sections autonomes

Chaque section doit fournir un contexte complet :

```markdown
## Health Checks

The `health` package provides HTTP health check endpoints for monitoring service 
availability. Health checks verify that the service and its dependencies (databases, 
external APIs) are functioning correctly.

// Include necessary imports
import "goa.design/clue/health"

// Show complete, runnable example
checker := health.NewChecker(
    health.NewPinger("database", dbAddr),
    health.NewPinger("cache", redisAddr),
)
```

### Définitions en ligne

Définissez les termes techniques en ligne plutôt que de vous fier uniquement aux liens du glossaire :

```markdown
The **canonical home** (the single authoritative location for a topic's detailed 
documentation) for streaming is the DSL Reference.
```

### Relations explicites

Indiquer explicitement les liens entre les concepts :

```markdown
Error handling spans two layers: the **design layer** where you define errors 
using the `Error` DSL, and the **transport layer** where errors map to HTTP 
status codes or gRPC status codes.
```

### Hiérarchie des titres

Utilisez une hiérarchie de titres appropriée sans sauter de niveaux :

```markdown
## Main Topic (h2)
### Subtopic (h3)
#### Detail (h4)
```

## Organisation des fichiers

### Exigences relatives à la matière première

Chaque page de documentation a besoin d'une page de garde appropriée :

```yaml
---
title: "Page Title"
linkTitle: "Short Title"  # Optional, for navigation
weight: 2                 # Controls sort order
description: "One-line description for SEO and previews."
llm_optimized: true       # Mark as LLM-optimized
content_scope: "What this page covers"
aliases:                  # Optional, for redirects
  - /old/path/
---
```

### Conventions d'appellation

- Utiliser des minuscules avec des traits d'union : `http-guide.md`, `dsl-reference.md`
- Fichiers d'index : `_index.md` pour les pages d'atterrissage des sections
- Les noms doivent être courts mais descriptifs

## Exemple : Ajout d'une nouvelle fonctionnalité

Lorsque vous documentez une nouvelle fonctionnalité de Goa :

1. **Identifier la page d'accueil canonique** - Est-ce au niveau de la conception (DSL Reference), spécifique au transport (HTTP/gRPC Guide), ou transversal ?

2. **Rédiger le contenu canonique** - Détails complets, exemples et explications à l'emplacement canonique

3. **Ajouter des liens croisés** - brèves mentions avec des liens dans des pages connexes

4. **Mise à jour de l'index** - S'il s'agit d'une fonctionnalité majeure, l'ajouter à l'index de la section concernée

5. **Vérifier la cohérence** - S'assurer que les noms et les modèles d'exemples correspondent d'une page à l'autre

## Liste de contrôle pour les contributeurs

Avant de soumettre des modifications à la documentation :

- [Le contenu se trouve dans la page d'accueil canonique correcte
- [Les liens croisés pointent vers des emplacements canoniques (pas de contenu dupliqué)
- [Les documents de conception sont concis ; les documents de transport sont détaillés
- [Les exemples de code incluent les importations et le contexte nécessaires
- [La hiérarchie des titres est correcte (pas de niveaux sautés)
- [Le texte de présentation est complet et précis
- [Les termes techniques sont définis en ligne lorsqu'ils sont utilisés pour la première fois
- [Les sections "Voir aussi" ou "Pour en savoir plus" renvoient à des sujets connexes
