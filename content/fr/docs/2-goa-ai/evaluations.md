---
title: Évaluations générées
weight: 10
description: "Définissez des suites dans un DSL, générez des hooks typés et jugez les réponses du modèle avec des contrats sémantiques stricts."
llm_optimized: true
---

Les évaluations Goa-AI conservent l'intention stable du test dans le design et
laissent l'exécution du produit et les preuves à l'application. Le framework
possède le DSL, l'interface de hooks générée, l'orchestration, le juge sémantique
et le rapport. L'application possède la cible réelle, le protocole, les
vérifications déterministes, les affirmations et les artefacts.

## Définir une suite

Importez `goa.design/goa-ai/eval/dsl` dans un package de design Goa :

```go
var _ = Suite("chat", func() {
    Description("Évalue des résultats Chat complets.")
    Timeout("2m")

    Scenario("alarm_inventory", func() {
        Description("Récupère l'historique complet des alarmes.")
        Input("Liste toutes les alarmes de la fenêtre demandée.")
        Tags("production", "alarm")
        Timeout("3m")
    })

    Calibration("entailed", func() {
        Answer("Le compresseur 1 fonctionne.")
        Claim("Le compresseur 1 fonctionne.")
        Want(eval.Entailed)
    })
})
```

Les identifiants utilisent `lower_snake_case`. Des descriptions, entrées et
durées positives sont obligatoires. Les calibrations utilisent `entailed`,
`contradicted`, `not_addressed` ou `indeterminate`.

`goa gen` génère `gen/evals/<suite>/suite.go` avec une interface directe :

```go
type Hooks interface {
    AlarmInventory(context.Context, string) (eval.Result, error)
}

func New(hooks Hooks) eval.Suite
```

Il n'existe ni registre d'adaptateurs ni réflexion. Chaque méthode générée est
une obligation vérifiée à la compilation ; les champs du receiver ou les
closures capturent les dépendances et les cibles de l'application.

## Produire les preuves et exécuter

Chaque hook effectue l'interaction complète et renvoie un `eval.Result` avec
des `Checks` déterministes, des `Claims` sémantiques, l'`Output` du modèle et
des `Artifacts` de diagnostic. Les erreurs d'infrastructure et de protocole
sont renvoyées comme erreurs. Le runner refuse les résultats vides, identifiants
dupliqués, claims sans sortie et réponses du juge qui ne sont pas bijectives.

`eval/judge` utilise un `model.Client` indépendant du fournisseur. Il effectue
une seule requête structurée et sans outil par lot ; il ne répare, ne réessaie
et ne remplace jamais la sortie du modèle.

```go
suite := genevals.New(hooks)
runner := eval.NewRunner(judge.New(modelClient))
report, err := runner.Run(ctx, suite)
```

Le runner valide toutes les calibrations avant tout scénario, puis exécute les
scénarios séquentiellement sous leurs timeouts générés. Un scénario réussit
uniquement si tous les checks réussissent et chaque claim est `entailed`. Les
rapports ont des champs JSON stables pour la CI et la conservation des preuves.

