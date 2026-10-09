---
nav_group: guides
title: Intégration MCP
weight: 50
description: "Créez des serveurs et clients MCP typés avec autorisation, saisie utilisateur, travaux durables, Apps et Skills."
llm_optimized: true
aliases:
---

Goa-AI permet de **créer des serveurs MCP** et de **consommer des outils MCP externes**. Ajoutez des déclarations MCP à un service Goa pour exposer ses méthodes comme outils, publier des ressources et proposer des modèles de prompts. Le générateur produit le protocole JSON-RPC et les adaptateurs de service. Héberger un serveur MCP ne nécessite pas d’exécuter un agent Goa-AI.

Les callers HTTP et stdio envoient des requêtes autonomes avec les métadonnées du protocole. Il n’y a ni négociation d’initialisation ni session de protocole. L’interface `Caller` invoque les outils ; `Listen` reçoit les notifications de changement. Les clients JSON-RPC générés par Goa exposent aussi les opérations de ressources, prompts, découverte et complétion déclarées par le service.

Un seul design définit les schémas des outils, le décodage typé, la validation, les adaptateurs serveur et les clients. Les endpoints Goa configurés conservent authentification, autorisation, middleware et comportement applicatif. Développeurs et agents de programmation modifient ce contrat et le code applicatif ; `goa gen` maintient les interfaces dérivées cohérentes. Les serveurs MCP générés utilisent HTTP. Les clients pour sous-processus restent disponibles ; les serveurs stdio générés sont reportés.

| Besoin | Déclaration ou composition |
|---|---|
| Outils, ressources, prompts et suggestions | `Tool`, `Resource`, `ResourceReader`, `Prompt`, `PromptCompletion`, `ResourceCompletion` |
| Catalogues autorisés et notifications | `ToolCatalog`, `PromptCatalog`, `ResourceCatalog`, `ResourceTemplateCatalog`, `SubscriptionSource` |
| Formulaires ou consentement pour ouvrir une URL | `InputExchange` sur une méthode Goa existante |
| Travaux asynchrones et réponses ultérieures de l’hôte | `TaskExchange` avec création, lecture, réponse et annulation |
| Interfaces dans le navigateur d’un hôte MCP | `ToolUI`, `ToolVisibility`, `ToolMetadata` et ressources ordinaires |
| Instructions et fichiers associés | `SkillCatalog`, `SkillLookup`, `ResourceDirectory` facultatif et chargement géré par l’hôte |

Commencez par le serveur ci-dessous, puis ajoutez les capacités nécessaires.

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

Si un plugin du générateur déclare des dépendances obligatoires du serveur dans le plan de construction de Goa, passez leurs valeurs typées avant les derniers arguments d’origine. Le démarrage de l’exemple natif appelle les fonctions de construction correspondantes de l’application. Configurez ces fonctions avant de démarrer le serveur d’exemple.

Pour les routes avec des paramètres d’URL, enregistrez `ServeHTTP` auprès du même mux que celui passé à `New`, ou utilisez `Mount(mux)`. Le mux fournit les valeurs du chemin aux décodeurs générés.

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
    GetTask(ctx context.Context, taskID string) (Task, error)
    UpdateTask(ctx context.Context, taskID string, responses map[string]json.RawMessage) error
    CancelTask(ctx context.Context, taskID string) error
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

### Appelants personnalisés {#adaptateur-callerfunc}

Un appelant personnalisé implémente les quatre méthodes de l’interface. `CallerFunc` est supprimé : une seule fonction d’appel ne représente pas la lecture, les réponses et l’annulation des Tasks. Les états inachevés restent hors de l’historique des résultats du modèle.

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

### Déclarer une source de changements

`SubscriptionSource()` sélectionne une méthode de streaming serveur pour les changements autorisés de ressources, Tasks et catalogues. L’entrée `resources` sélectionne des URI ; les champs facultatifs `tasks` sélectionnent des travaux sous le nom de leur méthode de création. L’union obligatoire `change` commence par `acknowledged`, puis identifie les changements. Déclarez `Format(FormatURI)` pour les URI.

La méthode d’origine possède l’autorisation et la détection des changements. Le code généré lit les travaux via leurs endpoints d’observation configurés et envoie des instantanés complets. Le transport partagé ordonne les événements et corrèle les requêtes. `ToolCatalog`, `PromptCatalog`, `ResourceCatalog` et `ResourceTemplateCatalog` relient des pages autorisées à des méthodes ordinaires. La même source notifie les changements de listes ; les catalogues fixes ne reçoivent pas de notifications. Remplacez `ResourceSubscription()` par `SubscriptionSource()` et régénérez ; aucun alias de compatibilité n’existe.

