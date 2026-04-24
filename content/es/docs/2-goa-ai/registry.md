---
title: "Registro interno de herramientas"
linkTitle: "Registro"
weight: 9
description: "Deploy a clustered gateway for cross-process toolset discovery and invocation."
llm_optimized: true
---

El **Registro interno de herramientas** es un servicio de pasarela en clúster que permite el descubrimiento y la invocación de toolsets a través de los límites de los procesos. Está diseñado para escenarios en los que los toolsets son proporcionados por servicios separados que pueden escalar independientemente de los agentes que los consumen.

## Descripción general

El registro actúa simultáneamente como **catálogo** y como **pasarela**:

- **Catálogo**: Los agentes descubren los toolsets disponibles, sus esquemas y su estado de salud.
- **Pasarela**: Las llamadas a herramientas se enrutan a través del registro hacia los proveedores mediante streams Pulse.

Esto desacopla a los agentes de los proveedores de toolsets, habilitando escalado, despliegue y gestión del ciclo de vida independientes.

### Registro de herramientas vs registro de prompts

Son sistemas distintos con responsabilidades distintas:

- **Registro interno de herramientas** (esta página): descubrimiento/invocación entre procesos de toolsets y tool calls.
- **Registro de prompts del runtime** (`runtime.PromptRegistry`): registro y render de prompt specs dentro del proceso, opcionalmente respaldado por un prompt store (`runtime.WithPromptStore`).

El registro de herramientas no almacena plantillas de prompts ni resuelve overrides de prompts. El render de prompts permanece en la capa runtime/planner y emite eventos de observabilidad `prompt_rendered`.

{{< figure src="/images/diagrams/RegistryTopology.svg" alt="Agent-Registry-Provider Topology" >}}

## Clustering multinodo

Varios nodos de registro pueden participar en el mismo registro lógico utilizando el mismo `Name` en su configuración y conectándose a la misma instancia de Redis.

Los nodos con el mismo nombre automáticamente:

- **Comparten los registros de toolsets** a través de mapas replicados Pulse.
- **Coordinan los pings de comprobación de estado** mediante tickers distribuidos (solo un nodo envía pings en cada instante).
- **Comparten el estado de salud de los proveedores** entre todos los nodos.

Esto permite el escalado horizontal y la alta disponibilidad. Los clientes pueden conectarse a cualquier nodo y ver el mismo estado del registro.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## Inicio rápido

### Uso de la biblioteca

Crea y ejecuta un nodo de registro mediante programación. Cuando se invoca `New()`, el registro se conecta a Redis e inicializa varios componentes Pulse: un nodo pool para la coordinación distribuida, dos mapas replicados para el estado de salud y el seguimiento de toolsets, y gestores de streams para el enrutamiento de llamadas a herramientas. El método `Run()` arranca el servidor gRPC y se bloquea hasta el apagado, gestionando automáticamente la terminación graceful.

```go
package main

import (
    "context"
    "log"

    "github.com/redis/go-redis/v9"
    "goa.design/goa-ai/registry"
)

func main() {
    ctx := context.Background()

    // Connect to Redis
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    defer rdb.Close()

    // Create the registry
    reg, err := registry.New(ctx, registry.Config{
        Redis: rdb,
        Name:  "my-registry",  // Nodes with same name form a cluster
    })
    if err != nil {
        log.Fatal(err)
    }

    // Run the gRPC server (blocks until shutdown)
    log.Println("starting registry on :9090")
    if err := reg.Run(ctx, ":9090"); err != nil {
        log.Fatal(err)
    }
}
```

### Binario de ejemplo

El paquete del registro incluye un binario de ejemplo para un despliegue rápido. Todos los nodos con el mismo `REGISTRY_NAME` apuntando a la misma instancia de Redis forman automáticamente un clúster: comparten los registros de toolsets y coordinan las comprobaciones de salud sin configuración adicional.

```bash
# Single node (development)
REDIS_URL=localhost:6379 go run ./registry/cmd/registry

# Multi-node cluster (production)
REGISTRY_NAME=prod REGISTRY_ADDR=:9090 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9091 REDIS_URL=redis:6379 ./registry
REGISTRY_NAME=prod REGISTRY_ADDR=:9092 REDIS_URL=redis:6379 ./registry
```

