---
title: "Construire avec Goa"
linkTitle: "Documentation"
weight: 1
description: "Un langage de conception pour les services Go et les agents IA. Un processus clair pour les développeurs et leurs agents de code."
hide_children: true
---

Goa est un framework Go qui donne aux agents de développement moins de code à écrire et un seul contrat pour raisonner. Générez API, clients et validations. Créez des agents IA, serveurs MCP et registres d’outils avec Goa-AI.

## Choisissez votre point de départ

- **[Créer un service avec Goa](1-goa/quickstart/).** Définissez une API en Go, générez son serveur et son client HTTP, puis implémentez la logique métier.
- **[Créer un agent IA avec Goa-AI](2-goa-ai/quickstart/).** Définissez des outils typés, générez un agent local, puis connectez votre planificateur et votre modèle.
- **[Développer avec un agent de code](ai-development/).** Fournissez une conception ciblée, des limites de modification explicites et un cycle reproductible de génération et de tests.

Goa et Goa-AI partagent langage et générateur. Utilisez Goa seul, commencez directement avec Goa-AI ou exposez une méthode de service comme outil avec les mêmes types.

## Comment les éléments s’articulent

**La conception décrit le contrat.** Types, descriptions, validation, exemples et opérations sont définis en Go. Goa-AI ajoute agents, ensembles d’outils, réponses structurées et suites d’évaluation.

**Le générateur produit le code dérivé.** `goa gen` génère interfaces, transports, clients, schémas et liaisons. `gen/` contient le code généré ; le code applicatif reste séparé.

**L’application implémente le comportement.** Vous et votre agent écrivez logique métier, planificateurs, persistance, autorisation et tests. Après une modification du contrat, régénérez et utilisez le compilateur et les tests pour guider la mise à jour.

## Documentation pour les personnes et les agents

La navigation distingue démarrage rapide, guides et référence. Chaque page propose **Copier la page** et une version **Markdown**. L’[index pour les agents](/fr/llms.txt) permet de fournir uniquement le contexte utile.

Découvrez l’[écosystème Goa](3-ecosystem/) pour l’observabilité, les événements distribués et les diagrammes. Consultez [contribuer](contributing/) pour signaler un problème ou améliorer les guides.
