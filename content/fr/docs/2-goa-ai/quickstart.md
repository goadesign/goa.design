---
title: "Démarrage rapide"
linkTitle: "Démarrage rapide"
weight: 1
description: "Build a working AI agent in 10 minutes. Start with a stub, add streaming, validation, then connect a real LLM."
llm_optimized: true
aliases:
---

Ce guide vous fait passer d'un module vide à un agent Goa-AI généré et exécutable.
L'exemple généré utilise le moteur en mémoire, vous n'avez donc pas besoin de Temporal,
MongoDB, Redis ou une clé modèle API pour la première exécution.

Vous construirez :

1. Une conception Goa avec un agent, un outil typé et une complétion directe typée.
2. Agent généré, ensemble d'outils, code de complétion et de câblage d'exécution.
3. Un exemple d'échafaudage exécutable avec un planificateur de stub que vous pouvez remplacer par un planificateur basé sur un modèle.
4. Les premiers hooks de production : sessions explicites, exécuteurs d'outils générés, streaming et enregistrement de modèle.

---

## 1. Créez un module

```bash
go install goa.design/goa/v3/cmd/goa@latest

mkdir quickstart && cd quickstart
go mod init example.com/quickstart
go get goa.design/goa/v3@latest goa.design/goa-ai@latest
mkdir design
```

Goa-AI cible actuellement le Go moderne. Utilisez la version Go déclarée par le
Module `goa.design/goa-ai` ou plus récent.

---

## 2. Définir l'agent

Créez `design/design.go` :

```go
package design

import (
	. "goa.design/goa/v3/dsl"
	. "goa.design/goa-ai/dsl"
)

var _ = API("orchestrator", func() {})

var AskPayload = Type("AskPayload", func() {
	Attribute("question", String, "User question to answer")
	Example(map[string]any{"question": "What is the capital of Japan?"})
	Required("question")
})

var Answer = Type("Answer", func() {
	Attribute("text", String, "Answer text")
	Example(map[string]any{"text": "Tokyo is the capital of Japan."})
	Required("text")
})

var TaskDraft = Type("TaskDraft", func() {
	Attribute("name", String, "Task name")
	Attribute("goal", String, "Outcome-style goal")
	Required("name", "goal")
})

var _ = Service("orchestrator", func() {
	Completion("draft_task", "Produce a task draft directly", func() {
		Return(TaskDraft)
	})

	Agent("chat", "Friendly Q&A assistant", func() {
		Use("helpers", func() {
			Tool("answer", "Answer a simple question", func() {
				Args(AskPayload)
				Return(Answer)
			})
		})
		RunPolicy(func() {
			DefaultCaps(MaxToolCalls(2), MaxConsecutiveFailedToolCalls(1))
			TimeBudget("15s")
		})
	})
})
```

C'est la source de la vérité. Les outils et les complétions réutilisent les types Goa normaux,
descriptions, exemples et validations. Les schémas orientés modèle, les codecs typés,
et les contrats d'exécution sont générés à partir de cette conception.

---

## 3. Générer du code et un exemple

```bash
goa gen example.com/quickstart/design
goa example example.com/quickstart/design
go run ./cmd/orchestrator
```

Forme attendue :

```text
RunID: orchestrator-chat-...
Assistant: Hello from example planner.
Completion draft_task: ...
Completion stream draft_task: ...
```

`goa gen` crée des contrats générés. `goa example` crée des applications appartenant
échafaudage :

- `gen/` : code généré. Ne modifiez pas ce répertoire à la main.
- `cmd/orchestrator/main.go` : exemple de point d’entrée exécutable.
- `internal/agents/bootstrap/bootstrap.go` : construction du runtime et enregistrement des agents.
- `internal/agents/chat/planner/planner.go` : planificateur de stub à remplacer.
- `gen/orchestrator/completions/` : assistants de saisie semi-automatique typés.

Régénérer après les modifications de DSL. Réexécutez `goa example` lorsque vous souhaitez un échafaudage
mises à jour, puis conservez les modifications de l'application dans `cmd/` et `internal/`.

---

## 4. Comprendre la boucle d'exécution

**La boucle planifier/exécuter :**

1. `PlanStart` reçoit les messages utilisateur initiaux.
2. Le planificateur renvoie un `FinalResponse`, des appels d'outils ou une demande d'attente.
3. Le runtime valide et exécute les appels d'outils admis à l'aide des spécifications générées et des exécuteurs enregistrés.
4. `PlanResume` reçoit les sorties d'outils visibles par le planificateur.
5. La boucle se répète jusqu'à ce que le planificateur renvoie une réponse finale, un résultat d'outil de terminal ou que le moteur d'exécution applique des plafonds/budgets de temps.

