---
title: "Temps d'exécution"
linkTitle: "Temps d'exécution"
weight: 3
description: "Understand how the Goa-AI runtime orchestrates agents, enforces policies, and manages state."
llm_optimized: true
aliases:
---

## Présentation de l'architecture

Le runtime Goa-AI orchestre la boucle planifier/exécuter/reprendre, applique les politiques, gère l'état et se coordonne avec les moteurs, les planificateurs, les outils, la mémoire, les hooks et les modules de fonctionnalités.

| Couche | Responsabilité |
| --- | --- |
| DSL + Codegen | Produire des registres d'agents, des spécifications/codecs d'outils, des spécifications/codecs de complétion, des flux de travail, des adaptateurs MCP |
| Noyau d'exécution | Orchestre la boucle de planification/démarrage/reprise, l'application des politiques, les hooks, la mémoire, le streaming |
| Adaptateur de moteur de flux de travail | L'adaptateur Temporal implémente `engine.Engine` ; d'autres moteurs peuvent se brancher |
| Stockage du runtime hôte | Enregistre ensemble la portée de session, l’état d’exécution, les points de reprise et les enregistrements immuables |
| Modules de fonctionnalités | Intégrations facultatives (MCP, Pulse, mémoire et prompts, fournisseurs de modèles) |

---

## Architecture agentique de haut niveau

Au moment de l'exécution, Goa-AI organise votre système autour d'un petit ensemble de constructions composables :

- **Agents** : orchestrateurs de longue durée identifiés par `agent.Ident` (par exemple, `service.chat`). Chaque agent possède un planificateur, une politique d'exécution, des flux de travail générés et des enregistrements d'outils.

- **Exécutions** : une seule exécution d'un agent. Les courses sont identifiées par un `RunID` et suivies via `run.Context` et `run.Handle`. Les exécutions de session sont regroupées par `SessionID` et `TurnID` pour former des conversations ; Les exécutions ponctuelles sont explicitement sans session.

- **Ensembles d'outils et outils** : collections nommées de fonctionnalités, identifiées par `tools.Ident` (`service.toolset.tool`). Les ensembles d'outils basés sur des services appellent des API ; Les ensembles d'outils soutenus par des agents exécutent d'autres agents en tant qu'outils.

- **Achèvements** : Contrats de sortie d'assistant direct dactylographiés appartenant au service générés sous `gen/<service>/completions`. Les assistants d'achèvement attachent une sortie structurée imposée par le fournisseur aux requêtes de modèle unaire et en streaming direct, puis décodent la charge utile typée canonique via les codecs générés.

- **Planificateurs** : votre couche stratégique basée sur LLM mettant en œuvre `PlanStart` / `PlanResume`. Les planificateurs décident quand appeler les outils plutôt que de répondre directement ; le runtime impose des plafonds et des budgets de temps autour de ces décisions.

- **Arbre d'exécution et agent en tant qu'outil** : lorsqu'un agent appelle un autre agent en tant qu'outil, le moteur d'exécution démarre une véritable exécution enfant avec son propre `RunID`. Le parent `ToolResult` transporte un `RunLink` (`*run.Handle`) pointant vers l'enfant, et un événement de flux `child_run_linked` correspondant est émis afin que UIs puisse corréler les appels d'outil parent avec les ID d'exécution enfant sans deviner.

- **Flux et profils appartenant à la session** : Goa-AI publie les valeurs `stream.Event` saisies dans un **flux appartenant à la session** (`session/<session_id>`). Les événements transportent à la fois `RunID` et `SessionID` et incluent un marqueur de limite explicite (`run_stream_end`) afin que les consommateurs puissent fermer SSE/WebSocket de manière déterministe sans minuterie. `stream.StreamProfile` sélectionne les types d'événements visibles pour une audience donnée (chat UI, débogage, métriques).

---

## Démarrage rapide

```go
package main

import (
    "context"
    "time"

    chat "example.com/assistant/gen/orchestrator/agents/chat"
    "goa.design/goa-ai/runtime/agent/model"
    "goa.design/goa-ai/runtime/agent/runtime"
    storageinmem "goa.design/goa-ai/runtime/agent/storage/inmem"
)

func main() {
    // In-memory engine is the default; pass WithEngine for Temporal or custom engines.
    store := storageinmem.New()
    rt := runtime.New(store)
    ctx := context.Background()
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: newChatPlanner()})
    if err != nil {
        panic(err)
    }

    // Sessions are first-class: create a session before starting runs under it.
    if _, err := store.CreateSession(ctx, "session-1", time.Now().UTC()); err != nil {
        panic(err)
    }

    client := chat.NewClient(rt)
    out, err := client.Run(ctx, "session-1", []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Summarize the latest status."}},
    }})
    if err != nil {
        panic(err)
    }
    // Use out.RunID, out.Final (the assistant message), etc.
}
```

---

## Complétions directes dactylographiées

Toutes les interactions structurées ne doivent pas être modélisées comme un appel d’outil. Quand votre
Le service a besoin d'une réponse finale de l'assistant tapée, déclarez `Completion(...)` dans le
DSL et régénérer.

`goa gen` émet `gen/<service>/completions` avec :

- les types de résultat et d'union typés ;
- les schémas privés et codecs générés du résultat ;
- les fonctions générées `Complete<Name>(ctx, client, req)` ;
- les fonctions typées `StreamComplete<Name>(ctx, client, req)` ;
- `<Name>Example()` lorsque le résultat racine possède un `Example(...)`.

Les services peuvent déclarer des achèvements sans déclarer de `Agent(...)`. Agent
un échafaudage de démarrage rapide/exemple est émis uniquement pour les services qui possèdent réellement
agents.

Ces assistants clonent la requête et attachent une sortie structurée indépendante du fournisseur.
métadonnées, appelez le `model.Client` sous-jacent et décodez le canonique typé
charge utile via le codec généré :

```go
resp, err := taskcompletion.CompleteDraftFromTranscript(ctx, modelClient, &model.Request{
    Messages: []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Create a startup investigation task."}},
    }},
})
if err != nil {
    panic(err)
}

fmt.Println(resp.Value.Name)
```

Chaque `model.StructuredOutput` de bas niveau exige un nom non vide. Les
fonctions générées le dérivent du DSL validé. Une complétion unaire effectue
exactement un appel au modèle. Un JSON invalide renvoie
`planner.OutputContractError`, non récupérable, et une réponse nil ; aucune
demande de correction n'est déclenchée. Après un succès,
`resp.ModelResponse` contient la réponse exacte du fournisseur et son
utilisation des jetons.

Les complétions en continu renvoient un `completion.Streamer[T]`. `Recv`
expose des fragments d'aperçu, tandis que `Value()` reste indisponible jusqu'à
la fin du flux et jusqu'à ce que la réponse terminale concorde avec la
complétion finale :

```go
stream, err := taskcompletion.StreamCompleteDraftFromTranscript(ctx, modelClient, &model.Request{
    Messages: []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Create a startup investigation task."}},
    }},
})
if err != nil {
    panic(err)
}
defer stream.Close()

for {
    chunk, err := stream.Recv()
    if errors.Is(err, io.EOF) {
        break
    }
    if err != nil {
        panic(err)
    }
    // Render preview completion_delta chunks here when useful.
    _ = chunk
}
value, ok := stream.Value()
if !ok {
    panic("completion stream ended without a typed value")
}
fmt.Println(value.Name)
```

Les aides à la complétion typées sont intentionnellement strictes :

- Les assistants unaires acceptent uniquement les demandes unaires.
- Les noms de complétion sont validés à la limite DSL : 1 à 64 caractères ASCII,
lettres/chiffres/`_`/`-` uniquement et doit commencer par une lettre ou un chiffre.
- Les assistants unaires et en streaming rejettent les requêtes activées par les outils et le `StructuredOutput` fourni par l'appelant.
- Les fournisseurs de streaming émettent des fragments d'aperçu
  `completion_delta` et une réponse terminale canonique cohérente, ou refusent
  explicitement la demande.
- Les fournisseurs qui n’implémentent pas la sortie structurée renvoient
  `model.ErrStructuredOutputUnsupported`.
- Les schémas générés sont canoniques et indépendants du fournisseur ; les adaptateurs de fournisseur peuvent les normaliser sur un sous-ensemble pris en charge, mais doivent échouer explicitement lorsqu'ils ne peuvent pas préserver le contrat déclaré.

---

## Client uniquement vs travailleur

Deux rôles utilisent le runtime :

