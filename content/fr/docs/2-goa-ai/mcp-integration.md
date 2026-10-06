---
nav_group: guides
title: Intégration MCP
weight: 50
description: "Créez des serveurs MCP avec outils, ressources et prompts, et utilisez des outils MCP externes."
llm_optimized: true
aliases:
---

Goa-AI permet de **créer des serveurs MCP** et de **consommer des outils MCP externes**. Ajoutez des déclarations MCP à un service Goa pour exposer ses méthodes comme outils, publier des ressources et proposer des modèles de prompts. Le générateur produit le protocole JSON-RPC et les adaptateurs de service. Héberger un serveur MCP ne nécessite pas d’exécuter un agent Goa-AI.

Les callers HTTP et stdio envoient des requêtes autonomes avec les métadonnées du protocole. Il n’y a ni négociation d’initialisation ni session de protocole. L’interface `Caller` invoque les outils ; `Listen` reçoit les notifications de changement. Les clients JSON-RPC générés par Goa exposent aussi les opérations de ressources, prompts, découverte et complétion déclarées par le service.

## Aperçu

L'intégration MCP suit ce flux de travail :

1. **Conception de services** : Déclarez le serveur MCP via MCP DSL de Goa
2. **Conception d'agent** : référencez cette suite via un ensemble d'outils déclaré avec `FromMCP(...)` ou `FromExternalMCP(...)`.
3. **Génération de code** : produit le serveur MCP JSON-RPC (lorsqu'il est soutenu par Goa), ainsi que des aides à l'enregistrement d'exécution et des spécifications/codecs appartenant à l'ensemble d'outils pour la suite.
4. **Câblage d'exécution** : instanciez un `mcpruntime.Caller` HTTP ou stdio.
   L'appelant HTTP accepte une réponse JSON ou un flux d'événements HTTP. Les
   fonctions générées enregistrent l'ensemble d'outils et adaptent les erreurs
   JSON-RPC en valeurs `planner.ToolFailure`.
5. **Exécution du planificateur** : les planificateurs construisent les appels avec les descripteurs typés générés ; le runtime transmet le JSON canonique à l'appelant MCP, enregistre les résultats et expose une télémétrie structurée

---

## Déclaration des jeux d'outils MCP

### Dans la conception de services

Tout d’abord, déclarez le serveur MCP dans la conception de votre service Goa :

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })
    
    StaticPrompt("find-docs", "Help a user find documentation",
        "user", "Find relevant documentation for the user's question.")

    Method("readme", func() {
        Result(String)
        Resource("readme", "file:///docs/README.md", "text/markdown")
    })

    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
        })
        Tool("search", "Search documents by query")
    })
})
```

### Dans la conception d'agents

Référencez ensuite la suite MCP dans votre agent :

```go
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Serveurs externes MCP avec schémas en ligne

Pour les serveurs MCP externes (non basés sur Goa), déclarez les outils avec des schémas en ligne :

```go
var RemoteSearch = Toolset("remote-search", FromExternalMCP("remote", "search"), func() {
    Tool("web_search", "Search the web", func() {
        Args(func() { Attribute("query", String) })
        Return(func() { Attribute("results", ArrayOf(String)) })
    })
})

Agent("helper", "", func() {
    Use(RemoteSearch)
})
```

---

## Valeurs d’URL et attributs mappés

Utilisez la notation Goa `Param("payload_field:url_name")` pour distinguer un champ de la charge utile d’un paramètre d’URL :

```go
JSONRPC(func() {
    POST("/organizations/{organization}/mcp")
    Param("organization_id:organization")
})
```

L’URL fournit `organization_id`. Les arguments des outils et des invites, leurs schémas, exemples et codecs générés excluent ce champ. Un champ de domaine indépendant nommé `organization` reste un argument. Chaque méthode conserve son type, son nom de champ Go et sa validation. Une valeur d’URL invalide est rejetée avant l’exécution du point de terminaison configuré. Les chemins complets de l’API et du service parent sont conservés.

Les clients de protocole générés transportent ces valeurs hors des paramètres JSON-RPC. Le `NewCaller` généré les reçoit dans l’ordre du chemin après la politique de nouvelle tentative ; pour ce chemin, passez `"blue"` en dernier. Cet appelant garde la même adresse pour chaque appel. `NewHTTPCaller` reçoit l’URL complète, telle que `https://example.com/organizations/blue/mcp`. Régénérez ensemble les clients, les serveurs et les contrats d’agents.

---

## Héberger le serveur généré