### Variables de entorno

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `REGISTRY_ADDR` | Dirección de escucha gRPC | `:9090` |
| `REGISTRY_NAME` | Nombre del clúster de registro | `registry` |
| `REDIS_URL` | URL de conexión a Redis | `localhost:6379` |
| `REDIS_PASSWORD` | Contraseña de Redis | (ninguna) |
| `PING_INTERVAL` | Intervalo entre pings de comprobación de salud | `10s` |
| `MISSED_PING_THRESHOLD` | Pings perdidos antes de marcar como no saludable | `3` |

## Arquitectura

{{< figure src="/images/diagrams/RegistryArchitecture.svg" alt="Registry Internal Architecture" >}}

### Componentes

| Componente | Descripción |
|-----------|-------------|
| **Service** | Manejadores gRPC para descubrimiento e invocación |
| **Store** | Capa de persistencia para los metadatos de toolsets (memoria o MongoDB) |
| **Health Tracker** | Supervisa la actividad del proveedor mediante ping/pong |
| **Stream Manager** | Gestiona los streams Pulse para el enrutamiento de llamadas a herramientas |
| **Result Stream Manager** | Gestiona la entrega de los resultados de las herramientas |

### Flujo de llamadas a herramientas

Cuando se invoca `CallTool`, el registro ejecuta los siguientes pasos en secuencia:

1. **Validación del esquema**: La carga útil se valida contra el JSON Schema de la herramienta utilizando el validador de esquemas del toolregistry del runtime.
2. **Comprobación de salud**: El registro verifica si el toolset ha respondido a los pings recientes; los toolsets no saludables devuelven `service_unavailable` inmediatamente.
3. **Creación del stream de resultados**: Se crea un stream Pulse temporal con un `tool_use_id` único, y la asignación se almacena en Redis para la entrega de resultados entre nodos.
4. **Publicación de la solicitud**: La llamada a la herramienta se publica en el stream de solicitudes del toolset (`toolset:<name>:requests`).
5. **Espera del resultado**: La pasarela se suscribe al stream de resultados y se bloquea hasta que el proveedor responde o expira el timeout de 30 segundos.

Este diseño garantiza que las llamadas a herramientas fallen rápidamente cuando los proveedores no están saludables, en lugar de esperar a que venzan los timeouts.

## Integración del proveedor (lado del servicio)

El enrutamiento del registro es solo la mitad de la historia: los **proveedores deben ejecutar un bucle de ejecución de herramientas** dentro del proceso del servicio propietario del toolset.

Para toolsets propios del servicio y respaldados por métodos (herramientas declaradas con `BindTo(...)`), la generación de código emite un adaptador de proveedor en:

- `gen/<service>/toolsets/<toolset>/provider.go`

El proveedor generado:

- Decodifica el JSON del payload entrante usando el códec de payload generado.
- Construye el payload del método Goa usando las transformaciones generadas.
- Llama al método del servicio enlazado.
- Codifica el JSON del resultado junto con cualquier server-data declarado usando el códec de resultado generado.

Para servir llamadas a herramientas desde la pasarela del registro, conecta el proveedor generado al bucle de proveedor del runtime (`goa.design/goa-ai/runtime/toolregistry/provider`):

```go
handler := toolsetpkg.NewProvider(serviceImpl)
go func() {
    err := provider.Serve(ctx, pulseClient, toolsetID, handler, provider.Options{
        Pong: func(ctx context.Context, pingID string) error {
            return registryClient.Pong(ctx, &registry.PongPayload{
                PingID:  pingID,
                Toolset: toolsetID,
            })
        },
    })
    if err != nil {
        panic(err)
    }
}()
```

Los IDs de stream son deterministas:

- Llamadas a herramientas: `toolset:<toolsetID>:requests`
- Resultados: `result:<toolUseID>`

## Configuración

### Struct Config

