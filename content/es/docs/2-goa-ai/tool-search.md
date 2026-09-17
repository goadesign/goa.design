---
nav_group: guides
title: "Búsqueda de herramientas y catálogos dinámicos"
linkTitle: "Búsqueda de herramientas y catálogos dinámicos"
weight: 25
description: "Genera las decisiones de carga y consume herramientas cambiantes sin otro almacén de herramientas cargadas."
llm_optimized: true
---

La búsqueda carga definiciones cuando el modelo las necesita. Un registro permite a los proveedores cambiar las herramientas disponibles sin recompilar el consumidor. Son decisiones independientes: las herramientas estáticas pueden usar búsqueda y las dinámicas pueden anunciarse de inmediato.

## Elegir qué herramientas cargar mediante búsqueda

Supongamos que el toolset compilado `Records` define `lookup`, `search` y `analyze`. Mantén `lookup`, que se usa con frecuencia, disponible de inmediato y difiere solo las otras dos:

```go
Agent("assistant", "Find and analyze records.", func() {
    Use(Records, func() {
        Deferred("search", "analyze")
    })
})
```

Solo `search` y `analyze` se cargan mediante búsqueda; `lookup` se anuncia de inmediato. Esto cambia la carga de las definiciones, no los permisos ni la ejecución. La elección pertenece al `Use` consumidor, nunca a una definición compartida de `Toolset` ni a un `Export`. Los proveedores compartidos, las exportaciones y los demás consumidores no cambian.

Los nombres deben coincidir exactamente con los nombres locales declarados en el toolset compilado: `"search"`, no `"records.search"` ni un nombre Go generado. La selección por nombre admite herramientas locales, agentes expuestos como herramientas, herramientas MCP externas con esquemas declarados y herramientas MCP respaldadas por Goa.

- `Deferred()` selecciona todas las herramientas de ese `Use`; repetirlo es válido.
- Varias declaraciones con nombres combinan sus selecciones: `Deferred("search")` seguido de `Deferred("analyze")` selecciona ambas.
- Se rechazan nombres vacíos o duplicados, incluso entre declaraciones. La generación de código rechaza los nombres desconocidos después de reunir la lista completa de herramientas compiladas.
- Se rechaza combinar `Deferred()` con cualquier selección por nombre en el mismo `Use`.

## Consumir un catálogo cambiante

Para un catálogo cambiante, usa `Registry`. Tanto los toolsets `FromRegistry` como los registros completos rechazan las selecciones por nombre de `Deferred`, porque sus herramientas se resuelven en tiempo de ejecución:

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

El lector resuelve un toolset obligatorio; el generalista resuelve todos los toolsets enumerados actualmente. Quitar `Deferred()` anuncia ese catálogo de inmediato. `Version("1.2.3")` en una fuente con nombre exige esa versión actual; no selecciona una versión archivada.

Se rechazan fuentes duplicadas o solapadas, herramientas declaradas en línea en referencias de registro y la exportación de esas referencias. El proveedor posee las definiciones; la política de ejecución filtra el catálogo antes de enviarlo al modelo.

Las referencias de registro también rechazan `Tags(...)` y `PublishTo(...)` del consumidor. El proveedor posee las etiquetas; el consumidor las filtra mediante la política de ejecución.

## Conexión y publicación

Construye el cliente de servicio generado del registro distribuido (`registry/gen/registry.Client`) y el cliente Pulse de resultados al iniciar la aplicación. Conéctalos antes de comenzar las ejecuciones:

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

`Definition()` y `NewClient(rt)` no reciben catálogos ni hacen llamadas de red. Registra las herramientas compiladas con los helpers generados habituales. El runtime ejecuta las herramientas del registro sin callbacks de descubrimiento ni ejecutores dinámicos personalizados. Los clientes HTTP de catálogo son un transporte separado para servidores HTTP compatibles.

Los proveedores publican `ToolSchemas()` generado con la huella del esquema y el ciclo de registro existente. `ConsumerContract` incluye términos de búsqueda, metadatos de campos, etiquetas requeridas, confirmación, paginación y datos exclusivos del servidor. Las herramientas dinámicas de servicio admiten estas funciones; las herramientas de agentes hijos y de control siguen compiladas. Los registros que solo contienen esquemas y los tipos de ejecución no admitidos fallan explícitamente.

## ¿Quién realiza la búsqueda?