Passez les points de terminaison Goa originaux déjà configurés à `NewMCPAdapter`, puis construisez le serveur HTTP généré. Passez les origines de navigateur autorisées comme derniers arguments chaîne de son constructeur `New`, par exemple `"https://app.example.com"`. Sans origines, les requêtes sans en-tête `Origin` sont acceptées et celles qui le contiennent sont rejetées.

Utilisez `Server.Use` pour installer le middleware HTTP avant les premières requêtes. `Mount(mux)` et les appels directs à `ServeHTTP` partagent les vérifications des origines, des méthodes HTTP, des en-têtes MCP et des métadonnées avant le middleware ou le service. La liste des origines est copiée à la construction. Remplacez `MountWithOrigins` par des arguments du constructeur et utilisez `ServeHTTP` à la place du champ interne `Handler`, qui est supprimé. Régénérez les serveurs et mettez à jour leurs appelants ensemble.

---

## Câblage d'exécution

Au moment de l'exécution, instanciez un appelant MCP et enregistrez l'ensemble d'outils :

```go
import (
    mcpruntime "goa.design/goa-ai/runtime/mcp"
    genchat "example.com/assistant/gen/orchestrator/agents/chat"
    genmcpexec "example.com/assistant/gen/orchestrator/agents/chat/assistant_mcp"
)

// Create an HTTP MCP caller.
caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
if err != nil {
    log.Fatal(err)
}

// Register the MCP toolset
if err := genchat.RegisterUsedToolsets(ctx, rt,
    genchat.WithAssistantMcpExecutor(genmcpexec.NewMCPExecutor(caller)),
); err != nil {
    log.Fatal(err)
}
```

---

## Types d'appelants MCP

Goa-AI prend en charge HTTP et stdio via le package `runtime/mcp`. Les deux
appelants implémentent l'interface `Caller` :

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
}
```

`CallRequest` contient le nom de l’outil, ses arguments JSON et une continuation facultative détenue par l’hôte. `CallResponse.Content` utilise `content.Blocks` de `runtime/content` : valeurs ordonnées de texte, image, audio, lien vers une ressource ou ressource incorporée. Le JSON structuré reste séparé dans `StructuredContent`. `InputRequired` laisse l’opération inachevée ; l’hôte fournit les entrées demandées avant de continuer.

### Appelant HTTP

Pour les serveurs MCP accessibles via HTTP JSON-RPC :

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
    Endpoint: "https://assistant.example.com/mcp",
    Client:   customHTTPClient,
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
```

Le constructeur valide l’endpoint et l’identité de l’application sans requête réseau. Chaque opération envoie du JSON-RPC par HTTP `POST` et accepte du JSON ou un flux d’événements. Sans `Client`, il utilise `http.DefaultClient` ; l’application définit les délais avec son contexte et son client HTTP.

### Appelant Stdio

Pour les serveurs MCP exécutés en tant que sous-processus communiquant via stdin/stdout :

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
    Args:    []string{"--config", "config.json"},
    Env:     []string{"MCP_DEBUG=1"}, // Ajouté à l'environnement actuel.
    Dir:     "/path/to/workdir",
    ClientInfo: mcpruntime.ClientInfo{
        Name:    "my-agent",
        Version: "1.0.0",
    },
})
if err != nil {
    return err
}
defer func() {
    if err := caller.Close(shutdownContext); err != nil {
        log.Print(err)
    }
}()
```

Le caller stdio démarre un sous-processus et associe les opérations concurrentes à leur identifiant de requête. Chaque requête porte ses métadonnées. Fermez le caller avec un contexte d’arrêt défini par l’application et traitez l’erreur retournée.

### Adaptateur CallerFunc

Pour les implémentations ou les tests d'appelants personnalisés :

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

// Adapt a function to the Caller interface
caller := mcpruntime.CallerFunc(func(ctx context.Context, req mcpruntime.CallRequest) (mcpruntime.CallResponse, error) {
    content, structured, err := myCustomMCPCall(ctx, req.Tool, req.Payload)
    if err != nil {
        return mcpruntime.CallResponse{}, err
    }
    return mcpruntime.CallResponse{
        Content:           content,
        StructuredContent: structured,
    }, nil
})
```

### Appelant JSON-RPC généré par Goa

Pour les clients MCP générés par Goa qui encapsulent les méthodes de service :

```go
import genmcpclient "example.com/assistant/gen/jsonrpc/mcp_assistant/client"

caller, err := genmcpclient.NewCaller(client, mcpruntime.ClientInfo{
    Name: "my-agent", Version: "1.0.0",
}, mcpruntime.InputSupport{}, mcpruntime.HTTPRetryPolicy{})
if err != nil {
    return err
}
```

