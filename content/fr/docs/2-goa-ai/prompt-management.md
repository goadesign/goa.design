---
nav_group: guides
title: "Gestion des prompts"
linkTitle: "Gestion des prompts"
weight: 28
description: "Déclarez les prompts dans le design, rendez-les avec des arguments typés, modifiez-les à l’exécution pour une portée, et voyez quelle version de prompt a construit chaque requête au modèle."
llm_optimized: true
---

<!-- PENDING(signatures): this draft describes contracts already settled in
review. Every block marked PENDING(signatures) waits for the reviewed goa-ai
prompt API; do not publish while any marker remains. -->

Un prompt est le texte que votre agent envoie à un modèle, par exemple un prompt
système qui indique à un assistant de support comment traiter les remboursements.
Goa-AI traite les prompts comme une partie de votre design :

- Vous déclarez dans le design chaque prompt, son rôle et les arguments qu’il
  accepte.
- `goa gen` vérifie chaque template par rapport à ces arguments et génère une
  fonction typée qui le rend.
- À l’exécution, vous pouvez remplacer le texte d’un prompt pour un client, une
  session ou tout le monde, sans recompiler ni redéployer.
- Le rendu renvoie les versions exactes des prompts qu’il a utilisées. Attachez-les
  à la requête au modèle qui envoie le texte, et la trace de cette requête montre
  quel texte a produit quelle réponse.

## Concepts {#concepts}

**Prompt de base.** Le prompt tel que déclaré dans le design : son ID (par exemple
`support.system`), son rôle (`system`, `user`, `tool` ou `synthesis`), le texte de
son template et les champs que le template peut utiliser. Le runtime enregistre
chaque prompt de base une seule fois, et un prompt de base enregistré ne change
jamais. Sa version est dérivée du texte du template : modifier le texte dans le
design produit donc une nouvelle version.

**Remplacement.** Un texte de remplacement pour un prompt, enregistré dans un
magasin de prompts, qui ne s’applique que dans une portée. Chaque remplacement
reçoit sa propre version.

**Portée.** L’endroit où un remplacement s’applique. Une portée a un ID de session
facultatif et les libellés de votre choix, comme `account=acme` ou `region=eu`.
Un remplacement s’applique à une requête lorsque :

- le remplacement n’a pas d’ID de session, ou son ID de session est égal à celui
  de la requête ; et
- chaque libellé du remplacement figure dans la requête avec la même valeur.

Un remplacement sans session ni libellé s’applique partout.

**Quel remplacement l’emporte.** Lorsque plusieurs remplacements s’appliquent, le
runtime en choisit un :

1. Un remplacement avec un ID de session l’emporte sur un remplacement sans session.
2. Sinon, le remplacement qui a le plus de libellés l’emporte sur celui qui en a
   moins.
3. Sinon, le remplacement le plus récent l’emporte.

Si aucun remplacement ne s’applique, le runtime rend le prompt de base.

Par exemple, avec ces remplacements enregistrés pour `support.system` :

| Portée du remplacement | S’applique à une requête de la session `s-42` pour `account=acme`, `region=eu` ? |
| --- | --- |
| sans session, sans libellé | oui |
| `account=acme` | oui |
| `account=acme`, `region=eu` | oui, et l’emporte : il a le plus de libellés |
| `account=globex` | non : la valeur du libellé diffère |

## Déclarer les prompts dans le design

<!-- PENDING(signatures): Prompt / SystemPrompt / Args DSL, agent-level and
service-level placement, and the exact generated names. Arguments are rendered
from the generated Go struct, so templates use exact generated Go field names. -->

## Enregistrer les prompts

Le runtime doit connaître le prompt de base avant que quoi que ce soit puisse le
rendre.

**Les prompts d’agent** s’enregistrent avec leur agent. `AgentRegistration.PromptSpecs`
liste les prompts dont un agent est propriétaire, et `Runtime.RegisterAgent` les
traite :

1. Il vérifie d’abord chaque prompt listé, avant d’enregistrer quoi que ce soit.
   Un template qui ne s’analyse pas, un ID en double ou un ID déjà enregistré fait
   échouer tout l’appel. C’est aussi le cas d’un template qui utilise un champ que
   son prompt ne déclare pas, lorsque le prompt déclare ses champs.
2. Il enregistre l’agent auprès du moteur de workflow.
3. Seulement si cela réussit, il ajoute les prompts à `Runtime.PromptRegistry`.

Un prompt qui échoue aux vérifications arrête `RegisterAgent` avant que l’agent
n’atteigne le moteur de workflow. Construire une valeur d’enregistrement n’a aucun
effet de bord : rien n’est enregistré tant que vous n’appelez pas `RegisterAgent`.

