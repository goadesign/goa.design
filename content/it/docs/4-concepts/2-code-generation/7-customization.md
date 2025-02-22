---
title: "Personalizzazione"
linkTitle: "Personalizzazione"
weight: 7
description: "Scopri come personalizzare ed estendere la generazione del codice di Goa utilizzando metadati e plugin."
---

## Panoramica

I metadati ti permettono di controllare e personalizzare la generazione del codice attraverso
semplici tag. Usa la funzione `Meta` per aggiungere metadati ai tuoi elementi di design.

### Controllo Base della Generazione dei Tipi

Per impostazione predefinita, Goa genera solo i tipi che sono utilizzati dai metodi del servizio. Se
definisci un tipo nel tuo design ma non lo referenzi in alcun parametro o risultato di metodo,
Goa salterà la sua generazione.

Il tag di metadati `"type:generate:force"` sovrascrive questo comportamento. Accetta
nomi di servizi come argomenti per specificare quali servizi dovrebbero includere il tipo nel
loro codice generato. Se non vengono forniti nomi di servizi, il tipo verrà
generato per tutti i servizi:

```go
var MyType = Type("MyType", func() {
    // Forza la generazione del tipo in service1 e service2, anche se non utilizzato
    Meta("type:generate:force", "service1", "service2")
    Attribute("name", String)
})

var OtherType = Type("OtherType", func() {
    // Forza la generazione del tipo in tutti i servizi
    Meta("type:generate:force")
    Attribute("id", String)
})
```

### Organizzazione dei Pacchetti

Puoi controllare dove vengono generati i tipi utilizzando i metadati del pacchetto. Per impostazione predefinita,
i tipi vengono generati nei rispettivi pacchetti di servizio, ma puoi generarli
in un pacchetto condiviso. Questo è particolarmente utile quando più servizi
devono lavorare con le stesse struct Go, come quando si condivide logica di business o
codice di accesso ai dati. Generando i tipi in un pacchetto condiviso, eviti di dover
convertire tra definizioni di tipo duplicate tra i servizi:

```go
var CommonType = Type("CommonType", func() {
    // Genera nel pacchetto types condiviso
    Meta("struct:pkg:path", "types")
    
    Attribute("id", String)
    Attribute("createdAt", String)
})
```

Questo crea una struttura come:
```
project/
├── gen/
│   └── types/              # Pacchetto types condiviso
│       └── common_type.go # Generato da CommonType
```

{{< alert title="Note Importanti" color="primary" >}}
- Tutti i tipi correlati devono utilizzare lo stesso percorso del pacchetto
- I tipi che si riferiscono l'uno all'altro devono essere nello stesso pacchetto
- Il pacchetto `types` è comunemente utilizzato per i tipi condivisi
- L'utilizzo di un pacchetto condiviso elimina la necessità di copiare o convertire tra definizioni di tipo duplicate quando i servizi condividono codice
{{< /alert >}}

### Personalizzazione dei Campi

Per impostazione predefinita, Goa genera nomi di campo convertendo i nomi degli attributi in
CamelCase. Per esempio, un attributo chiamato "user_id" diventerebbe "UserID" nella
struct generata.

Goa fornisce anche mappature predefinite dai tipi di design ai tipi Go:
- `String` → `string`
- `Int` → `int`
- `Int32` → `int32`
- `Int64` → `int64`
- `Float32` → `float32`
- `Float64` → `float64`
- `Boolean` → `bool`
- `Bytes` → `[]byte`
- `Any` → `any`

Puoi personalizzare i singoli campi utilizzando diversi tag di metadati:

- `struct:field:name`: Sovrascrive il nome del campo generato
- `struct:field:type`: Sovrascrive il tipo del campo generato
- `struct:tag:*`: Aggiunge tag personalizzati alla struct

Ecco un esempio che combina questi:

```go
var Message = Type("Message", func() {
    Meta("struct:pkg:path", "types")
    
    Attribute("id", String, func() {
        // Sovrascrive il nome del campo
        Meta("struct:field:name", "ID")
        // Aggiunge un tag MessagePack personalizzato
        Meta("struct:tag:msgpack", "id,omitempty")
        // Sovrascrive il tipo con un tipo personalizzato
        Meta("struct:field:type", "bison.ObjectId", "github.com/globalsign/mgo/bson", "bison")
    })
})
```

Questo genera la seguente struct Go:

```go
type Message struct {
    ID bison.ObjectId `msgpack:"id,omitempty"`
}
```