### Ressources, prompts et contenu enrichi

`ResourceTemplate` lie un URI paramétré à une méthode de lecture typée. `Prompt` lie une méthode retournant des messages. `ResourceCompletion` et `PromptCompletion` lient des suggestions d’arguments typées. `ToolContent` sélectionne un champ de contenu enrichi à côté du résultat structuré. Ces contrats suivent le même processus de conception et de génération Goa que les méthodes ordinaires.

### Réessayer une réponse d’outil interrompue

HTTP effectue un seul essai par défaut. L’hôte peut configurer `HTTPRetryPolicy` pour un endpoint de confiance. Une réponse interrompue est répétée uniquement si l’outil déclare un comportement en lecture seule ou idempotent et que la politique fait confiance à ces déclarations. Le nouvel essai possède un autre identifiant et peut exécuter l’outil à nouveau. Les erreurs, réponses invalides, erreurs de callback et interruptions de souscriptions n’autorisent pas de nouvel essai.

Un échec lors de la préparation locale ne signifie pas que l’outil a été exécuté. Une annulation constatée avant l’envoi empêche la requête. Dès qu’une tentative atteint le client HTTP, la perte de sa réponse laisse le résultat inconnu. Les erreurs locales du client et les résultats inconnus arrêtent tous deux la récupération de l’agent.

## Autorisation OAuth {#autorisation-par-secret-client}

Protégez les méthodes MCP avec la sécurité native de Goa. Construisez le vérificateur obligatoire avec `NewJWTResourceServer` pour les jetons signés ou `NewIntrospectionResourceServer` pour les jetons opaques, puis transmettez-le au serveur généré. Émetteur de confiance, audience, clés et identifiants viennent de la configuration applicative. Identifiants absents ou invalides : 401 ; scopes insuffisants : 403 ; vérificateur indisponible : 503. Les erreurs applicatives après l’envoi ne deviennent pas des demandes d’autorisation.

Les clients partagent le transport HTTP ordinaire : `NewAuthorizationCodeHTTPTransport` gère consentement dans le navigateur, état, vérification de l’émetteur et PKCE S256 ; `NewClientCredentialsHTTPTransport` obtient des autorisations pour une application confidentielle ; `NewEnterpriseHTTPTransport` échange les identifiants de connexion unique validés par l’hôte. L’enregistrement choisit explicitement client public, HTTP Basic, secret dans le POST ou assertion signée. Clients préenregistrés et documents de métadonnées HTTPS ont des constructeurs explicites ; l’enregistrement dynamique déprécié est supprimé.

