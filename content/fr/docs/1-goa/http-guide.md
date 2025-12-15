---
title: HTTP Guide
weight: 4
description: "Complete guide to HTTP transport in Goa - routing, content negotiation, WebSocket, SSE, CORS, and static content."
llm_optimized: true
aliases:
---

Ce guide couvre les fonctionnalités HTTP spécifiques à Goa, du routage de base aux sujets avancés tels que le streaming WebSocket et la négociation de contenu.

## Routage HTTP

### Routage de base

Les routes sont définies à l'aide de la fonction `HTTP` au sein d'un service :

```go
var _ = Service("calculator", func() {
    HTTP(func() {
        Path("/calculator")  // Base path for all endpoints
    })

    Method("add", func() {
        Payload(func() {
            Field(1, "a", Int, "First operand")
            Field(2, "b", Int, "Second operand")
        })
        Result(Int)
        HTTP(func() {
            POST("/add")  // POST /calculator/add
        })
    })
})
```

Goa prend en charge toutes les méthodes HTTP standard : `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, `TRACE`.

Une seule méthode peut gérer plusieurs méthodes ou chemins HTTP :

```go
Method("manage_user", func() {
    Payload(User)
    Result(User)
    HTTP(func() {
        POST("/users")          // Create
        PUT("/users/{user_id}") // Update
        Response(StatusOK)
        Response(StatusCreated)
    })
})
```

### Paramètres de chemin

Capture les valeurs dynamiques de l'URL :

```go
Method("get_user", func() {
    Payload(func() {
        Field(1, "user_id", String, "User ID")
    })
    Result(User)
    HTTP(func() {
        GET("/users/{user_id}")  // Maps to payload.UserID
    })
})
```

Faire correspondre les noms des paramètres de l'URL aux noms des champs de la charge utile :

```go
Method("get_user", func() {
    Payload(func() {
        Field(1, "id", Int, "User ID")
    })
    HTTP(func() {
        GET("/users/{user_id:id}")  // URL uses user_id, maps to payload.ID
    })
})
```

### Paramètres de la requête

Définissez les paramètres de la requête avec la fonction `Param` :

```go
Method("list_users", func() {
    Payload(func() {
        Field(1, "page", Int, "Page number", func() {
            Default(1)
            Minimum(1)
        })
        Field(2, "per_page", Int, "Items per page", func() {
            Default(20)
            Minimum(1)
            Maximum(100)
        })
    })
    Result(CollectionOf(User))
    HTTP(func() {
        GET("/users")
        Param("page")
        Param("per_page")
    })
})
```

### Jokers

Capture tous les segments de chemin restants :

```go
Method("serve_files", func() {
    Payload(func() {
        Field(1, "path", String, "Path to file")
    })
    HTTP(func() {
        GET("/files/*path")  // Matches /files/docs/image.png
    })
})
```

### Relations de service

Utilisez `Parent` pour établir des hiérarchies de services :

```go
var _ = Service("users", func() {
    HTTP(func() {
        Path("/users/{user_id}")
        CanonicalMethod("get")  // Override default "show"
    })
    
    Method("get", func() {
        Payload(func() {
            Field(1, "user_id", String)
        })
        HTTP(func() {
            GET("")  // GET /users/{user_id}
        })
    })
})

var _ = Service("posts", func() {
    Parent("users")  // Inherit parent's path
    
    Method("list", func() {
        // user_id inherited from parent
        HTTP(func() {
            GET("/posts")  // GET /users/{user_id}/posts
        })
    })
})
```

### Hiérarchie des préfixes de chemin

Combiner les préfixes au niveau de l'API et du service :

```go
var _ = API("myapi", func() {
    HTTP(func() {
        Path("/api")  // Global prefix
    })
})

var _ = Service("users", func() {
    HTTP(func() {
        Path("/v1/users")  // Service prefix
    })
    
    Method("show", func() {
        HTTP(func() {
            GET("/{id}")  // Final: /api/v1/users/{id}
        })
    })
})
```

---

## Négociation du contenu

### Encodeurs intégrés

Les encodeurs par défaut de Goa prennent en charge
- JSON (`application/json`, `*+json`)
- XML (`application/xml`, `*+xml`)
- Gob (`application/gob`, `*+gob`)
- HTML (`text/html`)
- Texte brut (`text/plain`)

Le type de contenu de la réponse est déterminé par :
1. `Accept` l'en-tête
2. `Content-Type` en-tête (si pas d'acceptation)
3. Défaut (JSON)

Définit un type de contenu de réponse par défaut :

```go
Method("create", func() {
    HTTP(func() {
        POST("/media")
        Response(StatusCreated, func() {
            ContentType("application/json")
        })
    })
})
```

### Encodeurs personnalisés

Créez des encodeurs personnalisés pour des formats spécialisés :

```go
type MessagePackEncoder struct {
    w http.ResponseWriter
}

