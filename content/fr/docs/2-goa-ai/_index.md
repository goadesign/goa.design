---
title: "Goa-AI : des agents à partir d’une conception"
linkTitle: "Goa-AI"
weight: 2
description: "Concevez en Go des outils typés, des serveurs MCP et des contrats d’agents IA. Générez schémas et codecs, puis exécutez localement en mémoire ou durablement avec Temporal."
llm_optimized: true
---

Goa-AI apporte le compilateur de contrats de Goa aux agents IA, aux serveurs MCP et aux registres d’outils hébergés. Vous définissez les arguments d’outils, les types de retour, les modèles de prompts et les politiques d’exécution en Go ; `goa gen` produit les schémas JSON, les codecs de validation en bordure, les liaisons aux services et **`AGENTS_QUICKSTART.md`**. Votre code conserve le planificateur et les gestionnaires métier.

- **Démarrez en local (moteur en mémoire, aucune infrastructure externe) :** **[Créer votre premier agent](quickstart/)** (Go 1.27+, fonctionne de manière autonome sans service Goa distinct)
- **Besoin uniquement d’un serveur MCP ?** Passez directement à l’**[intégration MCP](mcp-integration/)**
- **Vous utilisez un agent de code ?** Associez le fichier généré **`AGENTS_QUICKSTART.md`** au **[processus avec un agent de code](../ai-development/)**

## D’un contrat à un agent opérationnel

### 1. Déclarer le service, l’outil lié et la politique (`design/catalog.go`)

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("catalog", func() {})

var LookupPayload = Type("LookupPayload", func() {
    Field(1, "tenant_id", String, "Caller tenant ID")
    Field(2, "sku", String, "Product SKU", func() {
        Pattern("^[A-Z0-9-]+$")
        Example("BOOK-1")
    })
    Required("tenant_id", "sku")
})

var Product = Type("Product", func() {
    Field(1, "sku", String, "Product SKU", func() {
        Example("BOOK-1")
    })
    Field(2, "name", String, "Display name", func() {
        Example("The Go Book")
    })
    Field(3, "price_cents", Int, "Price in cents", func() {
        Example(3800)
    })
    Required("sku", "name", "price_cents")
})

var _ = Service("catalog", func() {
    Method("lookup", func() {
        Payload(LookupPayload)
        Result(Product)
    })

    Agent("assistant", "Answer product questions", func() {
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(6))
        })
        Use("catalog", func() {
            // Required tenant_id is hidden from the LLM JSON schema
            Tool("lookup", "Find a product by SKU", func() {
                BindTo("lookup")
                Inject("tenant_id")
            })
        })
    })
})
```

### 2. Générer schémas, liaisons et `AGENTS_QUICKSTART.md`

```bash
go mod init example.com/catalog && go get goa.design/goa-ai@v0.90.0
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy && go run ./cmd/catalog
```

Exécuter `goa` via `go run` utilise la version exacte du générateur fixée dans `go.mod` (sans Node.js ni clés API ; `goa example` génère un planificateur d’essai exécutable en local). `Inject("tenant_id")` retire `tenant_id` du fichier `gen/catalog/agents/assistant/specs/tool_schemas.json` exposé au modèle tout en conservant la règle d’expression régulière sur `sku` :

```json
{
  "id": "catalog.lookup",
  "payload": {
    "schema": {
      "properties": {
        "sku": { "type": "string", "pattern": "^[A-Z0-9-]+$" }
      },
      "required": ["sku"]
    }
  },
  "hidden_fields": ["tenant_id"]
}
```

### 3. Connecter le planificateur et exécuter (en mémoire ou avec Temporal)

`goa example example.com/catalog/design` prépare un planificateur simulé pour exécuter et tester l’agent localement sans clé API. Pour connecter un modèle réel (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, Bedrock ou Vertex AI), implémentez `planner.Planner` (`PlanStart` et `PlanResume`) :

```go
type CatalogPlanner struct{}

func (p *CatalogPlanner) PlanStart(
    ctx context.Context, in *planner.PlanInput,
) (*planner.PlanResult, error) {
    return p.next(ctx, in.Agent, in.Messages)
}

func (p *CatalogPlanner) PlanResume(
    ctx context.Context, in *planner.PlanResumeInput,
) (*planner.PlanResult, error) {
    return p.next(ctx, in.Agent, in.Messages)
}