## Progression et changements de ressources

Utilisez `WithProgress(ctx, handler)` pour recevoir la progression avant le résultat final. Le service appelle `ReportProgress` ; le transport fournit les identifiants de corrélation. Une erreur du callback arrête cette opération et doit être traitée.

```go
err := caller.Listen(ctx, mcpruntime.SubscriptionFilter{
    ResourceSubscriptions: []string{"file:///docs/README.md"},
}, func(ctx context.Context, event mcpruntime.SubscriptionEvent) error {
    return handleResourceChange(ctx, event)
})
if err != nil {
    return err
}
```

Utilisez `Listen` pour recevoir une confirmation puis les changements acceptés. Vérifiez le filtre confirmé : les catégories non prises en charge peuvent être omises. L’application implémente `handleResourceChange`, recharge les données concernées et respecte l’annulation. Une perte de connexion produit une erreur ; le caller ne se reconnecte pas automatiquement.

Pour un client JSON-RPC généré, utilisez `WithSubscriptionEvents(ctx, handler)` puis son endpoint typé `SubscriptionsListen`. L’endpoint retourne le résultat final et le gestionnaire reçoit les événements validés. Sans handler, l’appel échoue avant toute requête réseau.

### Déclarer une source de souscriptions aux ressources

Un service MCP HTTP avec des ressources peut marquer une méthode de streaming serveur avec `ResourceSubscription()`. L’entrée facultative `resources` contient des URI. L’union obligatoire `change` contient `acknowledged` avec un tableau facultatif `resources`, ou `updated` avec un `uri` obligatoire. Déclarez `Format(FormatURI)` pour chaque URI. La source autorise et confirme un sous-ensemble, puis envoie les changements jusqu’à son retour ou l’annulation.

Seule une source de ressources liée annonce les souscriptions. La source possède l’autorisation, la détection des changements et la sélection des sous-ressources associées. Le générateur conserve l’endpoint Goa configuré, avec ses identifiants d’authentification, scopes, intercepteurs et middleware. Le transport partagé possède l’ordre et les identifiants de requête. Les catalogues fixes n’émettent pas de changements de catalogue.

### Ressources, prompts et contenu enrichi

`ResourceTemplate` lie un URI paramétré à une méthode de lecture typée. `Prompt` lie une méthode retournant des messages. `ResourceCompletion` et `PromptCompletion` lient des suggestions d’arguments typées. `ToolContent` sélectionne un champ de contenu enrichi à côté du résultat structuré. Ces contrats suivent le même processus de conception et de génération Goa que les méthodes ordinaires.

### Réessayer une réponse d’outil interrompue

HTTP effectue un seul essai par défaut. L’hôte peut configurer `HTTPRetryPolicy` pour un endpoint de confiance. Une réponse interrompue est répétée uniquement si l’outil déclare un comportement en lecture seule ou idempotent et que la politique fait confiance à ces déclarations. Le nouvel essai possède un autre identifiant et peut exécuter l’outil à nouveau. Les erreurs, réponses invalides, erreurs de callback et interruptions de souscriptions n’autorisent pas de nouvel essai.

---

## Flux d'exécution des outils

1. Le planificateur renvoie des appels construits avec les descripteurs MCP générés ou transmet des appels de modèle validés avec `planner.ToolRequestFromModelCall`
2. Le runtime valide le résultat complet du planificateur et attribue les identifiants d'exécution, ce qui produit des valeurs `runtime.ToolCall`
3. Le runtime détecte l'enregistrement de l'ensemble d'outils MCP
4. Il transmet la charge utile JSON canonique de l'appel du runtime à l'appelant MCP
5. L'appelant MCP utilise HTTP ou stdio et gère le protocole JSON-RPC. Une
   réponse HTTP peut être du JSON ou un flux d'événements
6. Décode le résultat à l'aide du codec généré
7. Renvoie `ToolResult` au planificateur

---

## Gestion des erreurs

Les fonctions générées adaptent les erreurs JSON-RPC en valeurs
`planner.ToolFailure` :

- **Erreurs de validation** → échecs d'appel invalide accompagnés d'informations
  précises pour la correction
- **Erreurs réseau** → échecs d'indisponibilité ou de délai avec une action
  explicite de replanification ou de finalisation
- **Erreurs du serveur** → causes structurées conservées dans l'échec

Les ensembles d'outils MCP et natifs partagent ainsi le même contrat de
récupération appliqué par le runtime.

