---
nav_group: guides
title: "Gestion des prompts"
linkTitle: "Gestion des prompts"
weight: 28
description: "Déclarez les prompts dans le design, rendez-les avec des arguments typés, modifiez-les à l’exécution pour une portée, et voyez quelle version de prompt a construit chaque requête au modèle."
llm_optimized: true
---

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

## Prérequis de version {#version-prerequisite}

Les prompts déclarés dans le design (`SystemPrompt`, `Prompt`, `Template`,
`Role`, `Args`), les paquets de prompts générés et la validation typée des
remplacements ont été intégrés dans `goa.design/goa-ai` après `v0.90.0`. En
attendant la prochaine version étiquetée, épinglez `goa.design/goa-ai` sur le
commit `fb00df97927e61cfa444423e77584b950d753bda` (la dépendance de module de
`goa-ai` sélectionne automatiquement une version compatible de
`goa.design/goa/v3`) :

```bash
go get goa.design/goa-ai@fb00df97927e61cfa444423e77584b950d753bda
```

## Concepts {#concepts}

**Prompt de base.** Le prompt tel que déclaré dans le design : son ID (par exemple
`support.assistant.system`), son rôle (`system`, `user`, `tool` ou `synthesis`),
le texte de son template et les champs que le template peut utiliser. Le runtime
enregistre chaque prompt de base une seule fois, et un prompt de base enregistré
ne change jamais. Sa version est dérivée du texte du template : modifier le texte
dans le design produit donc une nouvelle version.

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

Par exemple, avec ces remplacements enregistrés pour `support.assistant.system` :

| Portée du remplacement | S’applique à une requête de la session `s-42` pour `account=acme`, `region=eu` ? |
| --- | --- |
| sans session, sans libellé | oui |
| `account=acme` | oui |
| `account=acme`, `region=eu` | oui, et l’emporte : il a le plus de libellés |
| `account=globex` | non : la valeur du libellé diffère |

## Déclarer les prompts dans le design

Utilisez `SystemPrompt` dans `Agent` pour le prompt système de base de l’agent
(`<service>.<agent>.system`, rôle `system`), `Prompt` dans `Agent` pour les
prompts propres à l’agent (`<service>.<agent>.<name>`, rôle par défaut `user`)
et `Prompt` dans `Service` pour les prompts partagés entre agents ou code hors
agent (`<service>.<name>`) :

```go
var _ = Service("support", func() {
    Prompt("shared_safety", func() {
        Description("Shared safety rules")
        Role("system")
        Template("Never disclose internal credentials or personal data.")
    })

    Agent("assistant", "Answer refund questions", func() {
        SystemPrompt(func() {
            Description("Refund policy")
            Args(func() {
                Attribute("account_name", String)
                Attribute("refund_limit", Int)
                Required("account_name", "refund_limit")
            })
            Template("You help {{ .AccountName }} customers. " +
                "Approve refunds up to ${{ .RefundLimit }}. " +
                `{{ render "support.shared_safety" }}`)
        })
    })
})
```

Les templates sont rendus avec le struct d’arguments Go généré
(`SystemPromptArgs` ou `<Name>PromptArgs`), de sorte que les expressions
utilisent les noms exacts des champs Go générés (`{{ .AccountName }}`,
`{{ .RefundLimit }}`). `goa gen` émet les fonctions de prompt d’agent dans
`gen/<service>/agents/<agent>/prompts.go` (`SystemPromptID`, `Prompt<Name>ID`,
`SystemPromptArgs`, `<Name>PromptArgs`, `PromptSpecSystem()`,
`PromptSpec<Name>()`, `PromptSpecs()`, `RegisterPrompts`, `RenderSystemPrompt`,
`Render<Name>Prompt`, `RenderSystemPromptWithRegistry` et
`Render<Name>PromptWithRegistry`) et les fonctions de prompt de service dans
`gen/<service>/prompts/prompts.go`.

## Enregistrer les prompts

Le runtime doit connaître le prompt de base avant que quoi que ce soit puisse le
rendre.

**Les prompts d’agent** s’enregistrent avec leur agent. `AgentRegistration.PromptSpecs`
liste les prompts dont un agent est propriétaire, et `Runtime.RegisterAgent` les
traite :

1. Il vérifie d’abord chaque prompt listé, avant d’enregistrer quoi que ce soit.
   Un template qui ne s’analyse pas, un ID en double ou un ID déjà enregistré fait
   échouer tout l’appel. C’est aussi le cas d’un template qui utilise un champ que
   son `ArgsType` ne déclare pas, lorsque le prompt déclare `ArgsType`.
2. Il enregistre l’agent auprès du moteur de workflow.
3. Seulement si cela réussit, il ajoute les prompts à `Runtime.PromptRegistry`.

Un prompt qui échoue aux vérifications arrête `RegisterAgent` avant que l’agent
n’atteigne le moteur de workflow. Construire une valeur d’enregistrement n’a aucun
effet de bord : rien n’est enregistré tant que vous n’appelez pas `RegisterAgent`.

