---
title: Évaluations générées
weight: 10
description: "Définissez des scénarios dans le design Goa, générez des hooks typés et produisez des rapports fiables."
llm_optimized: true
---

**Votre agent a changé. Ses réponses se sont-elles dégradées ?**

Une évaluation est un test reproductible qui exécute l'agent réel et vérifie
que son résultat reste correct. Ce n'est pas un test unitaire : elle appelle
des systèmes et des modèles réels, peut durer plusieurs minutes, et une partie
de la vérification exige d'interpréter une réponse rédigée par un modèle plutôt
que de comparer des valeurs exactes.

La plupart des équipes construisent elles-mêmes ce dispositif avec des cas en
YAML, un exécuteur spécifique et des expressions régulières appliquées aux
réponses. Goa-AI génère ce dispositif à partir du design qui définit déjà
l'agent et remplace la comparaison de texte par des affirmations évaluées par
un modèle juge préalablement calibré.

Chaque partie d'une suite d'évaluation a un propriétaire unique :

- **Le design** décrit chaque scénario : son nom, son objectif, la forme de son
  entrée, ses tags et son délai.
- **Le code généré** transforme cette description en types Go et en une méthode
  d'interface par scénario. Si le design et l'application divergent, la
  compilation échoue ; aucun test ne peut disparaître silencieusement.
- **Le code de l'application** implémente ces méthodes : il appelle l'agent,
  recueille les preuves et énonce les résultats attendus.
- **Le runner** de `goa.design/goa-ai/eval` sélectionne les scénarios, limite
  leur concurrence, évalue les réponses et produit un rapport JSON.

Six termes couvrent l'ensemble du mécanisme :

| Terme | Signification |
|------|---------|
| **Scénario** | Un cas de test, par exemple « demander à l'agent de chat de lister toutes les alarmes » |
| **Hook** | La méthode Go écrite pour un scénario ; elle exécute l'agent et renvoie ce qui s'est produit |
| **Vérification** | Un fait vrai ou faux vérifié exactement par le code, par exemple « toutes les pages ont été récupérées » |
| **Affirmation** | Une courte phrase anglaise qui doit être vraie au regard de la réponse du modèle |
| **Juge** | Un évaluateur fondé sur un modèle qui attribue un résultat à chaque affirmation |
| **Rapport** | Le résumé JSON d'une exécution : ce qui a été exécuté, ce qui a réussi, pourquoi et en combien de temps |

Les formulations des réponses varient, ce qui empêche une comparaison exacte
des chaînes : c'est le rôle des affirmations. À l'inverse, tout fait que le
code peut vérifier exactement doit rester une vérification déterministe et ne
jamais être délégué à un modèle.

## Déclarer les scénarios dans le design

Le design déclare la *forme* de l'entrée de chaque scénario : les champs
disponibles et leurs règles de validité. Il ne contient jamais les valeurs
réelles. Les IDs d'utilisateurs, les installations et les messages concrets
restent dans l'application, ce qui permet d'utiliser le même design dans tous
les environnements.

```go
package design

import (
    . "goa.design/goa-ai/dsl"
    . "goa.design/goa-ai/eval/dsl"
    . "goa.design/goa/v3/dsl"
)

var ChatEvalInput = Type("ChatEvalInput", func() {
    Attribute("user_id", String, "User running the evaluation.", func() {
        Format(FormatUUID)
    })
    Attribute("prompt", String, "User message.", func() {
        MinLength(1)
    })
    Required("user_id", "prompt")
})

var _ = Service("chat_agent", func() {
    Agent("chat", "Answers product questions.", func() {
        Suite("chat", func() {
            Description("Exercises production Chat outcomes.")
            Timeout("2m")

            Scenario("alarm_inventory", func() {
                Description("Retrieves every alarm in a fixed window.")
                Input(ChatEvalInput)
                Tags("production", "alarm")
                Timeout("3m")
            })

            Scenario("health_check", func() {
                Description("Verifies application-owned setup.")
            })
        })
    })
})
```