- **Client uniquement** (soumettre des exécutions) : construit un environnement d'exécution avec un moteur compatible client et n'enregistre pas les agents. Utilisez le `<agent>.NewClient(rt)` généré, qui transporte l'`AgentDefinition` générée et partagée avec les workers distants.
- **Worker** (exécutions d'exécution) : construit un environnement d'exécution avec un moteur capable de fonctionner, enregistre les ensembles d'outils et les agents, puis scelle l'enregistrement afin que l'interrogation ne démarre qu'une fois le registre d'exécution local terminé.

Chaque `AgentDefinition` générée est le contrat complet et immuable d'un agent.
Elle contient le nom du workflow, la file de tâches par défaut, les contrats des
outils générés, les labels obligatoires, la politique de complétion et les
définitions de tous les agents enfants accessibles. Les appelants l'utilisent
pour valider et diriger le travail avant que le moteur accepte le workflow ; les
workers utilisent la même valeur pour l'enregistrer. Une exécution donnée peut
choisir une autre file avec `WithTaskQueue`, mais un enregistrement écrit à la
main ne doit pas définir une seconde route ni un second graphe d'agents enfants.

### Exemple client uniquement

```go
rt := runtime.New(runtimeStore, runtime.WithEngine(temporalClient)) // engine client

// The host session service has already created "s1".
// No agent registration is needed in a caller-only process.
client := chat.NewClient(rt)
out, err := client.Run(ctx, "s1", msgs)
```

### Exécutions ponctuelles sans session

Utilisez `StartOneShot` et `OneShotRun` lorsque vous souhaitez un travail durable qui n'est pas attaché à une session existante.

- `Start` / `Run` sont de type session : ils nécessitent un `SessionID` concret, participent au cycle de vie de la session et émettent des événements de flux à l'échelle de la session.
- `StartOneShot` / `OneShotRun` sont sans session : ils ne prennent pas de `SessionID` et n'en créent pas. Avant d'exécuter le travail, le stockage intégré enregistre les métadonnées complètes sans session et l'enregistrement `RunStarted`, afin que l'exécution soit consultable par `RunID`.
- L’application hôte crée les sessions avant le travail ; les runtimes d’agents ne créent, ne terminent et ne suppriment pas les sessions.
- Le moteur accepte un workflow racine avant que sa première activity enregistre l’exécution. Aucun état `pending` n’est créé avant l’admission.
- Les démarrages racine, enfant et ponctuel sont des opérations distinctes. Le démarrage enfant enregistre le lien parent ; le démarrage ponctuel enregistre toutes les métadonnées sans session.
- Le motif d’annulation est écrit une seule fois. Une répétition identique réussit ; un motif différent produit un conflit.
- La suspension et la fin enregistrent le nouvel état avec l’enregistrement immuable correspondant.
- `StartOneShot` renvoie immédiatement un `engine.WorkflowHandle`. `OneShotRun` est le wrapper pratique de blocage qui appelle `handle.Wait(ctx)` pour vous.

```go
client := chat.NewClient(rt)

handle, err := client.StartOneShot(ctx, msgs,
    runtime.WithRunID("run-123"),
    runtime.WithLabels(map[string]string{"tenant": "acme"}),
)
if err != nil {
    panic(err)
}

out, err := handle.Wait(ctx)
if err != nil {
    panic(err)
}

fmt.Println(out.RunID)
```

La méthode de plus bas niveau `Runtime.RunOneShot` enregistre l’exécution avant
d’appeler le code de l’application. Lorsque le callback se termine, elle
enregistre les prompts rendus et le résultat final même si le callback a annulé
son contexte. Les erreurs temporaires du stockage relancent l’écriture des
enregistrements déjà préparés sans rappeler le callback.

### Exemple de travailleur

```go
eng, err := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{HostPort: "temporal:7233", Namespace: "default"},
    WorkerOptions: temporal.WorkerOptions{TaskQueue: "orchestrator.chat"},
})
if err != nil {
    panic(err)
}
defer eng.Close()

rt := runtime.New(runtimeStore, runtime.WithEngine(eng))
if err := chat.RegisterUsedToolsets(ctx, rt /* executors... */); err != nil {
    panic(err)
}
if err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{Planner: myPlanner}); err != nil {
    panic(err)
}
if err := rt.Seal(ctx); err != nil {
    panic(err)
}
```

---

## Boucle Planifier → Exécuter → Reprendre

1. Le moteur accepte un workflow pour l'agent, en mémoire ou dans Temporal.
2. La première activité enregistre l'identité et le premier enregistrement
   permanent avec `StartRootRun`, `StartChildRun`, `StartOneShotRun` ou
   `StartOneShotChildRun`. Chaque workflow accepté enregistre `RunStarted`.
   [Mémoire et sessions](../memory-sessions/#cancellation-provenance) définit
   les trois façons valides d'enregistrer les motifs et les demandes
   d'annulation.
3. Le runtime appelle `PlanStart` avec les messages et un `run.Context`
   contenant `RunID`, `SessionID`, `TurnID`, les libellés et les limites.
4. Il planifie les appels d'outils avec les codecs générés.
5. Il appelle `PlanResume` avec les résultats d'outils survivants visibles par
   le planificateur. Les outils budgétisés sont visibles par défaut ; les outils
   comptables ne sont rejoués qu'après un échec dont
   `ToolFailure.Recovery.Action` demande une récupération. La boucle continue
   jusqu'à une réponse finale, un résultat d'outil final ou le succès d'un
   outil `TerminalRun`. Pendant une finalisation imposée par une limite ou un
   délai, le planificateur peut terminer avec des outils comptables terminaux.
   L'exécution progresse dans les valeurs `run.Phase` (`prompted`, `planning`,
   `executing_tools`, `synthesizing` et phases terminales).
6. Les hooks et les abonnés au flux émettent des événements (pensées du planificateur, démarrage/mise à jour/fin de l'outil, attentes, utilisation, flux de travail, liens exécutés par l'agent) et, une fois configurés, conservent les entrées de transcription et exécutent les métadonnées.

---
## Phases d'exécution

Au fur et à mesure qu’une exécution progresse dans la boucle planifier/exécuter/reprendre, elle passe par une série de phases du cycle de vie. Ces phases offrent une visibilité précise de l'état d'avancement d'une exécution, permettant à UIs d'afficher des indicateurs de progression de haut niveau.

### Valeurs de phase

| Phase | Description |
| --- | --- |
| `prompted` | Les commentaires ont été reçus et l'exécution est sur le point de commencer la planification |
| `planning` | Le planificateur décide si et comment appeler les outils ou répondre directement |
| `executing_tools` | Les outils (y compris les agents imbriqués) sont en cours d'exécution |
| `synthesizing` | Le planificateur synthétise une réponse finale sans planifier d'outils supplémentaires |
| `completed` | L'exécution s'est terminée avec succès |
| `failed` | La course a échoué |
| `canceled` | La course a été annulée |

### Transitions de phases

Une exécution réussie typique suit cette progression :

```
prompted → planning → executing_tools → planning → synthesizing → completed
                          ↑__________________|
                          (loop while tools needed)
```

Le runtime émet des événements hook `RunPhaseChanged` pour les phases **non terminales** (par exemple, `planning`, `executing_tools`, `synthesizing`) afin que les abonnés au flux puissent suivre la progression en temps réel.

### Phase vs Statut

Les phases sont distinctes de `run.Status` :

- **Le statut** (`running`, `suspended`, `completed`, `failed`, `canceled`) correspond à l'état du cycle de vie à granularité grossière stocké dans les métadonnées d'exécution durables. Il n’existe aucun état `pending` avant l’admission.
- **Phase** offre une visibilité plus fine sur la boucle d'exécution, destinée aux surfaces de streaming/UX

### Événements du cycle de vie : changements de phase ou achèvement du terminal

Le runtime émet :

- **`RunPhaseChanged`** pour les transitions de phase non terminales.
- **`RunCompleted`** une fois par exécution pour le cycle de vie du terminal (succès/échec/annulation).

Les abonnés au flux traduisent les deux en événements de flux `workflow` (`stream.WorkflowPayload`) :

- **Mises à jour non terminales** (à partir de `RunPhaseChanged`) : `phase` uniquement.
- **Mise à jour du terminal** (à partir de `RunCompleted`) : `status` + terminal `phase`, plus champs d'erreur structurés sur les échecs.

**Mappage de l'état du terminal**

- `status="success"` → `phase="completed"`
- `status="failed"` → `phase="failed"`
- `status="canceled"` → `phase="canceled"`

**L'annulation n'est pas une erreur**

Pour `status="canceled"`, la charge utile du flux **ne doit pas** inclure un `error` destiné à l'utilisateur. Les consommateurs devraient considérer l’annulation comme un état final terminal et sans erreur.

**Les échecs sont structurés**

Pour `status="failed"`, la charge utile du flux comprend :

- `error_kind` : classificateur stable pour l'UX/la décision (types de fournisseurs comme `rate_limited`, `unavailable` ou types d'exécution comme `timeout`/`internal`)
- `retryable` : si une nouvelle tentative peut réussir sans modifier l'entrée
- `error` : message **sécurisé pour l'utilisateur** adapté à l'affichage direct
- `debug_error` : texte de diagnostic de l'erreur ; l'application décide qui peut le voir

**Identité terminale**

`RunCompleted` porte `Labels` : les étiquettes de portée exécution fournies au
démarrage de l'exécution (`RunInput.Labels`, définies via
`runtime.WithLabels(...)`), nil quand l'exécution n'en avait aucune. Les
abonnés à la fin d'exécution peuvent attribuer le résultat terminal — success,
failed ou canceled — sans maintenir leur propre table run-ID vers identité. Les
mêmes étiquettes sont exposées sur `run.Snapshot.Labels` pour les lecteurs par
sondage, rejouées depuis l'enregistrement durable `RunStarted`, de sorte que
l'identité de l'exécution survit aux redémarrages du processus sur les deux
moteurs. Les étiquettes fusionnées par des décisions de politique en cours
d'exécution ne sont pas incluses ; elles restent observables via les
événements `PolicyDecision`.

---

## Diagnostic des erreurs

Goa-AI conserve intégralement les messages de diagnostic et le texte des erreurs
de fournisseur typées en UTF-8 valide, sans limite de longueur par champ.
L'application décide ce que son instrumentation enregistre et qui peut le lire
ou l'afficher. Les spans du planificateur et des activités Temporal reçoivent
l'erreur originale avant le transport du workflow ou la conversion de l'erreur.
La relecture du workflow ne réémet pas ces diagnostics. Les résumés destinés à
l'affichage, la classification, les possibilités de nouvelle tentative et la
récupération du modèle restent inchangés ; le diagnostic n'est pas une consigne
de correction pour le modèle.

### Formats des erreurs enregistrées

Les nouveaux enregistrements `OutputContractFailure`, `ModelOutputRejected` et
`PlannerOutputRejected` utilisent `ReasonVersion="goa_ai.rejection_reason.v2"`.
`Reason` conserve le texte exact de la cause sélectionnée, identifié par
`ReasonSHA256` et `ReasonSize`. Un texte valide laisse `ReasonOmitted` vide ;
un texte UTF-8 invalide produit un `Reason` vide et
`ReasonOmitted="invalid_utf8"`. Les nouveaux enregistrements n'utilisent pas
`size_limit` pour omettre une cause longue.

Les nouveaux échecs Temporal utilisent quatre types privés d'erreur applicative :

- `goa_ai.provider_error.v3`
- `goa_ai.generic_error.v3`
- `goa_ai.output_contract_error.v3`
- `goa_ai.invalid_reserved_error.v3`

Le type sélectionne le format des détails enregistrés. Les détails génériques
et de fournisseur conservent leur propre texte sous forme de chaînes simples,
séparément du message de diagnostic extérieur. Un texte UTF-8 invalide devient
un avis explicite de texte indisponible avec l'empreinte et le nombre d'octets
d'origine, sans caractères de remplacement silencieux. Ces formats ne
sérialisent pas les causes Go arbitraires, les objets d'erreur du SDK ni les
détails personnalisés de l'application. Conserver exactement un texte valide
ne signifie pas stocker des octets arbitraires.

### Limites du transport et de l'application

La limite existante des arguments et résultats complets de workflow continue
de s'appliquer à la valeur encodée entière, y compris les champs associés.
Un résultat du planificateur trop volumineux produit un échec explicite de
budget de transport ; le diagnostic n'est pas enregistré en étant raccourci
silencieusement.

Les objets d'échec natifs de Temporal utilisent un convertisseur d'échecs du SDK
distinct, et non le contrôle de taille des arguments et résultats du workflow.
Goa-AI n'ajoute aucune limite de taille ni vérification préalable pour ces
échecs natifs. Le `FailureConverter` configuré par l'application, y compris son
comportement de rejet, reste sous le contrôle de l'application.

