---
nav_group: reference
title: "Registro interno de herramientas"
linkTitle: "Registro"
weight: 110
description: "Despliega una pasarela en clúster para descubrir e invocar toolsets entre procesos."
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
- **Coordinan los pings de salud** con concesiones Redis que caducan, adquiridas por separado para cada toolset.
- **Comparten el estado de salud de los proveedores** entre todos los nodos.

Esto permite el escalado horizontal y la alta disponibilidad. Los clientes pueden conectarse a cualquier nodo y ver el mismo estado del registro.

{{< figure src="/images/diagrams/RegistryCluster.svg" alt="Registry Cluster Architecture" >}}

## Inicio rápido

### Uso de la biblioteca

Crea y ejecuta un nodo de registro mediante programación. `registry.New`
inicializa el catálogo y los registros de llamadas en Redis, los streams Pulse
y el planificador de salud. `Run` inicia el servidor gRPC y espera hasta el
apagado. El ejemplo usa direcciones locales de desarrollo; configura las
credenciales Redis y gRPC de tu despliegue.

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
| **Catálogo** | Esquemas de herramientas, identidades de admisión, concesiones de proveedores e historial de retiradas almacenados en Redis |
| **Health Tracker** | Supervisa la actividad del proveedor mediante ping/pong |
| **Stream Manager** | Gestiona los streams Pulse para el enrutamiento de llamadas a herramientas |
| **Registros de llamadas** | Conservan la identidad de la solicitud, el proveedor asignado, las fechas límite, el estado de publicación y el resultado final canónico |

### Flujo de llamadas a herramientas

Cuando se invoca `CallTool`, el registro ejecuta los siguientes pasos en secuencia:

1. **Validación de identidad y esquema**: El registro valida la carga útil y
   deriva un `tool_use_id` único dentro de la ejecución. Un reintento idéntico
   se vincula al mismo registro conservado.
2. **Espera de un proveedor**: Una llamada aún no publicada espera a que el
   toolset activo tenga un proveedor saludable, dentro de la fecha límite de
   ejecución existente de la llamada.
3. **Publicación atómica**: Una operación de Redis verifica que el proveedor
   seleccionado siga siendo el actual y acepte nuevas llamadas, y añade la
   solicitud exactamente una vez. Si un despliegue cambió el proveedor tras la
   comprobación de salud, la llamada aún no publicada selecciona al sustituto
   y vuelve a intentarlo dentro de la misma fecha límite.
4. **Ejecución inmutable**: La publicación fija la asignación al proveedor.
   La llamada ya no puede trasladarse porque podría haber comenzado un efecto
   externo.
5. **Entrega del resultado**: `CallTool` devuelve el token exacto del proveedor,
   la identidad del stream de resultados y las fechas límite de ejecución y
   conservación. El ejecutor lee ese stream hasta que el proveedor devuelve un
   resultado final o la fecha límite de ejecución determina el resultado de la
   llamada.

Si la fecha límite de ejecución vence antes de la publicación, el registro
guarda `call_not_admitted`, lo que permite al ejecutor elegir otro plan. Una
llamada publicada cuyo resultado sea incierto devuelve `outcome_unknown` y no
puede sustituirse.

## Integración del proveedor (lado del servicio)

El enrutamiento del registro es solo la mitad de la historia: los **proveedores deben ejecutar un bucle de ejecución de herramientas** dentro del proceso del servicio propietario del toolset.
Antes de invocar un manejador, el proveedor llama a `ClaimToolCall` con el
contexto del ciclo de vida de su worker y el timeout acotado existente para esa
solicitud, independientemente de la fecha límite de ejecución del mensaje. El
registro determina si la llamada ha expirado, ya tiene un resultado final o si
otra entrega posee el derecho de ejecución. En estos casos, el proveedor confirma
la recepción del mensaje sin invocar el manejador ni detener su bucle de ejecución. Solo tras
una decisión `execute` invoca el manejador con la fecha límite de ejecución
original del mensaje, sin ampliarla.

Para toolsets propios del servicio y respaldados por métodos (herramientas declaradas con `BindTo(...)`), la generación de código emite un adaptador de proveedor en:

- `gen/<service>/toolsets/<toolset>/provider.go`

El proveedor generado:

- Decodifica el JSON del payload entrante usando el códec de payload generado.
- Construye el payload del método Goa usando las transformaciones generadas.
- Llama al método del servicio enlazado.
- Codifica el JSON del resultado junto con cualquier server-data declarado usando el códec de resultado generado.