L'exemple généré commence par un planificateur de stub afin que ce flux soit visible avant
vous connectez un modèle. Un vrai planificateur suit le même contrat ; ça délègue simplement
la décision à un client modèle.

---

## 5. Appelez l'agent depuis le code

Les packages d'agent générés exposent les clients typés. Les exécutions de session nécessitent un
séance explicite ; Les exécutions ponctuelles sont intentionnellement sans session.

```go
rt, cleanup, err := bootstrap.New(ctx)
if err != nil {
	log.Fatal(err)
}
defer cleanup()

if _, err := rt.CreateSession(ctx, "session-1"); err != nil {
	log.Fatal(err)
}

client := chat.NewClient(rt)
out, err := client.Run(ctx, "session-1", []*model.Message{{
	Role:  model.ConversationRoleUser,
	Parts: []model.Part{model.TextPart{Text: "Hello"}},
}})
if err != nil {
	log.Fatal(err)
}
fmt.Println(out.RunID)

out, err = client.OneShotRun(ctx, []*model.Message{{
	Role:  model.ConversationRoleUser,
	Parts: []model.Part{model.TextPart{Text: "Summarize this document"}},
}})
```

Utilisez `Run` ou `Start` pour le travail conversationnel/sessionnel. Utilisez `OneShotRun` ou
`StartOneShot` pour les tâches de demande/réponse qui doivent être observables par `RunID`
mais ne doit pas appartenir à une session.

---

## 6. Implémenter un exécuteur d'outils

Les packages d'agents générés incluent un assistant `RegisterUsedToolsets` pour les
ensembles d'outils. Les exécuteurs reçoivent des métadonnées d'exécution explicites et renvoient un fichier appartenant au runtime
résultat de l'exécution :

```go
type HelpersExecutor struct{}

func (e *HelpersExecutor) Execute(
	ctx context.Context,
	meta *runtime.ToolCallMeta,
	call *planner.ToolRequest,
) (*runtime.ToolExecutionResult, error) {
	switch call.Name {
	case helpers.Answer:
		args, err := helpers.UnmarshalAnswerPayload(call.Payload)
		if err != nil {
			return runtime.Executed(&planner.ToolResult{
				Name:  call.Name,
				Error: planner.NewToolError("invalid answer payload"),
			}), nil
		}
		return runtime.Executed(&planner.ToolResult{
			Name:   call.Name,
			Result: &helpers.AnswerResult{Text: "Answer: " + args.Question},
		}), nil
	default:
		return runtime.Executed(&planner.ToolResult{
			Name:  call.Name,
			Error: planner.NewToolError("unknown tool"),
		}), nil
	}
}

if err := chat.RegisterUsedToolsets(ctx, rt, chat.WithHelpersExecutor(&HelpersExecutor{})); err != nil {
	log.Fatal(err)
}
```

Le runtime valide la charge utile JSON avec les codecs générés avant l'exécution,
encode les résultats réussis avec les codecs de résultat générés, enregistre l'exécution canonique
événements et transmet les sorties visibles par le planificateur à `PlanResume`.

---

## 7. Connectez un modèle

Enregistrez les clients du fournisseur auprès du runtime, puis accédez-y à partir des planificateurs par ID.
Pour les planificateurs de streaming, préférez `PlannerModelClient` ; il possède un assistant/réfléchissant
et l'émission d'événements d'utilisation.

```go
modelClient, err := rt.NewOpenAIModelClient(runtime.OpenAIConfig{
	APIKey:       os.Getenv("OPENAI_API_KEY"),
	DefaultModel: "gpt-5-mini",
	HighModel:    "gpt-5",
	SmallModel:   "gpt-5-nano",
})
if err != nil {
	log.Fatal(err)
}
if err := rt.RegisterModel("default", modelClient); err != nil {
	log.Fatal(err)
}
```

Croquis du planificateur :

```go
func (p *Planner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
	mc, ok := in.Agent.PlannerModelClient("default")
	if !ok {
		return nil, errors.New("model client default is not registered")
	}

	summary, err := mc.Stream(ctx, &model.Request{
		Messages: in.Messages,
		Tools:    in.Agent.AdvertisedToolDefinitions(),
		Stream:   true,
	})
	if err != nil {
		return nil, err
	}
	if len(summary.ToolCalls) > 0 {
		return &planner.PlanResult{ToolCalls: summary.ToolCalls}, nil
	}
	return &planner.PlanResult{
		FinalResponse: &planner.FinalResponse{
			Message: &model.Message{
				Role:  model.ConversationRoleAssistant,
				Parts: []model.Part{model.TextPart{Text: summary.Text}},
			},
		},
		Streamed: true,
	}, nil
}
```

