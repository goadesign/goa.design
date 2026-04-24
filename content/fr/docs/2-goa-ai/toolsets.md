---
title: Ensembles d'outils
weight: 4
description: "Learn about toolset types, execution models, validation, retry hints, and tool catalogs in Goa-AI."
llm_optimized: true
aliases:
---

Les ensembles d'outils sont des ensembles d'outils que les agents peuvent utiliser. Goa-AI prend en charge plusieurs types d'ensembles d'outils, chacun avec des modèles d'exécution et des cas d'utilisation différents.

## Types d'ensembles d'outils

### Ensembles d'outils appartenant au service (basés sur une méthode)

Déclaré via `Toolset("name", func() { ... })` ; les outils peuvent être des méthodes de service `BindTo` Goa ou être implémentés par des exécuteurs personnalisés.

- Codegen émet des spécifications/types/codecs/transformations par ensemble d'outils sous `gen/<service>/toolsets/<toolset>/`
- Lors de l'utilisation du registre d'outils interne, codegen émet également `gen/<service>/toolsets/<toolset>/provider.go` pour une exécution côté service acheminée par le registre.
- Agents qui `Use` ces ensembles d'outils importent les spécifications du fournisseur et obtiennent des générateurs d'appels tapés et des usines d'exécution
- Les applications enregistrent les exécuteurs qui décodent les arguments saisis (via les codecs fournis au moment de l'exécution), utilisent éventuellement des transformations, appellent les clients de service et renvoient `ToolResult`.

Si vous déployez le registre d'outils interne pour un appel inter-processus, le service propriétaire exécute une boucle de fournisseur qui s'abonne à `toolset:<toolsetID>:requests` et publie les résultats sur `result:<toolUseID>`. Consultez la [documentation du registre]({{< ref "/docs/2-goa-ai/registry.md" >}}) pour obtenir l'extrait de câblage du fournisseur.

### Ensembles d'outils implémentés par l'agent (agent en tant qu'outil)

Défini dans un bloc d'agent `Export`, et éventuellement `Use`d par d'autres agents.

- La propriété vit toujours avec le service ; l'agent est la mise en œuvre
- Codegen émet des packages d'exportation côté fournisseur sous `gen/<service>/agents/<agent>/exports/<export>` avec `NewRegistration` et des générateurs d'appels tapés
- Assistants côté consommateur dans les agents que `Use`, l'ensemble d'outils exportés, délègue aux assistants fournisseurs tout en conservant la centralisation des métadonnées de routage
- L'exécution s'effectue en ligne ; les charges utiles sont transmises sous forme canonique JSON et décodées uniquement à la limite si nécessaire pour les invites

### Ensembles d'outils MCP

Déclaré via `Toolset(FromMCP(service, suite))` pour les suites MCP soutenues par Goa, ou
`Toolset("name", FromExternalMCP(service, suite), func() { ... })` pour externe
Serveurs MCP avec schémas d'outils en ligne.

- L'enregistrement généré définit `DecodeInExecutor=true` afin que le JSON brut soit transmis à l'exécuteur MCP.
- L'exécuteur MCP décode en utilisant ses propres codecs
- Les wrappers générés gèrent les schémas/encodeurs et transports JSON (HTTP/SSE/stdio) avec tentatives et traçage

### Quand utiliser les implémentations BindTo vs Inline

**Utilisez `BindTo` lorsque :**
- L'outil doit appeler une méthode de service Goa existante
- Vous souhaitez des transformations générées entre les types d'outils et de méthodes
- La méthode de service possède déjà la logique métier dont vous avez besoin
- Vous souhaitez réutiliser la validation et la gestion des erreurs de la couche service

```go
// Tool bound to existing service method
Tool("search", "Search documents", func() {
    Args(SearchPayload)
    Return(SearchResult)
    BindTo("Search")  // Calls the Search method on the same service
})
```

**Utilisez les implémentations en ligne lorsque :**
- L'outil a une logique personnalisée non liée à une méthode de service
- Vous devez orchestrer plusieurs appels de service
- L'outil est purement informatique (pas d'appels externes)
- Vous souhaitez un contrôle total sur le flux d'exécution

```go
// Tool with custom executor implementation
Tool("summarize", "Summarize multiple documents", func() {
    Args(func() {
        Attribute("doc_ids", ArrayOf(String), "Document IDs to summarize")
        Required("doc_ids")
    })
    Return(func() {
        Attribute("summary", String, "Combined summary")
        Required("summary")
    })
    // No BindTo - implement in executor
})
```

Pour les implémentations en ligne, vous écrivez directement la logique de l'exécuteur :

```go
func (e *Executor) Execute(
    ctx context.Context,
    meta *runtime.ToolCallMeta,
    call *planner.ToolRequest,
) (*runtime.ToolExecutionResult, error) {
    switch call.Name {
    case specs.Summarize:
        args, _ := specs.UnmarshalSummarizePayload(call.Payload)
        // Custom logic: fetch multiple docs, combine, summarize
        summary := e.summarizeDocuments(ctx, args.DocIDs)
        return runtime.Executed(&planner.ToolResult{
            Name:   call.Name,
            Result: &specs.SummarizeResult{Summary: summary},
        }), nil
    }
    return runtime.Executed(&planner.ToolResult{
        Name:  call.Name,
        Error: planner.NewToolError("unknown tool"),
    }), nil
}

```

### Résultats des outils limités