- **OpenAI Responses, directo o Bedrock:** el modelo emite búsquedas nativas del cliente. El adaptador ordena nombres, títulos y descripciones permitidos con BM25, un algoritmo de relevancia por palabras, y devuelve las definiciones coincidentes. La primera solicitud contiene solo una herramienta de consulta, sin directorio de nombres o descripciones. El catálogo diferido permanece en la aplicación.
- **Anthropic Messages, directo o Bedrock:** se envía el catálogo permitido con indicadores de carga diferida y la búsqueda alojada de Claude. El proveedor busca y expande definiciones. En Bedrock se usa `NewAnthropic` con Messages e InvokeModel; Converse no implementa búsqueda.
- **Otros adaptadores:** devuelven `model.ErrToolSearchUnsupported` cuando no admiten el descubrimiento, sin sustituirlo por carga inmediata.

Los planners pasan `input.Agent.AdvertisedToolDefinitions()` y los mensajes actuales, e indican el modelo o su clase. La búsqueda permanece en el adaptador; el planner recibe llamadas ordinarias. OpenAI exige `MaxTokens` positivo o `MaxCompletionTokens` en el adaptador; las rondas comparten el presupuesto de salida de esa invocación.

## Cambios e historial

Los resultados de búsqueda de OpenAI colocan cada función seleccionada en un espacio de nombres nativo con el mismo nombre del proveedor. Así Bedrock devuelve una identidad de llamada completa que puede reproducirse. El adaptador controla esta representación; no hace falta un DSL de espacios de nombres, un mapeo en la aplicación ni otro estado de herramientas cargadas. Las herramientas de carga inmediata conservan su representación. Los historiales de Bedrock creados con funciones dinámicas sin ese contenedor pueden incluir llamadas sin espacio de nombres que Bedrock rechaza al reproducirlas. Inicia otra conversación o elimina deliberadamente el intercambio afectado completo; el adaptador nunca inventa campos ausentes del proveedor.

Cada actividad de planificación que puede iniciar trabajo lee sus fuentes una vez y mantiene ese catálogo durante la inferencia. La siguiente vuelve a leer, incluidos los nuevos proveedores. Las actividades dedicadas a la respuesta final y los finalizadores explícitos no consultan el registro. Un registro completo vacío es válido; las fuentes con nombre ausentes, versiones incorrectas, identidades duplicadas, errores de lectura y eliminaciones durante la resolución fallan explícitamente.

Cada llamada aceptada guarda su definición, la herramienta de paginación asociada si existe y el token de registro existente. Confirmación, decodificación y restauración usan ese contrato guardado sin consultar el catálogo actual. `CallResolvedTool` comprueba el token antes de publicar; un reemplazo anterior a la publicación registra `call_not_admitted`. Los reintentos por sobrecarga conservan el token y devuelven `admission_conflict` si se reemplazó esa admisión. Las llamadas publicadas conservan su asignación y resultado originales.

Los registros de búsqueda nativa permanecen en los metadatos de mensajes. Consérvalos al almacenar o compactar. No hay otra base de herramientas cargadas. Las definiciones históricas explican llamadas pasadas; el consumo y la política actuales autorizan las nuevas.

El historial de altas y bajas de Claude exige un modelo compatible. Una definición modificada bajo un nombre retenido no se puede reproducir con ese protocolo y se rechaza. Inicia otra conversación o compacta deliberadamente para eliminar esa definición; el adaptador nunca reinicia el historial silenciosamente. No se implementa la continuación de pausas de Claude que solo contienen trabajo nativo.

## Ejemplos y actualización

Regenera el agente consumidor después de cambiar su selección de `Deferred`. La generación de código prepara los recuentos de palabras de búsqueda y emite los ID fijos existentes de las herramientas seleccionadas mediante la misma API del runtime. La selección por nombre no añade ninguna API del proveedor, estado del proveedor ni espacio de nombres.

Regenera proveedores y consumidores con Goa v3.31.1. Sustituye `Discover`, `RegistryToolsets` y el cableado de ejecutores dinámicos por `RegisterRegistry`. Actualiza el registro para servir `ResolveToolset` y `CallResolvedTool`, y publica `ToolSchemas()` completo antes de habilitar consumidores dinámicos. Los registros antiguos con solo esquemas siguen disponibles para integraciones estáticas, pero no para esta ruta.

Las plantillas de confirmación usan nombres JSON como `{{ .key }}`, en lugar de campos Go como `{{ .Key }}`. Usa `{{ json .value }}` para valores JSON e `index` para propiedades opcionales.

El quickstart de goa-ai incluye `go run ./cmd/tool-search -provider openai -model YOUR_MODEL_ID`, o `-provider anthropic`, con la variable de entorno de clave API correspondiente. Este comando opcional hace llamadas facturables; el quickstart habitual no requiere credenciales. El helper devuelve el ejemplo fijo de Tokio. La prueba local del SDK cubre búsqueda, ejecución e historial. Una sola herramienta no demuestra ahorro de tokens: mide calidad y uso con el modelo y catálogo reales.
