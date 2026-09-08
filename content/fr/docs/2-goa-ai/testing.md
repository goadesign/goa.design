---
title: Tests et dépannage
weight: 9
description: "Learn how to test agents, planners, and tools, and troubleshoot common issues."
llm_optimized: true
---

Ce guide couvre les stratégies de test pour les agents Goa-AI et les solutions aux problèmes courants.

## Agents de test

### Tests avec le moteur en mémoire

Le moteur en mémoire est idéal pour les tests car il :
- Ne nécessite aucune dépendance externe (pas de Temporal)
- S'exécute de manière synchrone pour un comportement de test prévisible
- Fournit un retour rapide pendant le développement

```go
func TestChatAgent(t *testing.T) {
    // Create runtime with in-memory engine (default)
    store := storageinmem.New()
    rt := runtime.New(store)
    ctx := context.Background()
    
    // Register agent with test planner
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
        Planner: &TestPlanner{},
    })
    require.NoError(t, err)

    _, err = store.CreateSession(ctx, "test-session", time.Now().UTC())
    require.NoError(t, err)
    
    // Run agent
    client := chat.NewClient(rt)
    out, err := client.Run(
        ctx,
        "test-session",
        []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Hello"}},
        }},
    )
    require.NoError(t, err)
    
    // Assert on output
    assert.NotEmpty(t, out.RunID)
    assert.NotNil(t, out.Final)
}
```

### Planificateurs de tests avec des clients modèles simulés

Isolez la logique du planificateur en vous moquant du client modèle :

```go
type MockModelClient struct {
    responses []model.Message
    callCount int
}

func (m *MockModelClient) Complete(ctx context.Context, req *model.Request) (*model.Response, error) {
    if m.callCount >= len(m.responses) {
        return nil, fmt.Errorf("no more mock responses")
    }
    resp := &model.Response{
        Content: []model.Message{m.responses[m.callCount]},
    }
    m.callCount++
    return resp, nil
}

func (m *MockModelClient) Stream(ctx context.Context, req *model.Request) (model.Streamer, error) {
    // Return a mock streamer for streaming tests
    return &MockStreamer{response: m.responses[m.callCount]}, nil
}

func TestPlannerWithMockClient(t *testing.T) {
    mockClient := &MockModelClient{
        responses: []model.Message{
            {
                Role: model.ConversationRoleAssistant,
                Parts: []model.Part{
                    model.TextPart{Text: "I'll search for that."},
                    model.ToolUsePart{
                        ID:    "call-1",
                        Name:  "search",
                        Input: json.RawMessage(`{"query": "test"}`),
                    },
                },
            },
        },
    }
    
    p := &MyPlanner{client: mockClient}
    messages := []*model.Message{{
        Role:  model.ConversationRoleUser,
        Parts: []model.Part{model.TextPart{Text: "Search for test"}},
    }}
    
    input := &planner.PlanInput{
        PrepareMessages: func() ([]*model.Message, error) {
            return messages, nil
        },
    }
    
    result, err := p.PlanStart(context.Background(), input)
    require.NoError(t, err)
    
    // Assert planner returned tool calls
    assert.NotNil(t, result.ToolCalls)
    assert.Len(t, result.ToolCalls, 1)
    assert.Equal(t, "search", string(result.ToolCalls[0].Name))
}
```