Certains outils renvoient naturellement de grandes listes, graphiques ou fenêtres de séries chronologiques. Vous pouvez les marquer comme **vues limitées** afin que les services restent responsables du découpage pendant que le runtime applique et fait apparaître le contrat.

#### L'agent.Contrat de limites

Le type `agent.Bounds` est un petit contrat indépendant du fournisseur qui décrit comment le résultat d'un outil a été limité par rapport à l'ensemble de données sous-jacent complet :

```go
type Bounds struct {
    Returned       int    // Number of items in the bounded view
    Total          *int   // Best-effort total before truncation (optional)
    Truncated      bool   // Whether any caps were applied (length, window, depth)
    RefinementHint string // Guidance on how to narrow the query when truncated
}
```

| Champ | Description |
|-------|-------------|
| `Returned` | Nombre d'éléments réellement présents dans le résultat |
| `Total` | Nombre total d'éléments au mieux avant troncature (nul si inconnu) |
| `Truncated` | Vrai si des majuscules ont été appliquées (pagination, limites de profondeur, limites de taille) |
| `RefinementHint` | Conseils lisibles par l'homme pour affiner la requête (par exemple, "Ajouter un filtre de date pour réduire les résultats") |

#### Responsabilité du service pour le parage

Le moteur d'exécution ne calcule pas lui-même les sous-ensembles ni la troncature ; **les services sont responsables de** :

1. **Application de la logique de troncature** : pagination, limites de résultats, limites de profondeur, fenêtres horaires
2. **Remplir les métadonnées des limites d'exécution** : paramètre de `planner.ToolResult.Bounds`
3. **Fournir des conseils d'affinement** : guider les utilisateurs/modèles sur la manière de restreindre les requêtes lorsque les résultats sont tronqués

Cette conception conserve la logique de troncature là où réside la connaissance du domaine (dans les services) tout en fournissant un contrat uniforme pour le temps d'exécution, les planificateurs et UIs à consommer.

#### Déclaration d'outils limités

Utilisez l'assistant DSL `BoundedResult()` dans une définition `Tool` :

```go
Tool("list_devices", "List devices with pagination", func() {
    Args(func() {
        Attribute("site_id", String, "Site identifier")
        Attribute("cursor", String, "Opaque pagination cursor")
        Required("site_id")
    })
    Return(func() {
        Attribute("devices", ArrayOf(Device), "Matching devices")
        Required("devices")
    })
    BoundedResult(func() {
        Cursor("cursor")
        NextCursor("next_cursor")
    })
    BindTo("DeviceService", "ListDevices")
})
```

#### Génération de code

Lorsqu'un outil est marqué de `BoundedResult()` :

- La spécification d'outil générée inclut `tools.ToolSpec.Bounds`
- Le schéma de résultat JSON généré inclut les champs délimités canoniques (`returned`, `total`,
`truncated`, `refinement_hint` et `next_cursor` en option)
- Le type de résultat sémantique Go reste spécifique au domaine ; il n'est pas nécessaire de dupliquer ces champs

Pour les outils `BindTo` basés sur une méthode, le résultat de la méthode de service lié doit toujours
transporter les champs délimités canoniques afin que l'exécuteur généré puisse construire
`planner.ToolResult.Bounds` avant la projection d’exécution.

```go
spec.Bounds = &tools.BoundsSpec{
    Paging: &tools.PagingSpec{
        CursorField:     "cursor",
        NextCursorField: "next_cursor",
    },
}
```

#### Implémentation d'outils limités

Les outils limités sont un contrat dur : les services implémentent la troncature et remplissent les métadonnées des limites sur chaque chemin de code réussi.

**Contracter:**

- `Bounds.Returned` et `Bounds.Truncated` doivent toujours être définis sur des résultats d'outil limités réussis.
- `Bounds.Total`, `Bounds.NextCursor` et `Bounds.RefinementHint` sont facultatifs et ne doivent être définis que lorsqu'ils sont connus.

Les exécuteurs implémentent la troncature et remplissent les métadonnées des limites :

```go
func (e *DeviceExecutor) Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    args, err := specs.UnmarshalListDevicesPayload(call.Payload)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("invalid payload"),
        }), nil
    }

    devices, total, nextCursor, truncated, err := e.repo.QueryDevices(ctx, args.SiteID, args.Cursor)
    if err != nil {
        return nil, err
    }

    return runtime.Executed(&planner.ToolResult{
        Name: call.Name,
        Result: &ListDevicesResult{
            Devices: devices,
        },
        Bounds: &agent.Bounds{
            Returned:       len(devices),
            Total:          ptr(total),
            Truncated:      truncated,
            NextCursor:     nextCursor,
            RefinementHint: "Add a status filter or reduce the site scope to see fewer results",
        },
    }), nil
}
```

#### Comportement d'exécution

Lorsqu'un outil limité s'exécute :

1. Le runtime valide qu'un outil limité réussi a renvoyé `planner.ToolResult.Bounds`
2. Le moteur d'exécution fusionne ces limites dans le JSON émis en utilisant les noms de champs de `BoundedResult(...)`.
3. Les limites restent attachées à `planner.ToolResult.Bounds`
4. Les abonnés au flux et les finaliseurs peuvent accéder aux limites de l'affichage, de la journalisation ou des décisions politiques de UI.