Utilisez `in.Agent.ModelClient("default")` lorsque vous avez besoin d'un contrôle de flux brut et d'une association
avec `planner.ConsumeStream`. Choisissez un propriétaire de flux par tour de planificateur.

---

## 8. Ajouter du streaming

Goa-AI émet des événements de flux typés pour le texte de l'assistant, les démarrages/fins d'outils, le flux de travail
statut, attentes, utilisation et liens d'exécution enfants. Câblez n’importe quel `stream.Sink` :

```go
type ConsoleSink struct{}

func (s *ConsoleSink) Send(ctx context.Context, event stream.Event) error {
	switch e := event.(type) {
	case stream.AssistantReply:
		fmt.Print(e.Data.Text)
	case stream.ToolStart:
		fmt.Printf("tool_start: %s\n", e.Data.ToolName)
	case stream.ToolEnd:
		fmt.Printf("tool_end: %s\n", e.Data.ToolName)
	case stream.Workflow:
		fmt.Printf("workflow: %s\n", e.Data.Phase)
	}
	return nil
}

func (s *ConsoleSink) Close(ctx context.Context) error { return nil }

rt := runtime.New(runtime.WithStream(&ConsoleSink{}))
```

Pour la production UIs, publiez sur Pulse et abonnez-vous au flux de session
(`session/<session_id>`). Fermez la connexion utilisateur lorsque vous observez
`run_stream_end` pour l'exécution active.

---

## 9. Utiliser les complétions directes typées

`Completion(...)` est destiné à la sortie structurée de l'assistant qui n'est pas un appel d'outil.
Les assistants générés demandent une sortie structurée imposée par le fournisseur et décodent via
codecs générés :

```go
resp, err := completions.CompleteDraftTask(ctx, modelClient, &model.Request{
	Messages: []*model.Message{{
		Role:  model.ConversationRoleUser,
		Parts: []model.Part{model.TextPart{Text: "Draft a task for launch readiness."}},
	}},
})
if err != nil {
	log.Fatal(err)
}
fmt.Println(resp.Value.Name)
```

Les noms de complétion font partie du contrat de sortie structurée : 1-64 ASCII
caractères, lettres/chiffres/`_`/`-`, commençant par une lettre ou un chiffre. Diffusion en continu
les aides à l'achèvement exposent les morceaux d'aperçu `completion_delta` et décodent uniquement les
morceau canonique final `completion`.

---

## 10. Composer des agents

Les agents peuvent exporter des ensembles d'outils que d'autres agents utilisent. Les agents imbriqués sont exécutés en tant qu'enfants
workflows avec leur propre `RunID`, et les flux émettent `child_run_linked` afin que UIs puisse
rendre les arbres d'exécution.

```go
Agent("researcher", "Research specialist", func() {
	Export("research", func() {
		Tool("deep_search", "Perform deep research", func() {
			Args(ResearchRequest)
			Return(ResearchReport)
		})
	})
})

Agent("coordinator", "Delegates specialist work", func() {
	Use(AgentToolset("orchestrator", "researcher", "research"))
})
```

Chaque agent conserve son propre planificateur, ses propres outils, sa politique et son journal d'exécution. Le parent voit un
résultat d'outil normal avec un `RunLink` à l'exécution enfant.

---

## Ce que vous avez construit

- Un agent axé sur la conception avec des outils validés par les schémas.
- Codecs de charge utile/résultat générés et schémas JSON orientés modèle.
- Un contrat dactylographié en exécution directe.
- Un client d'exécution généré avec une exécution par session et en une seule fois.
- Un chemin vers la planification basée sur un modèle, le streaming UIs et la composition des agents.

Pour la production, ajoutez le moteur Temporal pour la durabilité, les magasins soutenus par Mongo pour
journaux de mémoire/session/exécution, Pulse pour le streaming distribué et middleware de modèle
pour les limites de tarifs des fournisseurs. La conception Goa reste la source de vérité.

---

## Prochaines étapes

| Guide | Ce que vous apprendrez |
|-------|-------------------|
| [Référence DSL](dsl-reference/) | Toutes les fonctions DSL : politiques, MCP, registres |
| [Exécution](runtime/) | Boucle de planification/exécution, moteurs, magasins de mémoire |
| [Jeux d'outils](toolsets/) | Outils, transformations, exécuteurs basés sur des services |
| [Composition d'agent](agent-composition/) | Analyse approfondie des modèles d'agent en tant qu'outil |
| [Production](production/) | Configuration Temporal, streaming vers UIs, limitation de débit |
