---
title: "Goa-AI : des agents à partir d’une conception"
linkTitle: "Goa-AI"
weight: 2
description: "Concevez des outils typés et des contrats d’agents en Go. Générez l’intégration et utilisez un modèle d’exécution explicite."
llm_optimized: true
---

## Présentation

Goa-AI étend le langage et le générateur Goa aux applications IA. Définissez agents, entrées et résultats d’outils, réponses structurées, politiques et scénarios d’évaluation. Générez types, schémas, codecs et liaisons ; écrivez les planificateurs et le comportement applicatif.

**[Créer votre premier agent](quickstart/)** ou suivre le **[processus avec un agent de code](../ai-development/)**. Aucun service Goa séparé n’est requis au préalable.

## Développer avec un agent de code

Schémas et codecs Go viennent de la même conception. Un outil réutilise les types et l’implémentation d’un service via `BindTo`. La génération produit aussi **`AGENTS_QUICKSTART.md`**, un guide adapté à votre conception. Fournissez-le à l’agent avec les fichiers de design, puis implémentez planificateurs et exécuteurs hors de `gen/`. Régénérez, compilez et lancez les évaluations à chaque évolution.

Cela évite de faire rédiger au modèle des schémas et intégrations répétitifs. Aucun pourcentage d’économie n’est garanti : mesurez des tâches complètes, contexte, tentatives et revue compris.

## Intégrer des agents au produit

### Contrats d’outils {#design-first-agents}

Définissez entrées et résultats avec types Goa, descriptions, exemples et validation. Le générateur produit schémas JSON et codecs typés. Les arguments du modèle sont validés avant exécution. Voir [ensembles d’outils](toolsets/).

### Sorties structurées {#typed-direct-completions}

`Completion(...)` déclare une réponse typée. Les fonctions générées, y compris en streaming, valident le résultat complet. Voir [DSL](dsl-reference/) et [runtime](runtime/).

### Évaluations {#generated-evaluations}

Déclarez suites et scénarios, générez les points d’extension typés et implémentez les vérifications de résultats. Le jugement sémantique nécessite une calibration. Voir [évaluations générées](evaluations/).

### Composition {#run-trees-composition}

Exposez un agent comme outil d’un autre. Les exécutions enfants ont identité, lien parent et historique. Voir [composition](agent-composition/).

### Streaming {#structured-streaming}

Le runtime émet des événements typés pour les réponses, outils, interventions humaines et états. L’application choisit quoi exposer et comment le transporter. Voir [streaming](production/#streaming-ui).

### Exécution durable {#temporal-durability}

Utilisez le moteur en mémoire en local. Configurez Temporal pour la persistance, la reprise et les nouvelles tentatives d’activités. Les effets externes exigent idempotence et politiques de retry adaptées dans l’application. Voir [production](production/).

### Serveurs MCP et registres d’outils à héberger {#tool-registries}

**Créez des serveurs MCP.** Exposez les méthodes comme outils, publiez des ressources et proposez des modèles de prompts avec le protocole et les adaptateurs générés. Les agents peuvent aussi utiliser des outils MCP externes. Voir [l’intégration MCP](mcp-integration/).

**Hébergez un registre d’outils.** Exécutez le serveur inclus comme catalogue partagé et passerelle d’invocation, avec Redis et Pulse. Les fournisseurs publient toolsets et schémas ; les consommateurs découvrent les outils et invoquent les fournisseurs disponibles. Des helpers générés relient les applications au registre. Voir [l’exploitation du registre](registry/).

### Modèles et état {#model-providers}

Des adaptateurs existent pour OpenAI, Anthropic, AWS Bedrock et Google Vertex AI. Leurs capacités varient : consultez le [runtime](runtime/). L’application fournit le stockage et contrôle sessions, autorisation et mémoire. Voir [mémoire et sessions](memory-sessions/).

## Architecture

La conception porte les contrats statiques ; le code généré en fait des packages typés. Le runtime coordonne l’exécution et le moteur fournit les workflows locaux ou durables. Les planificateurs portent les choix sémantiques ; les services applicatifs portent le comportement métier.

## Guides

Commencez par le démarrage rapide local, puis ajoutez outils, modèles, état et déploiement. Consultez DSL et runtime pour les contrats exacts.
