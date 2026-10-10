---
nav_group: guides
title: Integración MCP
weight: 50
description: "Crea servidores y clientes MCP tipados con autorización, entrada del usuario, trabajos duraderos, Apps y Skills."
llm_optimized: true
aliases:
---

Goa-AI permite **crear servidores MCP** y **consumir herramientas MCP externas**. Añade declaraciones MCP a un servicio Goa para exponer métodos como herramientas, publicar recursos y proporcionar plantillas de prompts. El generador produce el manejo del protocolo JSON-RPC y los adaptadores de servicio. Alojar un servidor MCP no requiere ejecutar un agente Goa-AI.

Los callers HTTP y stdio envían solicitudes independientes con metadatos del protocolo. No hay negociación de inicialización ni sesión del protocolo. La interfaz `Caller` invoca herramientas; `Listen` recibe notificaciones de cambios. Los clientes JSON-RPC generados por Goa también exponen las operaciones de recursos, prompts, descubrimiento y completado declaradas por el servicio.

Los servidores HTTP generados también aceptan clientes MCP básicos `2025-11-25` en la misma URL POST. Regenera el servidor; no cambian las interfaces de servicio ni los constructores. `initialize` responde con `2025-11-25`; después las llamadas incluyen `MCP-Protocol-Version: 2025-11-25` sin identificador de sesión. Herramientas, recursos, prompts y sugerencias de argumentos conservan autenticación, autorización, middleware y validación tipada. Los resultados objeto mantienen su forma; los escalares, arrays y uniones sin etiqueta usan `{"value": ...}` y un esquema objeto correspondiente. Los resultados estructurados también se incluyen como contenido de texto. Esta vía anterior no ofrece Tasks, suscripciones a cambios ni solicitudes de entrada adicional del cliente. Los callers incluidos siguen usando `2026-07-28`.

Un solo diseño define esquemas de herramientas, decodificación tipada, validación, adaptadores del servidor y clientes. Los endpoints Goa configurados conservan autenticación, autorización, middleware y comportamiento de la aplicación. Desarrolladores y agentes de programación editan ese contrato y el código de la aplicación; `goa gen` mantiene coherentes las interfaces derivadas. Los servidores MCP generados usan HTTP. Los clientes de subprocesos siguen disponibles; la generación de servidores stdio queda aplazada.

Antes de generar este servidor, instala la versión de desarrollo verificada y su dependencia Goa correspondiente siguiendo la [configuración del módulo en el inicio rápido](../quickstart/).

| Necesidad | Declaración o composición |
|---|---|
| Herramientas, recursos, prompts y sugerencias | `Tool`, `Resource`, `ResourceReader`, `Prompt`, `PromptCompletion`, `ResourceCompletion` |
| Catálogos autorizados y notificaciones | `ToolCatalog`, `PromptCatalog`, `ResourceCatalog`, `ResourceTemplateCatalog`, `SubscriptionSource` |
| Formularios o consentimiento para abrir una URL | `InputExchange` en un método Goa existente |
| Trabajos asíncronos y respuestas posteriores del host | `TaskExchange` con creación, lectura, respuesta y cancelación |
| Interfaces en el navegador del host MCP | `ToolUI`, `ToolVisibility`, `ToolMetadata` y recursos ordinarios |
| Instrucciones y archivos de apoyo | `SkillCatalog`, `SkillLookup`, `ResourceDirectory` opcional y carga del host |

Empieza por el servidor de abajo y añade las capacidades necesarias.

## Visión General

La integración MCP sigue este flujo de trabajo:

1. **Diseño del servicio**: Declare el servidor MCP a través del DSL MCP de Goa
2. **Diseño del agente**: Haga referencia a esa suite mediante un conjunto de herramientas declarado con `FromMCP(...)` o `FromExternalMCP(...)`
3. **Generación de código**: Produce el servidor MCP JSON-RPC (cuando está respaldado por Goa), además de helpers de registro en runtime y specs/codecs del conjunto de herramientas (propiedad de la suite)
4. **Cableado en tiempo de ejecución**: Instancie un `mcpruntime.Caller` HTTP o
   stdio. El caller HTTP acepta una respuesta JSON o un flujo de eventos HTTP.
   Los helpers generados registran el conjunto de herramientas y adaptan los
   errores JSON-RPC a valores `planner.ToolFailure`
