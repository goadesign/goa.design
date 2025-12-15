---
title: "Registro interno de herramientas"
linkTitle: "Registro"
weight: 9
description: "Deploy a clustered gateway for cross-process toolset discovery and invocation."
llm_optimized: true
---

El **Registro interno de herramientas** es un servicio de pasarela agrupado que permite el descubrimiento y la invocación de conjuntos de herramientas a través de los límites de los procesos. Está diseñado para escenarios en los que los conjuntos de herramientas son proporcionados por servicios separados que pueden escalar independientemente de los agentes que los consumen.

## Descripción general

El registro actúa como **catálogo** y **puerta de enlace**:

- **Catálogo**: Los agentes descubren los conjuntos de herramientas disponibles, sus esquemas y su estado de salud
- **Pasarela**: Las llamadas a las herramientas se dirigen a través del registro a los proveedores mediante flujos Pulse

Esto desvincula a los agentes de los proveedores de conjuntos de herramientas, lo que permite un escalado, despliegue y gestión del ciclo de vida independientes.

{{< figure src="/images/diagrams/RegistryTopology.svg" alt="Agent-Registry-Provider Topology" >}}

## Agrupación de nodos múltiples

Varios nodos de registro pueden participar en el mismo registro lógico utilizando el mismo `Name` en su configuración y conectándose a la misma instancia de Redis.

Los nodos con el mismo nombre automáticamente:

- **Comparten registros del conjunto de herramientas** a través de mapas replicados Pulse
- **Coordinan los pings de comprobación de estado** a través de tickers distribuidos (sólo un nodo hace pings a la vez)
- **Compartir el estado de salud del proveedor** entre todos los nodos

Esto permite un escalado horizontal y una alta disponibilidad. Los clientes pueden conectarse a cualquier nodo y ver el mismo estado de registro.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## Inicio rápido

### Uso de la biblioteca

Crea y ejecuta un nodo de registro mediante programación. Cuando se llama a `New()`, el registro se conecta a Redis e inicializa varios componentes Pulse: un nodo pool para la coordinación distribuida, dos mapas replicados para el estado de salud y el seguimiento del conjunto de herramientas, y gestores de flujo para el enrutamiento de llamadas a herramientas. El método `Run()` inicia el servidor gRPC y se bloquea hasta el apagado, gestionando automáticamente la terminación graceful.

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

### Ejemplo Binario

El paquete de registro incluye un binario de ejemplo para un despliegue rápido. Todos los nodos con el mismo `REGISTRY_NAME` apuntando a la misma instancia de Redis forman automáticamente un clúster: comparten los registros del conjunto de herramientas y coordinan las comprobaciones de estado sin configuración adicional.

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
|----------|-------------|---------|
`REGISTRY_ADDR` Dirección de escucha de gRPC `:9090` Nombre del clúster de registro
| `REGISTRY_NAME` | Nombre de cluster de registro | `registry` |
`REDIS_URL` URL de conexión a Redis `localhost:6379` | `REDIS_PASSWORD` URL de conexión a Redis
| `REDIS_PASSWORD` | Contraseña Redis | (ninguna) | | `PING_INTERVAL` | Contraseña Redis
| `PING_INTERVAL` | Intervalo de ping de comprobación de salud | `10s` |
| `MISSED_PING_THRESHOLD` | Pings perdidos antes de insalubre | `3` |

## Arquitectura

{{< figure src="/images/diagrams/RegistryArchitecture.svg" alt="Registry Internal Architecture" >}}

### Componentes

| Componente | Descripción |
|-----------|-------------|
| **Service** | Manejadores gRPC para descubrimiento e invocación | **Store** | Capa de persistencia para metadatos del conjunto de herramientas
| **Store** | Capa de persistencia para los metadatos del conjunto de herramientas (memoria o MongoDB) | | **Health Tracker** | Seguimiento de salud
| **Health Tracker** | Monitoriza la actividad del proveedor a través de ping/pong | | **Stream Manager** | Gestión de flujos de datos
| **Gestor de flujos** | Gestiona flujos Pulse para el enrutamiento de llamadas a herramientas | **Gestor de flujos de resultados** | Gestión de flujos Pulse para el enrutamiento de llamadas a herramientas
| **Result Stream Manager** | Gestiona la entrega de los resultados de las herramientas | **Result Stream Manager** | Gestiona la entrega de los resultados de las herramientas

### Flujo de llamadas a herramientas

Cuando se invoca `CallTool`, el registro realiza estos pasos en secuencia:

1. **Validación del esquema**: La carga útil se valida contra el esquema JSON de la herramienta utilizando un validador de esquema compilado
2. **Comprobación de estado**: El registro comprueba si el conjunto de herramientas ha respondido a pings recientes: los conjuntos de herramientas no saludables devuelven `service_unavailable` inmediatamente
3. **Creación de flujo de resultados**: Se crea un flujo Pulse temporal con un único `tool_use_id`, y la asignación se almacena en Redis para la entrega de resultados entre nodos
4. **Publicación de la solicitud**: La llamada a la herramienta se publica en el flujo de solicitudes del conjunto de herramientas (`toolset:<name>:requests`)
5. **Esperar resultado**: La pasarela se suscribe al flujo de resultados y se bloquea hasta que el proveedor responde o expira el tiempo de espera de 30 segundos

Este diseño asegura que las llamadas a la herramienta fallen rápidamente cuando los proveedores no son saludables, en lugar de esperar a que expiren los tiempos de espera.

## Configuración

### Config Struct

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

### Implementaciones de almacenes

