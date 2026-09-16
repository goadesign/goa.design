---
title: "Goa : des services à partir d’une conception"
linkTitle: "Goa"
weight: 1
description: "Définissez le contrat API en Go. Générez types, transports, clients, validation et documentation."
llm_optimized: true
---

## Présentation

Goa construit des services Go à partir d’une conception. Décrivez types, opérations, erreurs et transports dans un langage spécifique au domaine (DSL) écrit en Go. Le générateur produit le code dérivé de ces décisions ; vous implémentez le comportement derrière les interfaces générées.

**[Créer votre premier service](quickstart/)** ou suivre le **[processus avec un agent de code](../ai-development/)**.

## Pourquoi cela aide les agents de code

L’agent part du contrat au lieu de le reconstruire depuis des gestionnaires, clients et schémas séparés. Il modifie la conception, régénère et utilise les erreurs du compilateur pour mettre à jour l’application. Le générateur écrit le code répétitif sans le faire rédiger au modèle. Fournissez la conception, l’interface utile et l’implémentation ; consultez les transports générés quand la tâche l’exige.

## Fonctionnement

### Concevoir {#phase-1-design-you-write}

Définissez méthodes, données, résultats, validation et correspondances HTTP, gRPC ou JSON-RPC dans `design/*.go`. Descriptions et exemples alimentent la documentation API.

### Générer {#phase-2-generate-automated}

```bash
goa gen example.com/myservice/design
```

Les transports choisis déterminent les types, interfaces, serveurs, clients, validations, spécifications OpenAPI et définitions Protocol Buffer produites. Ne modifiez pas `gen/` : il est remplacé. `goa example` crée les fichiers initiaux sans écraser les fichiers existants.

### Implémenter {#phase-3-implement-you-write}

Écrivez logique métier, autorisation, persistance et tests. Après une modification de signature, régénérez et compilez pour repérer les implémentations et appels incompatibles.

## Responsabilités {#whats-hand-written-vs-auto-generated}

Vous et l’agent maintenez conception, décisions métier, logique, autorisation, démarrage et tests. Goa génère types, interfaces, routage, codecs, validation, clients et spécifications API. La validation vérifie les contraintes déclarées ; la justesse métier, la sécurité et la compatibilité avec les clients déployés exigent conception et tests.

## Ajouter des capacités IA

[Goa-AI](../2-goa-ai/) utilise le même modèle pour les outils typés, réponses structurées et agents. Un outil peut réutiliser types et méthodes de service pour relier les contrats.

## Guides

Commencez par le démarrage rapide, puis utilisez les guides de transport pour les tâches pratiques et la référence DSL pour modifier les conceptions.