{{< alert title="Limitazioni Importanti" color="primary" >}}
Quando si usa `struct:field:type`:
- Il tipo sovrascritto deve supportare lo stesso marshaling/unmarshaling del tipo originale
- Goa genera codice di codifica/decodifica basato sulla definizione del tipo originale
- Un comportamento di marshaling incompatibile causerà errori a runtime
{{< /alert >}}

## Personalizzazione dei Protocol Buffer

Quando si lavora con i Protocol Buffer, puoi personalizzare il codice protobuf
generato utilizzando diversi metadati:

### Nomi dei Tipi Messaggio

Il metadato `struct:name:proto` ti permette di sovrascrivere il nome del messaggio
protobuf generato. Per impostazione predefinita, Goa usa il nome del tipo dal tuo design:

```go
var MyType = Type("MyType", func() {
    // Cambia il nome del messaggio protobuf in "CustomProtoType"
    Meta("struct:name:proto", "CustomProtoType")
    
    Field(1, "name", String)
})
```

### Tipi di Campo

Il metadato `struct:field:proto` ti permette di sovrascrivere il tipo di campo
protobuf generato. Questo è particolarmente utile quando si lavora con tipi protobuf
ben noti o tipi da altri file proto. Accetta fino a quattro argomenti:

1. Il nome del tipo protobuf
2. (Opzionale) Il percorso di importazione del file proto
3. (Opzionale) Il nome del tipo Go
4. (Opzionale) Il percorso di importazione del pacchetto Go

```go
var MyType = Type("MyType", func() {
    // Sovrascrittura semplice del tipo
    Field(1, "status", Int32, func() {
        // Cambia da sint32 predefinito a int32
        Meta("struct:field:proto", "int32")
    })

    // Uso del tipo timestamp ben noto di Google
    Field(2, "created_at", Timestamp, func() {
        Meta("struct:field:proto", 
            "google.protobuf.Timestamp",           // Tipo Proto
            "google/protobuf/timestamp.proto",     // Importazione Proto
            "Timestamp",                           // Tipo Go
            "google.golang.org/protobuf/types/known/timestamppb") // Importazione Go
    })
})
```

Questo genera la seguente definizione protobuf:

```protobuf
import "google/protobuf/timestamp.proto";

message MyType {
    int32 status = 1;
    google.protobuf.Timestamp created_at = 2;
}
```

### Percorsi di Importazione

Il metadato `protoc:include` specifica i percorsi di importazione utilizzati quando si invoca il
compilatore protoc. Puoi impostarlo sia a livello di API che di servizio:

```go
var _ = API("calc", func() {
    // Percorsi di importazione globali per tutti i servizi
    Meta("protoc:include", 
        "/usr/include",
        "/usr/local/include")
})

var _ = Service("calculator", func() {
    // Percorsi di importazione specifici del servizio
    Meta("protoc:include", 
        "/usr/local/include/google/protobuf")
    
    // ... metodi del servizio ...
})
```

Quando impostato su una definizione API, i percorsi di importazione si applicano a tutti i servizi. Quando impostato
su un servizio, i percorsi si applicano solo a quel specifico servizio.

{{< alert title="Note Importanti" color="primary" >}}
- Il metadato `struct:field:proto` deve fornire tutte le informazioni di importazione necessarie quando si utilizzano tipi proto esterni
- I percorsi di importazione in `protoc:include` dovrebbero puntare a directory contenenti file .proto
- I percorsi di importazione a livello di servizio sono aggiuntivi ai percorsi a livello di API, non sostitutivi
{{< /alert >}}

## Controllo della Specifica OpenAPI

### Impostazioni OpenAPI di Base

Controlla la generazione e la formattazione delle specifiche OpenAPI:

```go
var _ = API("MyAPI", func() {
    // Controlla la generazione OpenAPI
    Meta("openapi:generate", "false")
    
    // Formatta l'output JSON
    Meta("openapi:json:prefix", "  ")
    Meta("openapi:json:indent", "  ")
})
```

Questo influenza come viene formattato il JSON OpenAPI:
```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "MyAPI",
    "version": "1.0"
  }
}
```

### Personalizzazione di Operazioni e Tipi

Puoi personalizzare come le operazioni e i tipi appaiono nella specifica OpenAPI utilizzando
diversi metadati:

#### ID delle Operazioni

Il metadato `openapi:operationId` ti permette di personalizzare come vengono
generati gli ID delle operazioni. Supporta segnaposto speciali che vengono sostituiti con valori
effettivi:

- `{service}` - sostituito con il nome del servizio
- `{method}` - sostituito con il nome del metodo
- `(#{routeIndex})` - sostituito con l'indice della rotta (solo quando un metodo ha più rotte)

Per esempio:
```go
var _ = Service("UserService", func() {
    Method("ListUsers", func() {
        // Genera operationId: "users/list"
        Meta("openapi:operationId", "users/list")  // Valore statico
    })
    
    Method("CreateUser", func() {
        // Genera operationId: "UserService.CreateUser"
        Meta("openapi:operationId", "{service}.{method}")
    })
    
    Method("UpdateUser", func() {
        // Per rotte multiple, genera:
        // - "UserService_UpdateUser_1" (prima rotta)
        // - "UserService_UpdateUser_2" (seconda rotta)
        Meta("openapi:operationId", "{service}_{method}_{#routeIndex}")
        
        HTTP(func() {
            PUT("/users/{id}")   // Prima rotta
            PATCH("/users/{id}") // Seconda rotta
        })
    })
})
```

#### Sommari delle Operazioni

Per impostazione predefinita, se non viene fornito alcun sommario tramite metadati, Goa genera un sommario:
1. Utilizzando la descrizione del metodo se ne è definita una
2. Se non esiste una descrizione, utilizzando il metodo HTTP e il percorso (es., "GET /users/{id}")

Il metadato `openapi:summary` ti permette di sovrascrivere questo comportamento predefinito. Il
sommario appare in cima a ogni operazione e dovrebbe fornire una breve
descrizione di ciò che fa l'operazione.

Puoi utilizzare:
- Una stringa statica
- Il segnaposto speciale `{path}` che viene sostituito con il percorso HTTP dell'operazione

```go
var _ = Service("UserService", func() {
    Method("CreateUser", func() {
        // Usa questa descrizione come sommario predefinito
        Description("Crea un nuovo utente nel sistema")
        
        HTTP(func() {
            POST("/users")
        })
    })
    
    Method("UpdateUser", func() {
        // Sovrascrive il sommario predefinito
        Meta("openapi:summary", "Gestisce la richiesta PUT a {path}")
        
        HTTP(func() {
            PUT("/users/{id}")
        })
    })
    
    Method("ListUsers", func() {
        // Nessun metadato di descrizione o sommario
        // Il sommario predefinito sarà: "GET /users"
        
        HTTP(func() {
            GET("/users")
        })
    })
})
```

Questo genera la seguente specifica OpenAPI:
```json
{
  "paths": {
    "/users": {
      "post": {
        "summary": "Crea un nuovo utente nel sistema",
        "operationId": "UserService.CreateUser",
        // ... altri dettagli dell'operazione ...
      },
      "get": {
        "summary": "GET /users",
        "operationId": "UserService.ListUsers",
        // ... altri dettagli dell'operazione ...
      }
    },
    "/users/{id}": {
      "put": {
        "summary": "Gestisce la richiesta PUT a /users/{id}",
        "operationId": "UserService.UpdateUser",
        // ... altri dettagli dell'operazione ...
      }
    }
  }
}
```

{{< alert title="Best Practice" color="primary" >}}
- Mantieni i sommari concisi ma descrittivi
- Usa una formulazione coerente tra operazioni correlate
- Considera di includere parametri chiave o vincoli nel sommario
- Usa {path} quando il percorso HTTP fornisce un contesto importante
{{< /alert >}}

#### Nomi dei Tipi

Il metadato `openapi:typename` ti permette di sovrascrivere come un tipo appare nella
specifica OpenAPI, senza influenzare il nome del tipo Go:

```go
var User = Type("User", func() {
    // Nella specifica OpenAPI, questo tipo sarà chiamato "CustomUser"
    Meta("openapi:typename", "CustomUser")
    
    Attribute("id", Int)
    Attribute("name", String)
})
```

#### Generazione di Esempi

Goa ti permette di specificare esempi per i tuoi tipi nel design. Se non vengono
specificati esempi, Goa genera esempi casuali per impostazione predefinita. Il metadato `openapi:example`
ti permette di disabilitare questo comportamento di generazione degli esempi:

```go
var User = Type("User", func() {
    // Specifica un esempio (questo verrà utilizzato nella specifica OpenAPI)
    Example(User{
        ID:   123,
        Name: "John Doe",
    })
    
    Attribute("id", Int)
    Attribute("name", String)
})

var Account = Type("Account", func() {
    // Disabilita la generazione di esempi per questo tipo
    // Nessun esempio apparirà nella specifica OpenAPI
    Meta("openapi:example", "false")
    
    Attribute("id", Int)
    Attribute("balance", Float64)
})

var _ = API("MyAPI", func() {
    // Disabilita la generazione di esempi per tutti i tipi
    Meta("openapi:example", "false")
})
```