func (p *CatalogPlanner) next(
    ctx context.Context,
    agent planner.PlannerContext,
    msgs []*model.Message,
) (*planner.PlanResult, error) {
    mc, ok := agent.PlannerModelClient("default")
    if !ok {
        return nil, errors.New(`model "default" is not registered`)
    }
    res, err := mc.Stream(ctx, &model.Request{
        Messages: msgs,
        Tools:    agent.AdvertisedToolDefinitions(),
        Stream:   true,
    })
    if err != nil {
        return nil, err
    }
    if len(res.ToolCalls) > 0 {
        return &planner.PlanResult{ToolCalls: res.ToolCalls}, nil
    }
    return &planner.PlanResult{FinalResponse: res.FinalResponse()}, nil
}
```

Enregistrez l’agent et l’exécuteur du service lié (`inmem.New()` en local ; `runtime.WithEngine(temporalEng)` en production), puis fournissez `tenant_id` via `runtime.WithLabels` :

```go
rt := runtime.New(inmem.New())
modelClient, err := rt.NewOpenAIModelClient(runtime.OpenAIConfig{
    APIKey: os.Getenv("OPENAI_API_KEY"), DefaultModel: "gpt-5-mini",
})
if err != nil {
    return err
}
if err := rt.RegisterModel("default", modelClient); err != nil {
    return err
}
if err := assistant.RegisterAssistantAgent(ctx, rt,
    assistant.AssistantAgentConfig{Planner: &CatalogPlanner{}},
); err != nil {
    return err
}
// catalogClient is catalog.NewClient(...) wrapping your Goa endpoints
exec := assistantcatalog.NewAssistantCatalogExec(
    assistantcatalog.WithClient(catalogClient),
)
if err := assistant.RegisterUsedToolsets(
    ctx, rt, assistant.WithCatalogExecutor(exec),
); err != nil {
    return err
}

client := assistant.NewClient(rt)
msg := &model.Message{
    Role: model.ConversationRoleUser,
    Parts: []model.Part{
        model.TextPart{Text: "What does BOOK-1 cost?"},
    },
}
out, err := client.Run(ctx, "session-1", []*model.Message{msg},
    runtime.WithLabels(map[string]string{"tenant_id": "acme"}),
)
```

```text
tool_start: catalog.lookup {"sku":"BOOK-1"}  # tenant_id="acme" injected
tool_end:   {"sku":"BOOK-1","name":"The Go Book","price_cents":3800}
assistant:  BOOK-1 ("The Go Book") costs $38.00.
```

## Capacités principales

### Contrats d’outils typés et bornes {#design-first-agents}

Définissez les entrées et sorties d’outils avec les validations Goa, `Inject("tenant_id")` pour les champs de contexte liés côté serveur et masqués au modèle, `BoundedResult` pour les réponses paginées par curseur et `Confirmation` pour exiger une approbation humaine avant les actions sensibles. Voir [Ensembles d’outils](toolsets/) et [Valeurs par défaut des charges utiles d’outils](tool-payload-defaults/).

### Complétions directes structurées {#typed-direct-completions}

Déclarez `Completion(...)` lorsqu’un service attend d’un modèle une réponse typée et validée par schéma sans boucle d’outils multi-tours. Les fonctions générées, unaires et en streaming, décodent et valident la sortie. Voir la [Référence DSL](dsl-reference/) et le [Runtime](runtime/).

### Serveurs MCP et registres d’outils hébergés {#tool-registries}

- **Serveurs MCP (`MCP(...)`)** : Exposez les méthodes d’un service Goa sous forme d’outils, de ressources et de modèles de prompts MCP via HTTP sans exécuter de runtime d’agents. Voir [Intégration MCP](mcp-integration/).
- **Registre et recherche d’outils** : Exécutez la passerelle de registre incluse, adossée à Redis et [Pulse](../3-ecosystem/pulse/), afin que les agents découvrent dynamiquement les schémas entre services au lieu d’injecter chaque schéma d’outil dans chaque prompt. Voir [Registre](registry/) et [Recherche d’outils](tool-search/).

### Composition d’agents et arbres d’exécution {#run-trees-composition}

Exportez un agent comme outil consommé par un agent parent (`Export` / `Use`). Les exécutions enfants conservent leurs propres identifiants d’exécution, budgets et spans de télémétrie reliés au parent. Voir [Composition d’agents](agent-composition/).

### Événements typés en streaming {#structured-streaming}

Diffusez des événements typés du runtime (`AssistantReply`, `ToolStart`, `ToolEnd`, `AwaitConfirmation`, `RunCompleted`) vers vos interfaces web via SSE ou WebSockets. Voir [Streaming en production](production/#streaming-ui).

### Du développement local à la durabilité Temporal {#temporal-durability}

Développez et testez avec le moteur en mémoire sans dépendance, puis configurez le moteur Temporal en production pour la reprise après panne, les pauses `Confirmation` durables et les nouvelles tentatives d’activités (associez des clés d’idempotence aux effets externes). Voir [Production](production/).

### Suites d’évaluation {#generated-evaluations}

Déclarez des suites de scénarios aux côtés de votre agent et exécutez des assertions déterministes sur les trajectoires d’outils à l’aide de doublures de modèles scénarisées ou de juges sémantiques calibrés. Voir [Évaluations](evaluations/) et [Tests](testing/).

### Fournisseurs de modèles et état de session {#model-providers}

Les adaptateurs intégrés couvrent **OpenAI**, **Anthropic**, **AWS Bedrock** et **Google Vertex AI**. Votre application fournit l’historique des sessions, l’autorisation et la mémoire métier. Voir [Mémoire et sessions](memory-sessions/) et [Exploitation des fournisseurs](provider-operations/).

## Architecture

{{< figure src="/images/goa-ai-architecture.svg" alt="Architecture Goa-AI : le DSL de conception compile des packages typés, exécutés par le Runtime sur les moteurs en mémoire ou Temporal et les adaptateurs de modèles et d’outils" >}}