5. **Ejecución del planificador**: Los planificadores construyen llamadas con
   descriptores tipados generados; el runtime reenvía el JSON canónico al caller
   MCP, registra los resultados y expone telemetría estructurada

---

## Declaración de conjuntos de herramientas MCP

### En el diseño del servicio

En primer lugar, declare el servidor MCP en su diseño de servicio Goa:

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

### En el diseño del agente

A continuación, haga referencia a la suite MCP en su agente:

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

### Servidores MCP externos con esquemas en línea

Para servidores MCP externos (no respaldados por Goa), declare las herramientas con esquemas en línea:

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

## Valores de URL y atributos mapeados

Use la notación `Param("payload_field:url_name")` de Goa para distinguir un campo del payload de un parámetro de la URL:

```go
JSONRPC(func() {
    POST("/organizations/{organization}/mcp")
    Param("organization_id:organization")
})
```

La URL proporciona `organization_id`. Los argumentos de herramientas y prompts, sus esquemas, ejemplos y codecs generados excluyen ese campo. Un campo de dominio independiente llamado `organization` sigue siendo un argumento. Cada método conserva su tipo, nombre de campo Go y validación. Los valores de URL inválidos se rechazan antes de ejecutar el endpoint configurado. Se conservan las rutas completas de la API y del servicio padre.

Los clientes de protocolo generados transportan estos valores fuera de los parámetros JSON-RPC. `NewCaller` generado los recibe en el orden de la ruta después de la política de reintentos; para esta ruta, pase `"blue"` al final. Ese caller mantiene la misma dirección en cada llamada. `NewHTTPCaller` recibe la URL completa, como `https://example.com/organizations/blue/mcp`. Regenere juntos clientes, servidores y contratos de agentes.

---

## Alojar el servidor generado

Pase los endpoints Goa originales ya configurados a `NewMCPAdapter` y construya el servidor HTTP generado. Pase los orígenes de navegador permitidos como argumentos de cadena finales de su constructor `New`, por ejemplo `"https://app.example.com"`. Sin orígenes, se aceptan solicitudes sin la cabecera `Origin` y se rechazan las que la incluyen.

Use `Server.Use` para instalar middleware HTTP antes de recibir solicitudes. `Mount(mux)` y las llamadas directas a `ServeHTTP` comparten las comprobaciones de origen, método HTTP, cabeceras MCP y metadatos antes del middleware o del trabajo del servicio. La lista de orígenes se copia durante la construcción. Sustituya `MountWithOrigins` por argumentos del constructor y use `ServeHTTP` en lugar del campo interno `Handler`, que se elimina. Regenere los servidores y actualice sus llamadores juntos.

Si un plugin del generador declara dependencias obligatorias del servidor mediante el plan de construcción de Goa, pase sus valores tipados antes de los argumentos finales de origen. El arranque del ejemplo nativo llama a las funciones de construcción correspondientes de la aplicación. Configure esas funciones antes de iniciar el servidor de ejemplo.

Para rutas con parámetros de URL, registre `ServeHTTP` en el mismo mux que pasó a `New`, o use `Mount(mux)`. El mux proporciona los valores de ruta a los decodificadores generados.

---

## Cableado en tiempo de ejecución

En tiempo de ejecución, instancie un caller MCP y registre el conjunto de herramientas:

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

## Tipos de caller MCP

Goa-AI admite HTTP y stdio a través del paquete `runtime/mcp`. Ambos callers
implementan la interfaz `Caller`:

```go
type Caller interface {
    CallTool(ctx context.Context, req CallRequest) (CallResponse, error)
    GetTask(ctx context.Context, taskID string) (Task, error)
    UpdateTask(ctx context.Context, taskID string, responses map[string]json.RawMessage) error
    CancelTask(ctx context.Context, taskID string) error
}
```