El campo `Name` es especialmente importante: determina los nombres de los recursos Pulse utilizados para la coordinación. El pool se denomina `<name>`, el mapa de salud `<name>:health`, y el mapa de registro `<name>:toolsets`. Los nodos con nombres y conexiones Redis coincidentes se descubren automáticamente entre sí.

```go
type Config struct {
    // Redis is the Redis client for Pulse operations. Required.
    Redis *redis.Client

    // Store is the persistence layer for toolset metadata.
    // Defaults to an in-memory store if not provided.
    Store store.Store

    // Name is the registry cluster name.
    // Nodes with the same Name and Redis connection form a cluster.
    // Defaults to "registry" if not provided.
    Name string

    // PingInterval is the interval between health check pings.
    // Defaults to 10 seconds if not provided.
    PingInterval time.Duration

    // MissedPingThreshold is the number of consecutive missed pings
    // before marking a toolset as unhealthy.
    // Defaults to 3 if not provided.
    MissedPingThreshold int

    // ResultStreamMappingTTL is the TTL for tool_use_id to stream_id mappings.
    // Defaults to 5 minutes if not provided.
    ResultStreamMappingTTL time.Duration

    // PoolNodeOptions are additional options for the Pulse pool node.
    PoolNodeOptions []pool.NodeOption
}
```

### Implementaciones de almacén

El registro soporta backends de almacenamiento intercambiables. El almacén persiste los metadatos de toolsets (nombre, descripción, versión, etiquetas y esquemas de herramientas). Ten en cuenta que el estado de salud y la coordinación de streams siempre se gestionan a través de Redis/Pulse con independencia del almacén que elijas: el almacén solo afecta a la persistencia de los metadatos del toolset.

```go
import (
    "goa.design/goa-ai/registry/store/memory"
    "goa.design/goa-ai/registry/store/mongo"
)

// In-memory store (default, for development)
reg, _ := registry.New(ctx, registry.Config{
    Redis: rdb,
    // Store defaults to memory.New()
})

// MongoDB store (for production persistence)
mongoStore, _ := mongo.New(mongoClient, "registry", "toolsets")
reg, _ := registry.New(ctx, registry.Config{
    Redis: rdb,
    Store: mongoStore,
})
```

## Monitorización de la salud

El registro monitoriza automáticamente la salud de los proveedores mediante mensajes ping/pong a través de streams Pulse.

### Cómo funciona

1. El registro envía mensajes `ping` periódicos al stream de cada toolset registrado.
2. Los proveedores responden con mensajes `pong` a través del método gRPC `Pong`.
3. Si un proveedor pierde `MissedPingThreshold` pings consecutivos, se marca como no saludable.
4. Los toolsets no saludables quedan excluidos del enrutamiento de `CallTool`.

El health tracker utiliza un umbral de obsolescencia calculado como `(MissedPingThreshold + 1) × PingInterval`. Con los valores por defecto (3 pings perdidos, intervalo de 10s), un toolset se considera no saludable tras 40 segundos sin un pong. Esto concede a los proveedores tiempo suficiente para responder y, al mismo tiempo, detecta los fallos con rapidez razonable.

### Coordinación distribuida

En un clúster multinodo, los pings de comprobación de salud se coordinan mediante tickers distribuidos de Pulse. El ticker garantiza que exactamente un nodo envía pings en cada instante: si ese nodo cae, otro nodo toma el relevo automáticamente en un intervalo de ping.

Todos los nodos comparten el estado de salud a través de un mapa replicado de Pulse. Cuando se recibe un pong en cualquier nodo, este actualiza el mapa compartido con la marca de tiempo actual. Cuando cualquier nodo comprueba el estado de salud, lee de este mapa compartido, de modo que todos los nodos tienen una visión coherente del estado de salud de los proveedores.

## Integración del cliente

Los agentes se conectan al registro utilizando el cliente gRPC generado. El `GRPCClientAdapter` envuelve el cliente gRPC crudo y proporciona una interfaz más limpia para el descubrimiento y la invocación. Dado que todos los nodos del registro comparten estado, los clientes pueden conectarse a cualquier nodo: utiliza un balanceador de carga en producción para la conmutación por error automática.

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    
    registrypb "goa.design/goa-ai/registry/gen/grpc/registry/pb"
    runtimeregistry "goa.design/goa-ai/runtime/registry"
)