func (enc *MessagePackEncoder) Encode(v interface{}) error {
    enc.w.Header().Set("Content-Type", "application/msgpack")
    return msgpack.NewEncoder(enc.w).Encode(v)
}

func NewMessagePackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &MessagePackEncoder{w: w}
}
```

Enregistrer les encodeurs personnalisés lors de la création du serveur :

```go
func main() {
    decoder := func(r *http.Request) goahttp.Decoder {
        switch r.Header.Get("Content-Type") {
        case "application/msgpack":
            return NewMessagePackDecoder(r)
        default:
            return goahttp.RequestDecoder(r)
        }
    }
    
    encoder := func(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
        if accept := ctx.Value(goahttp.AcceptTypeKey).(string); accept == "application/msgpack" {
            return NewMessagePackEncoder(ctx, w)
        }
        return goahttp.ResponseEncoder(ctx, w)
    }
    
    server := myapi.NewServer(endpoints, mux, decoder, encoder, nil, nil)
}
```

---

## Intégration WebSocket

**Rappel de la conception** : Le streaming est défini au niveau de la conception à l'aide de `StreamingPayload` et `StreamingResult`. Le DSL est agnostique en matière de transport - la même conception fonctionne pour HTTP (WebSocket/SSE) et gRPC. Voir [DSL Reference : Streaming](dsl-reference/#streaming) pour les modèles de conception. Cette section couvre la mise en œuvre de WebSocket spécifique à HTTP.

WebSocket permet une communication bidirectionnelle en temps réel. Goa met en œuvre WebSocket par le biais de son DSL de streaming.

### Modèles de flux

**Client-to-Server Streaming:**

```go
Method("listener", func() {
    StreamingPayload(func() {
        Field(1, "message", String, "Message content")
        Required("message")
    })
    HTTP(func() {
        GET("/listen")  // WebSocket endpoints must use GET
    })
})
```

**La diffusion en continu de serveur à client:**

```go
Method("subscribe", func() {
    StreamingResult(func() {
        Field(1, "message", String, "Update content")
        Field(2, "action", String, "Action type")
        Field(3, "timestamp", String, "When it happened")
        Required("message", "action", "timestamp")
    })
    HTTP(func() {
        GET("/subscribe")
    })
})
```

**Streaming bidirectionnel:**

```go
Method("echo", func() {
    StreamingPayload(func() {
        Field(1, "message", String, "Message to echo")
        Required("message")
    })
    StreamingResult(func() {
        Field(1, "message", String, "Echoed message")
        Required("message")
    })
    HTTP(func() {
        GET("/echo")
    })
})
```

### Mise en œuvre de WebSocket

Mise en œuvre côté serveur :

```go
func (s *service) handleStream(ctx context.Context, stream Stream) error {
    connID := generateConnectionID()
    s.registerConnection(connID, stream)
    defer s.cleanupConnection(connID)

    errChan := make(chan error, 1)
    go func() {
        errChan <- s.handleIncoming(stream)
    }()

    select {
    case <-ctx.Done():
        return ctx.Err()
    case err := <-errChan:
        return err
    }
}
```

Gestion des connexions :

```go
type ConnectionManager struct {
    connections map[string]*ManagedConnection
    mu          sync.RWMutex
}

func (cm *ConnectionManager) AddConnection(id string, stream Stream) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    cm.connections[id] = &ManagedConnection{
        ID:       id,
        Stream:   stream,
        LastPing: time.Now(),
    }
}
```

---

## Événements envoyés par le serveur

**Rappel sur la conception** : SSE utilise `StreamingResult` au niveau de la conception avec `ServerSentEvents()` dans le mappage HTTP. Voir [DSL Reference : Streaming](dsl-reference/#streaming) pour les modèles de conception.

SSE fournit un flux unidirectionnel de serveur à client sur HTTP. Il est idéal pour
- Les notifications en temps réel
- Les flux de données en direct
- Mises à jour de l'état d'avancement
- Diffusion en continu d'événements

### Conception de l'ESS

```go
var Event = Type("Event", func() {
    Attribute("message", String, "Message body")
    Attribute("timestamp", Int, "Unix timestamp")
    Required("message", "timestamp")
})

var _ = Service("sse", func() {
    Method("stream", func() {
        StreamingResult(Event)
        HTTP(func() {
            GET("/events/stream")
            ServerSentEvents()  // Use SSE instead of WebSocket
        })
    })
})
```

Personnaliser les événements de l'ESS :

```go
var Event = Type("Event", func() {
    Attribute("message", String, "Message body")
    Attribute("type", String, "Event type")
    Attribute("id", String, "Event ID")
    Attribute("retry", Int, "Reconnection delay in ms")
    Required("message", "type", "id")
})