El siguiente ejemplo usa el módulo `example.com/registry-provider`, el
servicio `catalog` y su toolset `search`, enlazado a métodos y registrado como
`catalog.search`. Sustituye las dos rutas de importación de la aplicación y el
nombre del toolset por tus valores generados. `NewProvider`, `ToolSchemas` y
`SchemaFingerprint` proceden del paquete generado del toolset; conserva intactos
los esquemas generados. Los callbacks de registro siguen el ejemplo
**Service-Side Tool Providers** del archivo `AGENTS_QUICKSTART.md` generado en
la raíz del módulo ([Inicio rápido](../quickstart/)).

Pasa la implementación de tu servicio, un cliente Pulse creado con
`pulse.New(pulse.Options{Redis: rdb})` y una conexión gRPC al registro creada
con `grpc.NewClient` y las credenciales de tu despliegue. Proporciona un
`providerID` estable para este proceso y toolset, único entre las réplicas
activas, y el valor obligatorio `admissionRevision`, suministrado por el
despliegue y compartido por las réplicas del mismo registro. `Serve` crea el
identificador de instancia y lo pasa a los callbacks. Los métodos de servicio
enlazados deben respetar la cancelación del contexto. Ejecuta `serveTools`
dentro del ciclo de vida del servicio y espera a que termine antes de cerrar
cualquiera de los clientes. Al apagarse, el proveedor deja de aceptar trabajo
y finaliza las llamadas cuya ejecución posee, sus resultados y los acuses de
recibo dentro de `Options.ShutdownTimeout`. Solo una finalización correcta
permite liberar la concesión exacta, con el plazo independiente
`Registration.ReleaseTimeout`. Si la finalización falla, la autoridad termina
al caducar la concesión. Conserva y comunica los errores de finalización o
liberación aunque el error devuelto también coincida con `context.Canceled`.
A continuación se conectan todos los callbacks de registro obligatorios:

