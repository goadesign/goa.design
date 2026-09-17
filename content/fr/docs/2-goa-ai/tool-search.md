---
nav_group: guides
title: "Recherche d’outils et catalogues dynamiques"
linkTitle: "Recherche d’outils et catalogues dynamiques"
weight: 25
description: "Générer les choix de chargement et consommer un catalogue évolutif sans stockage distinct des outils chargés."
llm_optimized: true
---

La recherche charge les définitions lorsque le modèle en a besoin. Un registre permet aux fournisseurs de modifier les outils disponibles sans recompiler le consommateur. Ces choix sont indépendants : des outils statiques peuvent utiliser la recherche et des outils dynamiques peuvent être annoncés immédiatement.

## Choisir les outils à charger par recherche

Supposons que l’ensemble d’outils compilé `Records` définisse `lookup`, `search` et `analyze`. Gardez `lookup`, souvent utilisé, immédiatement disponible en différant uniquement les deux autres :

```go
Agent("assistant", "Find and analyze records.", func() {
    Use(Records, func() {
        Deferred("search", "analyze")
    })
})
```

Seuls `search` et `analyze` sont chargés par recherche ; `lookup` est annoncé immédiatement. Ce choix modifie le chargement des définitions, pas les permissions ni l’exécution. Il appartient au `Use` consommateur, jamais à une définition partagée de `Toolset` ni à un `Export`. Les fournisseurs partagés, les exports et les autres consommateurs restent inchangés.

Les noms doivent correspondre exactement aux noms locaux déclarés dans l’ensemble compilé : `"search"`, pas `"records.search"` ni un nom Go généré. La sélection par nom prend en charge les outils locaux, les agents exposés comme outils, les outils MCP externes dont les schémas sont déclarés et les outils MCP issus de Goa.

- `Deferred()` sélectionne tous les outils de ce `Use` ; le répéter est valide.
- Plusieurs déclarations nommées combinent leurs sélections : `Deferred("search")` suivi de `Deferred("analyze")` sélectionne les deux.
- Les noms vides ou dupliqués sont rejetés, y compris les doublons entre déclarations. La génération de code rejette les noms inconnus après avoir rassemblé la liste complète des outils compilés.
- Combiner `Deferred()` avec une sélection par nom dans le même `Use` est rejeté.

## Consommer un catalogue évolutif

Pour un catalogue évolutif, utilisez `Registry`. Les ensembles `FromRegistry` et les registres entiers rejettent les sélections nommées de `Deferred`, car leurs outils sont résolus à l’exécution :

```go
var Company = Registry("company", func() {
    URL("https://registry.example")
})
var Records = Toolset(FromRegistry(Company, "records"))

var _ = Service("assistant", func() {
    Agent("reader", "Read records.", func() {
        Use(Records, func() { Deferred() })
    })
    Agent("generalist", "Use the company catalog.", func() {
        Use(Company, func() { Deferred() })
    })
})
```

Le lecteur résout un ensemble d’outils obligatoire ; le généraliste résout tous les ensembles actuellement listés. Retirer `Deferred()` annonce immédiatement ce même catalogue. Une source nommée peut exiger `Version("1.2.3")` : cela vérifie la version publiée, sans sélectionner une ancienne version.

Les sources dupliquées ou qui se recouvrent, les outils déclarés en ligne sur une référence de registre et l’export de cette référence sont rejetés. Le fournisseur possède les définitions ; la politique d’exécution filtre le catalogue avant son envoi au modèle.

Les références de registre rejettent aussi `Tags(...)` et `PublishTo(...)` côté consommateur. Les tags appartiennent au fournisseur ; le consommateur les filtre par sa politique d’exécution.

## Connexion et publication

Construisez le client de service généré du registre distribué (`registry/gen/registry.Client`) et le client Pulse de résultats au démarrage de l’application. Connectez-les avant les exécutions :

```go
if err := rt.RegisterRegistry("company", registryClient, pulseClient); err != nil {
    return err
}
if err := genreader.RegisterReaderAgent(ctx, rt, genreader.ReaderAgentConfig{
    Planner: myPlanner,
}); err != nil {
    return err
}
client := genreader.NewClient(rt)
```

`Definition()` et `NewClient(rt)` ne prennent aucun catalogue et ne font aucun appel réseau. Enregistrez les outils compilés avec les helpers générés habituels. Le runtime exécute les outils du registre sans callback de découverte ni exécuteur dynamique personnalisé. Les clients HTTP de catalogue sont un transport distinct pour des serveurs HTTP correspondants.

Les fournisseurs publient le résultat de `ToolSchemas()` avec l’empreinte de schéma générée et le cycle d’enregistrement existant. `ConsumerContract` contient les termes de recherche, métadonnées de champs, labels requis, confirmation, pagination et données réservées au serveur. Les outils dynamiques de service les prennent en charge ; les outils d’agents enfants et de contrôle restent compilés. Les enregistrements limités aux schémas et les types d’exécution non pris en charge sont rejetés explicitement.

## Qui effectue la recherche ?