```go
// In a stream subscriber
func handleToolEnd(event *stream.ToolEndEvent) {
    if event.Bounds != nil && event.Bounds.Truncated {
        log.Printf("Tool %s returned %d of %d results (truncated)",
            event.ToolName, event.Bounds.Returned, *event.Bounds.Total)
        if event.Bounds.RefinementHint != "" {
            log.Printf("Hint: %s", event.Bounds.RefinementHint)
        }
    }
}
```

#### Quand utiliser BoundedResult

Utilisez `BoundedResult()` pour les outils qui :
- Renvoie des listes paginées (appareils, utilisateurs, enregistrements, journaux)
- Interroger de grands ensembles de données avec des limites de résultats
- Appliquer des limites de profondeur ou de taille aux structures imbriquées (graphiques, arbres)
- Renvoie des données échelonnées dans le temps (métriques, événements)

Le contrat limité permet :
- **Les modèles** comprennent que les résultats peuvent être incomplets et peuvent demander des améliorations.
- **UIs** affiche les indicateurs de troncature et les commandes de pagination
- **Les règles** imposent des limites de taille et détectent les requêtes incontrôlées

### Champs injectés

La fonction `Inject` DSL marque des champs de charge utile spécifiques comme « injectés » : des valeurs d'infrastructure côté serveur qui sont masquées pour le LLM mais requises par la méthode de service. Ceci est utile pour les ID de session, le contexte utilisateur, les jetons d'authentification et d'autres valeurs fournies par l'exécution.

#### Comment fonctionne l'injection

Lorsque vous marquez un champ avec `Inject` :

1. **Masqué de LLM** : Le champ est exclu du schéma JSON envoyé au fournisseur de modèles
2. **Validé au moment de la conception** : la charge utile de la méthode liée doit exposer le champ en tant que `String` requis
3. **Population d'exécuteurs** : les exécuteurs de service générés copient les valeurs prises en charge à partir de `runtime.ToolCallMeta` avant l'exécution des hooks d'intercepteur facultatifs.

#### Déclaration DSL

```go
Tool("get_user_data", "Get data for current user", func() {
    Args(func() {
        Attribute("session_id", String, "Current session ID")
        Attribute("query", String, "Data query")
        Required("session_id", "query")
    })
    Return(func() {
        Attribute("data", ArrayOf(String), "Query results")
        Required("data")
    })
    BindTo("UserService", "GetData")
    Inject("session_id")  // Hidden from LLM, populated at runtime
})
```

#### Code généré

Les exécuteurs générés basés sur la méthode copient les champs injectés à partir de `runtime.ToolCallMeta`
sur la charge utile de la méthode typée avant d'appeler le client de service :

```go
p := specs.InitGetUserDataMethodPayload(toolArgs)
p.SessionID = meta.SessionID
```

Les noms de champs injectés pris en charge sont fixes : `run_id`, `session_id`, `turn_id`,
`tool_call_id` et `parent_tool_call_id`.

#### Population d'exécution via des intercepteurs générés

Les exécuteurs de service générés exposent également les hooks d’intercepteur typés. Utilisez-les pour
dériver les champs de charge utile de la méthode à partir du contexte de la demande ou d'un autre état d'exécution :

```go
type SessionInterceptor struct{}

func (i *SessionInterceptor) Inject(ctx context.Context, payload any, meta *runtime.ToolCallMeta) error {
    sessionID, ok := ctx.Value(sessionKey).(string)
    if !ok {
        return fmt.Errorf("session ID not found in context")
    }

    switch p := payload.(type) {
    case *userservice.GetDataPayload:
        p.SessionID = sessionID
    }
    return nil
}

exec := usertools.NewChatUserToolsExec(
    usertools.WithClient(userClient),
    usertools.WithInterceptors(&SessionInterceptor{}),
)
```

#### Quand utiliser l’injection