```go
package providers

import (
	"context"
	"encoding/json"
	"time"

	gencatalog "example.com/registry-provider/gen/catalog"
	gensearch "example.com/registry-provider/gen/catalog/toolsets/search"
	"goa.design/goa-ai/features/stream/pulse/clients/pulse"
	genregistrygrpc "goa.design/goa-ai/registry/gen/grpc/registry/client"
	genregistry "goa.design/goa-ai/registry/gen/registry"
	registrywire "goa.design/goa-ai/runtime/toolregistry"
	"goa.design/goa-ai/runtime/toolregistry/provider"
	"google.golang.org/grpc"
)

// serveTools runs the generated catalog provider until shutdown or a provider error.
// The caller owns the clients, service implementation, and deployment identifiers.
func serveTools(ctx context.Context, pulseClient pulse.Client, conn *grpc.ClientConn,
	serviceImpl gencatalog.Service, providerID, admissionRevision string) error {
	const toolsetID = "catalog.search"
	transport := genregistrygrpc.NewClient(conn, grpc.WaitForReady(true))
	registryClient := genregistry.NewClient(
		transport.Register(),
		transport.ReleaseProvider(),
		transport.DrainProvider(),
		transport.Unregister(),
		transport.Pong(),
		transport.ListToolsets(),
		transport.GetToolset(),
		transport.ResolveToolset(),
		transport.CheckAdmission(),
		transport.Search(),
		transport.CallTool(),
		transport.CallResolvedTool(),
		transport.RetryTool(),
		transport.CompleteToolCall(),
		transport.PublishToolOutputDelta(),
		transport.ReportToolCallOverload(),
		transport.ClaimToolCall(),
	)
	toolSchemas := gensearch.ToolSchemas()
	handler := gensearch.NewProvider(serviceImpl)
	return provider.Serve(ctx, pulseClient, toolsetID, handler,
		provider.Registration{
			AdmissionRevision: admissionRevision,
			Register: func(ctx context.Context, toolset, providerID, incarnationID, admissionRevision string) (provider.RegistrationLease, error) {
				schemaFingerprint, err := gensearch.SchemaFingerprint(toolset)
				if err != nil {
					return provider.RegistrationLease{}, err
				}
				result, err := registryClient.Register(ctx, &genregistry.RegisterPayload{
					Name:                  toolset,
					Tools:                 toolSchemas,
					ProviderID:            providerID,
					ProviderIncarnationID: incarnationID,
					AdmissionRevision:     admissionRevision,
					WireProtocolVersion:   registrywire.WireProtocolVersion,
					SchemaFingerprint:     schemaFingerprint,
				})
				if err != nil {
					return provider.RegistrationLease{}, err
				}
				return provider.RegistrationLease{
					RegistrationToken: result.RegistrationToken,
					Duration:          time.Duration(result.LeaseDurationMs) * time.Millisecond,
				}, nil
			},
			Drain: func(ctx context.Context, toolset, providerID, incarnationID, expectedToken string, settlementDuration time.Duration) error {
				return registryClient.DrainProvider(ctx, &genregistry.DrainProviderPayload{
					Name:                      toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ExpectedRegistrationToken: expectedToken,
					SettlementDurationMs:      settlementDuration.Milliseconds(),
				})
			},
			Release: func(ctx context.Context, toolset, providerID, incarnationID, expectedToken string) error {
				return registryClient.ReleaseProvider(ctx, &genregistry.ReleaseProviderPayload{
					Name:                      toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ExpectedRegistrationToken: expectedToken,
				})
			},
			Complete: func(ctx context.Context, toolset, providerID, incarnationID, providerToken, requestEventID string, result registrywire.ToolResultMessage) error {
				resultJSON, err := json.Marshal(result)
				if err != nil {
					return err
				}
				return registryClient.CompleteToolCall(ctx, &genregistry.CompleteToolCallPayload{
					Toolset:                   toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					RegistrationToken:         result.RegistrationToken,
					ToolUseID:                 result.ToolUseID,
					ResultJSON:                resultJSON,
					RequestEventID:            requestEventID,
					ProviderRegistrationToken: providerToken,
				})
			},
			PublishOutputDelta: func(ctx context.Context, toolset, providerID, incarnationID, providerToken, callToken, toolUseID, requestEventID, stream, delta string) error {
				return registryClient.PublishToolOutputDelta(ctx, &genregistry.PublishToolOutputDeltaPayload{
					Toolset:                   toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ProviderRegistrationToken: providerToken,
					CallRegistrationToken:     callToken,
					ToolUseID:                 toolUseID,
					RequestEventID:            requestEventID,
					Stream:                    stream,
					Delta:                     delta,
				})
			},
			ReportOverload: func(ctx context.Context, toolset, providerID, incarnationID, providerToken, callToken, toolUseID, requestEventID string) error {
				return registryClient.ReportToolCallOverload(ctx, &genregistry.ProviderToolCallClaimPayload{
					Toolset:                   toolset,
					ProviderID:                providerID,
					ProviderIncarnationID:     incarnationID,
					ProviderRegistrationToken: providerToken,
					CallRegistrationToken:     callToken,
					ToolUseID:                 toolUseID,
					RequestEventID:            requestEventID,
				})
			},
			Claim: func(ctx context.Context, claim provider.ClaimRequest) (provider.ClaimDisposition, error) {
				result, err := registryClient.ClaimToolCall(ctx, &genregistry.ClaimToolCallPayload{
					Toolset:                   claim.Toolset,
					ProviderID:                claim.ProviderID,
					ProviderIncarnationID:     claim.ProviderIncarnationID,
					ProviderRegistrationToken: claim.ProviderRegistrationToken,
					CallRegistrationToken:     claim.CallRegistrationToken,
					ToolUseID:                 claim.ToolUseID,
					RequestEventID:            claim.RequestEventID,
					ClaimOperationID:          claim.OperationID,
				})
				if err != nil {
					return "", err
				}
				return provider.ClaimDisposition(result.Disposition), nil
			},
		},
		provider.Options{
			ProviderID: providerID,
			Pong: func(ctx context.Context, providerID, incarnationID, pingID string) error {
				return registryClient.Pong(ctx, &genregistry.PongPayload{
					PingID:                pingID,
					Toolset:               toolsetID,
					ProviderID:            providerID,
					ProviderIncarnationID: incarnationID,
				})
			},
		},
	)
}
```

Los IDs de stream son deterministas:

- Llamadas a herramientas: `toolset:<toolsetID>:requests`
- Resultados: `result:<toolUseID>`

## Configuración

### Opciones del registro {#struct-config}