Règles applicables :

- Les noms des suites, scénarios et tags utilisent `lower_snake_case`. Ils
  deviennent des identifiants stables dans les rapports et les options de
  ligne de commande.
- Chaque suite et scénario doit avoir une `Description`. Chaque suite doit
  définir un `Timeout` positif ; le `Timeout` d'un scénario remplace celui de
  la suite pour ce seul scénario.
- `Input` est facultatif. Sans `Input`, le hook ne reçoit qu'un
  `context.Context`. `Input` accepte les mêmes formes que les `Args` d'un
  outil : type Goa nommé, primitive, tableau, map ou fonction inline qui
  déclare des attributs. Les entrées d'évaluation ne prennent pas en charge
  `OneOf`.
- Une suite peut être déclarée au niveau supérieur du design ou dans un
  `Agent`. Dans un agent, le package généré accède également aux contrats
  d'outils de cet agent.

## Générer le code Go

L'import de `goa.design/goa-ai/eval/dsl` enregistre le générateur
d'évaluations. La commande habituelle `goa gen` écrit alors
`gen/evals/<suite>/suite.go` :

```go
type ChatEvalInput struct {
    UserID string
    Prompt string
}

type Hooks interface {
    AlarmInventory(context.Context, *ChatEvalInput) (eval.Result, error)
    HealthCheck(context.Context) (eval.Result, error)
}

type Inputs struct {
    AlarmInventory *ChatEvalInput
}

func New(hooks Hooks, inputs Inputs) (eval.Suite, error)
```

`Hooks` possède une méthode par scénario : l'ajout d'un scénario casse la
compilation tant que l'application ne l'implémente pas. `Inputs` possède un
champ pour chaque scénario qui déclare une entrée. L'application y place les
valeurs réelles. `New` vérifie ces valeurs selon les règles du design (champs
obligatoires, formats et longueurs) et renvoie une erreur avant le démarrage
d'un scénario.

### Contrats d'outils des suites d'agents

Le générateur connaît tous les outils déclarés d'un agent, y compris ceux des
autres agents qu'il utilise. Une suite déclarée dans un `Agent` expose :

```go
func MustToolContract(name tools.Ident) *tools.ToolSpec
```

Cette fonction renvoie le contrat généré de l'outil : son schéma et les codecs
qui décodent ses arguments et résultats. Les hooks peuvent ainsi décoder et
vérifier exactement les appels enregistrés sans écrire de traitement JSON.
Elle couvre tous les outils accessibles à la compilation, mais pas ceux
découverts dynamiquement dans un registre. Demander un outil inaccessible
provoque une panique, car cela révèle une erreur dans l'évaluation elle-même.

## Créer la commande exécutable

Après `goa gen`, exécutez :

```bash
goa example example.com/product/design
```

La commande crée une fois `cmd/<suite>-evals/main.go` et ne le remplace jamais.
Le fichier appartient ensuite à l'application. Les changements ultérieurs du
design continuent à mettre `gen/evals` à jour : une signature de hook modifiée
fait échouer la compilation et une entrée absente fait échouer `New`.

Le fichier initial contient un `TODO` pour chaque hook, chaque valeur d'entrée
et le juge. Sa ligne de commande est déjà fonctionnelle :

- `--scenario <id>` exécute un scénario ; l'option peut être répétée ;
- `--tag <tag>` exécute les scénarios qui portent ce tag ; cette option peut
  aussi être répétée, mais ne peut pas être combinée à `--scenario` ;
- `--max-concurrency <n>` limite le nombre de scénarios simultanés (5 par
  défaut).

Chaque exécution écrit le rapport JSON sur la sortie standard et renvoie un
code non nul en cas d'échec. L'application peut aussi ignorer cette commande et
appeler `New` depuis un test Go.

## Écrire les hooks

Implémentez l'interface générée sur un type ordinaire :