`CallRequest` contiene el nombre de la herramienta, los argumentos JSON y una continuación opcional propiedad del host. `CallResponse.Content` usa `content.Blocks` de `runtime/content`: valores ordenados de texto, imagen, audio, enlace a recurso o recurso incorporado. El JSON estructurado se conserva por separado en `StructuredContent`. `InputRequired` deja la operación sin terminar; el host proporciona la entrada solicitada antes de continuar.

### Caller HTTP

Para servidores MCP accesibles a través de HTTP JSON-RPC:

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

El constructor valida el endpoint y la identidad de la aplicación sin realizar solicitudes de red. Cada operación envía JSON-RPC mediante HTTP `POST` y acepta JSON o un flujo de eventos. Si se omite `Client`, usa `http.DefaultClient`; la aplicación define los plazos mediante el contexto y el cliente HTTP.

### Caller Stdio

Para servidores MCP que se ejecutan como subprocesos y se comunican a través de stdin/stdout:

```go
import mcpruntime "goa.design/goa-ai/runtime/mcp"

caller, err := mcpruntime.NewStdioCaller(ctx, mcpruntime.StdioOptions{
    Command: "mcp-server",
    Args:    []string{"--config", "config.json"},
    Env:     []string{"MCP_DEBUG=1"}, // Se añade al entorno actual.
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

El caller stdio inicia un subproceso y correlaciona operaciones concurrentes por ID de solicitud. Cada solicitud lleva sus metadatos. Cierre el caller con un contexto de cierre definido por la aplicación y gestione el error devuelto.

### Callers personalizados {#adaptador-callerfunc}

Un caller personalizado implementa los cuatro métodos de la interfaz. `CallerFunc` se ha eliminado: una sola función de invocación no representa lectura, respuestas y cancelación de Tasks. Los estados incompletos quedan fuera del historial de resultados del modelo.

### Caller JSON-RPC generado por Goa

Para clientes MCP generados por Goa que envuelven métodos de servicio:

```go
import genmcpclient "example.com/assistant/gen/jsonrpc/mcp_assistant/client"