El registro admite backends de almacenamiento conectables. El almacén persiste los metadatos del conjunto de herramientas (nombre, descripción, versión, etiquetas y esquemas de herramientas). Tenga en cuenta que el estado de salud y la coordinación de flujos siempre se gestionan a través de Redis/Pulse independientemente del almacén que elija; el almacén sólo afecta a la persistencia de los metadatos del conjunto de herramientas.

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

El registro monitoriza automáticamente la salud del proveedor mediante mensajes ping/pong a través de flujos Pulse.

### Cómo funciona

1. El registro envía mensajes periódicos `ping` al flujo de cada conjunto de herramientas registrado
2. Los proveedores responden con mensajes `pong` a través del método `Pong` gRPC
3. Si un proveedor pierde `MissedPingThreshold` pings consecutivos, se marca como no saludable
4. Los conjuntos de herramientas no saludables se excluyen del enrutamiento `CallTool`

El rastreador de salud utiliza un umbral de caducidad calculado como `(MissedPingThreshold + 1) × PingInterval`. Con los valores predeterminados (3 pings perdidos, intervalo de 10s), un conjunto de herramientas se convierte en no saludable después de 40 segundos sin un pong. Esto da a los proveedores tiempo suficiente para responder y, al mismo tiempo, detecta los fallos con razonable rapidez.

### Coordinación distribuida

En un clúster multinodo, los pings de comprobación de estado se coordinan mediante tickers distribuidos por Pulse. El ticker se asegura de que exactamente un nodo envía pings en un momento dado. Si ese nodo falla, otro toma el relevo automáticamente en un intervalo de pings.

Todos los nodos comparten el estado de salud a través de un mapa replicado de Pulse. Cuando un nodo recibe un ping, actualiza el mapa compartido con la marca de tiempo actual. Cuando cualquier nodo comprueba el estado de salud, lee de este mapa compartido, de modo que todos los nodos tienen una visión coherente del estado de salud del proveedor.

## Integración con el cliente

Los agentes se conectan al registro utilizando el cliente gRPC generado. El `GRPCClientAdapter` envuelve el cliente gRPC sin procesar y proporciona una interfaz más limpia para el descubrimiento y la invocación. Dado que todos los nodos del registro comparten estado, los clientes pueden conectarse a cualquier nodo; utilice un equilibrador de carga en producción para la conmutación por error automática.

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

| Método Descripción
|--------|-------------|
| `Register` | Registra un conjunto de herramientas en el registro. Valida los esquemas de herramientas, crea el flujo de peticiones e inicia el seguimiento de salud. Devuelve el ID del flujo para que el proveedor se suscriba. |
| `Unregister` | Eliminar un conjunto de herramientas del registro. Detiene los pings de salud y elimina los metadatos, pero no destruye el flujo subyacente. |
| `EmitToolResult` | Emitir el resultado de la ejecución de una herramienta. Busca el flujo de resultados de Redis (permitiendo la entrega entre nodos) y publica el resultado. |
| `Pong` | Responde a un ping de comprobación de salud. Actualiza la marca de tiempo del último ping en el mapa de salud compartido. |

### Operaciones de descubrimiento

| Método | Descripción
|--------|-------------|
| `ListToolsets` | Lista todos los conjuntos de herramientas registrados (con filtrado opcional de etiquetas). Devuelve sólo metadatos, no esquemas completos. |
`GetToolset` | Obtener el esquema completo de un conjunto de herramientas específico, incluyendo todos los esquemas de entrada/salida de la herramienta. |
| `Search` | Buscar conjuntos de herramientas por palabra clave que coincida con el nombre, la descripción o las etiquetas. |

### Operaciones de invocación

| Método Descripción
|--------|-------------|
| `CallTool` | Invoca una herramienta a través de la puerta de enlace del registro. Valida la carga útil, comprueba la salud, la ruta al proveedor, y espera el resultado (30s tiempo de espera). |

## Mejores prácticas

### Despliegue

- **Utilizar el mismo `Name`** para todos los nodos de un clúster-esto determina los nombres de recursos compartidos Pulse
- **Apuntar a la misma instancia de Redis** para la coordinación de estados
- **Desplegar detrás de un balanceador de carga** para las conexiones de los clientes-todos los nodos sirven idéntico estado
- **Utilizar el almacén MongoDB** en producción para la persistencia en los reinicios (el almacén en memoria pierde los registros en el reinicio)

### Monitorización del estado

- **Establezca un `PingInterval`** apropiado basado en sus requisitos de latencia (por defecto: 10s). Valores más bajos detectan fallos más rápido pero aumentan el tráfico de Redis.
- **Ajuste `MissedPingThreshold`** para equilibrar entre falsos positivos y velocidad de detección (por defecto: 3). El umbral de estancamiento es `(threshold + 1) × interval`.
- **Supervisar el estado de salud** a través de métricas o registros: los conjuntos de herramientas no saludables causan errores inmediatos `service_unavailable` en lugar de tiempos de espera

### Escalado

- **Añadir nodos** para manejar más conexiones gRPC-cada nodo puede servir cualquier petición
- **Los nodos comparten el trabajo** a través de los tickers distribuidos Pulse-sólo un nodo hace ping a cada conjunto de herramientas a la vez
- **No se requieren sesiones fijas**: los flujos de resultados utilizan Redis para la entrega entre nodos, por lo que una llamada a una herramienta puede iniciarse en un nodo y completarse en otro

## Próximos pasos

- Conozca [Toolsets](./toolsets/) para definir herramientas
- Explorar [Producción](./production/) para patrones de despliegue
- Conozca [Composición de agentes](./agent-composition/) para compartir herramientas entre agentes