El [ejemplo de la biblioteca](#uso-de-la-biblioteca) muestra la configuración
mínima: pasa el cliente Redis de la aplicación en `Redis` y elige un `Name`
compartido para el clúster. Los nodos con el mismo nombre y base de datos Redis
comparten el catálogo, los registros de llamadas y la coordinación de salud.
El catálogo usa el mapa replicado Pulse `<name>:toolsets`.

Consulta [registry.Config](https://pkg.go.dev/goa.design/goa-ai/registry#Config) para ver la API completa y sus valores por
defecto. `PingInterval` y `MissedPingThreshold` controlan las comprobaciones
de salud; `ExecutionTimeout` limita las nuevas ejecuciones admitidas;
`ResultStreamTTL` controla la conservación de resultados; y
`ProviderLeaseDuration` controla la renovación del registro de proveedores.
`ExpectedToolsets` registra los nombres requeridos del catálogo en la
telemetría sin rechazar registros ni llamadas. `Logger` recibe los errores
al finalizar llamadas. Configura estas opciones al construir el registro.

### Almacenamiento en Redis {#implementaciones-de-almacén}

Redis almacena en el catálogo los esquemas de herramientas, las identidades
de admisión, las concesiones de proveedores, las marcas de tiempo de salud y
el historial de retiradas. Los registros de llamadas y los streams Pulse de
solicitudes y resultados también usan Redis. Usa Redis duradero para que las
réplicas y los procesos reiniciados observen los mismos registros y decisiones
de llamadas. La aplicación es propietaria del cliente Redis y lo cierra
después de detener el registro.

## Monitorización de la salud

El registro envía pings de salud por streams Pulse. Los proveedores responden mediante el método gRPC `Pong`.

### Cómo funciona

1. El planificador de salud lee los toolsets activos del catálogo compartido.
2. El nodo que posee la concesión de ping de un toolset envía un ping mientras exista un proveedor activo que acepte llamadas.
3. `Pong` actualiza el catálogo solo si la respuesta coincide con el registro, el proceso proveedor y la identidad de comprobación de salud actuales.
4. El enrutamiento requiere una concesión de proveedor no caducada que acepte nuevas llamadas y un pong aceptado suficientemente reciente.

La salud se deriva del catálogo usando la hora de Redis. La antigüedad del
último pong aceptado no debe superar
`(MissedPingThreshold + 1) × PingInterval`. Una llamada aún no publicada
espera a un proveedor saludable solo hasta su fecha límite de ejecución
existente.

### Coordinación distribuida

Cada nodo ejecuta un planificador local y compite por una concesión Redis
que caduca para cada toolset. El nodo que la adquiere realiza esa
comprobación de salud; tras su caducidad, otro nodo puede adquirirla.
Los nombres de las concesiones pertenecen al clúster del registro.

Las concesiones de proveedores, la identidad de comprobación de salud actual
y el último pong aceptado se guardan juntos en el catálogo. Cada nodo deriva
la salud de ese registro, por lo que una respuesta tardía de un proveedor
obsoleto no puede hacer que el registro actual se considere saludable.

## Integración del cliente

Usa el cliente de servicio generado del registro para las API de proveedores
y de invocación. Para descubrir el catálogo, `runtime/registry.NewClient`
envuelve ese mismo cliente y expone `ListToolsets`, `GetToolset` y `Search`,
con los tipos de recursos usados por `runtime/registry.Manager`.

El ejemplo lista el catálogo y recupera el esquema completo de un toolset
por nombre. Pasa una conexión creada con `grpc.NewClient` y las credenciales
de tu despliegue; quien llama conserva la propiedad de esa conexión. Se
conectan todos los endpoints del cliente generado, como en el ejemplo del
proveedor anterior.

```go
package discovery

import (
	"context"

	genregistrygrpc "goa.design/goa-ai/registry/gen/grpc/registry/client"
	genregistry "goa.design/goa-ai/registry/gen/registry"
	runtimeregistry "goa.design/goa-ai/runtime/registry"
	"google.golang.org/grpc"
)

// discoverTools lists the catalog and retrieves the schema of the named toolset.
// The caller creates the gRPC connection and keeps it open during discovery.
func discoverTools(ctx context.Context, conn *grpc.ClientConn, toolsetName string) (
	[]*runtimeregistry.ToolsetInfo, *runtimeregistry.ToolsetSchema, error,
) {
	transport := genregistrygrpc.NewClient(conn, grpc.WaitForReady(true))
	generated := genregistry.NewClient(
		transport.Register(),
		transport.ReleaseProvider(),
		transport.DrainProvider(),
		transport.Unregister(),
		transport.Pong(),
		transport.ListToolsets(),
		transport.GetToolset(),
		transport.ResolveToolset(),
		transport.CheckAdmission(),
		transport.Search(),
		transport.CallTool(),
		transport.CallResolvedTool(),
		transport.RetryTool(),
		transport.CompleteToolCall(),
		transport.PublishToolOutputDelta(),
		transport.ReportToolCallOverload(),
		transport.ClaimToolCall(),
	)
	client := runtimeregistry.NewClient(generated)
	toolsets, err := client.ListToolsets(ctx)
	if err != nil {
		return nil, nil, err
	}
	schema, err := client.GetToolset(ctx, toolsetName)
	if err != nil {
		return nil, nil, err
	}
	return toolsets, schema, nil
}
```

## API gRPC

El registro expone los siguientes métodos gRPC:

### Operaciones del proveedor

| Método | Descripción |
|--------|-------------|
| `Register` | Añade o renueva la concesión de un proveedor para el contrato de herramientas activo. Un contrato diferente espera a que terminen las concesiones anteriores. |
| `DrainProvider` | Impide que una concesión de proveedor reciba nuevas llamadas, pero conserva su autoridad para terminar las que ya posee. |
| `ReleaseProvider` | Elimina una concesión de proveedor concreta una vez que su proceso ha completado el trabajo aceptado. |
| `Unregister` | Retira intencionadamente la admisión activa exacta. La elimina del descubrimiento y del enrutamiento e impide permanentemente que vuelva el mismo token de admisión; no es una operación de despliegue. |
| `Pong` | Registra la salud del proveedor para la concesión actual y la época exacta de comprobación de salud. |
| `ClaimToolCall` | Concede la ejecución de una solicitud publicada a una concesión de proveedor concreta. |
| `CompleteToolCall` | Guarda el resultado final canónico de la llamada cuya ejecución se ha concedido y lo publica en el stream de resultados. |
| `PublishToolOutputDelta` | Publica un fragmento de progreso acotado, sin garantía de entrega, para una llamada cuya ejecución se ha concedido. |
| `ReportToolCallOverload` | Registra una instrucción de reintento acotada antes de que un proveedor ejecute una llamada que excede su capacidad. |

### Operaciones de descubrimiento

| Método | Descripción |
|--------|-------------|
| `ListToolsets` | Lista todos los toolsets registrados (con filtrado opcional por etiquetas). Devuelve solo metadatos, no los esquemas completos. |
| `GetToolset` | Obtiene el esquema completo de un toolset concreto, incluidos todos los esquemas de entrada/salida de sus herramientas. |
| `Search` | Busca toolsets por palabras clave que coincidan con el nombre, la descripción o las etiquetas. |

### Operaciones de invocación

| Método | Descripción |
|--------|-------------|
| `CallTool` | Valida y publica una llamada identificada dentro de una ejecución. Espera a un proveedor saludable dentro de la fecha límite existente, permite un cambio de proveedor solo antes de la publicación y devuelve la referencia exacta e inmutable de ejecución. |
| `RetryTool` | Vuelve a publicar la admisión original exacta después de registrar una sobrecarga del proveedor. Nunca traslada la ejecución a un proveedor sustituto. |

## Buenas prácticas

### Despliegue

- **Usa el mismo `Name`** para todos los nodos de un clúster para compartir el catálogo y las llamadas y coordinar las comprobaciones de salud.
- **Apunta a la misma instancia de Redis** para la coordinación del estado.
- **Despliega detrás de un balanceador de carga** para las conexiones de los clientes: todos los nodos sirven un estado idéntico.
- **Usa Redis duradero** para el catálogo, los registros de llamadas y los streams Pulse, de modo que las réplicas y los procesos reiniciados observen las mismas decisiones.

### Monitorización de la salud

- **Configura `PingInterval` y `MissedPingThreshold`** según la frecuencia de comprobación y la antigüedad de pong tolerada. Consulta los valores por defecto en `registry.Config`.
- **Observa la telemetría del catálogo y de salud** para distinguir los toolsets ausentes de los proveedores que no pueden aceptar llamadas en ese momento.
- **Conserva la fecha límite de ejecución**: las llamadas aún no publicadas esperan la recuperación del proveedor solo hasta su fecha límite existente.

### Escalado

- **Añade nodos** para manejar más conexiones gRPC: cada nodo puede servir cualquier petición.
- **Los nodos coordinan las comprobaciones de salud** mediante concesiones Redis que caducan para cada toolset.
- **No se requieren sesiones con afinidad**: los streams de resultados utilizan Redis para la entrega entre nodos, por lo que una llamada a una herramienta puede iniciarse en un nodo y completarse en otro.

## Próximos pasos

- Conoce los [Toolsets](./toolsets/) para definir herramientas.
- Explora [Producción](./production/) para patrones de despliegue.
- Lee sobre [Composición de agentes](./agent-composition/) para compartir herramientas entre agentes.


Consulta [Búsqueda de herramientas y catálogos dinámicos](../tool-search/) para la resolución actual, contratos generados, proveedores y migración.