Les échecs renvoyés par un outil deviennent des `ToolFailure`. Un résultat final
invalide du planificateur devient un `OutputContractError` : il est refusé sans
nouvel appel au modèle et n'est pas présenté comme un échec d'outil.

---

## Exemple complet

### Conception

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

// MCP server service
var _ = Service("assistant", func() {
    Description("MCP server for assistant tools")
    
    MCP("assistant-mcp", "1.0.0")
    JSONRPC(func() {
        POST("/mcp")
    })
    
    Method("search", func() {
        Payload(func() {
            Attribute("query", String, "Search query")
            Required("query")
        })
        Result(func() {
            Attribute("results", ArrayOf(String), "Search results")
        })
        Tool("search", "Search documents by query")
    })
})

// Agent that uses MCP tools
var AssistantSuite = Toolset(FromMCP("assistant", "assistant-mcp"))

var _ = Service("orchestrator", func() {
    Agent("chat", "Conversational runner", func() {
        Use(AssistantSuite)
        RunPolicy(func() {
            DefaultCaps(MaxToolCalls(8))
            TimeBudget("2m")
        })
    })
})
```

### Durée d'exécution

Passez l’exécuteur généré à `RegisterUsedToolsets` avant d’enregistrer l’agent. L’exemple reçoit un runtime déjà construit et votre planificateur.

```go
package main

import (
    "context"

    genchat "example.com/assistant/gen/orchestrator/agents/chat"
    genmcpexec "example.com/assistant/gen/orchestrator/agents/chat/assistant_mcp"
    "goa.design/goa-ai/runtime/agent/planner"
    "goa.design/goa-ai/runtime/agent/runtime"
    mcpruntime "goa.design/goa-ai/runtime/mcp"
)

func registerChat(ctx context.Context, rt *runtime.Runtime, p planner.Planner) error {
    caller, err := mcpruntime.NewHTTPCaller(mcpruntime.HTTPOptions{
        Endpoint: "https://assistant.example.com/mcp",
        ClientInfo: mcpruntime.ClientInfo{Name: "my-agent", Version: "1.0.0"},
    })
    if err != nil {
        return err
    }
    if err := genchat.RegisterUsedToolsets(ctx, rt,
        genchat.WithAssistantMcpExecutor(genmcpexec.NewMCPExecutor(caller)),
    ); err != nil {
        return err
    }
    return genchat.RegisterChatAgent(ctx, rt, genchat.ChatAgentConfig{Planner: p})
}
```

### Planificateur

Votre planificateur peut référencer les outils MCP tout comme les ensembles d'outils natifs :

```go
func (p *MyPlanner) PlanStart(ctx context.Context, in *planner.PlanInput) (*planner.PlanResult, error) {
    call, err := planner.NewToolRequest(
        genmcpspecs.SearchTool(),
        &genmcpspecs.SearchPayload{Query: "golang tutorials"},
    )
    if err != nil {
        return nil, err
    }
    return &planner.PlanResult{ToolCalls: []planner.ToolRequest{call}}, nil
}
```

`genmcpspecs` importe `example.com/assistant/gen/assistant/toolsets/assistant_mcp`. Utilisez `planner.ToolRequestFromModelCall` pour conserver l’identifiant de corrélation du fournisseur lors du transfert d’un appel validé du modèle.

---

## Meilleures pratiques

- **Laissez codegen gérer l'enregistrement** : utilisez la fonction générée
  pour enregistrer les ensembles d'outils MCP ; évitez le câblage manuscrit
  afin que les codecs et la récupération structurée restent cohérents
- **Utilisez des appelants tapés** : préférez les appelants JSON-RPC générés par Goa lorsqu'ils sont disponibles pour la sécurité du type
- **Classez explicitement les erreurs** : mappez les erreurs MCP vers
  `ToolFailure` avec le type d'échec et l'action `Recovery.Action` appropriés
- **Surveiller la télémétrie** : les appels MCP émettent des événements de télémétrie structurés ; utilisez-les pour l'observabilité
- **Choisissez le bon transport** : utilisez HTTP pour les serveurs distants et stdio pour les serveurs lancés comme sous-processus. L'appelant HTTP accepte les réponses JSON et les flux d'événements.

---

## Prochaines étapes

- **[Ensembles d'outils](./toolsets.md)** - Comprendre les modèles d'exécution d'outils
- **[Mémoire et sessions](./memory-sessions.md)** - Gérer l'état avec les transcriptions et les magasins de mémoire
- **[Production](./production.md)** - Déployer avec Temporal et diffuser UI