Les limites des requêtes et de l'historique Temporal peuvent rejeter les échecs
volumineux ; l'état de nouvelle tentative d'une activité en attente peut
conserver un échec raccourci par le serveur. L'instrumentation possède aussi
ses limites d'échantillonnage, d'exportation et de stockage. La conservation du
texte par le framework ne garantit ni stockage ni livraison illimités, ni la
récupération d'un texte précédemment omis.

### Mise à niveau des workers et historiques enregistrés

Les nouveaux lecteurs maintiennent le comportement des rejets sans version et
v1, ainsi que des types Temporal historiques avec leurs détails v1/v2. Le
décodage et la relecture ne réécrivent pas ces enregistrements, ne modifient pas
leurs octets publiés et ne restaurent pas le texte perdu. Les anciennes règles
d'omission et de validation restent applicables aux anciens formats.

Les échecs terminaux déjà enregistrés conservent leurs octets d'origine. Un
workflow qui lit d'anciennes métadonnées de rejet mais se termine pour la
première fois après la mise à niveau écrit le type actuel d'échec terminal.
Une relecture réussie ne prouve pas que les anciennes et nouvelles commandes
d'échec terminal ont des détails encodés identiques.

Mettez à niveau les consommateurs de hooks qui valident les enregistrements et
les workers de workflows et d'activités avant qu'ils reçoivent les nouveaux
formats. Ne mélangez pas de nouveaux producteurs avec des lecteurs anciens
incompatibles sur les mêmes files de tâches ; utilisez le routage par version
de worker ou la procédure vérifiée de vidage et de remplacement de l'application.
Un retour arrière doit conserver des lecteurs capables de comprendre tous les
formats déjà écrits. Gardez les décodeurs historiques tant que des
enregistrements d'exécution ou des historiques de workflow pris en charge en
ont besoin ; remplacer les workers ne supprime pas cette obligation.

## Politiques, plafonds et étiquettes

### Politique d'exécution au moment de la conception

Au moment de la conception, vous configurez les stratégies par agent avec `RunPolicy` :

```go
Agent("chat", "Conversational runner", func() {
    RunPolicy(func() {
        DefaultCaps(
            MaxToolCalls(8),
            MaxRecoveryTurns(3),
        )
        TimeBudget("2m")
        InterruptsAllowed(true)
    })
})
```

Celui-ci devient un `runtime.RunPolicy` attaché à l'inscription de l'agent :

- **Caps** : `MaxToolCalls` limite le nombre total d'appels d'outils budgétisés par exécution. `MaxRecoveryTurns` limite les nouveaux appels au planificateur après le rejet d'un résultat d'outil ou d'une réponse du modèle. Un appel d'outil budgétisé réussi réinitialise cette allocation. Les outils déclarés `Bookkeeping()` ne consomment aucun de ces budgets.
- **Budget temps** : `TimeBudget` – budget d'horloge murale pour la course. `FinalizerGrace` (exécution uniquement) – fenêtre réservée en option pour la finalisation.
- **Interruptions** : `InterruptsAllowed` – option pour la pause/reprise.
- **Comportement des champs manquants** : `OnMissingFields` – régit ce qui se passe lorsque la validation indique des champs manquants.
- **Outils terminaux** : les outils déclarés `TerminalRun()` deviennent
  automatiquement comptables et terminent l'exécution après leur succès ;
  aucun tour `PlanResume` supplémentaire n'est planifié. Pendant la
  finalisation forcée, le runtime n'admet que les appels comptables terminaux,
  les exécute avant l'échéance absolue et ne ferme l'exécution que si tous leurs
  effets réussissent. Avant l'appel, il écrit la valeur exacte de
  `planner.TerminationReason` dans `runtime.FinalizationReasonLabel`
  (`goa-ai.finalization_reason`). Les étiquettes de l'exécution ou de la
  politique, ainsi que les sorties du planificateur ou du modèle, ne peuvent ni
  choisir ni remplacer cette valeur. Les appels ordinaires ne la reçoivent pas.

  Les consommateurs d'appels terminaux à limite fixe ou produits par le
  planificateur, notamment `tool_failure`, utilisent
  `runtime.FinalizationReasonLabel`. Déployez ensemble les consommateurs et
  les workers lors d'une modification de ce contrat d'exécution.

### Remplacements de stratégie d'exécution

Dans certains environnements, vous souhaiterez peut-être renforcer ou assouplir les politiques sans en modifier la conception. Le `rt.OverridePolicy` API permet des ajustements de politique au niveau du processus :

```go
err := rt.OverridePolicy(chat.AgentID, runtime.RunPolicy{
    MaxToolCalls:                  3,
    MaxRecoveryTurns: 1,
    InterruptsAllowed:             true,
})
```

**Portée** : les remplacements sont locaux à l'instance d'exécution actuelle et affectent uniquement les exécutions ultérieures. Ils ne persistent pas lors des redémarrages de processus et ne se propagent pas aux autres travailleurs.

**Champs remplaçables** :

| Champ | Description |
| --- | --- |
| `MaxToolCalls` | Nombre total maximum d'appels d'outils par exécution |
| `MaxRecoveryTurns` | Nouveaux appels au planificateur après un résultat rejeté |
| `TimeBudget` | Budget horloger pour la course |
| `FinalizerGrace` | Fenêtre réservée à la finalisation |
| `InterruptsAllowed` | Activer la fonctionnalité pause/reprise |

Seuls les champs non nuls sont appliqués (et `InterruptsAllowed` lorsque `true`). Cela permet des remplacements sélectifs sans affecter les autres paramètres de stratégie.

**Cas d'utilisation** :
- Interruptions temporaires pendant la limitation du fournisseur
- Tests A/B de différentes configurations de politiques
- Développement/débogage avec des contraintes assouplies
- Personnalisation des politiques par locataire au moment de l'exécution

### Étiquettes et moteurs de politiques

Goa-AI s'intègre aux moteurs de politiques enfichables via `policy.Engine`. Les
politiques reçoivent les métadonnées de l'outil (ID, balises), le contexte
d'exécution (SessionID, TurnID, étiquettes) et le `ToolFailure` structuré après
un échec d'exécution.

Les étiquettes arrivent dans :
- `run.Context.Labels` – disponible pour les planificateurs pendant une exécution
- entrée d'activité d'outil (`api.ToolInput.Labels`) – clonée dans les
  exécutions distribuées ; les appels de finalisation reçoivent aussi le motif
  détenu par le runtime dans `runtime.FinalizationReasonLabel`
- **Le stockage du runtime** (`storage.Store`) ajoute les enregistrements immuables par `RunID`. Les méthodes de cycle de vie enregistrent l’état, le point de reprise ou l’annulation avec l’enregistrement correspondant.
- fin d'exécution et instantanés – les étiquettes de départ ressortent à la fin de l'exécution sur `hooks.RunCompletedEvent.Labels` et `run.Snapshot.Labels`, si bien que les hooks de fin et les lecteurs de `GetRunSnapshot` retrouvent l'identité de l'exécution sans suivi hors bande

### Filtrage des outils par exécution

Les balises au moment de la conception et les options d'exécution permettent aux appelants de réduire la surface de l'outil avant
invite du planificateur et encore avant l'exécution :

```go
out, err := client.Run(ctx, "session-1", messages,
    runtime.WithAllowedTags([]string{"read", "safe"}),
    runtime.WithDeniedTags([]string{"destructive"}),
    runtime.WithTagPolicyClauses([]runtime.TagPolicyClause{
        {AllowedAny: []string{"docs", "search"}},
        {DeniedAny: []string{"external"}},
    }),
)
```

Utilisez `WithRestrictToTool` lorsqu'un flux de réparation doit exposer exactement un outil :

```go
out, err := client.Run(ctx, "session-1", messages,
    runtime.WithRestrictToTool(searchspecs.Search),
)
```

Cette stratégie s'applique à toute l'exécution demandée par l'appelant. Les
échecs d'outils utilisent un contrat distinct : `ToolFailure.Recovery.Action`
choisit la correction, une nouvelle planification ou la fin, puis le runtime
impose le catalogue d'outils correspondant au tour suivant.

---

## Exécution des outils

- **Ensembles d'outils natifs** : vous écrivez des implémentations ; le runtime gère le décodage des arguments tapés à l'aide des codecs générés
- **Agent en tant qu'outil** : les ensembles d'outils d'agent générés exécutent les agents fournisseurs en tant qu'exécutions enfants (en ligne du point de vue du planificateur) et adaptent leur `RunOutput` en un `planner.ToolResult` avec un handle `RunLink` vers l'exécution enfant.
- **Ensembles d'outils MCP** : le runtime transmet le JSON canonique aux appelants générés ; les appelants gèrent le transport

### Valeurs par défaut de la charge utile de l'outil

Le décodage de la charge utile de l'outil suit le modèle **decode-body → transform** de Goa et applique les valeurs par défaut de style Goa de manière déterministe pour les charges utiles de l'outil.

Voir **[Tool Payload Defaults](tool-payload-defaults/)** pour les invariants de contrat et de codegen.

### Résultats d'outils limités

Les outils qui renvoient des vues partielles d'ensembles de données plus volumineux doivent déclarer `BoundedResult(...)`.
dans le DSL. Le contrat d'exécution de ces outils est :

- généré `tools.ToolSpec.Bounds` déclare le schéma canonique de résultat borné
- les exécutions réussies doivent remplir `planner.ToolResult.Bounds`
- le runtime projette les limites détenues par le fournisseur dans les `tool_result` JSON émis, indice de résultat
données de modèle sous `.Bounds`, charges utiles de hook et événements de flux
- pour les outils paginés, le code fournisseur définit `Bounds.NextCursor` avec le curseur opaque de la page suivante

`tools.ToolSpec.Bounds` utilise les noms JSON visibles par le modèle. Une
déclaration DSL peut référencer des attributs Goa en lower-camel comme
`NextCursor("nextCursor")`, mais les specs générées, les schémas, la projection
du runtime et les codecs de résultat utilisent `next_cursor`.

Champs projetés canoniques :

- `returned` (obligatoire)
- `truncated` (obligatoire)
- `total` (facultatif)
- `refinement_hint` (facultatif)
- `next_cursor` (facultatif lorsque `NextCursor(...)` est exposé par un contrat `Cursor` direct)