Les tests directs des planificateurs fournissent `PrepareMessages` et vérifient
que toute erreur de préparation est renvoyée. Pour prouver que le runtime
n'applique la politique qu'une fois et refuse une erreur ignorée, testez avec le
vrai runtime ; voir le [contrat de préparation](../runtime/#preparing-conversation-messages).

### Outils de test isolés

Testez les exécuteurs de l’outil indépendamment de l’agent :

```go
func TestSearchToolExecutor(t *testing.T) {
    // Create executor with mock dependencies
    mockSearchService := &MockSearchService{
        results: []string{"doc1", "doc2", "doc3"},
    }
    executor := &SearchExecutor{searchService: mockSearchService}
    
    // Create test tool call
    meta := &runtime.ToolCallMeta{
        RunID:      "test-run",
        SessionID:  "test-session",
        TurnID:     "test-turn",
        ToolCallID: "call-1",
    }
    
    request, err := planner.NewToolRequest(specs.SearchTool(), &specs.SearchPayload{
        Query: "test",
        Limit: 5,
    })
    require.NoError(t, err)

    // Executors run after validation and execution-ID assignment. Build the
    // runtime call from the valid bytes produced by the generated descriptor.
    call := &runtime.ToolCall{
        Name:       request.Name,
        Payload:    request.Payload,
        RunID:      meta.RunID,
        SessionID:  meta.SessionID,
        TurnID:     meta.TurnID,
        ToolCallID: meta.ToolCallID,
    }
    
    // Execute tool
    result, err := executor.Execute(context.Background(), meta, call)
    require.NoError(t, err)
    require.NotNil(t, result.ToolResult)
    
    // Assert on result
    assert.Nil(t, result.ToolResult.Failure)
    assert.NotNil(t, result.ToolResult.Result)
    
    // Unmarshal and verify typed result
    searchResult, ok := result.ToolResult.Result.(*specs.SearchResult)
    require.True(t, ok)
    assert.Len(t, searchResult.Documents, 3)
}
```

### Tester la validation et la récupération des outils

Testez le JSON externe mal formé à la frontière du codec généré. Les appels
d'outils invalides du modèle sont refusés avant que le planificateur ou
l'exécuteur ne les reçoive :

```go
func TestSearchPayloadRequiresQuery(t *testing.T) {
    _, err := specs.SearchTool().Payload.FromJSON(
        rawjson.Message(`{"limit":5}`),
    )
    require.Error(t, err)

    var validationErr *tools.ValidationError
    require.ErrorAs(t, err, &validationErr)
    assert.Equal(t, "query", validationErr.Issues()[0].Field)
}
```

Les tests directs de l'exécuteur doivent créer un `planner.ToolRequest` valide
avec le descripteur typé généré, puis construire un `runtime.ToolCall` à partir
de son nom et de ses octets canoniques, en ajoutant les IDs que le runtime
attribuerait. Vérifiez les échecs du domaine ou du fournisseur avec
`ToolResult.Failure.Kind`, `Failure.Error` et `Failure.Recovery`. Un test du
planificateur qui transmet précisément un appel validé du fournisseur peut
utiliser `planner.ToolRequestFromModelCall` pour conserver son ID de
corrélation.

### Composition de l'agent de test

Scénarios de test d'agent en tant qu'outil :

```go
func TestAgentComposition(t *testing.T) {
    store := storageinmem.New()
    rt := runtime.New(store)
    ctx := context.Background()
    
    // Register provider agent
    err := planner.RegisterPlannerAgent(ctx, rt, planner.PlannerAgentConfig{
        Planner: &PlanningPlanner{},
    })
    require.NoError(t, err)
    
    // Register consumer agent that uses provider's tools
    err = orchestrator.RegisterOrchestratorAgent(ctx, rt, orchestrator.OrchestratorAgentConfig{
        Planner: &OrchestratorPlanner{},
    })
    require.NoError(t, err)

    _, err = store.CreateSession(ctx, "test-session", time.Now().UTC())
    require.NoError(t, err)
    
    // Run orchestrator - it should invoke planner agent as a tool
    client := orchestrator.NewClient(rt)
    out, err := client.Run(
        ctx,
        "test-session",
        []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Create a plan for X"}},
        }},
    )
    require.NoError(t, err)
    
    // Verify child run was created
    assert.Greater(t, out.ChildrenCount, 0)
}
```

### Tester le stockage du runtime

Utilisez `runtime/agent/storage/inmem` pour les tests de planificateurs et de workflows. Testez une implémentation de production durable avec le même contrat, notamment les cas suivants :

- les démarrages racine, enfant et ponctuel sans session enregistrent ensemble leurs métadonnées et leurs premiers enregistrements ;
- les nouveaux appels à `StartChildRun` et `StartOneShotChildRun` exigent un parent actif et enregistrent le lien parent dans la même opération que le démarrage de l'enfant ;
- une nouvelle tentative identique de l'un de ces démarrages déjà acceptés reste valide après l'arrêt du parent, tandis qu'une tentative modifiée ou un nouvel enfant est rejeté ;
- une nouvelle tentative identique renvoie l’identifiant d’origine et indique qu’aucun nouvel enregistrement n’a été inséré ;
- répéter un changement de cycle de vie avec un autre enregistrement produit un conflit, même si l’état demandé et les autres champs sont inchangés ;
- toute modification d’une valeur fixée par la première écriture renvoie un conflit ;
- un appel explicite à `CancelRun` accepté par un workflow actif enregistre
  ensemble le premier motif et l'enregistrement
  `storage.CancellationRecordType` correspondant ; son type sérialisé est
  `runtime.cancellation_intent`. Une répétition exacte réussit et un motif
  ultérieur différent produit un conflit ;
- le démarrage d'une exécution avec une session déjà terminée enregistre
  `session_ended` avec l'enregistrement terminal annulé et sans enregistrement
  `storage.CancellationRecordType` ;
- une annulation venant du moteur laisse vide le motif enregistré et ne crée
  aucun enregistrement `storage.CancellationRecordType`, tandis que son
  enregistrement terminal contient `engine_canceled` ;
- la suspension enregistre ensemble le point de reprise, l’état suspendu et l’enregistrement correspondant ;
- la fin enregistre ensemble l’état final et l’enregistrement correspondant ;
- le démarrage d'une continuation exige une exécution précédente suspendue qui
  existe et possède la même session, le même agent et la même exécution parente ;
- une continuation qui ne correspond pas n'écrit ni démarrage du successeur ni
  lien parent, et un successeur accepté conserve `PredecessorRunID` dans
  `RunStarted`, pas dans `RunMeta` ;
- une session terminée empêche le planificateur et les outils de travailler, mais enregistre comme annulé un workflow déjà accepté ;
- la purge échoue tant qu’une exécution est active, puis supprime les métadonnées, points de reprise et enregistrements de la session terminée une fois toutes les exécutions achevées.

Ces tests du stockage doivent exécuter les vraies transactions de la base de
données. Un mock qui vérifie seulement les appels de méthodes ne peut pas
prouver que l’état et les enregistrements deviennent visibles ensemble.

Testez séparément l'adaptateur Temporal : la fermeture d'un workflow parent
doit terminer son workflow enfant.

Testez séparément les commandes explicites du runtime pour livrer la fin :

- `EnsureRunCompletion` enregistre le résultat manquant d'une exécution active,
  puis valide et livre à nouveau un résultat déjà enregistré sans le modifier ;
- le lien d'un enfant est livré avant son événement final, tandis que
  `EnsureChildRunLink` livre uniquement le lien exact enregistré ;
- une session active sans `Runtime.WithStream` échoue, tandis qu’une session
  nouvellement constatée comme terminée conserve le résultat enregistré et
  supprime sa livraison ;
- `LoadSessionStatus` renvoie le statut actuel de la session, tandis que
  `EnsureRunCompletion` utilise le `SessionStatus` renvoyé avec l’écriture de
  l’enregistrement final ou sa nouvelle tentative identique et conserve ce
  statut pendant les nouvelles tentatives de livraison au flux ;
- un événement accepté pendant que sa session est active reste à livrer si la
  session se termine pendant cet appel de livraison ;
- un workflow encore actif dans le moteur renvoie `ErrRunCompletionNotReady`,
  et des données mal formées ou contradictoires du moteur ou du stockage
  renvoient `ErrRunCompletionCorrupt`.

Testez séparément le codec des hooks : les décodeurs de `RunStarted`,
`RunSuspended`, `RunCompleted` et `ChildRunLinked` doivent rejeter `null`, les
champs inconnus et une seconde valeur JSON finale.

Les tests de continuation doivent accepter `goa-ai.run-suspension.v7` et rejeter
toutes les versions précédentes avant de restaurer les payloads ou d’appeler le
planificateur.

---

## Dépannage

### Erreurs courantes

#### Erreur "inscription fermée"

**Symptôme:**
```
error: registration closed: cannot register agent after runtime start
```

**Cause :** Tentative d'enregistrement d'un agent après que le runtime a commencé à traiter les exécutions.

**Solution :** Enregistrez tous les agents avant de démarrer une exécution :

```go
store := storageinmem.New()
rt := runtime.New(store)

// ✓ Register all agents first
chat.RegisterChatAgent(ctx, rt, chatConfig)
planner.RegisterPlannerAgent(ctx, rt, plannerConfig)

// ✓ Then create a session and start runs
client := chat.NewClient(rt)
if _, err := store.CreateSession(ctx, "session-123", time.Now().UTC()); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "session-123", messages, opts...)
```

#### Erreur "ID de session manquant"

**Symptôme:**
```
error: missing session ID: session ID is required for run
```

**Cause :** Démarrage d'une exécution sans fournir d'ID de session.

**Solution :** Fournissez toujours un ID de session comme argument de position requis :

```go
// ✗ Wrong - no session ID
out, err := client.Run(ctx, "", messages)

// ✓ Correct - session ID provided
if _, err := store.CreateSession(ctx, "session-123", time.Now().UTC()); err != nil {
    panic(err)
}
out, err := client.Run(ctx, "session-123", messages)
```

**Conseil :** Pour les tests, utilisez un ID de session fixe. Pour la production, générez des identifiants de session uniques par conversation.

#### Erreurs de violation des règles

**Symptôme:**
```
error: policy violation: max tool calls exceeded (10/10)
```

**Cause :** L'agent a dépassé la limite `MaxToolCalls` configurée pour les outils *budgétisés*. Les outils déclarés `Bookkeeping()` ne comptent pas dans ce plafond.

**Solutions :**

1. **Augmentez la limite** si le cas d'utilisation nécessite légitimement davantage d'appels d'outils :
```go
RunPolicy(func() {
    DefaultCaps(MaxToolCalls(20)) // Increase from default
})
```

2. **Améliorez l'efficacité du planificateur** pour utiliser moins d'appels d'outils :
   - Opérations par lots lorsque cela est possible
   - Utiliser des appels d'outils plus spécifiques
   - Améliorer l’ingénierie rapide

3. **Vérifiez les boucles infinies** dans la logique du planificateur qui appelle à plusieurs reprises le même outil.

4. **Exempter les enregistrements de contrôle structurés des budgets de récupération et d'échecs** en les déclarant `Bookkeeping()` dans le DSL. Les marqueurs de statut et déclarations de transition appartiennent à cette catégorie, contrairement aux résultats de recherche dont le succès doit planifier un raisonnement ultérieur. Un lot mixte produit par le modèle reste atomique et est rejeté entièrement si ses appels budgétisés ne tiennent pas. Utilisez `TerminalRun()` seul pour une validation terminale : les outils terminaux deviennent automatiquement comptables et peuvent être admis après épuisement du budget.

**Symptôme:**
```
error: bookkeeping-only tool batch requires a terminal tool or terminal planner payload
```

**Cause :** Le planificateur n'a émis que des outils de comptabilité. Leurs appels et résultats restent dans la transcription du fournisseur, mais les résultats réussis ne déclenchent pas un autre `PlanResume` et n'entrent pas dans les futurs `ToolOutputs` typés. Le même tour doit donc se résoudre de manière terminale ou attendre une entrée.

**Solutions :**

1. **Terminez dans le même tour** avec `TerminalRun()`, `FinalResponse` ou `FinalToolResult` lorsque le lot de comptabilité est déjà terminal.
2. **Pause explicitement** avec une poignée de main d'attente/pause si l'exécution attend une entrée humaine ou externe.
3. **Déplacez l'état du prochain tour dans une entrée explicite du planificateur** au lieu de dépendre d'un résultat de comptabilité réussi pour reprendre la planification.

**Symptôme:**
```
error: policy violation: max consecutive failed tool calls exceeded (3/3)
```

**Cause :** Plusieurs appels d'outils consécutifs ont échoué.

**Solutions :**

1. **Corrigez les erreurs sous-jacentes de l'outil** - vérifiez les journaux de l'exécuteur de l'outil
2. **Améliorez les conseils de nouvelle tentative** afin que le planificateur puisse s'auto-corriger
3. **Augmentez la limite** si des pannes transitoires sont attendues :
```go
RunPolicy(func() {
    DefaultCaps(MaxRecoveryTurns(5))
})
```

**Symptôme:**
```
error: policy violation: time budget exceeded (2m0s)
```

**Cause :** L'exécution de l'agent a dépassé le `TimeBudget` configuré.

**Solutions :**

1. **Augmenter le budget** pour les opérations de longue durée :
```go
RunPolicy(func() {
    TimeBudget("10m")
})
```

2. **Utilisez `Timing` pour un contrôle précis** :
```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")  // Overall budget
        Plan("1m")     // Per-plan timeout
        Tools("2m")    // Per-tool timeout
    })
})
```

3. **Optimisez l'exécution des outils** pour terminer plus rapidement.

#### Erreur "outil inconnu"

**Symptôme:**
```
error: unknown tool: orchestrator.helpers.search
```

**Cause :** Le planificateur a demandé un outil qui n'est pas enregistré.

**Solutions :**

1. **Vérifiez l'enregistrement de l'ensemble d'outils** : assurez-vous que l'ensemble d'outils est enregistré auprès de l'agent :
```go
Agent("chat", "Chat agent", func() {
    Use(HelpersToolset) // Make sure this is included
})
```

2. **Vérifiez l'orthographe du nom de l'outil** : les noms d'outils sont sensibles à la casse et utilisent des noms qualifiés.

3. **Régénérer le code** après les modifications de DSL :
```bash
goa gen example.com/project/design
```

#### Erreur "charge utile invalide"

**Symptôme:**
```
error: invalid payload: json: cannot unmarshal string into Go struct field SearchPayload.limit of type int
```

**Cause :** Le LLM a fourni une charge utile qui ne correspond pas au schéma de l'outil.

**Solutions :**

1. **Testez le codec généré** afin que la frontière indique précisément le
   champ en cause :
```go
_, err := specs.SearchTool().Payload.FromJSON(
    rawjson.Message(`{"query":"example","limit":"ten"}`),
)
var validationErr *tools.ValidationError
require.ErrorAs(t, err, &validationErr)
assert.Equal(t, "invalid_field_type", validationErr.Issues()[0].Constraint)
```

Lorsque le fournisseur émet cette charge utile, le client de modèle validé
renvoie `model.OutputValidationError`. Le planificateur ou le runtime la
présente sous la forme `planner.OutputContractError` avant l'exécution de tout
exécuteur ou code de service. Utilisez `errors.As` pour vérifier cette erreur
structurée à la frontière testée ; aucun `ToolFailure` n'est enregistré.

Testez `RecoveryCorrectCall` séparément avec un appel produit par le modèle qui
respecte le schéma, puis dont l'exécuteur ou la frontière du domaine renvoie un
`ToolFailure` récupérable.

2. **Améliorer les descriptions des outils** pour clarifier les types attendus.

3. **Ajoutez des exemples** au DSL :
```go
Args(func() {
    Attribute("limit", Int, "Maximum results", func() {
        Example(10)
        Minimum(1)
        Maximum(100)
    })
})
```

### Conseils de débogage

#### Activer la journalisation du débogage

```go
import "goa.design/goa-ai/runtime/agent/runtime"

rt := runtime.New(
    storageinmem.New(),
    runtime.WithLogger(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,
    }))),
)
```

#### Abonnez-vous aux événements pour le débogage

```go
type DebugSink struct{}

func (s *DebugSink) Send(ctx context.Context, event stream.Event) error {
    fmt.Printf("[%s] %s run=%s session=%s payload=%v\n",
        time.Now().Format(time.RFC3339),
        event.Type(),
        event.RunID(),
        event.SessionID(),
        event.Payload(),
    )
    return nil
}

func (s *DebugSink) Close(ctx context.Context) error { return nil }

// Wire the sink into the runtime to observe all stream events.
rt := runtime.New(storageinmem.New(), runtime.WithStream(&DebugSink{}))
```

#### Inspecter les spécifications de l'outil au moment de l'exécution

```go
// List all registered tools
for _, spec := range rt.ToolSpecsForAgent(chat.AgentID) {
    fmt.Printf("Tool: %s\n", spec.Name)
    fmt.Printf("  Description: %s\n", spec.Description)
    fmt.Printf("  Payload Schema: %s\n", spec.Payload.Schema)
}
```

---

## Prochaines étapes

- **[Référence DSL](./dsl-reference/)** - Référence complète de la fonction DSL
- **[Runtime](./runtime/)** – Comprendre l'architecture d'exécution
- **[Production](./production/)** - Déployer avec Temporal et diffuser UI