```go
type hooks struct {
    client *Client
}

func (h *hooks) AlarmInventory(
    ctx context.Context,
    input *genevals.ChatEvalInput,
) (eval.Result, error) {
    answer, evidence, err := h.client.Run(ctx, input.UserID, input.Prompt)
    if err != nil {
        return eval.Result{}, err
    }
    return eval.Result{
        Checks: []eval.Check{{
            Name:   "all_pages_retrieved",
            Passed: evidence.Exhausted,
        }},
        Claims: []eval.Claim{{
            ID:   "complete_answer",
            Text: "The answer reports every alarm in the window.",
        }},
        Output: answer,
        Artifacts: []eval.Artifact{{
            Name: "protocol",
            URI:  evidence.ArtifactURI,
        }},
    }, nil
}
```

Un hook renvoie trois catégories d'informations :

- Les **vérifications** portent sur les faits exacts : noms d'outils, IDs,
  nombres et états. Une vérification en échec doit fournir un diagnostic.
- Les **affirmations** portent sur la réponse du modèle. Écrivez une
  affirmation par fait, plutôt qu'une longue phrase composée. N'utilisez pas
  d'expressions régulières ou de listes de mots-clés pour approximer le sens.
  Les affirmations sont évaluées par rapport à `Output`. Si `Output` est vide,
  chacune reçoit `not_addressed` et le scénario échoue sans appeler le juge.
- Les **artefacts** sont des liens facultatifs vers des preuves enregistrées,
  par exemple des journaux, transcriptions ou traces de protocole.

L'erreur renvoyée est réservée aux problèmes d'infrastructure : agent
injoignable, délai dépassé ou environnement défaillant. Une réponse obtenue
mais incorrecte doit produire une vérification en échec ou une affirmation non
étayée.

Le runner refuse les résultats mal formés avant leur évaluation : il faut au
moins une vérification ou une affirmation, les noms et IDs doivent être uniques
et les artefacts doivent posséder un nom et une URI.

## Recueillir les preuves et déclarer les attentes

Le package `eval/evidence` fournit une implémentation commune pour observer les
événements d'une exécution et comparer les preuves aux attentes du scénario.

Un `evidence.Collector` consomme les événements du runtime (début et fin
d'outils, réponses de l'assistant, cycle du workflow et confirmations). Il
construit une `evidence.Evidence` contenant les appels d'outils et leur JSON
canonique, corrélés par ID et ordonnés selon leur causalité, la réponse
accumulée, une éventuelle confirmation en attente et la phase terminale.

```go
collector := evidence.NewCollector()
for !collector.Done() {
    event, err := stream.Recv()
    if err != nil {
        return eval.Result{}, err
    }
    if err := collector.Consume(event); err != nil {
        return eval.Result{}, err
    }
}
ev, err := collector.Finish()
```

Une `evidence.Expect` déclare les attentes déterministes et les transforme en
vérifications. Chaque package d'ensemble d'outils généré expose un descripteur
typé par outil, par exemple `helpers.AnswerTool`, qui associe l'identifiant aux
codecs de charge utile et de résultat. `evidence.ExpectCall` construit une
attente à partir de ce descripteur ; une modification de nom ou de type dans le
design casse alors la compilation de la suite.

```go
expect := evidence.Expect{
    Tools: []evidence.Tool{
        evidence.ExpectCall(helpers.AnswerTool,
            func(p *helpers.AnswerPayload) error {
                if p.Question == "" {
                    return errors.New("question must not be empty")
                }
                return nil
            },
            nil, // result unconstrained
        ),
    },
    ForbidTools: []tools.Ident{admin.DeleteRecords},
}
return eval.Result{
    Checks: expect.Checks(ev),
    Claims: claims,
    Output: ev.Answer,
}, nil
```

