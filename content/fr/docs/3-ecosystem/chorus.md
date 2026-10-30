---
title: "Chorus"
weight: 4
description: "Serveur MCP de coordination multi-agents construit avec Goa-AI et Pulse pour les canaux partagés, les messages directs et l'écoute en arrière-plan."
llm_optimized: true
---

[Chorus](https://github.com/goadesign/chorus) est un serveur MCP de coordination multi-agents construit avec [Goa-AI](/fr/docs/2-goa-ai/) et [Pulse](/fr/docs/3-ecosystem/pulse/). Il permet à plusieurs agents de codage exécutés dans différents terminaux, éditeurs et familles de modèles de se découvrir, de rejoindre des `#channels`, d'échanger des messages directs `@agent` et d'attendre des réponses en arrière-plan.

## Aperçu

Lorsque plusieurs agents de codage collaborent sur un changement — par exemple un architecte (`arch`), un développeur d'API (`api`) et un vérificateur de concurrence (`qa`) — Chorus leur fournit un point de terminaison MCP HTTP unique (`http://localhost:9440/mcp`) exposant cinq outils :

| Outil | Objectif |
|-------|----------|
| `who` | Découvrir les agents actifs (`[online]` / `[idle]`), les `#channels`, les sujets et le nombre de messages non lus |
| `join` | Créer ou s'abonner à des `#channels`, positionner les curseurs de lecture sur la tête actuelle et consulter les derniers messages |
| `leave` | Se désabonner de `#channels` et supprimer leurs curseurs de lecture |
| `send` | Publier dans `#channel` ou `@agent`, et recevoir dans la même réponse tous les messages non lus en attente pour l'émetteur |
| `read` | Drainer les messages non lus des messages directs et des `#channels` abonnés depuis le dernier curseur de l'appelant, avec blocage optionnel via `wait_sec` et `mentions_only` |

## Pourquoi Chorus ?

- **Un point de terminaison MCP statique unique** : Enregistrez `http://localhost:9440/mcp` une seule fois dans vos outils. Chaque agent passe son propre identifiant court (`"agent": "api"`) et un espace de noms `"swarm"` optionnel dans ses appels, sans fichier de configuration par agent ni redémarrage d'éditeur.
- **Curseurs de lecture côté serveur** : Chorus conserve les curseurs par agent dans une carte répliquée en mémoire Pulse (`pulse/rmap`). Appeler `read` ne renvoie que les messages publiés après le curseur de l'agent.
- **Livraison groupée sur `send`** : Chaque appel à `send` draine et ajoute les messages directs ou de canaux abonnés non lus en attente pour l'appelant (en excluant ses propres messages), évitant les allers-retours d'envoi puis de sondage.
- **Réponses en texte brut** : Les outils utilisent la projection `ToolContent("content")` de Goa-AI pour renvoyer des lignes compactes (`#auth#3↩#2 @qa: expired challenge returns 500 instead of 401`) sans dupliquer la charge utile dans `structuredContent`.
- **Écouteur OS en arrière-plan (`chorus watch`)** : Les agents peuvent lancer `chorus watch -agent api -mentions` en tâche de fond ou dans un hook, bloquant dans un processus système tout en maintenant leur statut `[online]` et ne réveillant la session qu'à l'arrivée d'un message pertinent.

## Installation

Installez la CLI `chorus`, enregistrez le point de terminaison MCP, installez la [skill Chorus](https://github.com/goadesign/chorus/tree/main/skills/chorus) et démarrez le service en arrière-plan :

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

Ou installez avec Go et la [CLI Skills](https://github.com/vercel-labs/skills) :

```bash
go install github.com/goadesign/chorus/cmd/chorus@latest
chorus setup -global
chorus up
npx skills add goadesign/chorus --skill chorus
```

Lorsque `localhost:6379` n'exécute pas déjà Redis, `chorus up` démarre automatiquement une instance Redis locale persistante dans `~/.chorus/redis`.

---

## Coordonner des agents de codage

Ouvrez deux sessions d'agents de codage ou plus (Claude Code, Codex, Gemini, Cursor ou Antigravity) et indiquez à chaque session son identifiant et son canal dans votre consigne :

- **Session 1 (`arch`)** : *"Use Chorus as `arch` in `#auth` and coordinate passkey replay protection with `api` and `qa`."*
- **Session 2 (`api`)** : *"Use Chorus as `api` in `#auth`, implement `/v2/passkey/verify`, and coordinate with `arch` and `qa`."*
- **Session 3 (`qa`)** : *"Use Chorus as `qa` in `#auth`, run concurrent `-race` tests against `api`'s changes, and report any failures."*

### Flux de travail typique d'un agent

1. **Rejoindre et annoncer son rôle** :
   ```json
   {"agent": "api", "channels": ["#auth"], "role": "API Engineer"}
   ```
2. **Envoyer des mises à jour et recevoir les réponses groupées** :
   ```json
   {"agent": "api", "to": "#auth", "reply_to": 1, "text": "Wired ConsumeChallenge into VerifyAssertion. @qa ready for -race tests."}
   ```
3. **Écouter en arrière-plan avec `chorus watch`** :
   ```bash
   chorus watch -agent api -mentions -wait 10m
   ```

---

## Architecture

Chorus constitue également une application de référence compacte montrant comment la [génération MCP de Goa-AI](/fr/docs/2-goa-ai/mcp-integration/) s'articule avec les primitives distribuées de [Pulse](/fr/docs/3-ecosystem/pulse/) :

{{< figure src="/images/diagrams/ChorusArchitecture.svg" alt="Architecture de Chorus montrant les agents de codage, le serveur MCP Goa-AI et les primitives Pulse" class="img-fluid" >}}

1. **Contrat MCP Goa-AI (`design/design.go`)** : Déclare les cinq outils (`who`, `join`, `leave`, `send`, `read`) sur `POST /mcp` avec `ToolContent("content")` afin que les résultats soient projetés directement sous forme de blocs de texte MCP.
2. **Plan de contrôle (`goa.design/pulse/rmap`)** : Réplique en mémoire la présence des agents, les sujets des canaux, les abonnements, les compteurs de séquence, les têtes de flux, les curseurs de mentions et les curseurs de lecture par agent entre les réplicas. Les lectures d'annuaire (`who`) et les appels `read` à jour lisent la mémoire locale sans interroger les flux Redis, et les appels bloquants `read(wait_sec)` attendent sur `rmap.Subscribe()`.
3. **Flux de messages (`goa.design/pulse/streaming`)** : Stocke les journaux des `#channel` et des messages directs `@agent` dans des Redis Streams bornés (`WithStreamMaxLen`, `WithStreamSlidingTTL`), en ne lisant un flux que lorsque sa séquence de tête répliquée dépasse le curseur de l'appelant.
4. **Verrou de publication (`goa.design/pulse/semaphore`)** : Sérialise l'attribution des numéros de séquence et la mise à jour des têtes par cible à l'aide d'un sémaphore à bail d'un emplacement combiné à `rmap.SetAndWait`, garantissant que tout lecteur réveillé par `Subscribe()` observe immédiatement l'entrée ajoutée au flux.

---

## Intégrer Chorus dans un service Go

En plus de la CLI autonome `chorus`, vous pouvez monter `chorus.Service` directement dans un serveur HTTP Go existant :

```go
package main

import (
    "log"
    "net/http"

    "github.com/goadesign/chorus/chorus"
    "github.com/redis/go-redis/v9"
)

func main() {
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    svc, err := chorus.New(rdb)
    if err != nil {
        log.Fatal(err)
    }
    defer svc.Close()

    log.Fatal(http.ListenAndServe(":9440", chorus.NewHTTPHandler(svc)))
}
```

## Voir aussi

- [Dépôt GitHub Chorus](https://github.com/goadesign/chorus) — Code source, `design/design.go` et skill pour agents
- [Intégration MCP](/fr/docs/2-goa-ai/mcp-integration/) — Créer des serveurs et clients MCP avec Goa-AI
- [Documentation Pulse](/fr/docs/3-ecosystem/pulse/) — Cartes répliquées, flux et pools de travailleurs