Utilisez `Inject` pour les champs qui :
- Sont requis par le service mais ne doivent pas être choisis par le LLM
- Proviennent du contexte d'exécution (session, utilisateur, locataire, ID de demande)
- Contenir des valeurs sensibles (jetons d'authentification, clés API)
- Y a-t-il des problèmes d'infrastructure (ID de traçage, ID de corrélation)

---

## Modèles d'exécution

### Exécution basée sur les activités (par défaut)

Les ensembles d'outils basés sur des services s'exécutent via des activités Temporal (ou équivalentes dans d'autres moteurs) :

1. Le planificateur renvoie les appels d'outil dans `PlanResult` (la charge utile est `json.RawMessage`)
2. Le temps d'exécution planifie `ExecuteToolActivity` pour chaque appel d'outil
3. L'activité décode la charge utile via le codec généré pour la validation/indices
4. Appelle le `Execute(ctx, planner.ToolRequest)` de l'enregistrement du jeu d'outils avec le JSON canonique
5. Réencode le résultat avec le codec de résultat généré

### Exécution en ligne (agent en tant qu'outil)

Les ensembles d'outils Agent en tant qu'outil s'exécutent en ligne du point de vue du planificateur tandis que le moteur d'exécution exécute l'agent fournisseur en tant qu'exécution enfant réelle :

1. Le moteur d'exécution détecte `Inline=true` lors de l'enregistrement du jeu d'outils
2. Il injecte le `engine.WorkflowContext` dans `ctx` afin que la fonction `Execute` de l'ensemble d'outils puisse démarrer l'agent fournisseur en tant que workflow enfant avec son propre `RunID`.
3. Il appelle le jeu d'outils `Execute(ctx, call)` avec la charge utile canonique JSON et les métadonnées de l'outil (y compris les parents `RunID` et `ToolCallID`).
4. L'exécuteur agent-outil généré crée des messages d'agent imbriqués (système + utilisateur) à partir de la charge utile de l'outil et exécute l'agent fournisseur en tant qu'exécution enfant.
5. L'agent imbriqué exécute une boucle complète de planification/exécution/reprise lors de sa propre exécution ; ses événements `RunOutput` et d'outil sont regroupés dans un `planner.ToolResult` parent qui transporte la charge utile du résultat, la télémétrie agrégée, l'enfant `ChildrenCount` et un `RunLink` pointant vers l'exécution enfant
6. Les abonnés au flux émettent à la fois `tool_start` / `tool_end` pour l'appel de l'outil parent et un événement de lien `child_run_linked` afin que UIs puisse créer des cartes d'agent imbriquées tout en consommant un seul flux de session.

### Matérialisateurs de résultats

Les ensembles d'outils peuvent enregistrer un matérialiseur de résultat typé :

```go
reg := runtime.ToolsetRegistration{
    Name: "chat.ask_question",
    Execute: runtime.ToolCallExecutorFunc(func(
        ctx context.Context,
        meta *runtime.ToolCallMeta,
        call *planner.ToolRequest,
    ) (*runtime.ToolExecutionResult, error) {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("externally provided"),
        }), nil
    }),
    Specs: []tools.ToolSpec{specs.SpecAskQuestion},
    ResultMaterializer: func(ctx context.Context, meta runtime.ToolCallMeta, call *planner.ToolRequest, result *planner.ToolResult) error {
        // Attach deterministic, server-only sidecars here.
        result.ServerData = buildServerData(call, result)
        return nil
    },
}
```

Contracter:

- `ResultMaterializer` s'exécute à la fois sur le **chemin d'exécution normal** et sur le **chemin d'attente de résultat fourni en externe**.
- Il reçoit le `planner.ToolRequest` typé d'origine plus le `planner.ToolResult` typé, avant que le runtime ne code JSON pour les hooks, les limites de flux de travail ou les appelants.
- Utilisez-le pour attacher `result.ServerData` ou pour normaliser la forme du résultat sémantique de manière déterministe.
- Gardez-le pur et déterministe ; lorsqu'il s'exécute dans le code du workflow, il ne doit pas effectuer d'E/S.

Il s'agit de l'endroit canonique pour dériver des side-cars réservés aux observateurs à partir de la charge utile de l'outil d'origine et du résultat typé tout en gardant ces side-cars invisibles pour les fournisseurs de modèles.

---

## Modèle exécuteur-premier

Les ensembles d'outils de service générés exposent les aides à l'enregistrement qui acceptent
Implémentations `runtime.ToolCallExecutor` pour les ensembles d'outils qu'un agent utilise.

```go
if err := chat.RegisterUsedToolsets(ctx, rt,
    chat.WithSearchExecutor(searchExec),
    chat.WithProfilesExecutor(profileExec),
); err != nil {
    return err
}
```

Les applications enregistrent une implémentation d'exécuteur pour chaque local consommé
ensemble d'outils. L'exécuteur décide comment exécuter l'outil (client de service, personnalisé
fonction, appelant de registre, etc.) et reçoit des métadonnées explicites par appel via
`ToolCallMeta`.

**Exemple d'exécuteur testamentaire :**

```go
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    switch call.Name {
    case "orchestrator.profiles.upsert":
        args, err := profilesspecs.UnmarshalUpsertPayload(call.Payload)
        if err != nil {
            return runtime.Executed(&planner.ToolResult{
                Name: call.Name,
                Error: planner.NewToolError("invalid payload"),
            }), nil
        }
        
        // Optional transforms if emitted by codegen
        mp, _ := profilesspecs.ToMethodPayload_Upsert(args)
        methodRes, err := client.Upsert(ctx, mp)
        if err != nil {
            return runtime.Executed(&planner.ToolResult{
                Name:  call.Name,
                Error: planner.ToolErrorFromError(err),
            }), nil
        }
        tr, _ := profilesspecs.ToToolReturn_Upsert(methodRes)
        return runtime.Executed(&planner.ToolResult{
            Name:   call.Name,
            Result: tr,
        }), nil
        
    default:
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.NewToolError("unknown tool"),
        }), nil
    }
}
```

---

## Métadonnées d'appel d'outil

Les exécuteurs d'outils reçoivent des métadonnées explicites par appel via `ToolCallMeta` plutôt que de pêcher les valeurs de `context.Context`. Cela fournit un accès direct aux identifiants d’exécution pour la corrélation, la télémétrie et les relations parent/enfant.

### Champs ToolCallMeta

| Champ | Description |
|-------|-------------|
| `RunID` | Identificateur d'exécution de workflow durable de l'exécution propriétaire de cet appel d'outil. Stable au fil des tentatives ; utilisé pour corréler les enregistrements d'exécution et la télémétrie. |
| `SessionID` | Regroupe logiquement les exécutions liées (par exemple, une conversation par chat). Les services indexent généralement la mémoire et recherchent les attributs par session. |
| `TurnID` | Identifie le tournant conversationnel qui a produit cet appel d'outil. Les flux d'événements l'utilisent pour ordonner et regrouper des événements. |
| `ToolCallID` | Identifie de manière unique cet appel d’outil. Utilisé pour corréler les événements de début/mise à jour/fin et les relations parent/enfant. |
| `ParentToolCallID` | Identifiant de l'appel de l'outil parent lorsque cet invocation est un enfant (par exemple, un outil lancé par un agent-outil). UIs et les abonnés l'utilisent pour reconstruire l'arborescence des appels. |

### Signature de l'exécuteur testamentaire

Tous les exécuteurs d'outils reçoivent `ToolCallMeta` comme paramètre explicite :

```go
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    // Access run context directly from meta
    log.Printf("Executing tool in run %s, session %s, turn %s", 
        meta.RunID, meta.SessionID, meta.TurnID)
    
    // Use ToolCallID for correlation
    span := tracer.StartSpan("tool.execute", trace.WithAttributes(
        attribute.String("tool.call_id", meta.ToolCallID),
        attribute.String("tool.parent_call_id", meta.ParentToolCallID),
    ))
    defer span.End()
    
    typedResult := buildTypedResult()
    return runtime.Executed(&planner.ToolResult{Name: call.Name, Result: typedResult}), nil
}
```

### Pourquoi des métadonnées explicites ?

Le modèle de métadonnées explicite offre plusieurs avantages :

- **Sécurité des types** : garantit au moment de la compilation que les identifiants requis sont disponibles
- **Testabilité** : facilité de construction de métadonnées de test sans contexte moqueur
- **Clarté** : aucune dépendance cachée sur les clés contextuelles ou l'ordre des middlewares
- **Corrélation** : accès direct aux relations parent/enfant pour les appels agent-outil imbriqués
- **Traçabilité** : chaîne causale complète depuis la saisie de l'utilisateur jusqu'à l'exécution de l'outil jusqu'à la réponse finale

---

## Exécution asynchrone et durable
 
Goa-AI utilise **Activités Temporal** pour toutes les exécutions d'outils basés sur des services. Cette architecture « asynchrone d'abord » est implicite et ne nécessite aucun DSL spécial.
 
### Asynchrone implicite
 
Lorsqu'un planificateur décide d'appeler un outil, le runtime ne bloque pas le thread du système d'exploitation. Plutôt:
 
1. Le runtime planifie une **activité Temporal** pour l'appel de l'outil.
2. Le workflow de l'agent suspend l'exécution (état d'enregistrement).
3. L'activité s'exécute (sur un travailleur local, un travailleur distant ou même un autre cluster).
4. Une fois l'activité terminée, le flux de travail se réveille, restaure son état et reprend avec le résultat.
 
Cela signifie que **chaque appel d'outil** est automatiquement parallélisable, durable et de longue durée. Vous n'avez **pas** besoin de configurer `InterruptsAllowed` pour ce comportement asynchrone standard.
 
### Pause et reprise (niveau agent)
 
`InterruptsAllowed(true)` est distinct : il permet à **l'agent lui-même** de faire une pause et d'attendre un signal externe arbitraire (comme une clarification d'un utilisateur) qui n'est *pas* lié à une activité d'outil en cours d'exécution.
 
| Fonctionnalité | Asynchrone implicite | Pause et reprise |
| :--- | :--- | :--- |
| **Portée** | Exécution avec un seul outil | Flux de travail complet de l'agent |
| **Déclenchement** | Appel de n’importe quel outil basé sur un service | Arguments manquants ou demande du planificateur |
| **Politique requise** | Aucun (par défaut) | `InterruptsAllowed(true)` |
| **Cas d'utilisation** | API lent, travail par lots, traitement | Humain dans le circuit, Clarification |
 
Assurez-vous de vérifier que votre cas d'utilisation nécessite une pause *au niveau de l'agent* avant d'activer la stratégie ; souvent, l’outil standard async est suffisant.
 
### Planificateurs non bloquants
 
Du point de vue du **planificateur (LLM)**, l'interaction semble synchrone : le modèle demande un outil, "fait une pause", puis "voit" le résultat au tour suivant.
 
Du point de vue de l'**infrastructure**, elle est entièrement asynchrone et non bloquante. Cela permet à un seul petit agent de gérer des milliers d'exécutions simultanées d'agents de longue durée sans manquer de threads ou de mémoire.
 
### Survie lors des redémarrages
 
L'exécution étant durable, vous pouvez redémarrer l'intégralité de votre backend, y compris les agents agents, pendant que les outils sont en cours d'exécution. Lorsque les systèmes reviennent :
 
- Les activités d'outils en attente seront récupérées par les travailleurs.
- Les outils terminés rapporteront les résultats à leurs flux de travail parents.
- Les agents reprendront exactement là où ils s'étaient arrêtés.
 
Cette capacité est essentielle pour créer des systèmes agentiques robustes de niveau production qui fonctionnent de manière fiable dans des environnements dynamiques.

---

## Transformations

Lorsqu'un outil est lié à une méthode Goa via `BindTo`, la génération de code analyse l'outil Arg/Return et la méthode Payload/Result. Si les formes sont compatibles, Goa émet des assistants de transformation de type sécurisé :

- `ToMethodPayload_<Tool>(in <ToolArgs>) (<MethodPayload>, error)`
- `ToToolReturn_<Tool>(in <MethodResult>) (<ToolReturn>, error)`

Les transformations sont émises sous le package propriétaire de l'ensemble d'outils (par exemple `gen/<service>/toolsets/<toolset>/transforms.go`) et utilisent GoTransform de Goa pour mapper les champs en toute sécurité. Si aucune transformation n'est émise, écrivez un mappeur explicite dans l'exécuteur.

---

## Identité de l'outil

Chaque jeu d'outils définit des identifiants d'outils typés (`tools.Ident`) pour tous les outils générés, y compris les jeux d'outils non exportés. Préférez ces constantes aux chaînes ad hoc :

```go
import searchspecs "example.com/assistant/gen/orchestrator/toolsets/search"

// Use a generated constant instead of ad-hoc strings/casts
spec, _ := rt.ToolSpec(searchspecs.Search)
schemas, _ := rt.ToolSchema(searchspecs.Search)
```

Pour les ensembles d'outils exportés (agent-as-tool), Goa-AI génère des packages d'exportation sous `gen/<service>/agents/<agent>/exports/<export>` avec :
- ID d'outil saisis
- Types de charge utile/résultat d'alias
- Codecs
- Constructeurs auxiliaires (par exemple, `New<Search>Call`)

---

## Conseils pour la validation des outils et les nouvelles tentatives

Goa-AI combine **les validations au moment de la conception de Goa** avec un **modèle d'erreur d'outil structuré** pour offrir aux planificateurs de LLM un moyen puissant de **réparer automatiquement les appels d'outils non valides**.

### Types de base : ToolError et RetryHint

**ToolError** (alias de `runtime/agent/toolerrors.ToolError`) :
- `Message string` – résumé lisible par l’homme
- `Cause *ToolError` – cause imbriquée facultative (préserve les chaînes entre les tentatives et les sauts d'agent en tant qu'outil)
- Constructeurs : `planner.NewToolError(msg)`, `planner.NewToolErrorWithCause(msg, cause)`, `planner.ToolErrorFromError(err)`, `planner.ToolErrorf(format, args...)`

**RetryHint** – indice côté planificateur utilisé par le moteur d'exécution et de stratégie :

```go
type RetryHint struct {
    Reason             RetryReason
    Tool               tools.Ident
    RestrictToTool     bool
    MissingFields      []string
    ExampleInput       map[string]any
    PriorInput         map[string]any
    ClarifyingQuestion string
    Message            string
}
```

Valeurs `RetryReason` courantes :
- `invalid_arguments` – échec de la validation de la charge utile (schéma/type)
- `missing_fields` – les champs obligatoires sont manquants
- `malformed_response` – l'outil a renvoyé des données qui n'ont pas pu être décodées
- `timeout`, `rate_limited`, `tool_unavailable` – problèmes d’exécution/infra

**ToolResult** contient des erreurs et des astuces :

```go
type ToolResult struct {
    Name          tools.Ident
    Result        any
    Error         *ToolError
    RetryHint     *RetryHint
    Telemetry     *telemetry.ToolTelemetry
    ToolCallID    string
    ChildrenCount int
    RunLink       *run.Handle
}
```

### Réparation automatique des appels d'outils invalides

Le modèle recommandé :

1. **Outils de conception avec des schémas de charge utile solides** (conception Goa)
2. **Laissez les exécuteurs/outils faire apparaître les échecs de validation** sous la forme `ToolError` + `RetryHint` au lieu de paniquer ou de cacher les erreurs
3. **Apprenez à votre planificateur** à inspecter `ToolResult.Error` et `ToolResult.RetryHint`, à réparer la charge utile lorsque cela est possible et à réessayer l'appel à l'outil si nécessaire.

**Exemple d'exécuteur testamentaire :**

```go
func Execute(ctx context.Context, meta *runtime.ToolCallMeta, call *planner.ToolRequest) (*runtime.ToolExecutionResult, error) {
    args, err := spec.UnmarshalUpsertPayload(call.Payload)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name: call.Name,
            Error: planner.NewToolError("invalid payload"),
            RetryHint: &planner.RetryHint{
                Reason:        planner.RetryReasonInvalidArguments,
                Tool:          call.Name,
                RestrictToTool: true,
                Message:       "Payload did not match the expected schema.",
            },
        }), nil
    }

    res, err := client.Upsert(ctx, args)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.ToolErrorFromError(err),
        }), nil
    }

    return runtime.Executed(&planner.ToolResult{Name: call.Name, Result: res}), nil
}
```

**Exemple de logique de planificateur :**

```go
func (p *MyPlanner) PlanResume(ctx context.Context, in *planner.PlanResumeInput) (*planner.PlanResult, error) {
    if len(in.ToolOutputs) == 0 {
        return &planner.PlanResult{}, nil
    }

    last := in.ToolOutputs[len(in.ToolOutputs)-1]
    if last.Error != nil && last.RetryHint != nil {
        hint := last.RetryHint

        switch hint.Reason {
        case planner.RetryReasonMissingFields, planner.RetryReasonInvalidArguments:
            return &planner.PlanResult{
                Await: &planner.Await{
                    Clarification: &planner.AwaitClarification{
                        ID:               "fix-" + string(hint.Tool),
                        Question:         hint.ClarifyingQuestion,
                        MissingFields:    hint.MissingFields,
                        RestrictToTool:   hint.Tool,
                        ExampleInput:     hint.ExampleInput,
                        ClarifyingPrompt: hint.Message,
                    },
                },
            }, nil
        }
    }

    return &planner.PlanResult{/* FinalResponse, next ToolCalls, ... */}, nil
}
```

---

## Catalogues et schémas d'outils

Les agents Goa-AI génèrent un **catalogue d'outils unique et faisant autorité** à partir de vos conceptions Goa. Ce catalogue alimente :
- Publicité sur l'outil de planification (quels outils le modèle peut appeler)
- Découverte UI (listes d'outils, catégories, schémas)
- Orchestrateurs externes (MCP, frontends personnalisés) nécessitant des spécifications lisibles par machine

### Spécifications générées et tool_schemas.json

Pour chaque agent, Goa-AI émet un **package de spécifications** et un **catalogue JSON** :

**Packages de spécifications (`gen/<service>/agents/<agent>/specs/...`) :**
- `types.go` – charge utile/résultat des structures Go
- Codecs `codecs.go` – JSON (encodage/décodage des charges utiles/résultats typés)
- `specs.go` – Entrées `[]tools.ToolSpec` avec ID d'outil canonique, schémas de charge utile/résultat, astuces

**Catalogue JSON (`tool_schemas.json`) :**

Emplacement : `gen/<service>/agents/<agent>/specs/tool_schemas.json`

Contient une entrée par outil avec :
- `id` – ID d'outil canonique (`"<service>.<toolset>.<tool>"`)
- `service`, `toolset`, `title`, `description`, `tags`
- `payload.schema` et `result.schema` (schéma JSON)

Ce fichier JSON est idéal pour alimenter en schémas les fournisseurs LLM, créer des formulaires/éditeurs UI et des outils de documentation hors ligne.

### API d'introspection d'exécution

Au moment de l'exécution, vous n'avez pas besoin de lire `tool_schemas.json` à partir du disque. Le runtime expose une introspection API :

```go
agents   := rt.ListAgents()     // []agent.Ident
toolsets := rt.ListToolsets()   // []string

spec,   ok := rt.ToolSpec(toolID)              // single ToolSpec
schemas, ok := rt.ToolSchema(toolID)           // payload/result schemas
specs   := rt.ToolSpecsForAgent(chat.AgentID)  // []ToolSpec for one agent
```

Où `toolID` est une constante `tools.Ident` typée à partir d'un package de spécifications ou d'agenttools généré.

### Données du serveur

Certains outils doivent renvoyer des résultats riches destinés à l'observateur - des séries chronologiques complètes,
graphiques de topologie, grands ensembles de résultats, références de preuves – ce qui est utile pour UIs
et des systèmes d'audit mais trop lourds pour les fournisseurs de modèles. Modèles Goa-AI qui
sortie non-modèle en tant que **données du serveur**.

#### Données orientées modèle et données serveur

La distinction clé est de savoir quelles données circulent où :

| Type de données | Envoyé au modèle | Stocké/Diffusé | But |
|-----------|---------------|-----------------|---------|
| **Résultat face au modèle** | ✓ | ✓ | Résumé limité des raisons de LLM concernant |
| **Données du serveur Timeline** | ✗ | ✓ | Données destinées à l'observateur pour UIs, chronologies, graphiques, cartes et tableaux |
| **Données du serveur de preuves** | ✗ | ✓ | Références de provenance ou éléments probants |
| **Données internes du serveur** | ✗ | Cela dépend du consommateur | Pièces jointes à la composition d'outils ou métadonnées du serveur uniquement |

Cette séparation vous permet :
- Gardez les fenêtres de contexte du modèle délimitées et ciblées
- Fournissez des visualisations riches (graphiques, graphiques, tableaux) sans invites LLM gonflées
- Joignez des données de provenance et d'audit que les modèles n'ont pas besoin de voir
- Diffusez de grands ensembles de données sur UIs pendant que le modèle fonctionne avec des résumés

#### Déclaration de ServerData dans DSL

Utilisez la fonction `ServerData(kind, schema)` dans une définition `Tool` :

```go
Tool("get_time_series", "Get time series data", func() {
    Args(func() {
        Attribute("device_id", String, "Device identifier")
        Attribute("start_time", String, "Start timestamp (RFC3339)")
        Attribute("end_time", String, "End timestamp (RFC3339)")
        Required("device_id", "start_time", "end_time")
    })
    // Model-facing result: bounded summary
    Return(func() {
        Attribute("summary", String, "Summary for the model")
        Attribute("count", Int, "Number of data points")
        Attribute("min_value", Float64, "Minimum value in range")
        Attribute("max_value", Float64, "Maximum value in range")
        Required("summary", "count")
    })
    // Server-data: full-fidelity data for observers (e.g., UIs)
    ServerData("atlas.time_series", func() {
        Attribute("data_points", ArrayOf(TimeSeriesPoint), "Full time series data")
        Attribute("metadata", MapOf(String, String), "Additional metadata")
        Required("data_points")
    }, func() {
        AudienceTimeline()
    })
})
```

Le paramètre `kind` (par exemple, `"atlas.time_series"`) identifie le type de données du serveur afin que UIs puisse distribuer les moteurs de rendu appropriés.
Le public déclare son intention de routage :

- `AudienceTimeline()` pour la chronologie face à l'observateur/les charges utiles UI.
- `AudienceEvidence()` pour la provenance ou les éléments probants d’audit.
- `AudienceInternal()` pour les charges utiles de composition serveur uniquement.

Utilisez `FromMethodResultField("field_name")` avec les outils `BindTo(...)` lorsque le
La charge utile des données du serveur est projetée à partir d'un champ sur le résultat de la méthode de service liée.

#### Spécifications et aides générées

Dans les packages de spécifications, chaque entrée `tools.ToolSpec` comprend :
- `Payload tools.TypeSpec` – schéma de saisie de l'outil
- `Result tools.TypeSpec` – schéma de sortie orienté modèle
- `ServerData []*tools.ServerDataSpec` – charges utiles réservées au serveur émises avec le résultat

Les entrées de données du serveur incluent des schémas et des codecs générés afin que les abonnés puissent
décoder les octets canoniques JSON sans envoyer ces octets aux fournisseurs de modèles.

#### Modèles d'utilisation du runtime

**Dans les exécuteurs d'outils**, attachez les données canoniques du serveur JSON au résultat de l'outil :

```go
func (e *Executor) Execute(
    ctx context.Context,
    meta *runtime.ToolCallMeta,
    call *planner.ToolRequest,
) (*runtime.ToolExecutionResult, error) {
    args, _ := specs.UnmarshalGetTimeSeriesPayload(call.Payload)
    
    // Fetch full data
    fullData, err := e.dataService.GetTimeSeries(ctx, args.DeviceID, args.StartTime, args.EndTime)
    if err != nil {
        return runtime.Executed(&planner.ToolResult{
            Name:  call.Name,
            Error: planner.ToolErrorFromError(err),
        }), nil
    }
    
    // Build bounded model-facing result
    result := &specs.GetTimeSeriesResult{
        Summary:  fmt.Sprintf("Retrieved %d data points from %s to %s", len(fullData.Points), args.StartTime, args.EndTime),
        Count:    len(fullData.Points),
        MinValue: fullData.Min,
        MaxValue: fullData.Max,
    }
    
    // Build full-fidelity server-data for UIs
    // Generated server-data codecs are named from the tool and kind, for example:
    // specs.GetTimeSeriesAtlasTimeSeriesServerDataCodec.ToJSON(...)
    serverData, err := buildCanonicalServerData("atlas.time_series", fullData)
    if err != nil {
        return nil, err
    }

    return runtime.Executed(&planner.ToolResult{
        Name:   call.Name,
        Result: result,
        ServerData: serverData,
    }), nil
}
```

Les outils basés sur des méthodes peuvent également attacher des données de serveur via des fournisseurs générés et
matérialisateurs de résultats. Un matérialiseur est déterministe et fonctionne à la fois normalement
chemins d’exécution et d’attente de résultats fournis en externe :

```go
reg := runtime.ToolsetRegistration{
    Name:  "orchestrator.metrics",
    Specs: []tools.ToolSpec{specs.SpecGetTimeSeries},
    ResultMaterializer: func(ctx context.Context, meta runtime.ToolCallMeta, call *planner.ToolRequest, result *planner.ToolResult) error {
        if len(result.ServerData) != 0 {
            return nil
        }
        result.ServerData = buildServerData(call, result)
        return nil
    },
}
```

**Dans les abonnés au flux ou les gestionnaires UI**, lisez `ServerData` à partir des événements de fin d'outil
ou exécutez les journaux et décodez-les avec les codecs générés pour les types déclarés :

```go
func handleToolEnd(event stream.ToolEnd) {
    if len(event.Data.ServerData) == 0 {
        return
    }
    data, err := decodeTimeSeriesServerData(event.Data.ServerData)
    if err != nil {
        log.Printf("invalid server-data: %v", err)
        return
    }
    renderTimeSeriesChart(data.DataPoints)
}
```

#### Quand utiliser ServerData

Utilisez les données du serveur lorsque :
- Les résultats de l'outil incluent des données trop volumineuses pour le contexte du modèle (séries chronologiques, journaux, grandes tables)
- UIs a besoin de données structurées pour la visualisation (graphiques, graphiques, cartes)
- Vous souhaitez séparer les raisons du modèle de ce que voient les utilisateurs.
- Les systèmes en aval ont besoin de données pleine fidélité tandis que le modèle fonctionne avec des résumés

Évitez les données du serveur lorsque :
- Le résultat complet s'intègre confortablement dans le contexte du modèle
- Aucun consommateur UI ou en aval n'a besoin de l'intégralité des données.
- Le résultat borné contient déjà tout le nécessaire

---

## Meilleures pratiques

- **Mettez les validations dans la conception, pas dans les planificateurs** – Utilisez l'attribut DSL de Goa (`Required`, `MinLength`, `Enum`, etc.)
- **Retour ToolError + RetryHint des exécuteurs** – Préférez les erreurs structurées aux paniques ou aux retours `error` simples
- **Gardez des conseils concis mais exploitables** – Concentrez-vous sur les champs manquants/invalides, une courte question de clarification et une petite carte `ExampleInput`
- **Apprenez aux planificateurs à lire les astuces** – Faites de la gestion du `RetryHint` une partie de première classe de votre planificateur
- **Évitez de revalider les services internes** – Goa-AI suppose que la validation se produit à la limite de l'outil

---

## Prochaines étapes

- **[Composition de l'agent](./agent-composition.md)** – Créez des systèmes complexes avec des modèles d'agent en tant qu'outil
- **[Intégration MCP](./mcp-integration.md)** - Connectez-vous à des serveurs d'outils externes
- **[Runtime](./runtime.md)** - Comprendre le flux d'exécution des outils