Par défaut, `Expect` associe les outils déclarés à une sous-séquence ordonnée
des appels observés ; les appels non déclarés restent libres. Avec
`Exact: true`, toute la trajectoire causale est comparée appel par appel.
`evidence.ExpectFailure` exige une classification d'échec précise,
`ForbidFailureKinds` interdit certaines classes pour toutes les tentatives et
`RequireAllAttemptsSuccessful` refuse tout résultat absent ou en échec.
`evidence.ExpectConfirmation` vérifie que l'exécution s'est arrêtée sur une
confirmation en attente. Pour un outil découvert par registre sans descripteur
généré, utilisez un `evidence.Tool` et des assertions `evidence.Decoded`.

Les limites sont transportées à côté du résultat typé et non dans son type de
domaine. Définissez `Tool.Bounds` pour vérifier le nombre renvoyé, le total,
l'état de troncature, le conseil d'affinement ou le curseur :

```go
alarms := evidence.ExpectCall(ada.ListAlarmsTool, nil, nil)
alarms.Bounds = func(bounds *agent.Bounds) error {
    if bounds == nil || bounds.Truncated {
        return errors.New("expected a complete alarm inventory")
    }
    return nil
}
```

## Exécuter la suite

```go
suite, err := genevals.New(&hooks{client: client}, genevals.Inputs{
    AlarmInventory: &genevals.ChatEvalInput{
        UserID: userID,
        Prompt: "List every alarm in the requested window.",
    },
})
if err != nil {
    return err
}

grader, err := judge.New(modelClient, maxOutputTokens)
if err != nil {
    return err
}
runner, err := eval.NewRunner(grader, eval.RunnerConfig{
    MaxConcurrency: 5,
    Reporter:       reporter,
})
if err != nil {
    return err
}
report, err := runner.Run(ctx, suite)
```

`MaxConcurrency` est obligatoire et positif. L'échec d'un scénario n'arrête
pas les autres, et le rapport conserve toujours l'ordre du design. Les hooks
et le juge doivent donc accepter les appels concurrents.

Le `Reporter` facultatif reçoit un rappel au début et à la fin de chaque
scénario. Chaque scénario sélectionné reçoit exactement un rappel de fin, y
compris s'il n'a pas démarré à cause d'une annulation.

L'annulation du contexte empêche le démarrage de nouveaux scénarios et annule
ceux en cours. `Run` renvoie alors l'erreur du contexte avec le rapport partiel.
Les hooks doivent respecter cette annulation.

Un juge nil n'est permis que si aucun hook ne renvoie d'affirmation :

```go
runner, err := eval.NewRunner(nil, eval.RunnerConfig{MaxConcurrency: 2})
```

### Sélectionner des scénarios

Le runner valide toute sélection avant d'appeler l'agent ou un modèle :

```go
report, err := runner.Run(ctx, suite)
report, err := runner.RunScenarios(ctx, suite, "alarm_inventory", "solar_analysis")
report, err := runner.RunTags(ctx, suite, "smoke", "alarm")
```

`RunScenarios` sélectionne des noms exacts. `RunTags` sélectionne chaque
scénario portant au moins un tag demandé. Les deux refusent les sélections et
valeurs vides, les doublons et les noms ou tags inconnus.

## Fonctionnement du jugement

`eval/judge` construit un juge à partir du même `model.Client` validé et opaque
que le reste de Goa-AI. Les tests qui ont besoin d'un client déterministe
implémentent `model.Provider` puis appellent `model.NewClient` ; le code
d'application ne peut pas implémenter directement `model.Client`.

L'application doit fournir un `maxOutputTokens` strictement positif à
`judge.New` et traiter son erreur. Lisez cette valeur dans la configuration de
l'application avant d'exécuter la suite. Zéro et les valeurs négatives font
échouer la construction sans appeler le modèle ; il n'existe aucune valeur par
défaut.

Cette valeur est un plafond inclusif de jetons de sortie pour **une réponse
complète du modèle**, comprenant tous les jugements et leur structure JSON.
Ce n'est ni un quota par affirmation, ni un budget total par scénario ou suite.
Goa-AI transmet la même valeur dans la requête initiale et chaque requête de
correction autorisée, quel que soit le nombre d'affirmations. Choisissez une
valeur prise en charge par le fournisseur et le modèle configurés ; une valeur
non prise en charge reste une erreur, sans réduction silencieuse du plafond.
Un plafond fini ne garantit pas que la réponse pourra se terminer.