`planner.ToolResult.Bounds` reste le seul contrat fournisseur lisible par machine.
Les types de résultats Go créés restent sémantiques et spécifiques au domaine ; ils n'ont pas besoin de
dupliquez les champs délimités canoniques juste pour que les modèles puissent les voir.
`ContinueWith("continue_tool", "cursor")` déclare la continuation mécanique
comme une action distincte. Le runtime ne la propose que lorsque l'historique
contient une seule tête de chaîne active avec un autre curseur. La correspondance
exacte du curseur fait avancer les pages séquentielles. Les appels source parallèles
restent valides, mais plusieurs têtes actives rendent l'action sans argument
indisponible. Le modèle
l'appelle avec `{}` et le runtime associe le curseur et les champs de requête
conservés avant l'exécution. Un `Cursor("cursor")` direct garde le contrat
ouvert : le modèle répète les arguments inchangés avec le curseur opaque renvoyé
dans `next_cursor`.

Pour les outils `BindTo` basés sur une méthode, le résultat de la méthode de service lié doit toujours
transporter les champs délimités canoniques afin que l'exécuteur généré puisse construire
`planner.ToolResult.Bounds` avant projection. `Return(...)` face à l'outil explicite
les formes ne doivent pas dupliquer ces champs canoniques. Dans la méthode liée
Par conséquent, seuls `returned` et `truncated` peuvent être requis ; `total`,
`refinement_hint` et `next_cursor` restent facultatifs et sont omis des émissions
JSON chaque fois que les limites d’exécution les omettent.

Lorsqu'une limite de service doit assembler le résultat canonique JSON à l'extérieur
`ExecuteToolActivity`, utilisez `runtime.EncodeCanonicalToolResult(...)` plutôt que
appeler le codec de résultat généré et les assistants de projection de résultats limités
séparément.

---

## Contrats d'exécution rapide

La gestion des invites est native du runtime et versionnée :

- `runtime.PromptRegistry` stocke les enregistrements `prompt.PromptSpec` de base immuables.
- `runtime.WithPromptStore(prompt.Store)` permet une résolution de remplacement étendue (`session` -> `facility` -> `org` -> global).
- Les planificateurs appellent `PlannerContext.RenderPrompt(ctx, id, data)` pour résoudre et afficher le contenu des invites.
- Le contenu rendu inclut les métadonnées `prompt.PromptRef` pour la provenance ; les planificateurs peuvent les joindre à
`model.Request.PromptRefs`.

```go
content, err := input.Agent.RenderPrompt(ctx, "assistant.system", map[string]any{
    "AssistantName": "Ops Assistant",
})
if err != nil {
    return nil, err
}

resp, err := modelClient.Complete(ctx, &model.Request{
    RunID:      input.RunContext.RunID,
    Messages:   input.Messages,
    PromptRefs: []prompt.PromptRef{content.Ref},
})
```

`PromptRefs` indique quelles versions rendues des prompts ont influencé une requête ; il ne fait pas partie du payload du fournisseur. Le runtime le déduit des enregistrements `prompt_rendered` et des liens parent-enfant, sans maintenir une autre liste susceptible de diverger.

Le rendu n’écrit jamais dans le stockage du runtime. Tous les chemins utilisent
`prompt.RenderRecorder` pour créer le même `prompt.RenderEvent`, avec l’ID, la
version et la portée du prompt résolu :

- le code de l’application qui rend les messages initiaux transmet
  `recorder.Events()` avec ces messages via `runtime.WithRenderedPrompts` ;
- les activités du planificateur renvoient leurs événements avec le résultat ;
- la préparation du prompt d’un agent enfant s’exécute dans une activité et
  renvoie le texte rendu et ses événements dans l’entrée de l’enfant ;
- `RunOneShot` enregistre les rendus effectués par son callback.

Le workflow enregistre chaque événement accepté sous la même forme
`PromptRendered`. Le chemin initial n’applique pas une règle de rendu
différente ; il transmet seulement un événement créé avant le démarrage du
workflow. La préparation de l’enfant s’exécute dans une activité afin que le
replay Temporal réutilise le texte et les événements déjà présents dans
l’historique, sans lire une version plus récente du prompt.
`RenderRecorder.Events` renvoie les rendus terminés dans un ordre stable par ID
de prompt, version, session et portée. L’ordre de fin de rendus simultanés ne
peut donc pas modifier la requête exacte de démarrage du workflow.

---

## Mémoire, Streaming, Télémétrie

- **Hook bus** publie des événements de hook structurés pour le cycle de vie complet de l'agent : démarrage/achèvement de l'exécution, changements de phase, `prompt_rendered`, planification/résultats/mises à jour des outils, notes du planificateur et blocs de réflexion, attentes, conseils de nouvelle tentative et liens d'agent en tant qu'outil.

- **Les magasins de mémoire** (`memory.Store`) s'abonnent et ajoutent des événements de mémoire durables (messages utilisateur/assistant, appels d'outils, résultats d'outils, notes de planificateur, réflexion) par `(agentID, RunID)`.

- **Le stockage du runtime** (`storage.Store`) est unique et appartient à
  l'application hôte. Il ajoute, pour chaque `RunID`, des enregistrements qui ne
  peuvent plus changer après leur insertion, afin d'alimenter les interfaces
  d'audit et de débogage et la consultation des exécutions. Ses méthodes de cycle
  de vie enregistrent l'état, le point de reprise ou la modification
  d'annulation avec l'enregistrement immuable correspondant en une seule
  opération.

- Les **récepteurs de flux** (`stream.Sink`, par exemple Pulse ou SSE/WebSocket personnalisé) reçoivent les valeurs `stream.Event` typées produites par le `stream.Subscriber`. Un `StreamProfile` contrôle quels types d'événements sont émis.

  La transcription durable conserve exactement chaque réponse sélectionnée du
  fournisseur. Lorsqu'un message assistant contient un appel d'outil, son texte
  reste dans cette transcription pour la relecture auprès du fournisseur, mais
  n'est pas émis comme réponse visible par l'utilisateur. Les événements d'outil
  et d'attente présentent cette étape non terminale. Seuls les messages
  assistant sans appel d'outil produisent des événements de texte assistant
  validés.

- **Télémétrie** : les flux de travail et les activités des instruments de journalisation, de métriques et de traçage compatibles OTEL de bout en bout.

### Conseils d'affichage des appels d'outils (DisplayHint)

Les appels d'outils peuvent porter un `DisplayHint` destiné à l'utilisateur (par exemple pour UIs).

Contracter:

- Les constructeurs de hooks ne rendent pas d'indices. Les événements planifiés d’appel d’outil sont par défaut `DisplayHint==""`.
- Le runtime enrichit et conserve un indice d'appel par défaut durable au moment de la publication à partir du modèle typé lorsque le décodage de la charge utile réussit.
- L'enregistrement des outils exige un titre de métadonnées non vide. Lorsque le décodage typé échoue ou qu'aucun modèle n'est enregistré, le runtime utilise ce titre comme display hint. Les charges utiles mal formées échouent toujours à la frontière de l'outil ; le titre de métadonnées sert seulement à garder le travail tenté affichable. Les indices ne sont jamais rendus à partir des octets JSON bruts.
- Si un producteur définit explicitement `DisplayHint` (non vide) avant de publier l'événement hook, le runtime traite
comme faisant autorité et ne l'écrase pas.
- Pour les modifications de formulation par consommateur, configurez `runtime.WithHintOverrides` au moment de l'exécution. Les remplacements prennent
priorité sur les modèles créés par DSL pour les événements `tool_start` diffusés en streaming.

### Consommation d'un flux de session (Pulse)

En production, le modèle courant est le suivant :

- publier des événements de flux d'exécution sur Pulse (flux Redis) à l'aide d'un `stream.Sink`
- abonnez-vous au **flux de session** (`session/<session_id>`) depuis votre diffusion UI (SSE/WebSocket)
- arrêtez de diffuser une analyse lorsque vous observez `type=="run_stream_end"` pour l'ID d'exécution actif

```go
import (
    pulsestream "goa.design/goa-ai/features/stream/pulse"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/runtime/agent/stream"
)

streams, err := pulsestream.NewRuntimeStreams(pulsestream.RuntimeStreamsOptions{
    Client: pulseClient,
})
if err != nil {
    panic(err)
}
rt := runtime.New(
    runtimeStore,
    runtime.WithEngine(eng),
    runtime.WithStream(streams.Sink()),
)

sub, err := streams.NewSubscriber(pulsestream.SubscriberOptions{SinkName: "ui"})
if err != nil {
    panic(err)
}
events, errs, cancel, err := sub.Subscribe(ctx, "session/session-123")
if err != nil {
    panic(err)
}
defer cancel()

activeRunID := "run-123"
for {
    select {
    case evt, ok := <-events:
        if !ok {
            return
        }
        if evt.Type() == stream.EventRunStreamEnd && evt.RunID() == activeRunID {
            return
        }
        // evt.SessionID(), evt.RunID(), evt.Type(), evt.Payload()
    case err := <-errs:
        panic(err)
    }
}
```

---

## Abstraction du moteur

- **En mémoire** : boucle de développement rapide, pas de dépôts externes
- **Temporal** : exécution durable, relecture, nouvelles tentatives des activités, signaux et workers ; les adaptateurs relient les activités et propagent le contexte

Les workflows d’agent Goa-AI n’ont qu’une tentative. Le runtime relance les
activités individuelles lorsque leur contrat le permet, mais ne redémarre
jamais un workflow d’agent complet après un échec. Un tel redémarrage pourrait
répéter les effets des outils ou entrer en conflit avec l’enregistrement final
déjà sauvegardé par la première tentative.

### Synchronisation sémantique vs vivacité du Temporal

Goa-AI maintient le contrat d'exécution public indépendant du moteur :

- `RunPolicy.Timing.Plan` et `RunPolicy.Timing.Tools` sont des budgets de tentatives sémantiques
- `runtime.WithTiming(...)` remplace ces budgets sémantiques pour une exécution
- Les clients générés utilisent la file d'attente par défaut de l'agent. Passez
  `runtime.WithTaskQueue("orchestrator.chat")` à un appel `Start` ou `Run`
  lorsqu'une exécution doit utiliser une autre file

Si vous utilisez l'adaptateur Temporal et avez besoin d'un réglage de l'attente en file d'attente ou de l'activité, configurez
sur le moteur Temporal lui-même :

```go
eng, err := temporal.NewWorker(temporal.Options{
    ClientOptions: &client.Options{
        HostPort:  "temporal:7233",
        Namespace: "default",
    },
    WorkerOptions: temporal.WorkerOptions{
        TaskQueue: "orchestrator.chat",
    },
    ActivityDefaults: temporal.ActivityDefaults{
        Planner: temporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 30 * time.Second,
            LivenessTimeout:  20 * time.Second,
        },
        Tool: temporal.ActivityTimeoutDefaults{
            QueueWaitTimeout: 2 * time.Minute,
            LivenessTimeout:  20 * time.Second,
        },
    },
})
if err != nil {
    panic(err)
}
```