**Les prompts de service** appartiennent à un service plutôt qu’à un seul agent, si
bien que plusieurs agents et du code hors agent peuvent les partager. Leur
`PromptSpec.AgentID` est vide, et vous les enregistrez directement avec
`Runtime.PromptRegistry.Register`.

<!-- PENDING(signatures): the generated agent registration that fills
PromptSpecs and the generated service registration function. -->

**Les prompts que vous enregistrez à la main** continuent de fonctionner. Construisez
un `prompt.PromptSpec` et passez-le à `Runtime.PromptRegistry.Register`, comme
avant. Un spec sans `Fields` ne déclare aucun champ : la syntaxe de son template
est donc vérifiée, mais pas les noms de champs.

## Rendre un prompt et suivre les versions utilisées

Le rendu renvoie le texte et la liste de chaque version de prompt utilisée pour le
construire. Cette liste inclut les prompts intégrés avec
`{{ render "<prompt-id>" . }}`, dans l’ordre où ils ont été rendus. Placez cette
liste sur la requête au modèle qui utilise le texte :

<!-- PENDING(signatures): replace with the generated typed render helper once
its signature is final. -->

```go
content, err := input.Agent.RenderPrompt(ctx, "support.system", args)
if err != nil {
    return nil, err
}

system := &model.Message{
    Role:  model.ConversationRoleSystem,
    Parts: []model.Part{model.TextPart{Text: content.Text}},
}
resp, err := modelClient.Complete(ctx, &model.Request{
    Messages:   append([]*model.Message{system}, input.Messages...),
    PromptRefs: content.Refs,
})
```

Utilisez `content.Refs`, et non `[]prompt.PromptRef{content.Ref}`. `content.Ref`
ne nomme que le prompt de premier niveau et omet les prompts qu’il a composés.

Le runtime n’attache pas les versions de prompt à votre place : chaque requête
porte la liste que son appelant y a placée. Si un planificateur rend un prompt de
classification et un prompt de réponse distinct pour deux appels au modèle dans le
même tour, donnez à chaque requête les `Refs` de son propre rendu. Le span de
trace de l’appel au modèle liste les ID et les versions des prompts de cette
requête.

<!-- PENDING(signatures): exact span attribute names. -->

## Modifier un prompt à l’exécution

Enregistrer un remplacement remplace le texte d’un prompt pour une portée. Le
runtime vérifie le nouveau template avant d’enregistrer quoi que ce soit. Pour un
prompt qui déclare ses champs, un template qui utilise un champ inconnu est rejeté
au moment de l’enregistrement, au lieu d’échouer plus tard à chaque rendu.

<!-- PENDING(signatures): state how generated prompts, including prompts with
no arguments, declare their fields. -->

<!-- PENDING(signatures): SetOverride / ValidateOverride signatures and return
values. -->

## Réinitialiser un remplacement

La réinitialisation supprime les remplacements d’un prompt à une portée exacte :
le rendu suivant revient alors au remplacement suivant qui s’applique, ou au
prompt de base.

La réinitialisation est destructive :

- Elle supprime définitivement chaque remplacement enregistré pour ce prompt dont
  la portée est exactement égale à celle que vous passez : le même ID de session
  et les mêmes libellés, ni plus ni moins.
- Les remplacements des autres portées restent intacts, y compris les portées plus
  larges et plus étroites.
- `History` ne renvoie ensuite que les remplacements restants. La réinitialisation
  ne conserve aucune trace d’audit de ce qu’elle a supprimé. Si vous en avez
  besoin, enregistrez ce qu’elle va supprimer avant de réinitialiser.

Par exemple, réinitialiser `support.system` à la portée `account=acme` supprime
les remplacements enregistrés exactement à `account=acme`. Un remplacement à
`account=acme, region=eu` reste, de même qu’un remplacement sans libellé. Une
requête pour `account=acme, region=eu` continue d’utiliser le remplacement plus
étroit. Une requête pour `account=acme` seul utilise désormais le remplacement
sans libellé.

<!-- PENDING(signatures): Registry.ResetOverride / Store.Reset call. -->

## Stocker les remplacements

Les remplacements résident dans un magasin de prompts que vous passez au runtime
avec `runtime.WithPromptStore`. Goa-AI en inclut deux :

- `prompt.NewInMemoryStore()`, pour les tests et le développement en un seul
  processus ;
- le magasin MongoDB de `features/prompt/mongo`, pour la production.

Sans magasin de prompts, chaque rendu utilise le prompt de base.

### Magasins personnalisés

Un `prompt.Store` personnalisé implémente désormais aussi `Reset`, avec le
comportement destructif à portée exacte décrit ci-dessus. Traitez les clés et
valeurs de libellé comme de simples données : une clé peut contenir des points, et
une valeur peut commencer par `$`.

<!-- PENDING(signatures): final Store interface listing and migration note for
external implementers. -->