// Connect to the registry
conn, _ := grpc.NewClient("localhost:9090",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
defer conn.Close()

// Create the client adapter
client := runtimeregistry.NewGRPCClientAdapter(
    registrypb.NewRegistryClient(conn),
)

// Discover toolsets
toolsets, _ := client.ListToolsets(ctx)
for _, ts := range toolsets {
    fmt.Printf("Toolset: %s (%d tools)\n", ts.Name, ts.ToolCount)
}

// Get full schema for a toolset
schema, _ := client.GetToolset(ctx, "data-tools")
for _, tool := range schema.Tools {
    fmt.Printf("  Tool: %s - %s\n", tool.Name, tool.Description)
}
```

## API gRPC

El registro expone los siguientes métodos gRPC:

### Operaciones del proveedor

| Método | Descripción |
|--------|-------------|
| `Register` | Registra un toolset en el registro. Valida los esquemas de herramientas, crea el stream de solicitudes e inicia el seguimiento de salud. Devuelve el ID del stream al que se suscribirá el proveedor. |
| `Unregister` | Elimina un toolset del registro. Detiene los pings de salud y borra los metadatos, pero no destruye el stream subyacente. |
| `EmitToolResult` | Emite el resultado de la ejecución de una herramienta. Busca el stream de resultados en Redis (permitiendo la entrega entre nodos) y publica el resultado. |
| `Pong` | Responde a un ping de comprobación de salud. Actualiza la marca de tiempo del último pong en el mapa de salud compartido. |

### Operaciones de descubrimiento

| Método | Descripción |
|--------|-------------|
| `ListToolsets` | Lista todos los toolsets registrados (con filtrado opcional por etiquetas). Devuelve solo metadatos, no los esquemas completos. |
| `GetToolset` | Obtiene el esquema completo de un toolset concreto, incluidos todos los esquemas de entrada/salida de sus herramientas. |
| `Search` | Busca toolsets por palabras clave que coincidan con el nombre, la descripción o las etiquetas. |

### Operaciones de invocación

| Método | Descripción |
|--------|-------------|
| `CallTool` | Invoca una herramienta a través de la pasarela del registro. Valida la carga útil, comprueba la salud, enruta al proveedor y espera el resultado (timeout de 30s). |

## Buenas prácticas

### Despliegue

- **Utiliza el mismo `Name`** para todos los nodos de un clúster: esto determina los nombres compartidos de los recursos Pulse.
- **Apunta a la misma instancia de Redis** para la coordinación del estado.
- **Despliega detrás de un balanceador de carga** para las conexiones de los clientes: todos los nodos sirven un estado idéntico.
- **Usa el almacén MongoDB** en producción para la persistencia entre reinicios (el almacén en memoria pierde los registros al reiniciar).

### Monitorización de la salud

- **Establece un `PingInterval` apropiado** según tus requisitos de latencia (por defecto: 10s). Valores más bajos detectan fallos más rápidamente, pero aumentan el tráfico de Redis.
- **Ajusta `MissedPingThreshold`** para equilibrar falsos positivos y velocidad de detección (por defecto: 3). El umbral de obsolescencia es `(threshold + 1) × interval`.
- **Monitoriza el estado de salud** mediante métricas o logs: los toolsets no saludables provocan errores `service_unavailable` inmediatos en lugar de timeouts.

### Escalado

- **Añade nodos** para manejar más conexiones gRPC: cada nodo puede servir cualquier petición.
- **Los nodos se reparten el trabajo** mediante los tickers distribuidos de Pulse: solo un nodo hace ping a cada toolset en cada momento.
- **No se requieren sesiones con afinidad**: los streams de resultados utilizan Redis para la entrega entre nodos, por lo que una llamada a una herramienta puede iniciarse en un nodo y completarse en otro.

## Próximos pasos

- Conoce los [Toolsets](./toolsets/) para definir herramientas.
- Explora [Producción](./production/) para patrones de despliegue.
- Lee sobre [Composición de agentes](./agent-composition/) para compartir herramientas entre agentes.