Method("stream", func() {
    StreamingResult(Event)
    HTTP(func() {
        GET("/events/stream")
        ServerSentEvents(func() {
            SSEEventData("message")
            SSEEventType("type")
            SSEEventID("id")
            SSEEventRetry("retry")
        })
    })
})
```

Gérer le Last-Event-Id pour les flux résumables :

```go
Method("stream", func() {
    Payload(func() {
        Attribute("startID", String, "Last event ID received")
    })
    StreamingResult(Event)
    HTTP(func() {
        GET("/events/stream")
        ServerSentEvents(func() {
            SSERequestID("startID")  // Maps Last-Event-Id header
        })
    })
})
```

### Mise en œuvre de l'ESS

```go
func (s *Service) Stream(ctx context.Context, stream sse.StreamServerStream) error {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            event := &sse.Event{
                Message:   "Hello from server!",
                Timestamp: time.Now().Unix(),
            }
            if err := stream.Send(event); err != nil {
                return err
            }
        case <-ctx.Done():
            return nil
        }
    }
}
```

Client du navigateur :

```javascript
const eventSource = new EventSource('/events/stream');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};

eventSource.onerror = (error) => {
    console.error('EventSource failed:', error);
    eventSource.close();
};
```

---

## Configuration CORS

Le plugin CORS gère les requêtes cross-origin. Importez-le :

```go
import (
    cors "goa.design/plugins/v3/cors/dsl"
    . "goa.design/goa/v3/dsl"
)
```

CORS au niveau de l'API :

```go
var _ = API("calc", func() {
    cors.Origin("http://127.0.0.1", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
        cors.MaxAge(600)
        cors.Credentials()
    })
})
```

CORS au niveau du service :

```go
var _ = Service("calc", func() {
    // Allow specific origin
    cors.Origin("localhost")

    // Allow subdomain pattern
    cors.Origin("*.domain.com", func() {
        cors.Headers("X-Shared-Secret", "X-Api-Version")
        cors.MaxAge(100)
        cors.Credentials()
    })

    // Allow all origins
    cors.Origin("*")

    // Allow regex pattern
    cors.Origin("/.*domain.*/", func() {
        cors.Headers("*")
        cors.Methods("GET", "POST")
        cors.Expose("X-Time")
    })
})
```

---

## Contenu statique

**Récapitulation de la conception** : Le service de fichiers statiques utilise la fonction DSL `Files`. Il s'agit d'une fonctionnalité HTTP uniquement. Voir [Référence DSL : Fichiers statiques] (dsl-reference/#static-files) pour les modèles de conception.

Servez les fichiers statiques à l'aide de la fonction `Files` :

```go
var _ = Service("web", func() {
    // Serve files from a directory
    Files("/static/{*path}", "./public")
    
    // Serve a specific file
    Files("/favicon.ico", "./public/favicon.ico")
})
```

Pour les applications à page unique, servir le fichier index.html pour tous les itinéraires :

```go
var _ = Service("spa", func() {
    // API endpoints
    Method("api", func() {
        HTTP(func() {
            GET("/api/data")
        })
    })
    
    // Serve SPA - catch-all for client-side routing
    Files("/{*path}", "./dist/index.html")
})
```

---

---

## Voir aussi

- [Référence DSL : Streaming](dsl-reference/#streaming) - Modèles de streaming au niveau de la conception
- [Référence DSL : Fichiers statiques](dsl-reference/#static-files) - DSL de fichiers pour le contenu statique
- [DSL Reference : Error Handling](dsl-reference/#error-handling-design-level) - Définitions des erreurs au niveau de la conception
- [Guide gRPC](grpc-guide/) - Caractéristiques du transport gRPC
- [Guide de gestion des erreurs](error-handling/) - Modèles complets de gestion des erreurs
- [Clue Documentation](../3-ecosystem/clue/) - Logiciel intermédiaire HTTP pour l'observabilité

---

## Meilleures pratiques

### Conception des URL
- Utilisez des noms pour les ressources : `/articles`, et non `/list-articles`
- Utiliser systématiquement des noms pluriels
- Laisser les méthodes HTTP définir les actions
- Garder les URL hiérarchiques et prévisibles

### Gestion des erreurs
- Associer les erreurs aux codes d'état HTTP appropriés
- Utiliser des formats de réponse d'erreur cohérents
- Inclure des messages d'erreur significatifs

### Performance
- Utiliser des tailles de tampon appropriées pour WebSocket
- Mettre en place un pool de connexions pour les services à fort trafic
- Envisager la mise en lot des messages pour les points d'extrémité en flux continu

### Sécurité
- Toujours utiliser HTTPS en production
- Configurer CORS de manière appropriée
- Valider tous les paramètres d'entrée
- Définir des délais d'attente appropriés pour les connexions de longue durée