Cette division maintient les mécanismes de flux de travail derrière la limite Temporal tandis que le
le temps d'exécution générique reste honnête à la fois sur Temporal et sur le moteur en mémoire.

### Contrats de l’adaptateur de stockage et de fin

Le runtime enregistre une seule activité typée appelée `runtime.store`. Chaque
`StorageActivityCommand` définit exactement l’un des champs `Append`,
`RootStart`, `ChildStart`, `OneShotStart`, `OneShotChildStart`, `Cancellation`,
`Suspension` ou `Terminal`. Le `StorageActivityResult` renvoyé définit exactement le champ
correspondant et aucun autre. Un stockage personnalisé renvoie
`storage.ContractError` lorsque répéter la même commande ne peut pas réussir.
Les pannes temporaires de base de données ou de réseau restent des erreurs
ordinaires et peuvent être retentées. `runtime.WithStorageActivityTimeout`
définit le délai Start-to-Close de l’activité et exige une valeur supérieure à
zéro.

`Engine.QueryRunCompletion` renvoie le `Status` actuel de l’exécution. Une fois
l’exécution fermée, le même résultat contient aussi son instant stable
`CompletedAt` et son `Output` final ou son `WorkflowError`.
`EnsureRunCompletion` utilise `CompletedAt` comme horodatage de l’enregistrement,
afin que chaque nouvelle tentative envoie la même valeur. L’erreur distincte de
la méthode indique que le moteur n’a pas pu récupérer ces informations. Il
n’existe pas de requête de statut séparée.

La préparation du prompt d’un enfant renvoie exactement un `Success` ou un
`Failure`. Le succès contient uniquement les messages et les informations sur
les prompts rendus. Le workflow déduit l’identité de l’exécution enfant, de la
session, du parent, de l’outil et des étiquettes depuis l’appel d’outil original
déjà enregistré. Le moteur en mémoire copie et limite l’entrée et la sortie et
applique la même politique de nouvelle tentative que Temporal.

---

## Exécuter des contrats

- `SessionID` est requis pour les démarrages de session. `Start` et `Run` échouent rapidement lorsque `SessionID` est vide ou un espace
- `StartOneShot` et `OneShotRun` sont explicitement sans session. Ils ne nécessitent ni ne créent de session et n'émettent pas d'événements de flux à l'échelle de la session.
- L’hôte crée les sessions avant de soumettre un travail avec session. Les runtimes d’agents ne créent, ne terminent et ne suppriment pas les sessions
- Le moteur accepte un workflow racine avant que sa première activité enregistre l’exécution. Le runtime ne crée aucun enregistrement `pending` avant cette acceptation
- Répéter un démarrage avec le même ID d’exécution et exactement la même
  requête renvoie le workflow accepté tant que son historique reste
  interrogeable. Réutiliser l’ID avec une autre entrée est refusé. Après la
  durée de conservation de l’historique, l’identité permanente de la commande
  appartient au service produit, pas à Goa-AI
- Les démarrages racine, enfant et ponctuel utilisent des opérations distinctes. Les démarrages d'enfants enregistrent ensemble le lien parent et le démarrage de l'enfant ; les démarrages ponctuels enregistrent les métadonnées complètes sans session
- Temporal termine un workflow enfant si son workflow parent se ferme en premier
- Tout nouvel enfant exige un parent actif. `StartChildRun` et `StartOneShotChildRun` enregistrent chacun le lien parent et le démarrage de l'enfant ensemble. Une nouvelle tentative identique déjà acceptée reste valide après l'arrêt du parent ; une tentative modifiée ou un nouvel enfant est rejeté
- Le premier motif d’annulation ne change pas. Une répétition exacte réussit et un autre motif pour la même exécution produit un conflit
- La suspension et la fin enregistrent le nouvel état avec l’enregistrement correspondant, qui ne peut plus être modifié
- Les payloads durables `RunStarted`, `RunSuspended`, `RunCompleted` et `ChildRunLinked` doivent contenir exactement une valeur JSON du type correspondant. Les champs inconnus et les valeurs JSON supplémentaires sont rejetés
- Les agents doivent être enregistrés avant la première exécution. Le moteur d'exécution rejette l'enregistrement après la première soumission d'exécution avec `ErrRegistrationClosed` pour que les opérateurs du moteur restent déterministes.
- Les exécuteurs d'outils reçoivent des métadonnées explicites par appel
  (`ToolCallMeta`) plutôt que d'extraire des valeurs de `context.Context`.
  Leurs étiquettes copient celles de l'exécution et de la politique et ne
  contiennent `runtime.FinalizationReasonLabel` que pour un appel de
  finalisation terminale
- Ne comptez pas sur des solutions de repli implicites ; tous les identifiants de domaine (exécution, session, tour, corrélation) doivent être transmis explicitement

### Garantir l’enregistrement final et sa livraison {#ensuring-a-final-record-and-its-delivery}

Les workflows normaux relancent les écritures de suspension et de fin jusqu’à
ce que le stockage du runtime les accepte. Un hôte peut utiliser deux commandes
explicites après la fermeture de l'historique du moteur :

- `Runtime.EnsureRunCompletion(ctx, runID)` enregistre une suspension ou un
  résultat final manquant tant que l'exécution reste active dans le stockage.
  Si elle est déjà terminée, ou si un autre résultat final l'emporte pendant
  l'exécution de la commande, celle-ci valide et livre exactement le résultat
  enregistré.
- `Runtime.EnsureChildRunLink(ctx, runID)` valide et livre uniquement le lien
  parent exact d'une exécution enfant associée à une session. Les hôtes peuvent
  l'appeler dans l'ordre des parents vers les enfants avant de livrer les
  résultats finaux des enfants imbriqués.

`EnsureRunCompletion` livre le lien parent avant l'événement final d'un enfant.
Les clés d'événement stables permettent de répéter sans risque la livraison au
flux, et un résultat déjà enregistré ne produit pas une nouvelle notification
locale du cycle de vie. Aucune des deux commandes ne modifie le résultat accepté
par le stockage.

Les deux commandes exigent `Runtime.WithStream` lorsque le statut de la session
utilisé pour la livraison est actif. `EnsureChildRunLink` lit le statut actuel
avec `LoadSessionStatus`. `EnsureRunCompletion` utilise plutôt le
`SessionStatus` renvoyé avec l’écriture de l’enregistrement final ou sa nouvelle
tentative identique. Une session nouvellement constatée comme terminée conserve
ses enregistrements et n’émet rien sur le flux. Si le stockage a accepté
l’événement pendant que la session était active, cet événement reste à livrer :
terminer la session pendant les nouvelles tentatives de ce même appel de
livraison ne l’annule pas.

`EnsureRunCompletion` renvoie `ErrRunCompletionNotReady` lorsque le moteur
signale encore un workflow actif. Il renvoie `ErrRunCompletionCorrupt` lorsque
l'historique du moteur ou les données de cycle de vie enregistrées ne peuvent
pas former un résultat valide unique. Une erreur de lecture de l'historique du
moteur est renvoyée au code appelant et n'est jamais enregistrée comme échec
du workflow.