### Référence partagée et migration du juge

Placez le contexte factuel partagé par plusieurs affirmations dans la chaîne
facultative `Result.Reference`, au lieu de le répéter dans chaque affirmation.
Conservez dans `Output` la réponse à évaluer :

```go
result := eval.Result{
    Output:    answer,
    Reference: "Supported export formats: CSV and JSON.",
    Claims: []eval.Claim{{
        ID:   "export_formats",
        Text: "The answer lists the supported export formats.",
    }},
}
```

Le runner transmet la référence séparément, sans modifier la réponse. Le juge
fondé sur un modèle l'inclut une seule fois dans chaque requête, y compris les
requêtes de correction existantes. Les faits de la référence aident à vérifier
l'exactitude de la réponse ; ils ne fournissent jamais le contenu qu'elle omet.
Dans cet exemple, énumérer les formats uniquement dans la référence ne suffit
pas à satisfaire l'affirmation. Un `Output` vide attribue toujours `not_addressed`
à chaque affirmation sans appeler le juge, même si la référence contient la
réponse.

Les juges personnalisés implémentent la nouvelle interface à quatre arguments :

```go
Judge(ctx context.Context, output string, claims []eval.Claim, reference string) ([]eval.Judgment, error)
```

Modifiez les appels directs en `grader.Judge(ctx, output, claims, reference)`.
Passez `""` lorsqu'aucun contexte supplémentaire n'est nécessaire ; la calibration
utilise aussi une référence vide. Le runner conserve une référence non vide dans
le champ `reference` du rapport JSON et omet ce champ lorsqu'elle est vide. Les
anciens rapports sans ce champ indiquent toujours l'absence de contexte
supplémentaire. Les lecteurs externes à validation stricte doivent accepter le
nouveau champ avant de lire des rapports qui l'incluent. Aucune migration des
rapports enregistrés ni modification des suites générées ou des contrats des
services du produit n'est nécessaire. Ce changement n'ajoute aucun appel au modèle
et ne modifie ni le choix du modèle, ni les limites de jetons, ni les résultats
possibles, ni le nombre de corrections.

### Résultats et validation des réponses

Le juge reçoit la réponse et les affirmations, puis attribue exactement un
résultat et une justification courte à chacune :

- `entailed` : la réponse établit l'affirmation ;
- `contradicted` : elle établit son contraire ;
- `not_addressed` : elle traite d'autre chose ;
- `indeterminate` : elle est trop ambiguë ou contradictoire.

Seul `entailed` réussit. Avant tout scénario, le runner calibre le juge avec un
exemple fixe de chaque résultat. Un juge incapable de les distinguer arrête la
suite avant tout appel à l'application. Cette calibration a un délai de deux
minutes géré par le runner.

Appliquez les conditions de chaque affirmation telles qu'elles sont écrites.
« Indiquer le prix » exige un prix. « Tout prix cité doit correspondre à la
référence ; ne citer aucun prix satisfait cette contrainte » permet l'omission :
une réponse non vide qui ne cite aucun prix satisfait cette contrainte
(`entailed`, et non `not_addressed`) si ses autres exigences sont remplies.
L'omission ne fournit pas le contenu obligatoire, n'étaye pas une déclaration
incluse sans preuve et ne résout pas une condition inconnue sur le monde.

Le modèle interprète ces conditions ; le framework ne classe pas les affirmations
par du code et ne réécrit ni les résultats ni leurs justifications. Un `Output`
entièrement vide attribue toujours `not_addressed` à chaque affirmation et fait
échouer le scénario sans appeler le juge.

Le prompt demande d'appeler exactement une fois l'outil d'évaluation fourni,
sans indiquer un nom propre au fournisseur. Son schéma exige une propriété portant
l'ID de chaque affirmation, contenant un résultat et une justification non vide.
Le juge renvoie les jugements dans l'ordre des affirmations en les recherchant
par nom, et non selon leur position dans la réponse. Les noms manquants, inconnus
ou dupliqués, les champs supplémentaires et les résultats invalides sont refusés.

