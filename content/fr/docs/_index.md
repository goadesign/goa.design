---
title: "Documentation"
linkTitle: "Documentation"
weight: 20
description: >
  LLM-optimized documentation for Goa and Goa-AI frameworks. Consolidated pages designed for easy copying into LLM contexts.
llm_optimized: true
content_scope: "Complete Documentation"
aliases:
---

{{< section-llm-info >}}
**📋 Documentation optimisée pour LLM** - Cette documentation est conçue pour être facilement copiée dans des contextes LLM. Utilisez le bouton "Copier la page" sur n'importe quelle page pour copier le contenu en Markdown ou en texte brut.
{{< /section-llm-info >}}

## Sections de la documentation

Cette documentation est organisée en pages consolidées et autonomes, optimisées pour la consommation de LLM. Chaque page peut être copiée dans son intégralité pour fournir un contexte complet.

### Cadre Goa

Développement d'API avec génération automatique de code pour les microservices Go.

| Guide de l'utilisateur - Description - ~Tokens - ~Tokens - ~Tokens - ~Tokens - ~Tokens
|-------|-------------|---------|
| | [Quickstart](1-goa/quickstart/) | Installez Goa et construisez votre premier service | ~1,100 |
| Référence DSL](1-goa/dsl-reference/) | Référence complète pour le langage de conception de Goa | ~2 900 |
| [Génération de code](1-goa/code-generation/) | Comprendre le processus de génération de code de Goa | ~2,100 |
| Guide HTTP](1-goa/http-guide/) | Caractéristiques, routage et modèles du transport HTTP | ~1 700 |
| Guide gRPC](1-goa/grpc-guide/) | Fonctionnalités de transport gRPC et streaming | ~1,800 |
| [Gestion des erreurs](1-goa/error-handling/) | Définition et gestion des erreurs | ~1 800 |
| [Intercepteurs](1-goa/interceptors/) | Intercepteurs et modèles d'intergiciels | ~1 400 |
| Production](1-goa/production/) | Observabilité, sécurité et déploiement | ~1 300 |

**Total de la section Goa:** ~14 500 jetons

### Goa-AI Framework

Cadre de conception pour la construction de systèmes agentiques pilotés par des outils en Go.

| Guide de l'utilisateur - Description - ~Tokens - ~Tokens - ~Tokens - ~Tokens - ~Tokens
|-------|-------------|---------|
| Installation et premier agent | ~2 700 |
| DSL Reference](2-goa-ai/dsl-reference/) | DSL complet : agents, toolsets, policies, MCP | ~3,600 |
| [Runtime](2-goa-ai/runtime/) | Architecture du runtime, boucle plan/execute, moteurs | ~2,400 |
| [Outils](2-goa-ai/toolsets/) | Types d'outils, modèles d'exécution, transformations | ~2 300 |
| Composition de l'agent](2-goa-ai/agent-composition/) | Agent en tant qu'outil, arbres d'exécution, topologie de streaming | ~1,400 |
| [Intégration MCP](2-goa-ai/mcp-integration/) | Serveurs MCP, transports, wrappers générés | ~1.200 |
| [Mémoire et sessions](2-goa-ai/memory-sessions/) | Transcriptions, mémoires, sessions, exécutions | ~1.600 |
| [Production](2-goa-ai/production/) | Configuration temporelle, interface utilisateur en continu, intégration de modèles | ~2 200 |

**Total de la section Goa-AI:** ~17 600 jetons

## Utilisation de cette documentation avec les LLM

### Fonctionnalité de copie de page

Chaque page de documentation comprend un bouton "Copier la page" avec deux options :

- **Copier en Markdown** - Préserve le formatage, les annotations de langage des blocs de code et la hiérarchie des titres
- **Copier en texte brut** - Texte propre sans syntaxe Markdown, adapté à tous les contextes

### Flux de travail recommandé

1. **Commencez par le Quickstart** - Copiez le guide de démarrage rapide pour donner à votre LLM un contexte de base
2. **Ajouter des guides spécifiques** - Copiez les guides pertinents en fonction de votre tâche (par exemple, le guide HTTP pour les API REST)
3. **Inclure la référence DSL** - Pour les questions de conception, inclure la référence DSL complète

### Conseils sur le budget des jetons

- Chaque guide est conçu pour s'intégrer dans les fenêtres contextuelles typiques des LLM
- La documentation complète de Goa (~14,5k tokens) s'intègre facilement dans la plupart des LLM modernes
- La documentation complète de Goa-AI (~17.6k tokens) est également compacte
- Les deux frameworks ensemble (~32k tokens) fonctionnent bien avec des modèles de contexte plus larges

## Concepts clés

### Développement axé sur la conception d'abord

Goa et Goa-AI suivent tous deux une philosophie de conception d'abord :

1. **Définissez votre API/Agent** à l'aide d'un puissant DSL
2. **Générer du code** automatiquement à partir de votre conception
3. **Implémenter la logique métier** dans des interfaces propres et sûres
4. **La documentation reste synchronisée** car elle provient de la même source

### Sécurité de type

Le code généré offre une sécurité de type de bout en bout :

```go
// Generated interface - your contract
type Service interface {
    Add(context.Context, *AddPayload) (int, error)
}

// Your implementation - clean and focused
func (s *service) Add(ctx context.Context, p *calc.AddPayload) (int, error) {
    return p.A + p.B, nil
}
```

## Communauté

- [Gophers Slack](https://gophers.slack.com/messages/goa) - Canal #goa
- [GitHub Discussions](https://github.com/goadesign/goa/discussions) - Questions et idées
- [Bluesky](https://goadesign.bsky.social) - Mises à jour et annonces

## Contribuer

Vous souhaitez améliorer la documentation ? Consultez le [Guide de contribution](contributing/) pour obtenir des directives sur les maisons canoniques, les modèles de liens croisés et la stratégie de contenu.