caller, err := genmcpclient.NewCaller(client, mcpruntime.ClientInfo{
    Name: "my-agent", Version: "1.0.0",
}, mcpruntime.InputSupport{}, mcpruntime.HTTPRetryPolicy{})
if err != nil {
    return err
}
```

## Progreso y cambios de recursos

Use `WithProgress(ctx, handler)` para recibir progreso antes del resultado final. El servicio llama a `ReportProgress`; el transporte proporciona los identificadores de correlación. Un error del callback detiene esa operación y debe gestionarse.

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

Use `Listen` para recibir una confirmación seguida de los cambios aceptados. Compruebe el filtro confirmado: puede omitir tipos no compatibles. La aplicación implementa `handleResourceChange`, vuelve a cargar los datos correspondientes y respeta la cancelación. Perder la conexión produce un error; el caller no se reconecta automáticamente.

Para un cliente JSON-RPC generado, use `WithSubscriptionEvents(ctx, handler)` e invoque su endpoint tipado `SubscriptionsListen`. El endpoint devuelve el resultado final y el handler recibe eventos validados. Sin handler, falla antes de enviar la solicitud.

### Declarar una fuente de cambios

`SubscriptionSource()` selecciona un método de streaming de servidor para cambios autorizados de recursos, Tasks y catálogos. La entrada `resources` selecciona URI; los campos opcionales `tasks` seleccionan trabajos bajo los nombres de sus métodos de creación. La unión obligatoria `change` empieza con `acknowledged`, después identifica cambios. Declara `Format(FormatURI)` para las URI.

El método original controla autorización y detección de cambios. El código generado lee los trabajos mediante sus endpoints de observación configurados y envía estados completos. El transporte compartido ordena eventos y correlaciona solicitudes. `ToolCatalog`, `PromptCatalog`, `ResourceCatalog` y `ResourceTemplateCatalog` vinculan páginas autorizadas a métodos ordinarios. La misma fuente notifica cambios en sus listas; los catálogos fijos no reciben notificaciones. Sustituye `ResourceSubscription()` por `SubscriptionSource()` y regenera; no hay alias compatible.

### Recursos, prompts y contenido enriquecido

`ResourceTemplate` vincula un URI parametrizado a un método de lectura tipado. `Prompt` vincula un método que devuelve mensajes. `ResourceCompletion` y `PromptCompletion` vinculan sugerencias de argumentos tipadas. `ToolContent` selecciona un campo de contenido enriquecido junto al resultado estructurado. Estos contratos siguen el mismo flujo de diseño y generación Goa que los métodos ordinarios.

### Reintentar una respuesta de herramienta interrumpida

HTTP realiza un intento por defecto. El host puede configurar `HTTPRetryPolicy` para un endpoint de confianza. Solo se reintenta una respuesta interrumpida si la herramienta declara comportamiento de solo lectura o idempotente y la política confía en esas declaraciones. El nuevo intento usa otro ID y puede ejecutar la herramienta otra vez. Los errores, respuestas inválidas, fallos de callbacks e interrupciones de suscripciones no autorizan reintentos.

Un fallo al preparar la solicitud localmente no implica que la herramienta se haya ejecutado. Una cancelación detectada antes del envío impide la solicitud. Cuando un intento llega al cliente HTTP, perder su respuesta deja el resultado desconocido. Tanto los errores locales del cliente como los resultados desconocidos detienen la recuperación del agente.

## Autorización OAuth {#autorización-con-secreto-de-cliente}

Protege los métodos MCP con la seguridad nativa de Goa. Construye el verificador obligatorio con `NewJWTResourceServer` para tokens firmados o `NewIntrospectionResourceServer` para tokens opacos y pásalo al servidor generado. Emisor fiable, audiencia, claves y credenciales proceden de la configuración de la aplicación. Credenciales ausentes o inválidas reciben 401; scopes insuficientes, 403; verificador no disponible, 503. Los errores de aplicación después del envío no se convierten en desafíos de autorización.

Los clientes comparten el transporte HTTP habitual: `NewAuthorizationCodeHTTPTransport` gestiona consentimiento en el navegador, estado, verificación del emisor y PKCE S256; `NewClientCredentialsHTTPTransport` obtiene permisos para una aplicación confidencial; `NewEnterpriseHTTPTransport` intercambia credenciales de inicio de sesión único validadas por el host. El registro elige explícitamente cliente público, HTTP Basic, secreto en POST o aserción firmada. Clientes prerregistrados y documentos de metadatos HTTPS tienen constructores explícitos; el registro dinámico obsoleto se elimina.

El host controla inicio de sesión, emisores fiables y un `AuthorizationStore` por usuario o aplicación. La durabilidad requiere persistencia cifrada y serialización entre instancias; el almacén en memoria dura un proceso. Descubrimiento y desafíos vinculan credenciales al emisor y audiencia exactos aunque la URL interna difiera. Una solicitud inicial sin credenciales obtiene scopes antes del consentimiento. Los nuevos scopes anunciados no reabren por sí solos el consentimiento. Un cliente de navegador o enterprise puede recuperarse una vez de un rechazo explícito previo a la ejecución; el rechazo de permisos de máquina es definitivo. Esto no permite repetir una herramienta con resultado incierto. Consulta la [guía de autorización](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#mcp-resource-servers).

## Entrada adicional y Tasks asíncronas {#additional-input-and-asynchronous-tasks}

`InputExchange(continuationField, outcomeField)` vincula la continuación opcional de un método con su unión obligatoria de resultado completo o entrada requerida. Las solicitudes tipadas describen formularios o consentimiento para abrir URL; Goa aporta esquemas y decodificación de respuestas. Solo la rama completa proporciona el resultado anunciado. Autenticación y validación se aplican en cada ronda. Estado y respuestas del host quedan fuera de los argumentos del modelo. Aceptar una URL no demuestra que la interacción externa terminara; la aplicación lo comprueba.

La misma declaración funciona por MCP, `BindTo` local y proveedores del registro. El agente se suspende y reanuda la llamada incompleta exacta tras una respuesta tipada. Los datos sensibles pertenecen a interacciones URL externas, no a formularios visibles para el modelo.

`TaskExchange(read, answer, cancel)` vincula métodos de trabajos duraderos. La creación asume duraderamente el trabajo antes de devolver su identificador. La lectura devuelve en curso, entrada requerida, completo, fallido o cancelado. Respuesta y cancelación confirman intención; lecturas posteriores establecen el efecto. El servicio controla persistencia y finalización; el adaptador genera metadatos y conversiones sin otro almacén de trabajos.

Un cliente directo usa `WithTaskSupport(ctx)` solo si conserva y observa `CallResponse.Task`. `GetTask`, `UpdateTask` y `CancelTask` usan el mismo caller. La ejecución generada conserva identidad, lee trabajos o recibe notificaciones y gestiona entrada y cancelación mediante el motor configurado. En producción se necesitan Temporal y almacenamiento de la aplicación; el motor en memoria dura un proceso. Consulta [entrada y trabajos nativos](https://github.com/goadesign/goa-ai/blob/main/docs/dsl.md#native-job-tools) y [clientes Task](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#mcp-task-clients).

## MCP Apps {#mcp-apps}

Sirve un recurso HTML `text/html;profile=mcp-app` mediante métodos ordinarios. `ToolUI("ui://...")` lo vincula al resultado de una herramienta del mismo servidor. `ToolVisibility("model")`, `ToolVisibility("app")` o ambos seleccionan callers; omitirlo permite ambos. Las herramientas exclusivas de app quedan fuera de los catálogos del modelo. `ToolMetadata` selecciona datos tipados del host separados de contenido y resultados del modelo. Los hosts sin navegador siguen recibiendo resultados ordinarios útiles.

El host controla aislamiento y permisos del navegador. El [ejemplo mantenido](https://github.com/goadesign/goa-ai/tree/main/integration_tests/apps) combina endpoints Goa generados, SDK oficial de navegador, frame en otro origen y permisos explícitos. Comprueba visibilidad actual y mantiene resultados privados fuera de los mensajes del modelo.

## MCP Skills {#mcp-skills}

`SkillCatalog()` y `SkillLookup()` declaran páginas y búsqueda exacta por URI junto a `ResourceReader()`. Cada entrada conserva URI, todos los campos de frontmatter y un manifiesto estable de archivos o la declaración `dynamic`. Cada archivo estable tiene URI exacta, tamaño en bytes y SHA-256. `ResourceDirectory()` opcional enumera hijos inmediatos sin activar instrucciones ni ampliar el manifiesto retenido.

El host asigna identidad del servidor y conserva la entrada completa con el contexto del modelo. Antes del uso, `mcp.VerifySkillFile(ctx, retainedEntryJSON, uri, bytes)` verifica pertenencia, tamaño y digest, también en caché. Para el propio `SKILL.md` de la entrada compara cada campo YAML con el descubrimiento, incluidos campos futuros y números exactos. Las entradas dinámicas no superan esta verificación estable.

Las Skills son instrucciones no fiables, no mensajes del sistema ni permisos de herramientas. Un `SKILL.md` anidado leído como apoyo requiere descubrimiento y consentimiento propios para activarse. La ejecución local exige consentimiento explícito para servidor, Skill y manifiesto completo; un cambio de manifiesto lo revoca. El [host de referencia](https://github.com/goadesign/goa-ai/tree/main/codegen/mcp/testdata/skills_host) combina lecturas diferidas y confirmación nativa. Contexto y aprobaciones duran un proceso; aplicaciones con persistencia deben conservar entradas y controlar la duración del consentimiento. Consulta el [contrato completo](https://github.com/goadesign/goa-ai/blob/main/docs/mcp_skills.md).

## Actualización incompatible {#breaking-upgrade}

Regenera conjuntamente servidores, clientes, ejecutores y proveedores del registro. Elimina inicialización, sesiones, selección del protocolo y decodificadores de resultados JSON textuales. Los callers personalizados implementan los cuatro métodos. Construye adaptadores con endpoints Goa configurados y servidores protegidos con un verificador. Sustituye `ResourceSubscription` por `SubscriptionSource` y selecciona ramas mediante los métodos de las uniones generadas.

Los peers antiguos y nuevos no pueden compartir endpoint. Finaliza o resuelve trabajos aceptados y ejecuciones guardadas incompatibles antes de cambiar workers, registro y persistencia. Revertir una dependencia no restaura compatibilidad con los datos nuevos. Sigue la [guía de actualización](https://github.com/goadesign/goa-ai/blob/main/docs/runtime.md#preview-upgrade-guide).

---

## Flujo de ejecución de herramientas

1. El planificador crea llamadas con descriptores tipados generados, o reenvía
   llamadas validadas del modelo mediante `planner.ToolRequestFromModelCall`.
2. El runtime valida el resultado completo del plan y asigna IDs de ejecución,
   produciendo valores `runtime.ToolCall`.
3. El runtime detecta el registro del conjunto de herramientas MCP.
4. Reenvía el payload JSON canónico de la llamada del runtime al caller MCP.
5. El caller MCP usa HTTP o stdio y gestiona el protocolo JSON-RPC. Una respuesta
   HTTP puede ser JSON o un flujo de eventos.
6. Decodifica el resultado mediante el codec generado.
7. Devuelve `ToolResult` al planificador.

---

## Tratamiento de errores

Los helpers generados adaptan los errores JSON-RPC a valores
`planner.ToolFailure`:

- **Errores de validación** → fallos de llamada inválida con evidencia exacta
  para corregirla
- **Errores de red** → fallos de indisponibilidad o timeout con una acción
  explícita de replanificación o finalización
- **Errores del servidor** → causas estructuradas conservadas en el fallo

Así, los conjuntos de herramientas MCP y los nativos comparten el mismo
contrato de recuperación impuesto por el runtime.

Los fallos devueltos por una herramienta se convierten en `ToolFailure`. Un
resultado final inválido del planificador se convierte en
`OutputContractError`: se rechaza sin otra solicitud al modelo y no se presenta
como fallo de herramienta.

---

## Ejemplo Completo

### Diseño

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

### Tiempo de ejecución

Pase el ejecutor generado a `RegisterUsedToolsets` antes de registrar el agente. El ejemplo recibe un runtime ya construido y su planificador.

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

### Planificador

Su planificador puede hacer referencia a herramientas MCP igual que a los conjuntos de herramientas nativos:

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

`genmcpspecs` importa `example.com/assistant/gen/assistant/toolsets/assistant_mcp`. Use `planner.ToolRequestFromModelCall` para conservar el ID de correlación del proveedor al reenviar una llamada validada del modelo.

---

## Mejores prácticas

- **Deje que codegen gestione el registro**: Utilice el helper generado para
  registrar los conjuntos de herramientas MCP; evite el pegamento escrito a
  mano para mantener coherentes los codecs y la recuperación estructurada de
  fallos
- **Utilice callers tipados**: Prefiera los callers JSON-RPC generados por Goa cuando estén disponibles para obtener seguridad de tipos
- **Gestione los errores explícitamente**: Asigne los errores MCP a valores
  `ToolFailure` con el tipo de fallo y la acción de recuperación correctos
- **Supervise la telemetría**: Las llamadas MCP emiten eventos de telemetría estructurados; utilícelos para la observabilidad
- **Elija el transporte adecuado**: Utilice HTTP para servidores remotos y stdio para servidores basados en subprocesos. El caller HTTP acepta respuestas JSON y flujos de eventos

---

## Próximos pasos

- **[Conjuntos de herramientas](./toolsets.md)** - Comprenda los modelos de ejecución de herramientas
- **[Memoria y sesiones](./memory-sessions.md)** - Gestione el estado con transcripciones y almacenes de memoria
- **[Producción](./production.md)** - Despliegue con Temporal y streaming UI