Les métadonnées structurelles permettent au validateur d'expliquer les erreurs
indépendantes des champs, par exemple une affirmation encodée comme chaîne alors
qu'un objet est requis. Le texte complet des affirmations reste dans le schéma
et les preuves de référence dans la requête ; ni l'un ni les autres ne sont copiés
dans ces métadonnées de correction. Une affirmation nommée `requests` est valide
si le schéma l'exige. Le juge ne fournit pas de verdicts d'exemple.

Le mécanisme de correction existant et borné peut demander une réponse de
remplacement, mais ne répare jamais une sortie invalide. Les résultats possibles,
le choix du modèle, les limites de tokens et le nombre de corrections restent
inchangés ; des indications plus précises ne garantissent pas leur respect. Une
fois les corrections épuisées, l'appelant reçoit une erreur, pas des jugements
inventés. Voir le [contrat du juge du framework](https://github.com/goadesign/goa-ai/blob/main/docs/evals.md#how-judging-works).

## Lire le rapport

Les noms des champs JSON du rapport sont stables. La durée d'un scénario
comprend le hook, la validation du résultat et le jugement.

- Les échecs de **suite** (sélection invalide, calibration ou annulation) sont
  renvoyés par `Run` et enregistrés dans le champ `error` du rapport.
- Les échecs de **scénario** (hook, résultat, délai ou jugement) sont enregistrés
  sur ce scénario, afin que les autres puissent se terminer.

Après une exécution sans erreur de suite, `report.Passed` n'est vrai que si
toutes les vérifications et affirmations de tous les scénarios sélectionnés ont
réussi. Une valeur false doit faire échouer la commande ou le travail CI.

## Migrer la construction du juge

`judge.New(client, opts...) *Judge` est remplacé par
`judge.New(client, maxOutputTokens, opts...) (*Judge, error)`. Modifiez chaque
appelant pour fournir son plafond de réponse configuré, strictement positif,
et traiter l'erreur avant de créer le runner. Les options existantes comme
`WithModelClass` suivent le plafond obligatoire et conservent leur sens.

L'ancien calcul `256 × nombre d'affirmations` est supprimé. Ce changement du
code source Go exige de modifier les appelants pour compiler avec la nouvelle
version. Il ne change ni le choix du modèle, ni le prompt, ni les résultats
possibles, ni la validation stricte, ni le nombre de corrections. Aucune
migration des rapports enregistrés n'est nécessaire.

## Migrer depuis les suites à entrée texte

Les entrées typées remplacent l'ancienne chaîne unique :

- remplacez `Input("some literal")` par un type Goa et déplacez la valeur dans
  le `Inputs` généré ;
- utilisez `Description` et `Timeout` de Goa v3, ainsi que `Tags` de Goa-AI ;
  `eval/dsl` ne déclare désormais que `Suite`, `Scenario` et `Input` ;
- remplacez les hooks `(context.Context, string)` par leurs signatures typées ;
- remplacez `New(hooks)` par `New(hooks, inputs)` et traitez son erreur de
  validation.

Régénérez avant de compiler. Le package de suite et les hooks résident dans le
même binaire Go : une incompatibilité produit une erreur de compilation, pas
une surprise à l'exécution.

## Modèles juges distants

Les suites utilisent le même `model.Client` opaque et validé que les
planificateurs. Si le modèle juge s'exécute dans un autre processus, exposez le
fournisseur avec `gateway.NewServer` et connectez-vous avec
`gateway.NewRemoteClient` ou `gateway.NewCountingRemoteClient`. Le client de
comptage est obligatoire lorsqu'une politique d'évaluation exige le nombre
exact de jetons d'entrée. Consultez
[Passerelles de modèles distants](./runtime/#remote-model-gateways) pour le
contrat de transport et de validation.