{{< alert title="Nota" color="primary" >}}
- Per impostazione predefinita, Goa genera esempi casuali per i tipi senza esempi espliciti
- Usa il DSL `Example()` per specificare esempi personalizzati
- Usa `Meta("openapi:example", "false")` per impedire qualsiasi generazione di esempi
- Impostare `openapi:example` a false a livello di API influenza tutti i tipi
{{< /alert >}}

### Tag ed Estensioni

Puoi aggiungere tag ed estensioni personalizzate alla tua specifica OpenAPI sia a livello di
servizio che di metodo. I tag aiutano a raggruppare operazioni correlate, mentre le estensioni
ti permettono di aggiungere metadati personalizzati alla tua specifica API.

#### Tag a Livello di Servizio

Quando applicati a livello di servizio, i tag sono disponibili per tutti i metodi in quel servizio:

```go
var _ = Service("UserService", func() {
    // Definisci tag per l'intero servizio
    HTTP(func() {
        // Aggiungi un tag semplice
        Meta("openapi:tag:Users")
        
        // Aggiungi un tag con descrizione
        Meta("openapi:tag:Backend:desc", "Operazioni API Backend")
        
        // Aggiungi URL della documentazione al tag
        Meta("openapi:tag:Backend:url", "http://example.com/docs")
        Meta("openapi:tag:Backend:url:desc", "Documentazione API")
    })
    
    // Tutti i metodi in questo servizio erediteranno questi tag
    Method("CreateUser", func() {
        HTTP(func() {
            POST("/users")
        })
    })
    
    Method("ListUsers", func() {
        HTTP(func() {
            GET("/users")
        })
    })
})
```

#### Tag a Livello di Metodo

Puoi anche applicare tag a metodi specifici, sia aggiungendo che sovrascrivendo i tag a livello di servizio:

```go
var _ = Service("UserService", func() {
    Method("AdminOperation", func() {
        HTTP(func() {
            // Aggiungi tag aggiuntivi solo per questo metodo
            Meta("openapi:tag:Admin")
            Meta("openapi:tag:Admin:desc", "Operazioni Amministrative")
            
            POST("/admin/users")
        })
    })
})
```

#### Estensioni Personalizzate

Le estensioni possono essere aggiunte a più livelli per personalizzare diverse parti della specifica OpenAPI:

```go
var _ = API("MyAPI", func() {
    // Estensione a livello di API
    Meta("openapi:extension:x-api-version", `"1.0"`)
})

var _ = Service("UserService", func() {
    // Estensione a livello di servizio
    HTTP(func() {
        Meta("openapi:extension:x-service-class", `"premium"`)
    })
    
    Method("CreateUser", func() {
        // Estensione a livello di metodo
        HTTP(func() {
            Meta("openapi:extension:x-rate-limit", `{"rate": 100, "burst": 200}`)
            POST("/users")
        })
    })
})
```

Questo genera la seguente specifica OpenAPI:
```json
{
  "info": {
    "x-api-version": "1.0"
  },
  "tags": [
    {
      "name": "Users",
      "description": "Operazioni di gestione utenti"
    },
    {
      "name": "Backend",
      "description": "Operazioni API Backend",
      "externalDocs": {
        "description": "Documentazione API",
        "url": "http://example.com/docs"
      }
    },
    {
      "name": "Admin",
      "description": "Operazioni Amministrative"
    }
  ],
  "paths": {
    "/users": {
      "post": {
        "tags": ["Users", "Backend"],
        "x-service-class": "premium",
        "x-rate-limit": {
          "rate": 100,
          "burst": 200
        }
      },
      "get": {
        "tags": ["Users", "Backend"]
      }
    },
    "/admin/users": {
      "post": {
        "tags": ["Users", "Backend", "Admin"],
        "x-service-class": "premium"
      }
    }
  }
}
```

{{< alert title="Note Importanti" color="primary" >}}
- I tag a livello di servizio si applicano a tutti i metodi nel servizio
- I tag a livello di metodo vengono aggiunti ai tag a livello di servizio
- Le estensioni possono essere aggiunte a livello di API, servizio e metodo
- I valori delle estensioni devono essere stringhe JSON valide
- I tag aiutano a organizzare e raggruppare operazioni correlate nella documentazione API
{{< /alert >}} 