- **OpenAI Responses, direct ou Bedrock :** le modèle émet des recherches natives exécutées côté client. L’adaptateur classe les noms, titres et descriptions autorisés avec BM25, un algorithme de pertinence fondé sur les mots, puis retourne les définitions correspondantes. La première requête contient seulement un outil de recherche par requête, sans répertoire de noms ou descriptions. Le catalogue différé reste dans l’application.
- **Anthropic Messages, direct ou Bedrock :** l’adaptateur envoie le catalogue autorisé, les indicateurs de chargement différé et la recherche hébergée de Claude. Le fournisseur recherche et développe les définitions. Sur Bedrock, utilisez `NewAnthropic`, Messages et InvokeModel ; Converse n’implémente pas cette recherche.
- **Autres adaptateurs :** une découverte non prise en charge retourne `model.ErrToolSearchUnsupported`, sans chargement immédiat de remplacement.

Les planners transmettent `input.Agent.AdvertisedToolDefinitions()` et les messages actuels, avec le modèle ou sa classe explicite. La recherche reste dans l’adaptateur ; le planner reçoit des appels ordinaires. OpenAI exige un `MaxTokens` positif ou `MaxCompletionTokens` dans l’adaptateur ; les tours de recherche partagent le budget de sortie de cette invocation.

## Évolution et historique

Les résultats de recherche OpenAI placent chaque fonction sélectionnée dans un espace de noms natif portant le même nom côté fournisseur. Bedrock retourne ainsi une identité d’appel complète pour la relecture. L’adaptateur gère cette représentation ; aucun DSL d’espaces de noms, mapping applicatif ou état distinct des outils chargés n’est nécessaire. Les outils chargés immédiatement conservent leur représentation. Les historiques Bedrock créés avec des fonctions dynamiques sans ce conteneur peuvent contenir des appels sans espace de noms que Bedrock rejette à la relecture. Démarrez une nouvelle conversation ou retirez délibérément l’échange concerné complet ; l’adaptateur n’invente jamais les champs manquants du fournisseur.

Chaque activité de planification pouvant commencer du travail lit ses sources une fois et conserve ce catalogue pendant l’inférence. La suivante relit les sources, y compris les nouveaux fournisseurs. Les activités de réponse finale seule et les finaliseurs explicites ne lisent pas le registre. Un registre complet vide est valide ; une source nommée absente, une version incorrecte, des identités dupliquées, une erreur de lecture ou une suppression pendant la résolution échouent explicitement.

Un appel accepté conserve sa définition, son éventuel partenaire de pagination fixe et le jeton d’enregistrement existant. Confirmation, décodage et restauration utilisent ce contrat sauvegardé sans lire le catalogue actuel. `CallResolvedTool` vérifie le jeton avant publication ; un remplacement avant publication enregistre `call_not_admitted`. Les reprises après surcharge conservent le jeton et retournent `admission_conflict` si cette admission a été remplacée. Les appels publiés gardent leur affectation et leur résultat d’origine.

Les traces de recherche native restent dans les métadonnées des messages. Préservez-les lors du stockage et de la compaction. Il n’existe aucune base distincte d’outils chargés. Les définitions historiques expliquent les anciens appels ; la consommation et la politique actuelles autorisent les nouveaux.

L’historique d’ajout/retrait de Claude nécessite un modèle compatible. Une définition modifiée sous un nom encore retenu ne peut pas être rejouée par ce protocole et est rejetée. Démarrez une nouvelle conversation ou compactez délibérément pour supprimer cette définition ; l’adaptateur ne réinitialise jamais silencieusement l’historique. La continuation des pauses de Claude contenant uniquement du travail natif n’est pas implémentée.

## Exemples et mise à niveau

Régénérez l’agent consommateur après avoir modifié sa sélection `Deferred`. La génération de code prépare les fréquences des mots de recherche et émet les identifiants fixes existants des outils sélectionnés via la même API du runtime. La sélection par nom n’ajoute aucune API fournisseur, aucun état fournisseur ni aucun espace de noms.

Dans v0.80.0, le type de `Deferred` est passé de `func()` à `func(...string)`. Les appels à `Deferred()` restent valides, mais passer directement `Deferred` comme callback de type `func()` ne compile plus. Encapsulez les références directes :

```go
// Avant
Use(Records, Deferred)

// Après
Use(Records, func() { Deferred() })
```

Utilisez la même fonction d’encapsulation pour les autres affectations de `Deferred` à un callback de type `func()`. Le chargement différé de tout le groupe d’outils est préservé. Encapsuler un callback existant sans modifier la sélection ne nécessite pas de régénération.

Régénérez fournisseurs et consommateurs avec Goa v3.31.1. Remplacez `Discover`, les entrées `RegistryToolsets` et le câblage d’exécuteurs dynamiques par `RegisterRegistry`. Mettez à niveau le registre pour exposer `ResolveToolset` et `CallResolvedTool`, puis publiez `ToolSchemas()` complet avant d’activer les consommateurs dynamiques. Les anciens enregistrements limités aux schémas restent utilisables par leurs intégrations statiques, mais pas par ce chemin dynamique.

Les modèles de confirmation utilisent les noms JSON comme `{{ .key }}`, au lieu des champs Go comme `{{ .Key }}`. Utilisez `{{ json .value }}` pour les valeurs JSON et `index` pour les propriétés facultatives.

Le quickstart goa-ai inclut `go run ./cmd/tool-search -provider openai -model YOUR_MODEL_ID`, ou `-provider anthropic`, avec la variable d’environnement de clé API correspondante. Ce programme facultatif effectue des appels facturables ; le quickstart habituel reste sans identifiants. Le helper retourne l’exemple fixe de Tokyo. Le test SDK local couvre recherche, exécution et rejeu. Un exemple à un outil ne prouve pas d’économie de tokens : mesurez qualité et usage avec le modèle et le catalogue réels.