Les méthodes de liste et d'instantané sont en lecture seule et n'appellent
jamais ces commandes. Ces commandes n'ajoutent aucune migration du schéma de la
base de données et ne changent aucun format public. Elles modifient toutefois
l'interface Go des stockages personnalisés, et les enregistrements durables
existants doivent respecter les formes JSON typées et strictes décrites dans
[Mémoire et sessions](../memory-sessions/#durable-event-json).

---

## Entrées externes et continuations de workflow

Chaque entrée utilisateur acceptée démarre un workflow de premier niveau pour
ce tour. Le workflow se termine soit avec le résultat final de ce tour, soit
avec une suspension en attente d'une entrée externe. Les agents imbriqués
continuent à s'exécuter dans des workflows enfants liés.

Les clarifications, questions structurées, résultats d'outils externes et
confirmations terminent correctement le workflow courant. Le
`RunOutput.Suspension` renvoyé contient des demandes `Pending` visibles et un
point de reprise `Checkpoint` privé. L’application conserve la suspension complète
dans un stockage serveur fiable et transmet uniquement `Suspension.Pending` à
l’interface ou au système externe qui doit répondre. Elle ne transmet jamais le
point de reprise privé à un client non fiable. Aucun workflow Temporal ne reste
ouvert pendant la décision d'une personne.

Avant de se terminer, Goa-AI enregistre son point de reprise privé sous l'ID de
l'exécution achevée. L'application doit accepter atomiquement une seule réponse
afin que deux requêtes concurrentes ne puissent pas continuer le même état.
Elle démarre ensuite un nouveau workflow avec l'ID de l'exécution précédente,
un nouvel ID d'exécution, un nouvel ID de tour et une réponse typée :

Si l'acceptation de la réponse doit être enregistrée avec des données produit,
appelez `PrepareContinuation`, puis `MarshalBinary`, et enregistrez ces octets
avec la réponse dans une seule transaction. Le processus qui lance le workflow
charge ces octets, appelle `ParsePreparedRun`, puis transmet la valeur restaurée
à `StartPrepared`. Utilisez `Continue` uniquement lorsqu'aucune écriture
applicative ne sépare la validation de la soumission au moteur.

```go
next, err := client.Continue(
    ctx,
    "session-1",
    previous.RunID,
    "run-124",
    "turn-2",
    &api.PendingInputResponse{
        Clarification: &api.ClarificationAnswer{
            ID:     "clarify-device",
            Answer: "Device ID is ABC-123",
        },
    },
    runtime.WorkflowOptions{},
)
```

Lors de la préparation de la continuation, l’application transmet uniquement
l’ID de l’exécution terminée et la réponse typée. Goa-AI charge le point de
reprise, valide sa version et la demande en attente, restaure les payloads
enregistrés avec les codecs générés actuels et reprend la planification. Les
octets de `PreparedRun` peuvent contenir une copie de ce point de reprise et la
transcription complète. Conservez-les uniquement dans un stockage applicatif
fiable avec un accès contrôlé ; ne les envoyez jamais à un client non fiable.

Le seul format accepté est `goa-ai.run-suspension.v7`. Goa-AI rejette toutes les
versions précédentes au lieu de deviner comment les traduire. Avant d’accepter
des continuations avec le nouveau runtime, l’hôte doit migrer ou supprimer les
exécutions suspendues qui utilisent un ancien format.

Lorsqu’une réponse termine un appel d’outil créé par le modèle dans le workflow
précédent, le nouvel événement `tool_end` porte deux identités :

- son ID d’exécution normal désigne le nouveau workflow qui a reçu la réponse ;
- `call_run_id` désigne le workflow précédent qui a émis le `tool_start`.

Les consommateurs du flux doivent associer ces événements avec `call_run_id` et
l’ID de l’appel. Ils ne doivent ni rechercher les exécutions précédentes, ni
supposer que l’appel et son résultat appartiennent au même workflow.

---

## Confirmation de l'outil

Goa-AI prend en charge les portes de confirmation **appliquées au moment de l'exécution** pour les outils sensibles (écritures, suppressions, commandes).

Vous pouvez activer la confirmation de deux manières :

- **Au moment de la conception (cas courant) :** déclarez `Confirmation(...)` dans l'outil DSL. Magasins Codegen
la politique dans `tools.ToolSpec.Confirmation`.
- **Runtime (remplacement/dynamique) :** passez `runtime.WithToolConfirmation(...)` lors de la construction du runtime
pour exiger une confirmation pour des outils supplémentaires ou remplacer le comportement au moment de la conception.

Au moment de l'exécution, le workflow émet une demande de confirmation hors bande et exécute uniquement l'outil
après qu’une approbation explicite ait été fournie. En cas de refus, le runtime synthétise un outil conforme au schéma
résultat afin que la transcription reste valide et que le planificateur puisse réagir de manière déterministe.

### Protocole de confirmation

Au moment de l'exécution, la confirmation est implémentée sous la forme d'un protocole d'attente/décision dédié :

- **Attendre la charge utile** (diffusé sous le nom `await_confirmation`) :

  ```json
  {
    "id": "...",
    "title": "...",
    "prompt": "...",
  "tool_name": "facility.commands.change_setpoint",
    "tool_call_id": "toolcall-1",
    "payload": { "...": "canonical tool arguments (JSON)" }
  }
  ```

Contracter:

- `payload` contient toujours les arguments canoniques de l'outil JSON pour l'appel en attente. S’ils sont approuvés, ce sont les arguments que le runtime exécute.
- Les remplacements de confirmation peuvent personnaliser le rendu de l'invite et du résultat refusé, mais ils n'introduisent pas de canal de charge utile d'affichage distinct ni ne modifient la signification de `payload`.
- Les produits qui nécessitent une confirmation plus riche UI doivent la matérialiser dans la couche d'application à partir de la charge utile canonique et des lectures appartenant à l'application.

- **Réponse de continuation** :

  ```go
  response := &api.PendingInputResponse{
      Confirmation: &api.ConfirmationDecision{
          ID:          "await-1",
          Approved:    true, // or false
          RequestedBy: "user:123",
          Labels:      map[string]string{"source": "front-ui"},
          Metadata:    map[string]any{"ticket_id": "INC-42"},
      },
  }
  ```

### Événements d’autorisation d’outil

Lorsqu'une décision est fournie, le runtime émet un événement d'autorisation de première classe :

- **Événement crochet** : `hooks.ToolAuthorization`
- **Type d'événement de flux** : `tool_authorization`

Cet événement est l'enregistrement canonique « qui/quand/quoi » pour un appel d'outil confirmé :

- `tool_name`, `tool_call_id`
- `approved` (vrai/faux)
- `summary` (résumé déterministe rendu à l'exécution)
- `approved_by` (copié à partir de `api.ConfirmationDecision.RequestedBy`, destiné à être un identifiant principal stable)

L'événement est émis immédiatement après la réception de la décision (avant l'exécution de l'outil en cas d'approbation, et avant la synthèse du résultat de l'outil refusé en cas de refus).

Remarques :

- Les consommateurs doivent traiter la confirmation comme un protocole d'exécution :
  - Affichez le premier élément en attente lorsque son type est `confirmation`,
    puis envoyez la décision avec `AgentClient.Continue`.
  - Ne couplez pas le comportement UI à un nom d’outil de confirmation spécifique ; traitez-le comme un détail de transport interne.
- Les modèles de confirmation (`PromptTemplate` et `DeniedResultTemplate`) sont des chaînes Go `text/template`
exécuté avec `missingkey=error`. En plus des fonctions de modèle standard (par exemple `printf`),
  Goa-AI fournit :
  - `json v` → JSON code `v` (utile pour les champs de pointeur facultatifs ou l'intégration de valeurs structurées).
  - `quote s` → renvoie une chaîne entre guillemets avec échappement Go (comme `fmt.Sprintf("%q", s)`).

### Validation d'exécution

Le runtime valide les interactions de confirmation à la limite :

- La confirmation `ID` correspond à l'identifiant de la demande en attente
  lorsqu'elle est fournie.
- La continuation contient exactement une variante de réponse et une décision
  bien formée.

---

## Contrat de planificateur

Les planificateurs mettent en œuvre :

```go
type Planner interface {
    PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error)
    PlanResume(ctx context.Context, input *planner.PlanResumeInput) (*planner.PlanResult, error)
}
```

`PlanResult` contient des appels d'outils, une réponse finale, un résultat d'outil
final, des annotations et la transition choisie après les outils.
`PlanResumeInput` indique au planificateur pourquoi il est appelé.

Ces contrats sont distincts :

| Contrat | Portée | Signification |
| --- | --- | --- |
| `ToolSpec.Tags` | Un outil, pour chaque exécution | Étiquettes plates disponibles au filtrage générique par les politiques et l'interface utilisateur. |
| `ToolSpec.Meta` | Un outil, pour chaque exécution | Annotations générées et inertes dont la sémantique appartient au consommateur nommé ; les métadonnées seules ne changent pas le runtime. |
| `ToolSpec.Bookkeeping` | Un outil, pour chaque exécution | L'appel est un enregistrement de contrôle durable dont le succès ne requiert pas un autre tour du planificateur. Il ne consomme aucun budget de récupération ou d'échecs consécutifs. |
| `ToolSpec.TerminalRun` | Un outil, pour chaque exécution | Le succès termine lui-même l'exécution et implique automatiquement la comptabilité. |
| `ToolFailure.Recovery.Action` | Un résultat en échec | Définit la prochaine transition autorisée : corriger le même appel, replanifier sans l'outil en échec ou terminer avec les éléments disponibles. |
| `PlanResult.SynthesizeAfterTools` | Un lot sélectionné | Si le lot n'a aucun échec récupérable, le prochain tour du planificateur doit répondre. |
| `PlanResumeInput.SynthesisOnly` | Une activité du planificateur | Renvoyer une réponse finale ; les appels d'outils sont invalides. |
| `PlanResumeInput.Finalize` | Arrêt imposé par le runtime | Un plafond ou une deadline interdit le travail normal. |

Le runtime choisit l'état suivant dans cet ordre :

| Étape terminée | État suivant |
| --- | --- |
| Un plafond ou une deadline impose la finalisation | Tour `Finalize` |
| Un outil `TerminalRun` a réussi | Fin immédiate |
| Un résultat en échec a `ToolFailure.AllowsToolTurn() == true` | Tour normal de récupération |
| `SynthesizeAfterTools` vaut true | Tour `SynthesisOnly` |
| Sinon | Tour normal de continuation |

Ainsi, l'intention du planificateur ne devient pas une seconde politique de
reprise. Un échec récupérable est réparé d'abord ; un lot final réussi ou en
échec terminal passe à la synthèse. Le runtime rejette les appels d'outils
renvoyés depuis un tour `SynthesisOnly`.

Chaque `ToolFailure` récupérable sélectionne aussi une `Recovery.Action` :

- `correct_call` garde l'outil en échec disponible et transmet au prochain tour
  du planificateur l'entrée rejetée, les problèmes de validation générés, les
  indications sur les champs et un exemple. Il n'impose pas un appel de
  remplacement par échec. Le planificateur peut regrouper le travail, effectuer
  autant d'appels valides que nécessaire aux outils annoncés, attendre une
  entrée ou répondre avec les éléments déjà recueillis.
- `replan` retire l'outil en échec du prochain tour. Le planificateur peut
  utiliser un autre outil annoncé, attendre une entrée ou répondre.
- `finish` retire tous les outils et exige une réponse finale fondée sur les
  éléments disponibles.

Le workflow possède les informations de correction visibles par le modèle.
Avant d'enregistrer l'échec, il remplace l'entrée antérieure et l'exemple
fournis par l'exécuteur par l'appel original du fournisseur et la spécification
de l'outil enregistrée. Une continuation créée par le runtime n'a aucune entrée
produite par le modèle et ne peut donc pas demander `correct_call` ; les
curseurs privés et les champs injectés ne peuvent ainsi pas réapparaître dans
une requête de modèle ultérieure.

Les transcriptions du modèle associent appels et résultats avec
`ModelToolCallID`. Les activités, tentatives et enregistrements d'exécution
utilisent un `ToolCallID` distinct attribué par le runtime. Ces deux IDs ne sont
ni interchangeables ni dérivés de l'ordre des appels.

Le runtime enregistre le catalogue exact présenté pendant un tour de
récupération et rejette tout appel exécutable qui n'en fait pas partie, y
compris un appel intégré à une demande d'entrée utilisateur ou externe. Les
codecs générés valident toujours chaque charge utile, et les limites d'outils,
d'échecs et de temps arrêtent toujours les travaux invalides répétés. Si un
tour de récupération attend une entrée, ses éléments d'échec restent
disponibles à la reprise ; le choix d'un appel d'outil ou d'une réponse finale
les efface.

Les entrées d'activité de récupération et leur catalogue annoncé font partie de
l'historique durable du workflow. Un déploiement qui modifie ce contrat doit
drainer ou arrêter les anciens workers et les workflows en cours avant de
démarrer le nouveau groupe de workers. Mélanger les versions de workers à cette
frontière n'est pas sûr.

Lorsque `PlanResumeInput.Finalize` est défini, les planificateurs peuvent
renvoyer des outils terminaux de comptabilité ; ces appels ne sont pas rejoués
dans un tour ultérieur et doivent terminer durablement la finalisation.

Les planificateurs reçoivent également un `PlannerContext` via `input.Agent` qui expose les services d'exécution :
- `AdvertisedToolDefinitions()` - obtient les définitions d'outils filtrées à l'exécution et visibles par le modèle pour ce tour
- `ModelClient(id string)` - obtenez un client modèle brut indépendant du fournisseur
- `PlannerModelClient(id string)` - obtenez un client modèle à l'échelle du planificateur avec une émission d'événements appartenant au runtime
- `RenderPrompt(ctx, id, data)` - résoudre et afficher le contenu de l'invite pour la portée d'exécution en cours
- `AddReminder(r reminder.Reminder)` - enregistrer les rappels système liés à l'exécution
- `RemoveReminder(id string)` - effacer les rappels lorsque les conditions préalables ne sont plus valables
- `Memory()` - accéder à l'historique des conversations

---

## Modules de fonctionnalités

- `runtime/agent/storage/inmem` – stockage intégré en mémoire pour les exemples et les tests

- `runtime/mcp` – appelants MCP pour HTTP et stdio ; HTTP accepte les réponses JSON et les flux d'événements
- `features/memory/mongo` – magasin de mémoire durable
- `features/prompt/mongo` – Magasin de remplacement d'invite soutenu par Mongo
- `features/stream/pulse` – Assistants récepteurs/abonnés Pulse
- `features/model/{anthropic,bedrock,openai,vertex}` – adaptateurs de
  fournisseurs qui renvoient des clients de modèle validés
- `features/model/gateway` – serveur de fournisseur distant et clients de
  transport validés
- `features/model/middleware` – middleware installé sous la validation du
  client, notamment la limitation adaptative fondée sur le nombre exact de
  jetons
- `features/policy/basic` – moteur de stratégie simple avec listes
  d'autorisation et de blocage et gestion de `ToolFailure`

### Modéliser le débit client et la limitation du débit

Goa-AI fournit dans `features/model/middleware` un limiteur adaptatif fondé
sur les jetons d'entrée. Il demande au client encapsulé le nombre exact de
jetons de la requête, réserve cette capacité avant l'appel et ajuste son budget
effectif de jetons d'entrée par minute lorsque le fournisseur signale une
limitation.

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/runtime/agent/runtime"
    "goa.design/goa-ai/features/model/bedrock"
    mdlmw "goa.design/goa-ai/features/model/middleware"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
bed, err := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "us.anthropic.claude-4-5-sonnet-20251120-v1:0",
})
if err != nil {
    panic(err)
}

rl := mdlmw.NewAdaptiveRateLimiter(
    ctx,
    throughputMap,       // *rmap.Map joined earlier (nil for process-local)
    "bedrock:sonnet",    // key for this model family
    80_000,              // initial input tokens per minute
    1_000_000,           // maximum input tokens per minute
)
limited, err := rl.Middleware()(bed)
if err != nil {
    panic(err)
}

rt := runtime.New(runtimeStore)
if err := rt.RegisterModel("bedrock", limited); err != nil {
    panic(err)
}
```

La construction du middleware ne teste pas le comptage. Si le fournisseur ou
la requête ne peut pas être compté exactement, le premier appel `Complete` ou
`Stream` renvoie `model.ErrTokenCountingUnsupported` avant l'inférence. Vertex
Gemini prend en charge ce comptage ; Bedrock seulement pour les requêtes et
modèles acceptés par Runtime `CountTokens`. OpenAI n'a pas de compteur natif.

Le limiteur mesure uniquement les jetons d'entrée. Un succès unaire ou la fin
propre d'un flux augmente progressivement le budget ; une limitation unaire ou
terminale le réduit. Ouvrir ou fermer un flux ne constitue pas un succès.

---

## Intégration LLM

Les planificateurs Goa-AI interagissent avec de grands modèles de langage via une **interface indépendante du fournisseur**. Cette conception vous permet d'échanger des fournisseurs (AWS Bedrock, OpenAI, Google Vertex AI — Gemini et Claude-on-Vertex — ou des points de terminaison personnalisés) sans modifier votre code de planificateur.

### Le client de modèle validé

Toutes les interactions du planificateur passent par un `model.Client` opaque :

```go
resp, err := client.Complete(ctx, req)
stream, err := client.Stream(ctx, req) // *model.ValidatedStream
```

Les intégrations implémentent `model.Provider`, qui produit les réponses et
fragments de transport bruts. Goa-AI construit `model.Client` avec
`model.NewClient(provider)` et valide les requêtes ainsi que les réponses
complètes autour du fournisseur. Les packages externes ne peuvent ni
implémenter `model.Client` ni exposer des fragments bruts au planificateur.

Avant l'appel, le client valide les noms et schémas d'outils, les parties de
messages, les options de raisonnement, la sortie structurée et les valeurs
dynamiques. Les requêtes et réponses unaires sont limitées à 16 Mio et
100 000 valeurs visitées ; les métadonnées imbriquées ont une profondeur
maximale de 64. Le streaming applique un budget cumulé aux fragments et à la
réponse terminale. Toute violation refuse l'opération entière : Goa-AI ne
tronque, ne répare et ne convertit jamais les données du modèle.

Un `ValidatedStream` doit être lu jusqu'à `io.EOF`. Ce n'est qu'alors que
`Response()` rend la réponse canonique acceptée. Un flux incomplet, mal formé
ou contradictoire renvoie une erreur sans réponse acceptée.

### Adaptateurs de fournisseur

Le Goa-AI est livré avec des adaptateurs pour les fournisseurs LLM populaires :

**AWS Bedrock**

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
    "goa.design/goa-ai/features/model/bedrock"
)

awsClient := bedrockruntime.NewFromConfig(cfg)
modelClient, err := bedrock.New(awsClient, bedrock.Options{
    DefaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    HighModel:    "anthropic.claude-sonnet-4-20250514-v1:0",
    SmallModel:   "anthropic.claude-3-5-haiku-20241022-v1:0",
    MaxTokens:    4096,
    Temperature:  0.7,
})
if err != nil {
    panic(err)
}
```

**OpenAI**

```go
import (
    "os"

    "goa.design/goa-ai/runtime/agent/runtime"
)

rt := runtime.New(runtimeStore) // stockage du runtime fourni par l'hôte
modelClient, err := rt.NewOpenAIModelClient(runtime.OpenAIConfig{
    APIKey:       os.Getenv("OPENAI_API_KEY"),
    DefaultModel: "gpt-5-mini",
    HighModel:    "gpt-5",
    SmallModel:   "gpt-5-nano",
})
if err != nil {
    panic(err)
}
```

**Google Vertex AI (Gemini et Claude-on-Vertex)**

Le paquet `features/model/vertex` fournit deux constructeurs qui satisfont
tous deux `model.Client` : un adaptateur Gemini natif et un assistant de pure
construction qui pointe l'adaptateur Anthropic vers les modèles Claude
hébergés sur Vertex.

```go
import "goa.design/goa-ai/runtime/agent/runtime"

// Gemini sur Vertex, avec les Application Default Credentials.
geminiClient, err := rt.NewVertexGeminiModelClient(ctx, runtime.VertexConfig{
    ProjectID:      "my-gcp-project",
    Location:       "us-central1",
    DefaultModel:   "gemini-2.5-flash",
    HighModel:      "gemini-3-pro-preview",
    SmallModel:     "gemini-2.5-flash-lite",
    MaxTokens:      4096,
    ThinkingBudget: 10000,
})

// Claude sur Vertex. C'est de la pure construction : cela crée un client
// Anthropic SDK sur le transport Vertex du SDK et le confie à
// features/model/anthropic, qui possède la traduction des Messages et la
// classification des erreurs HTTP pour chaque adaptateur hébergé par
// Anthropic (API directe et Vertex) — aucune couche de traduction séparée.
claudeOnVertexClient, err := rt.NewVertexAnthropicModelClient(ctx, runtime.VertexConfig{
    ProjectID:    "my-gcp-project",
    Location:     "us-east5",
    DefaultModel: "claude-sonnet-4-5@20250929",
})
```

Les modèles de la génération Gemini 3 attachent une **thought signature**
opaque aux parties `functionCall` (pas seulement aux parties
thought/thinking) pour authentifier la chaîne de raisonnement derrière un
appel d'outil. L'adaptateur Vertex fait l'aller-retour de cette signature via
`model.ToolCall.ThoughtSignature` / `model.ToolUsePart.ThoughtSignature` en
utilisant la même convention base64 que `ThinkingPart.Signature`. Le runtime
capture cette signature à la frontière du model-client — avant que l'un ou
l'autre des styles d'intégration ci-dessous ne produise un
`planner.ToolRequest` — et la rattache par ID d'appel d'outil lors de la
reconstruction du transcript destiné au fournisseur. `planner.ToolRequest`
ne porte aucun champ signature ; le code du planificateur n'a pas besoin de
savoir que les signatures existent.

### Différences de capacités entre fournisseurs

Le type de requête commun reste neutre, mais chaque adaptateur refuse les
combinaisons que son API ne peut pas préserver :

| Fournisseur | Contrat appliqué avant ou pendant l'appel |
| --- | --- |
| OpenAI | La sortie structurée utilise une projection stricte. Elle ne peut pas être combinée aux outils. Les branches `oneOf` qui se chevauchent sont refusées. Les schémas stricts ont des limites documentées sur les propriétés, les enums, la profondeur et les caractères agrégés. Une requête avec raisonnement refuse la température. |
| Anthropic | Les modèles Claude actuels utilisent la sortie structurée native lorsqu'elle est disponible. Le raisonnement adaptatif permet les outils et le choix forcé normal ; l'ancien raisonnement manuel refuse le choix forcé `any` ou d'un outil nommé. Un flux doit fermer chaque bloc et fournir une raison d'arrêt. |
| Bedrock | Claude 4.5 et 4.6 utilisent `OutputConfig`; les autres modèles Claude utilisent un outil privé forcé et valident son résultat avec le même contrat. `CountTokens` refuse les modèles qui exigent Mantle et les requêtes avec sortie structurée. |
| Vertex Gemini | Gemini 3 utilise des niveaux de raisonnement, refuse les budgets numériques et la désactivation explicite, et conserve les thought signatures des appels d'outils. Les flux exigent exactement un candidat et une raison de fin. |

Pour Claude Opus 4.7+, Sonnet 5+, Haiku 5+, Fable et Mythos, les adaptateurs
Anthropic et Bedrock omettent `temperature`, `top_p` et `top_k`, car ces
modèles les refusent. Les générations antérieures continuent à recevoir les
valeurs configurées.

Les adaptateurs ne conservent aucun historique de conversation. Chaque requête
doit transporter tous les `Messages` prêts pour le fournisseur ; un `RunID` ne
leur demande pas de charger des messages antérieurs.

Les principales erreurs sentinelles sont :

- `model.ErrStructuredOutputUnsupported` lorsqu'un adaptateur ne peut pas
  représenter le contrat de sortie ;
- `model.ErrTokenCountingUnsupported` lorsque le comptage exact est
  indisponible ;
- `model.ErrEmptyStream` lorsqu'un fournisseur ferme sans sortie ;
- `model.ErrRateLimited` pour une limitation récupérable du fournisseur.

`*planner.OutputContractError` est une erreur structurée, pas une sentinelle.
Détectez-la avec `errors.As` et examinez son origine pour distinguer une sortie
invalide du modèle, du planificateur ou d'un outil. Elle n'est pas récupérable :
une nouvelle requête ne doit pas masquer une violation de contrat.

### Métadonnées canoniques et rejeu des citations

`model.Message.Meta` contient les données produites par le fournisseur
nécessaires au rejeu exact d'une réponse. Les frontières qui persistent ou
transportent ces métadonnées doivent utiliser `model.MarshalMetadata` et
`model.UnmarshalMetadata`. Ces codecs exigent un objet JSON unique, conservent
les nombres décodés sous forme de `json.Number`, rejettent les données
supplémentaires et ramènent nil ou un objet vide à nil.

Le rejeu des citations dépend du fournisseur et ne doit jamais les aplatir en
texte ordinaire. L'adaptateur Bedrock peut rejouer les valeurs `CitationsPart`
de l'assistant sous forme de blocs de citation natifs, en préservant l'identité
de la source, les extraits et les emplacements du document par caractères,
chunks ou pages. Les citations système Bedrock restent non prises en charge car
son union de contenu système ne possède aucun membre citation. Anthropic et
Vertex rejettent le rejeu lorsqu'une partie canonique ne contient pas les champs
exigés par leur protocole.

### Utilisation de clients modèles dans les planificateurs

Les planificateurs obtiennent des clients modèles via le `PlannerContext` du runtime. Il y a
deux styles d'intégration explicites :

- `PlannerModelClient(id)` pour le streaming à l'échelle du planificateur avec émission d'événements appartenant au runtime
- `ModelClient(id)` lorsque vous avez besoin d'un accès direct au modèle validé et que vous drainez le flux renvoyé avec `planner.ConsumeStream`

#### PlannerModelClient (recommandé)

`PlannerContext.PlannerModelClient(id)` renvoie un client à l'échelle du planificateur qui
possède les émissions `AssistantChunk`, `PlannerThinkingBlock` et `UsageDelta`. C'est
La méthode `Stream(...)` draine le flux du fournisseur sous-jacent et renvoie un
`planner.StreamSummary` :

```go
func (p *MyPlanner) PlanStart(ctx context.Context, input *planner.PlanInput) (*planner.PlanResult, error) {
    mc, ok := input.Agent.PlannerModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
    if !ok {
        return nil, errors.New("model not configured")
    }

    req := &model.Request{
        Messages: input.Messages,
        Tools:    input.Agent.AdvertisedToolDefinitions(),
        Stream:   true,
    }

    sum, err := mc.Stream(ctx, req)
    if err != nil {
        return nil, err
    }
    if len(sum.ToolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: sum.ToolCalls}, nil
    }
    final := sum.FinalResponse()
    if final == nil {
        return nil, errors.New("model stream ended without a canonical response")
    }
    return &planner.PlanResult{
        FinalResponse: final,
        Streamed: true, // Le texte de l'assistant a déjà été diffusé
    }, nil
}
```

Il s'agit du style d'intégration le plus sûr car le client limité au
planificateur n'expose pas de `model.Streamer` brut et ne peut donc pas être
combiné accidentellement avec `planner.ConsumeStream`. Le retour de
`sum.FinalResponse()` sélectionne aussi la réponse exacte du fournisseur
capturée pour cette invocation ; reconstruire un message uniquement textuel
supprimerait le raisonnement, les citations, les signatures, les métadonnées et
les frontières des messages.

#### Client validé + ConsumeStream

Lorsque vous avez besoin d'accéder directement au `model.Client`, récupérez-le
sur `PlannerContext.ModelClient` et associez son flux validé à
`planner.ConsumeStream` :

```go
mc, ok := input.Agent.ModelClient("anthropic.claude-3-5-sonnet-20241022-v2:0")
if !ok {
    return nil, errors.New("model not configured")
}
req := &model.Request{
    Messages: input.Messages,
    Tools:    input.Agent.AdvertisedToolDefinitions(),
    Stream:   true,
}
stream, err := mc.Stream(ctx, req)
if err != nil {
    return nil, err
}
sum, err := planner.ConsumeStream(ctx, stream)
if err != nil {
    return nil, err
}
if len(sum.ToolCalls) > 0 {
    return &planner.PlanResult{ToolCalls: sum.ToolCalls}, nil
}
final := sum.FinalResponse()
if final == nil {
    return nil, errors.New("model stream ended without a canonical response")
}
return &planner.PlanResult{
    FinalResponse: final,
    Streamed:      true,
}, nil
```

Ce helper se contente de drainer le flux et renvoie un `StreamSummary` avec le
texte et les appels d'outils accumulés. Le journal des invocations du modèle du
runtime publie ensuite les événements de présentation et d'utilisation acceptés.

Utilisez le client direct lorsque le planificateur doit examiner des fragments
de prévisualisation validés ou effectuer plusieurs appels au modèle pendant un
même tour. Drainez chaque flux sélectionné jusqu'à son résultat terminal : une
fermeture anticipée ne produit pas de réponse acceptée. Le `PlanResult` renvoyé
doit transmettre un seul résultat exact : l'ensemble complet des `ToolCalls` du
résumé ou son `FinalResponse()`. Le runtime rejette les résultats modifiés,
mélangés ou ambigus. Ne combinez pas `PlannerModelClient.Stream(...)` avec
`planner.ConsumeStream` ; choisissez un seul propriétaire du flux par tour du
planificateur.

### Conservation exacte et couverture du résumé

Avec un `CompressAtMaxInputTokens` positif, un seul résumé reçoit tous les tours
antérieurs au plus récent. Le runtime compte ensemble les messages système,
le résumé réellement produit, les tours complets admissibles et les outils
actuels. Si le total dépasse la limite, il retire le plus ancien tour facultatif
et recompte jusqu'à trouver la plus longue suite finale qui tienne. L'égalité
avec la limite est acceptée. Le dernier tour n'est jamais résumé ni coupé.
`KeepMaxTurns` et `KeepMaxInputTokens` bornent toujours la conservation admissible ;
le résumé compte dans la limite totale, pas dans le budget supplémentaire des
anciens tours.

Chaque tour retiré a déjà été fourni au modèle de résumé. Certains peuvent
figurer à la fois dans le résumé et dans l'historique exact, sans réexécution
des outils. Cela ne prouve pas que le modèle interprétera correctement des faits
répétés ou contradictoires. Pour `K` tours admissibles, il y a au plus `K`
comptages finaux, en plus des vérifications initiales. L'entrée plus large et ces
comptages peuvent accroître le coût et la latence, sans second appel de résumé.
Si le résumé et le dernier tour ne tiennent pas, ou si un comptage ou le résumé
échoue, l'historique original accompagne l'erreur, sans solution de repli ni
redémarrage automatique.

Sans limite totale, seul le préfixe exclu est résumé : les tours conservés restent
inchangés, sans chevauchement ni comptage final ajouté. Avec une limite positive,
adaptez les prompts `WithSummaryPrompt` qui supposent « uniquement l'historique
écarté » pour parler de l'historique ancien fourni. L'objectif choisi, `%s`, les
pourcentages échappés, le modèle et le rôle restent inchangés ; aucune nouvelle
configuration ni migration de l'historique enregistré n'est nécessaire.
Voir le [contrat complet en anglais](https://goa.design/docs/2-goa-ai/runtime/#exact-retention-and-summary-coverage).

### Éléments fournis au modèle de résumé

`Compress` fournit les anciens messages sélectionnés comme éléments à résumer,
et non comme une conversation à poursuivre. Le texte, les arguments et résultats
complets des outils, leurs identifiants, l'état et le texte intégral des erreurs,
ainsi que les champs des citations sont cités au format JSON canonique de
`model.Message`. Les rôles, positions et ordre sont conservés, sans sélection,
arrondi ni suppression des valeurs répétées. Le modèle juge leur pertinence.

`WithSummaryPrompt` insère toujours la transcription textuelle complète dans
`%s`. Les images et documents sont joints une seule fois comme contenu natif dans
le même appel : un message de pièces jointes par message utilisateur original
contenant des médias, avec des références à leurs positions. Aucun outil n'est
proposé à l'exécution ; les documents ne sont ni extraits ni récupérés.
`Message.Meta`, le raisonnement, les points de contrôle du cache et les signatures
de raisonnement des outils ne sont pas copiés dans cette nouvelle requête.
L'historique original, les messages conservés exactement, les diagnostics et les
erreurs complètes restent inchangés.

Le résumé conserve son rôle et sa représentation textuelle. Les phrases citées
et tous leurs champs d'attribution sont conservés dans l'ordre sous forme
d'enregistrements cités. Les coordonnées appartiennent à la requête qui les a
produites. Si le nouveau résumé contient des citations et utilisait des documents
natifs, il décrit aussi leur disposition, sans corps de document, réattribution
de `DocumentIndex` ni lien inventé.

La couverture et la conservation suivent les règles ci-dessus ; le modèle, les
limites et l'unique appel de résumé restent inchangés. Un contenu non pris en
charge ou une requête de résumé trop volumineuse échoue explicitement, sans
suppression d'éléments ni second résumé. Les pièces jointes n'ajoutent pas de
comptage distinct.
Recevoir tous les éléments ne garantit pas que le modèle retiendra chaque fait.
Voir le [contrat complet en anglais](https://goa.design/docs/2-goa-ai/runtime/#evidence-supplied-to-the-summary-model).

### Validation de l'ordre des messages Bedrock

Lors de l'utilisation de AWS Bedrock avec le mode réflexion activé, le moteur d'exécution valide les contraintes d'ordre des messages avant d'envoyer les requêtes. Bedrock nécessite :

1. Tout message de l'assistant contenant `tool_use` doit commencer par un bloc de réflexion
2. Chaque message utilisateur contenant `tool_result` doit immédiatement suivre un message d'assistant avec les blocs `tool_use` correspondants.
3. Le nombre de blocs `tool_result` ne peut pas dépasser le nombre `tool_use` précédent.

Le client Bedrock valide ces contraintes plus tôt et renvoie une erreur descriptive en cas de violation :

```
bedrock: invalid message ordering with thinking enabled (run=xxx, model=yyy):
bedrock: assistant message with tool_use must start with thinking
```

Cette validation garantit que la reconstruction du grand livre de transcription produit des séquences de messages conformes au fournisseur.

---

## Prochaines étapes

- Découvrez les [Ensembles d'outils](./toolsets/) pour comprendre les modèles d'exécution d'outils.
- Explorez [Composition d'agent](./agent-composition/) pour les modèles d'agent en tant qu'outil
- En savoir plus sur [Mémoire et sessions](./memory-sessions/) pour la persistance des transcriptions