L’hôte possède connexion, émetteurs de confiance et `AuthorizationStore` par utilisateur ou application. La durabilité exige persistance chiffrée et sérialisation entre instances ; le stockage en mémoire dure un processus. Découverte et demandes d’autorisation lient les identifiants à l’émetteur et à l’audience exacts, même si l’URL interne diffère. Une requête initiale sans identifiants obtient les scopes avant consentement. De nouveaux scopes annoncés ne relancent pas seuls le consentement. Les clients navigateur ou enterprise peuvent récupérer une fois après un rejet explicite avant exécution ; le rejet d’une autorisation machine est définitif. Cela n’autorise pas à rejouer un outil dont le résultat est incertain. Voir le [guide d’autorisation](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#mcp-resource-servers).

## Saisie supplémentaire et Tasks asynchrones {#additional-input-and-asynchronous-tasks}

`InputExchange(continuationField, outcomeField)` lie la continuation facultative d’une méthode à son union obligatoire de résultat complet ou de saisie requise. Les requêtes typées décrivent formulaires ou consentement pour ouvrir une URL ; Goa fournit schémas et décodage des réponses. Seule la branche complète fournit le résultat annoncé. Authentification et validation s’appliquent à chaque étape. État et réponses de l’hôte restent hors des arguments du modèle. Le consentement à une URL ne prouve pas la fin de l’interaction externe ; l’application la vérifie.

La même déclaration fonctionne via MCP, `BindTo` local et les fournisseurs du registre. L’agent se suspend puis reprend exactement l’appel inachevé après une réponse typée. Placez les données sensibles dans une interaction URL externe plutôt qu’un formulaire visible du modèle.

`TaskExchange(read, answer, cancel)` lie des méthodes de travaux durables. La création assume durablement le travail avant de rendre son identifiant. La lecture retourne en cours, saisie requise, complet, échec ou annulé. Réponse et annulation confirment l’intention ; les lectures suivantes établissent l’effet. Le service possède persistance et achèvement ; l’adaptateur génère métadonnées et conversions sans autre stockage de travaux.

Un client direct utilise `WithTaskSupport(ctx)` seulement s’il conserve et observe `CallResponse.Task`. `GetTask`, `UpdateTask` et `CancelTask` utilisent le même appelant. L’exécution générée conserve l’identité, lit les travaux ou reçoit leurs notifications et gère saisie et annulation via le moteur configuré. En production, Temporal et un stockage applicatif sont nécessaires ; le moteur en mémoire dure un processus. Voir [saisie et travaux natifs](https://github.com/goadesign/goa-ai/blob/main/docs/dsl.md#native-job-tools) et [clients Task](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#mcp-task-clients).

## MCP Apps {#mcp-apps}

Servez une ressource HTML `text/html;profile=mcp-app` par les méthodes ordinaires. `ToolUI("ui://...")` la lie au résultat d’un outil du même serveur. `ToolVisibility("model")`, `ToolVisibility("app")` ou les deux choisissent les appelants ; l’omission autorise les deux. Les outils réservés à l’app restent hors des catalogues du modèle. `ToolMetadata` sélectionne les données typées de l’hôte séparément du contenu et des résultats du modèle. Un hôte sans navigateur reçoit toujours un résultat ordinaire utile.

L’hôte possède isolation du navigateur et permissions. L’[exemple maintenu](https://github.com/goadesign/goa-ai/tree/main/integration_tests/apps) compose endpoints Goa générés, SDK navigateur officiel, frame d’origine distincte et permissions explicites. Il vérifie la visibilité actuelle et garde les résultats privés hors des messages du modèle.

## MCP Skills {#mcp-skills}

`SkillCatalog()` et `SkillLookup()` déclarent pages et recherche exacte par URI avec `ResourceReader()`. Chaque entrée conserve URI, tous les champs de frontmatter et un manifeste stable ou la déclaration `dynamic`. Chaque fichier stable a une URI exacte, une taille en octets et un SHA-256. `ResourceDirectory()` facultatif liste les enfants immédiats sans activer d’instructions ni étendre le manifeste conservé.

L’hôte attribue l’identité du serveur et conserve l’entrée complète avec le contexte du modèle. Avant utilisation, `mcp.VerifySkillFile(ctx, retainedEntryJSON, uri, bytes)` vérifie appartenance, taille et digest, y compris en cache. Pour le propre `SKILL.md` de l’entrée, tous les champs YAML sont comparés à la découverte, dont les champs futurs et nombres exacts. Une entrée dynamique ne satisfait pas cette vérification stable.

Les Skills sont des instructions non fiables, pas des messages système ni des permissions d’outils. Un `SKILL.md` imbriqué lu comme support exige sa propre découverte et son consentement pour activation. L’exécution locale exige consentement explicite pour serveur, Skill et manifeste complet ; un manifeste modifié révoque ce consentement. L’[hôte de référence](https://github.com/goadesign/goa-ai/tree/main/codegen/mcp/testdata/skills_host) compose lectures différées et confirmation native. Contexte et approbations durent un processus ; une application persistante doit conserver les entrées et gérer la durée des approbations. Voir le [contrat complet](https://github.com/goadesign/goa-ai/blob/main/docs/mcp_skills.md).

## Mise à niveau incompatible {#breaking-upgrade}

Régénérez ensemble serveurs, clients, exécuteurs et fournisseurs du registre. Supprimez initialisation, sessions, sélection du protocole et décodeurs de résultats JSON textuels. Les appelants personnalisés implémentent les quatre méthodes. Construisez les adaptateurs avec les endpoints Goa configurés et les serveurs protégés avec un vérificateur. Remplacez `ResourceSubscription` par `SubscriptionSource` et sélectionnez les branches via les méthodes des unions générées.

Les anciens et nouveaux pairs ne partagent pas un endpoint. Terminez ou résolvez les travaux acceptés et exécutions enregistrées incompatibles avant de modifier workers, registre et persistance. Revenir à une dépendance antérieure ne restaure pas la compatibilité des nouvelles données. Suivez le [guide de mise à niveau](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#preview-upgrade-guide).

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
