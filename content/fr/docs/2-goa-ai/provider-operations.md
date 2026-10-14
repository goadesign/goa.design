---
nav_group: guides
title: "Opérations exécutées par le fournisseur"
weight: 35
description: "Appeler des opérations d’agents et des outils enregistrés sans importer leur implémentation."
llm_optimized: true
---

Appeler des opérations d’agents et des outils enregistrés sans importer leur implémentation.

## Démarrer une opération

L’hôte autorise l’appelant puis soumet la déclaration générée et les arguments
originaux. `StartOperation` utilise une session existante de l’hôte ;
`StartOneShotOperation` ne crée aucune session. Le worker fournisseur valide son
exportation et prépare la configuration immuable sélectionnée. Le consommateur n’a
besoin ni de la définition privée de l’agent ni de `WithAgentExecutors`.

```go
handle, err := rt.StartOneShotOperation(
    ctx, runID, operation, arguments, labels, nil,
)
if err != nil {
    return err
}
output, err := handle.Wait(ctx)
if err != nil {
    return err
}
```

Utilisez `StartToolOperation` ou `StartOneShotToolOperation` avec la sélection Registry
exacte conservée et son `RegisteredInvocation`. Configurez la même source Registry et le
client généré. Les agents natifs utilisent le workflow et la file déclarés. Les services
utilisent `WithToolWorkflowQueue` et un worker appelant `RegisterToolWorkflow`, sans
agent, planificateur, modèle ou conversation. Un enregistrement ou une étiquette ne
donne pas accès.

## Choisir explicitement l’historique

Enregistrez `AgentToolResolver` sur le worker fournisseur avant de sceller le runtime ou
de soumettre du travail. Sa signature est `func(context.Context,
genregistry.ExecutionInvocation, string, *runtime.ToolCall)
(*runtime.AgentToolConfiguration, error)`. Il reçoit l’invocation originale, la
référence immuable et l’appel validé. Il renvoie `History` obligatoire, étiquettes,
politique et, éventuellement, métadonnées et références de prompts.

```go
configuration := &runtime.AgentToolConfiguration{
    History: runtime.LiteralAgentHistory(messages),
    Labels: labels,
    Policy: policy,
}
```

Pour un tour ultérieur, utilisez `runtime.NextTurnAgentHistory(completedRunID,
systemMessages, freshMessages)`. La source doit être une exécution réussie du même agent
et de la même session. Les nouveaux messages ne contiennent pas de messages système.
`WithoutPriorReasoning()` exclut le raisonnement fourni et hérité ; cette exclusion
persiste aux tours suivants. Une opération sans session ne reprend pas l’historique
d’une autre session. Une répétition exacte réutilise la préparation acceptée.

## Résultats, saisie et annulation

Le moteur prend en charge le travail accepté avant la préparation. Répéter la requête
exacte retrouve l’exécution originale ; modifier une requête acceptée crée un conflit.
Un échec ou une annulation avant le premier enregistrement du runtime conserve un
résultat terminal dans le moteur. Observez le travail accepté avant de conclure que
l’absence d’un enregistrement signifie qu’aucun travail n’a démarré.

Les entrées, sorties, enregistrements et instantanés communs exigent `Subject` généré :
l’identifiant réel de l’agent, ou la source Registry et le nom qualifié de l’outil de
service. Un service n’a ni agent fictif ni session cachée. Les clients et historiques
propres aux agents exigent toujours une identité d’agent.

`planner.PlanInput.ParentTool` et `planner.PlanResumeInput.ParentTool` portent le
contrat de résultat sélectionné pour la délégation et les opérations directes. Le
planificateur renvoie `planner.FinalToolResult` conforme au contrat ; du texte seul est
refusé. Utilisez `FinalToolResult` pour le résultat typé et `Final` pour le texte.
Consultez les événements paginés seulement pour l’historique de diagnostic.

La continuation restaure l’opération originale et admet un seul successeur. Pour un
service, l’hôte conserve durablement le prédécesseur, le nouvel ID et la réponse typée ;
son worker appelle `StartToolContinuation` et `EnsureToolContinuationCompletion`.
L’annulation du parent suit les relations acceptées et conserve le nettoyage inachevé.
La finalisation ne dépend pas d’une nouvelle tentative du client.

## Contrats d’entrée générés

Dans `Use` d’un toolset compilé, `BindInput("read", "scope")` retire un champ
fournisseur obligatoire de premier niveau de l’entrée du modèle pour ce consommateur.
Installez le helper typé généré pour chaque activité de planification afin de fournir la
valeur de l’application. Le fournisseur reçoit toujours l’entrée complète. Les champs
facultatifs, injectés, inconnus, répétés et les chemins imbriqués sont refusés ; les
contrats Registry distants nécessitent une déclaration compilée.

Les codecs acceptent `Any` ou `Bytes` explicitement représentés par `json.RawMessage`,
conservant JSON et nombres exacts. Une map déclarée avec `Meta("struct:tag:json",
",embed")` accepte des membres supplémentaires selon le contrat de ses valeurs. Les clés
dupliquées, collisions et valeurs invalides sont refusées. Les objets ordinaires restent
fermés et les octets ordinaires utilisent base64.

## Mise à niveau et retour arrière {#upgrade}

Cette mise à niveau coordonne le code, les formats échangés et les données conservées.
Régénérez et reconstruisez fournisseurs et consommateurs ; remplacez `Messages` par
`History` obligatoire et enregistrez le resolver chez le fournisseur. Un historique
explicitement vide est `runtime.LiteralAgentHistory(nil)` ; un `AgentHistory` sans
sélection est refusé. Les cibles natives exigent `Executor`, `Configuration`, `Workflow`
et `Queue`. Validez tous les groupes conservés, même retirés.

Les suspensions utilisent `goa-ai.run-suspension.v14` et les résultats principaux
`json/goa-ai-run-output-v3`. Les anciens formats sont refusés. Adaptez Stores, moteurs,
enregistrements, consommateurs et transports à `Subject` obligatoire. Inventoriez
démarrages, préparations, sélections, checkpoints, historiques parents contenant des
résultats enfants, exports et copies de résultats. Terminez le travail avec ses anciens
workers ou effectuez une conversion contrôlée par le propriétaire avec vérification du
replay. Ne partagez pas une file entre anciennes et nouvelles préparations tant que du
travail ancien subsiste.

Coordonnez lecteurs et écrivains déployés séparément. Un retour arrière exige données,
déclarations, requêtes et workers compatibles ; rétablir seulement un binaire après de
nouvelles écritures est dangereux. Le framework ne déduit pas les exécuteurs manquants
et n’offre pas de compatibilité permanente.

Contrats détaillés du framework :

- [Run subjects](https://github.com/goadesign/goa-ai/blob/main/docs/run-subjects.md)
- [Workflow results](https://github.com/goadesign/goa-ai/blob/main/docs/workflow-results.md)
- [Native declarations](https://github.com/goadesign/goa-ai/blob/main/docs/native-agent-declarations.md)
- [JSON codecs](https://github.com/goadesign/goa-ai/blob/main/docs/json_codecs.md)