**Les prompts de service** appartiennent à un service plutôt qu’à un seul agent, si
bien que plusieurs agents et du code hors agent peuvent les partager. Leur
`PromptSpec.AgentID` est vide, et vous les enregistrez sur
`Runtime.PromptRegistry` avec la fonction générée `RegisterPrompts` du package
de service (ou `Runtime.PromptRegistry.Register`) :

```go
if err := supportprompts.RegisterPrompts(rt.PromptRegistry); err != nil {
    return err
}
if err := assistant.RegisterAssistantAgent(ctx, rt, assistant.AssistantAgentConfig{
    Planner: myPlanner,
}); err != nil {
    return err
}
```

`NewAssistantRegistration(rt, cfg)` remplit `AgentRegistration.PromptSpecs` à
partir du slice généré `PromptSpecs()` sans modifier le registre, et
`RegisterAssistantAgent` appelle `rt.RegisterAgent(ctx, reg)`.

**Les prompts que vous enregistrez à la main** continuent de fonctionner. Construisez
un `prompt.PromptSpec` et passez-le à `Runtime.PromptRegistry.Register`, comme
avant. Un spec avec un `ArgsType` nul accepte des données non typées : la syntaxe
de son template et ses `Funcs` déclarées sont donc vérifiées, mais pas les noms de
champs d’un struct.

## Rendre un prompt et suivre les versions utilisées

Le rendu renvoie le texte et la liste de chaque version de prompt utilisée pour le
construire. Cette liste inclut les prompts intégrés avec
`{{ render "<prompt-id>" . }}`, dans l’ordre où ils ont été rendus. Placez cette
liste sur la requête au modèle qui utilise le texte :

```go
content, err := assistant.RenderSystemPrompt(ctx, input.Agent, assistant.SystemPromptArgs{
    AccountName: "Acme",
    RefundLimit: 100,
})
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
même tour, donnez à chaque requête les `Refs` de son propre rendu. Le span client
`gen_ai.chat` enregistre `gen_ai.prompt.ids`, `gen_ai.prompt.versions` et
`goa_ai.prompt.refs` (`"<id>@<version>"`) de cette requête.

## Modifier un prompt à l’exécution

Enregistrer un remplacement remplace le texte d’un prompt pour une portée. Le
runtime vérifie le nouveau template avant d’enregistrer quoi que ce soit. Les
prompts générés définissent `PromptSpec.ArgsType` sur
`reflect.TypeFor[<Name>PromptArgs]()` lorsque `Args` est déclaré, ou sur
`reflect.TypeFor[struct{}]()` lorsque le prompt ne prend aucun argument, de sorte
qu’un template qui utilise un champ inconnu est rejeté au moment de
l’enregistrement au lieu d’échouer plus tard à chaque rendu :

```go
scope := prompt.Scope{
    Labels: map[string]string{"account": "acme"},
}
if err := rt.PromptRegistry.ValidateOverride(assistant.SystemPromptID, newTemplate); err != nil {
    return err
}
if err := rt.PromptRegistry.SetOverride(ctx, assistant.SystemPromptID, scope, newTemplate, map[string]string{
    "author": "ops@acme.com",
}); err != nil {
    return err
}
```

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

Par exemple, réinitialiser `support.assistant.system` à la portée `account=acme`
supprime les remplacements enregistrés exactement à `account=acme`. Un
remplacement à `account=acme, region=eu` reste, de même qu’un remplacement sans
libellé. Une requête pour `account=acme, region=eu` continue d’utiliser le
remplacement plus étroit. Une requête pour `account=acme` seul utilise désormais
le remplacement sans libellé.

```go
if err := rt.PromptRegistry.ResetOverride(ctx, assistant.SystemPromptID, prompt.Scope{
    Labels: map[string]string{"account": "acme"},
}); err != nil {
    return err
}
```

## Stocker les remplacements

Les remplacements résident dans un magasin de prompts que vous passez au runtime
avec `runtime.WithPromptStore`. Goa-AI en inclut deux :

- `prompt.NewInMemoryStore()`, pour les tests et le développement en un seul
  processus ;
- le magasin MongoDB de `features/prompt/mongo`, pour la production.

Sans magasin de prompts, chaque rendu utilise le prompt de base.

### Magasins personnalisés

Un `prompt.Store` personnalisé implémente `Reset` avec le comportement
destructif à portée exacte décrit ci-dessus. Traitez les clés et valeurs de
libellé comme de simples données : une clé peut contenir des points, et une
valeur peut commencer par `$`.

```go
type Store interface {
    Resolve(ctx context.Context, promptID Ident, scope Scope) (*Override, error)
    Set(ctx context.Context, promptID Ident, scope Scope, template string, metadata map[string]string) error
    Reset(ctx context.Context, promptID Ident, scope Scope) error
    History(ctx context.Context, promptID Ident) ([]*Override, error)
    List(ctx context.Context) ([]*Override, error)
}
```

Si votre application implémente un `prompt.Store` personnalisé, ajoutez
`Reset(ctx, promptID, scope)` afin qu’elle supprime définitivement les
remplacements dont `PromptID`, `Scope.SessionID` et `Scope.Labels` correspondent
exactement à `scope` (et renvoie `nil` lorsqu’aucun remplacement n’existe à cette
portée exacte).
