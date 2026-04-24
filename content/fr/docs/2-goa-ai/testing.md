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
    rt := runtime.New()
    ctx := context.Background()
    
    // Register agent with test planner
    err := chat.RegisterChatAgent(ctx, rt, chat.ChatAgentConfig{
        Planner: &TestPlanner{},
    })
    require.NoError(t, err)

    _, err = rt.CreateSession(ctx, "test-session")
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
    
    planner := &MyPlanner{client: mockClient}
    
    input := &planner.PlanInput{
        Messages: []*model.Message{{
            Role:  model.ConversationRoleUser,
            Parts: []model.Part{model.TextPart{Text: "Search for test"}},
        }},
    }
    
    result, err := planner.PlanStart(context.Background(), input)
    require.NoError(t, err)
    
    // Assert planner returned tool calls
    assert.NotNil(t, result.ToolCalls)
    assert.Len(t, result.ToolCalls, 1)
    assert.Equal(t, "search", string(result.ToolCalls[0].Name))
}
```

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
    
    call := &planner.ToolRequest{
        Name:    specs.Search,
        Payload: json.RawMessage(`{"query": "test", "limit": 5}`),
    }
    
    // Execute tool
    result, err := executor.Execute(context.Background(), meta, call)
    require.NoError(t, err)
    require.NotNil(t, result.ToolResult)
    
    // Assert on result
    assert.Nil(t, result.ToolResult.Error)
    assert.NotNil(t, result.ToolResult.Result)
    
    // Unmarshal and verify typed result
    searchResult, ok := result.ToolResult.Result.(*specs.SearchResult)
    require.True(t, ok)
    assert.Len(t, searchResult.Documents, 3)
}
```

### Conseils de validation et de nouvelle tentative de l'outil de test

Vérifiez que les outils renvoient des erreurs et des conseils appropriés en cas de saisie non valide :

```go
func TestToolValidationReturnsHint(t *testing.T) {
    executor := &SearchExecutor{}
    
    // Invalid payload - missing required field
    call := &planner.ToolRequest{
        Name:    specs.Search,
        Payload: json.RawMessage(`{"limit": 5}`), // missing "query"
    }
    
    result, err := executor.Execute(context.Background(), &runtime.ToolCallMeta{}, call)
    require.NoError(t, err) // Executor should not return error
    require.NotNil(t, result.ToolResult)
    
    // Should return ToolError with RetryHint
    assert.NotNil(t, result.ToolResult.Error)
    assert.NotNil(t, result.ToolResult.RetryHint)
    assert.Equal(t, planner.RetryReasonMissingFields, result.ToolResult.RetryHint.Reason)
    assert.Contains(t, result.ToolResult.RetryHint.MissingFields, "query")
}
```

### Composition de l'agent de test

Scénarios de test d'agent en tant qu'outil :

```go
func TestAgentComposition(t *testing.T) {
    rt := runtime.New()
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

    _, err = rt.CreateSession(ctx, "test-session")
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
rt := runtime.New()

// ✓ Register all agents first
chat.RegisterChatAgent(ctx, rt, chatConfig)
planner.RegisterPlannerAgent(ctx, rt, plannerConfig)

// ✓ Then create a session and start runs
client := chat.NewClient(rt)
if _, err := rt.CreateSession(ctx, "session-123"); err != nil {
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
if _, err := rt.CreateSession(ctx, "session-123"); err != nil {
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

4. **Exempter du budget les outils de comptabilité structurée** en les déclarant `Bookkeeping()` dans le DSL. Les mises à jour de statut, les marqueurs de progression et les outils de validation de terminal appartiennent généralement à cette catégorie ; une fois exonérés, ils ne consomment jamais `RemainingToolCalls` et peuvent toujours s'exécuter. Associez `Bookkeeping()` à `TerminalRun()` pour obtenir un outil de « validation de cette exécution » dont la finalisation est garantie même une fois le budget de récupération épuisé.

**Symptôme:**
```
error: bookkeeping-only tool batch requires a terminal tool or terminal planner payload
```

**Cause :** Le planificateur n'a émis que des outils de comptabilité, mais aucun de ces résultats n'était éligible pour déclencher un autre tour de planificateur. Par défaut, les résultats de comptabilité réussis restent cachés des futurs tours `PlanResume`, donc le même tour doit soit être résolu de manière terminale/attendre une entrée, soit produire un résultat de comptabilité visible par le planificateur.

**Solutions :**

1. **Terminez dans le même tour** avec `TerminalRun()`, `FinalResponse` ou `FinalToolResult` lorsque le lot de comptabilité est déjà terminal.
2. **Pause explicitement** avec une poignée de main d'attente/pause si l'exécution attend une entrée humaine ou externe.
3. **Marquez le résultat de la comptabilité `PlannerVisible()`** lorsqu'il contient un état canonique sur lequel le prochain tour du planificateur doit raisonner, comme un instantané de progression structuré.
4. **Ne combinez pas `PlannerVisible()` avec `TerminalRun()`**. Utilisez `TerminalRun()` pour l'achèvement atomique et `PlannerVisible()` pour la comptabilité non terminale qui devrait reprendre la planification.

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
    DefaultCaps(MaxConsecutiveFailedToolCalls(5))
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

1. **Renvoie un RetryHint** de l'exécuteur afin que le planificateur puisse s'auto-corriger :
```go
if err != nil {
    return runtime.Executed(&planner.ToolResult{
        Name:  call.Name,
        Error: planner.NewToolError("invalid payload"),
        RetryHint: &planner.RetryHint{
            Reason:       planner.RetryReasonInvalidArguments,
            Tool:         call.Name,
            ExampleInput: map[string]any{"query": "example", "limit": 10},
            Message:      "limit must be an integer",
        },
    }), nil
}
```

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
rt := runtime.New(runtime.WithStream(&DebugSink{}))
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
