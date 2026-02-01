---
title: Tests et dépannage
weight: 9
description: "Learn how to test agents, planners, and tools, and troubleshoot common issues."
llm_optimized: true
---

Ce guide présente des stratégies de test pour les agents Goa-AI et des solutions aux problèmes les plus courants.

## Tester les agents

### Test avec le moteur In-Memory

Le moteur en mémoire est idéal pour les tests car il
- Ne nécessite pas de dépendances externes (pas de temporalité)
- Il s'exécute de manière synchrone pour un comportement de test prévisible
- Fournit un retour d'information rapide pendant le développement

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

### Test des planificateurs avec des clients modèles fictifs

Isolez la logique du planificateur en simulant le client du modèle :

```go
type MockModelClient struct {
    responses []*model.Message
    callCount int
}

func (m *MockModelClient) Generate(ctx context.Context, req *model.Request) (*model.Response, error) {
    if m.callCount >= len(m.responses) {
        return nil, fmt.Errorf("no more mock responses")
    }
    resp := &model.Response{
        Message: m.responses[m.callCount],
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
        responses: []*model.Message{
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
        Tools: []tools.ToolSpec{/* ... */},
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

Tester les exécuteurs d'outils indépendamment de l'agent :

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
    
    // Assert on result
    assert.Nil(t, result.Error)
    assert.NotNil(t, result.Result)
    
    // Unmarshal and verify typed result
    searchResult, ok := result.Result.(*specs.SearchResult)
    require.True(t, ok)
    assert.Len(t, searchResult.Documents, 3)
}
```

### Validation de l'outil de test et conseils de réessai

Vérifiez que les outils renvoient des erreurs et des conseils appropriés en cas d'entrée non valide :

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
    
    // Should return ToolError with RetryHint
    assert.NotNil(t, result.Error)
    assert.NotNil(t, result.RetryHint)
    assert.Equal(t, planner.RetryReasonMissingFields, result.RetryHint.Reason)
    assert.Contains(t, result.RetryHint.MissingFields, "query")
}
```

### Test de la composition de l'agent

Tester les scénarios de l'agent en tant qu'outil :

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

#### "registration closed" Erreur

**Symptôme:**
```
error: registration closed: cannot register agent after runtime start
```

**Cause:** Tentative d'enregistrement d'un agent après que le runtime a commencé à traiter les exécutions.

**Solution:** Enregistrez tous les agents avant de commencer les exécutions :

```go
rt := runtime.New()

// ✓ Register all agents first
chat.RegisterChatAgent(ctx, rt, chatConfig)
planner.RegisterPlannerAgent(ctx, rt, plannerConfig)

// ✓ Then start runs
client := chat.NewClient(rt)
out, err := client.Run(ctx, messages, opts...)
```

#### Erreur "ID de session manquant

**Symptôme:**
```
error: missing session ID: session ID is required for run
```

**Cause:** Démarrage d'une exécution sans fournir d'identifiant de session.

**Solution:** Fournissez toujours un identifiant de session en tant qu'argument de position requis :

```go
// ✗ Wrong - no session ID
out, err := client.Run(ctx, "", messages)

// ✓ Correct - session ID provided
out, err := client.Run(ctx, "session-123", messages)
```

**Astuce:** Pour les tests, utilisez un identifiant de session fixe. Pour la production, générez des identifiants de session uniques par conversation.

#### Erreurs de violation de politique

**Symptôme:**
```
error: policy violation: max tool calls exceeded (10/10)
```

**Cause:** L'agent a dépassé la limite configurée `MaxToolCalls`.

**Solutions:**

1. **Augmentez la limite** si le cas d'utilisation nécessite légitimement plus d'appels à l'outil :
```go
RunPolicy(func() {
    DefaultCaps(MaxToolCalls(20)) // Increase from default
})
```

2. **Améliorer l'efficacité du planificateur** pour utiliser moins d'appels d'outils :
   - Effectuer des opérations par lots dans la mesure du possible
   - Utiliser des appels d'outils plus spécifiques
   - Améliorer l'ingénierie rapide

3. **Vérifier les boucles infinies** dans la logique du planificateur qui appelle de façon répétée le même outil.

**Symptôme:**
```
error: policy violation: max consecutive failed tool calls exceeded (3/3)
```

**Cause:** Plusieurs appels d'outils consécutifs ont échoué.

**Solutions:**

1. **Corriger les erreurs sous-jacentes de l'outil** - vérifier les journaux de l'exécuteur de l'outil
2. **Améliorer les conseils de relance** pour que le planificateur puisse s'auto-corriger
3. **Augmenter la limite** si des défaillances transitoires sont attendues :
```go
RunPolicy(func() {
    DefaultCaps(MaxConsecutiveFailedToolCalls(5))
})
```

**Symptôme:**
```
error: policy violation: time budget exceeded (2m0s)
```

**Cause:** L'exécution de l'agent a dépassé la `TimeBudget` configurée.

**Solutions:**

1. **Augmentez le budget** pour les opérations de longue durée :
```go
RunPolicy(func() {
    TimeBudget("10m")
})
```

2. **Utilisez `Timing` pour un contrôle plus fin** :
```go
RunPolicy(func() {
    Timing(func() {
        Budget("10m")  // Overall budget
        Plan("1m")     // Per-plan timeout
        Tools("2m")    // Per-tool timeout
    })
})
```

3. **Optimiser l'exécution de l'outil** pour qu'elle soit plus rapide.

#### Erreur "outil inconnu

**Symptôme:**
```
error: unknown tool: orchestrator.helpers.search
```

**Cause:** Le planificateur a demandé un outil qui n'est pas enregistré.

**Solutions:**

1. **Vérifier l'enregistrement de l'ensemble d'outils** - s'assurer que l'ensemble d'outils est enregistré auprès de l'agent :
```go
Agent("chat", "Chat agent", func() {
    Use(HelpersToolset) // Make sure this is included
})
```

2. **Vérifier l'orthographe des noms d'outils** - les noms d'outils sont sensibles à la casse et utilisent des noms qualifiés.

3. **Regénérer le code** après les modifications du DSL :
```bash
goa gen example.com/project/design
```

#### Erreur "invalid payload" (charge utile non valide)

**Symptôme:**
```
error: invalid payload: json: cannot unmarshal string into Go struct field SearchPayload.limit of type int
```

**Cause:** Le LLM a fourni une charge utile qui ne correspond pas au schéma de l'outil.

**Solutions:**

1. **Retourner un RetryHint** de l'exécuteur pour que le planificateur puisse s'auto-corriger :
```go
if err != nil {
    return &planner.ToolResult{
        Error: planner.NewToolError("invalid payload"),
        RetryHint: &planner.RetryHint{
            Reason:       planner.RetryReasonInvalidArguments,
            Tool:         call.Name,
            ExampleInput: map[string]any{"query": "example", "limit": 10},
            Message:      "limit must be an integer",
        },
    }, nil
}
```

2. **Améliorer les descriptions des outils** pour clarifier les types attendus.

3. **Ajouter des exemples** au DSL :
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

#### S'abonner aux événements pour le débogage

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

#### Inspecter les spécifications des outils au moment de l'exécution

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

- **[Référence DSL](./dsl-reference/)** - Référence complète des fonctions DSL
- **[Runtime](./runtime/)** - Comprendre l'architecture du runtime
- **[Production](./production/)** - Déploiement avec Temporal et streaming UI
