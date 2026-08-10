---
title: Évaluations générées
weight: 10
description: "Définissez des scénarios dans le design Goa, générez des hooks typés et produisez des rapports fiables."
llm_optimized: true
---

Les évaluations Goa-AI permettent de définir des scénarios stables dans le
design et d'implémenter le travail propre au produit en Go ordinaire. Goa-AI
gère la génération, la sélection des scénarios, la concurrence limitée, le
jugement sémantique et les rapports. L'application gère le système appelé, la
cible, les faits exacts vérifiés et les artefacts de diagnostic conservés.

## Définir des scénarios

Ajoutez le DSL d'évaluation à un package de design d'une application qui
utilise déjà le DSL Goa v3 :

```go
package design

import . "goa.design/goa-ai/eval/dsl"

var _ = Suite("chat", func() {
    Description("Évalue des résultats Chat complets.")
    Timeout("2m")

    Scenario("alarm_inventory", func() {
        Description("Récupère tout l'historique des alarmes.")
        Input("Liste toutes les alarmes de la fenêtre demandée.")
        Tags("production", "alarm")
        Timeout("3m")
    })
})
```

L'application doit aussi contenir son design de service Goa habituel. La CLI
Goa utilise ce design pour identifier la version de Goa avant de charger les
DSL d'extension.

Les IDs des suites, scénarios et tags utilisent `lower_snake_case`. Les
descriptions, les entrées et un timeout de suite positif sont obligatoires. Le
timeout d'un scénario remplace celui de la suite pour ce scénario.

`goa gen` génère `gen/evals/<suite>/suite.go` :

```go
type Hooks interface {
    AlarmInventory(context.Context, string) (eval.Result, error)
}

func New(hooks Hooks) eval.Suite
```

Chaque scénario possède une méthode. Ajouter un scénario oblige donc
l'application qui exécute la suite à l'implémenter, et le compilateur vérifie
cette obligation. Le code généré contient les noms, entrées, tags et timeouts
définitifs ; il n'utilise ni réflexion ni registre au runtime.

## Implémenter les vérifications et les affirmations

Un hook exécute le scénario et renvoie un `eval.Result`. Un `Check` compare une
preuve typée à un fait que l'application peut connaître exactement. Un `Claim`
exprime un sens qui doit être étayé par la réponse du modèle.

Utilisez les vérifications pour les noms d'outils, IDs, nombres, états et autres
valeurs exactes. Utilisez les affirmations uniquement lorsque la réponse doit
être lue et interprétée. Renvoyez les échecs d'infrastructure ou de protocole
comme erreurs. Toute vérification échouée doit inclure un diagnostic.

Le runner refuse les résultats vides, les IDs dupliqués, les affirmations sans
réponse, les artefacts invalides et les réponses incomplètes du juge.

## Créer et exécuter un runner

La concurrence est explicite et limitée :

```go
runner, err := eval.NewRunner(
    judge.New(modelClient),
    eval.RunnerConfig{MaxConcurrency: 5},
)
if err != nil {
    return err
}
suite := genevals.New(hooks)
report, err := runner.Run(ctx, suite)
```

`MaxConcurrency` est obligatoire et positif. Au plus ce nombre de scénarios
s'exécute en même temps. L'échec d'un scénario n'arrête pas les autres. Le
rapport conserve toujours l'ordre de déclaration de la suite. Les hooks et le
juge sémantique doivent donc accepter des appels simultanés jusqu'à cette limite.

Si tous les hooks ne renvoient que des vérifications déterministes et aucune
affirmation sémantique, utilisez un juge nil :

```go
runner, err := eval.NewRunner(nil, eval.RunnerConfig{MaxConcurrency: 2})
```

## Sélectionner des scénarios

Le runner valide la sélection avant tout appel au produit ou au modèle :

```go
report, err := runner.Run(ctx, suite)
report, err := runner.RunScenarios(ctx, suite, "alarm_inventory", "solar_analysis")
report, err := runner.RunTags(ctx, suite, "smoke", "alarm")
```

`RunScenarios` exécute des IDs exacts. `RunTags` exécute chaque scénario portant
au moins un tag demandé. Les deux refusent les sélections vides, les valeurs
vides, les doublons et les IDs ou tags inconnus.

## Jugement sémantique

Avant les scénarios, le runner vérifie le juge avec quatre exemples appartenant
au framework : `entailed` (la réponse établit l'affirmation), `contradicted`
(elle établit le contraire), `not_addressed` (elle parle d'autre chose) et
`indeterminate` (des informations contradictoires empêchent une conclusion).

Les quatre résultats doivent être corrects. Ainsi, un juge qui répond toujours
`entailed` ne peut pas faire réussir toute la suite. Un échec de calibration
arrête la suite avant l'appel à l'application. Pour les scénarios, seul
`entailed` réussit ; le juge ne réessaie ni ne répare sa sortie.

## Lire le rapport

La durée d'un scénario inclut l'appel à l'application, la validation du résultat
et le jugement sémantique. Les échecs de sélection et de calibration sont des
erreurs de suite. Les erreurs de hook, de validation, de timeout ou de jugement
sont enregistrées sur leur scénario et les autres scénarios continuent.

Sans erreur de suite, vérifiez `report.Passed` ; une valeur false doit faire
échouer le test ou la commande CI qui a lancé l'évaluation.
