---
title: "Contribuir a la documentación"
linkTitle: "Contribución"
weight: 100
description: "Guidelines for contributing to Goa documentation: canonical homes, cross-linking, and content strategy."
llm_optimized: true
content_scope: "Documentation Contribution Guide"
---

Esta guía ayuda a los colaboradores de la documentación a mantener la coherencia en toda la documentación de Goa. Abarca las casas canónicas para los temas, los patrones de enlaces cruzados y la estrategia de contenidos.

## Casas canónicas

Cada tema de documentación tiene exactamente una **página de inicio canónica**: la única ubicación autorizada que contiene todos los detalles. Otras menciones deben proporcionar breves resúmenes con enlaces cruzados a la ubicación canónica.

### Referencia canónica

| Tema | Página de inicio canónica | Categoría
|-------|---------------|----------|
| Modelado de datos** [DSL Reference](1-goa/dsl-reference/#data-modeling) Diseño
**Servicios y métodos** [DSL Reference](1-goa/dsl-reference/#services-and-methods) Diseño
**Streaming (Diseño)** [DSL Reference](1-goa/dsl-reference/#streaming) Diseño
| Archivos estáticos (Diseño)** [DSL Reference](1-goa/dsl-reference/#static-files) Diseño
**Manejo de Errores (Diseño)** [DSL Reference](1-goa/dsl-reference/#error-handling) Diseño
| Esquemas de seguridad** [DSL Reference](1-goa/dsl-reference/#security) Diseño
| Transporte HTTP** [Guía HTTP](1-goa/http-guide/) Transporte
**HTTP Streaming** [Guía HTTP](1-goa/http-guide/#streaming) Transporte
**Respuestas de error HTTP** [Guía HTTP](1-goa/http-guide/#error-responses) Transporte
**Transporte gRPC** [Guía gRPC](1-goa/grpc-guide/) Transporte
**Streaming gRPC** [Guía gRPC](1-goa/grpc-guide/#streaming) Transporte
| Códigos de estado gRPC** [Guía gRPC](1-goa/grpc-guide/#error-handling) Transporte
interceptores** | [Interceptores](1-goa/interceptors/) | Cross-Cutting | Observabilidad** | Transporte
| **Observabilidad** | [Pista](3-ecosystem/clue/) | Ecosistema |
| **Eventos Distribuidos** | [Pulso](3-ecosystem/pulse/) | Ecosistema |
| Diagramas de arquitectura** [Modelo](3-ecosystem/model/) Ecosistema

### Definiciones de categoría

**Diseño**: Definiciones de API agnósticas al protocolo usando Goa DSL. El contenido aquí debe centrarse en *qué* estás definiendo, no *cómo* se comporta en un transporte específico.

**Transporte**: Detalles de implementación específicos del protocolo HTTP o gRPC. El contenido aquí cubre el comportamiento, configuración y patrones específicos del transporte.

**Transversales**: Características que se aplican a todos los transportes (interceptores, middleware).

**Ecosistema**: Bibliotecas complementarias (model, pulse, clue) que amplían las capacidades de Goa.

## Estrategia de contenidos

### Documentación a nivel de diseño

Mantenga la documentación a nivel de diseño **concisa y centrada**:

- Explicar la sintaxis y semántica del DSL
- Mostrar ejemplos utilizando tipos estructurados
- Indicar qué transportes son compatibles con la función
- Incluir enlaces de "Lecturas complementarias" a guías de transporte

**Patrón de ejemplo:**

```markdown
## Streaming

Goa supports streaming for both payloads and results using `StreamingPayload` 
and `StreamingResult`. The same design works for HTTP (WebSocket/SSE) and gRPC.

[code example]

**Further reading:**
- [HTTP Streaming](../http-guide/#streaming) — WebSocket and SSE implementation
- [gRPC Streaming](../grpc-guide/#streaming) — Bidirectional streaming patterns
```

### Documentación a nivel de transporte

Las guías de transporte deben ser **detalladas y prácticas**:

- Empezar con una "Recapitulación del diseño" que enlace con la referencia DSL
- Tratar en profundidad el comportamiento específico del transporte
- Incluir opciones y patrones de configuración
- Mostrar ejemplos completos y ejecutables

**Patrón de llamada de resumen de diseño:**

```markdown
{{< alert title="Design Recap" color="info" >}}
Streaming is defined at the design level using `StreamingPayload` and 
`StreamingResult`. See [Streaming in DSL Reference](../dsl-reference/#streaming) 
for design patterns. This section covers HTTP-specific implementation details.
{{< /alert >}}
```

### Documentación del ecosistema

Las páginas de herramientas del ecosistema deben ser **completas y autocontenidas**:

- Proporcionar un contexto completo sin requerir referencias externas
- Incluir todas las importaciones y configuraciones necesarias en los ejemplos de código
- Documentar las principales características de la biblioteca
- Enlazar con los repositorios de GitHub para obtener más información

## Directrices para enlaces cruzados

### Cuándo enlazar

Añada enlaces cruzados cuando:

- Se menciona un tema fuera de su origen canónico
- Conceptos relacionados ayuden al lector
- Una característica tiene un comportamiento específico de transporte documentado en otro lugar

### Patrones de enlaces cruzados

**Enlaces en línea** para menciones breves:

```markdown
Goa supports [streaming](../dsl-reference/#streaming) for real-time data.
```

**Secciones "Véase también "** para temas relacionados:

```markdown
## See Also

- [Streaming Design](../dsl-reference/#streaming) — Design-level streaming concepts
- [gRPC Streaming](../grpc-guide/#streaming) — gRPC-specific streaming patterns
```

**Secciones "Lecturas complementarias "** al final de los temas de diseño:

```markdown
**Further reading:**
- [HTTP Error Responses](../http-guide/#error-responses) — HTTP status code mapping
- [gRPC Error Handling](../grpc-guide/#error-handling) — gRPC status code mapping
```

## Flujo de trabajo de actualización de las herramientas del ecosistema

Al actualizar la documentación de las herramientas del ecosistema (modelo, pulso, pista):

1. **Actualice primero la página canónica** - Realice cambios en `3-ecosystem/[tool].md`
2. **Actualizar las referencias cruzadas** - Comprobar si hay menciones en otras páginas que deban actualizarse
3. **Mantener los resúmenes sincronizados** - Actualizar el índice del ecosistema (`3-ecosystem/_index.md`) si la finalidad o las características clave de la herramienta han cambiado
4. **No duplicar detalles** - Otras páginas deben enlazar con la página del ecosistema, no repetir su contenido

### Fuente de la verdad

La documentación del ecosistema debe reflejar el comportamiento real de la biblioteca:

- **Clue**: [github.com/goadesign/clue](https://github.com/goadesign/clue)
- **Pulso**: [github.com/goadesign/pulse](https://github.com/goadesign/pulse)
- **Modelo**: [github.com/goadesign/model](https://github.com/goadesign/model)

Cuando cambie el comportamiento de la biblioteca, actualiza la documentación para que coincida.

## Contenido optimizado para LLM

Toda la documentación debe estar optimizada tanto para los lectores humanos como para el consumo de LLM:

### Secciones autocontenidas

Cada sección debe proporcionar un contexto completo:

```markdown
## Health Checks

The `health` package provides HTTP health check endpoints for monitoring service 
availability. Health checks verify that the service and its dependencies (databases, 
external APIs) are functioning correctly.

// Include necessary imports
import "goa.design/clue/health"

// Show complete, runnable example
checker := health.NewChecker(
    health.NewPinger("database", dbAddr),
    health.NewPinger("cache", redisAddr),
)
```

### Definiciones Inline

Defina los términos técnicos en línea en lugar de depender únicamente de los enlaces del glosario:

```markdown
The **canonical home** (the single authoritative location for a topic's detailed 
documentation) for streaming is the DSL Reference.
```

### Relaciones explícitas

Indique explícitamente las relaciones entre conceptos:

```markdown
Error handling spans two layers: the **design layer** where you define errors 
using the `Error` DSL, and the **transport layer** where errors map to HTTP 
status codes or gRPC status codes.
```

### Jerarquía de encabezamientos

Utilice una jerarquía de encabezamientos adecuada sin saltarse niveles:

```markdown
## Main Topic (h2)
### Subtopic (h3)
#### Detail (h4)
```

## Organización de archivos

### Frontmatter Requirements

Toda página de documentación necesita un frontmatter adecuado:

```yaml
---
title: "Page Title"
linkTitle: "Short Title"  # Optional, for navigation
weight: 2                 # Controls sort order
description: "One-line description for SEO and previews."
llm_optimized: true       # Mark as LLM-optimized
content_scope: "What this page covers"
aliases:                  # Optional, for redirects
  - /old/path/
---
```

### Convenciones de nomenclatura

- Utilice minúsculas con guiones: `http-guide.md`, `dsl-reference.md`
- Archivos de índice: `_index.md` para las páginas de inicio de sección
- Los nombres deben ser cortos pero descriptivos

## Ejemplo: Añadir una nueva función

Al documentar una nueva característica de Goa:

1. **Identifique el origen canónico** - ¿Es a nivel de diseño (DSL Reference), específico del transporte (HTTP/gRPC Guide), o transversal?

2. **Escribir el contenido canónico** - Detalles completos, ejemplos y explicaciones en la ubicación canónica

3. **Añadir enlaces cruzados** - Breves menciones con enlaces en páginas relacionadas

4. **Actualizar el índice** - Si se trata de una característica importante, añádala al índice de la sección correspondiente

5. **Comprobar la coherencia** - Asegurarse de que los nombres de los ejemplos y los patrones coinciden en todas las páginas

## Lista de comprobación para colaboradores

Antes de enviar cambios en la documentación:

- [ ] El contenido está en la home canónica correcta
- [ ] Los enlaces cruzados apuntan a ubicaciones canónicas (no contenido duplicado)
- [ ] Los documentos de diseño son concisos; los documentos de transporte son detallados
- [Los ejemplos de código incluyen las importaciones y el contexto necesarios
- [ ] La jerarquía de títulos es correcta (no se saltan niveles)
- [ ] La portada es completa y precisa
- [Los términos técnicos se definen en línea cuando se utilizan por primera vez
- [Las secciones "Véase también" o "Lecturas complementarias" enlazan con temas relacionados
