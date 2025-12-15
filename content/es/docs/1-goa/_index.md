---
title: "Marco de Goa"
linkTitle: "Goa"
weight: 1
description: "Design-first API development with automatic code generation for Go microservices."
llm_optimized: true
content_scope: "Complete Goa Documentation"
aliases:
---

## Resumen

Goa es un framework de diseño para construir microservicios en Go. Define tu API usando el potente DSL de Goa, y deja que Goa genere el código, la documentación y las librerías cliente.

### Características principales

- **Diseño-Primero** - Define tu API usando un potente DSL antes de escribir el código de implementación
- **Generación de código** - Genera automáticamente código de servidor, cliente y documentación
- **Seguridad de tipos** - Seguridad de tipos de extremo a extremo desde el diseño hasta la implementación
- **Multi-Transporte** - Soporte para HTTP y gRPC desde un único diseño
- **Validación** - Validación de peticiones integrada basada en su diseño
- **Documentación** - Especificaciones OpenAPI autogeneradas

## Cómo funciona Goa

Goa sigue un flujo de trabajo en tres fases que separa el diseño de la API de la implementación, garantizando la coherencia y reduciendo la repetición de tareas.

{{< figure src="/images/diagrams/GoaWorkflow.svg" alt="Goa three-phase workflow: Design → Generate → Implement" class="img-fluid" >}}

### Fase 1: Diseño (Tú escribes)

En la fase de diseño, defines tu API usando el DSL de Goa en archivos Go (típicamente en un directorio `design/`):

- **Tipos**: Define estructuras de datos con reglas de validación
- **Servicios**: Agrupan métodos relacionados
- **Métodos**: Definir operaciones con cargas útiles y resultados
- **Transportes**: Asignar métodos a puntos finales HTTP y/o procedimientos gRPC
- **Seguridad**: Definir esquemas de autenticación y autorización

**Lo que creas**: `design/*.go` archivos que contienen la especificación de tu API como código Go.

### Fase 2: Generar (Automatizado)

Ejecuta `goa gen` para generar automáticamente todo el código boilerplate:

```bash
goa gen myservice/design
```

**Lo que crea Goa** (en el directorio `gen/`):
- Andamiaje de servidor con enrutamiento y validación de peticiones
- Librerías cliente seguras
- Especificaciones OpenAPI/Swagger
- Definiciones de búfer de protocolo (para gRPC)
- Codificadores/decodificadores de transporte

**Importante**: Nunca edites archivos en `gen/` - se regeneran cada vez que ejecutas `goa gen`.

### Fase 3: Implementar (Usted escribe)

Escribe tu lógica de negocio implementando las interfaces de servicio generadas:

```go
// service.go - You write this
type helloService struct{}

func (s *helloService) SayHello(ctx context.Context, p *hello.SayHelloPayload) (string, error) {
    return fmt.Sprintf("Hello, %s!", p.Name), nil
}
```

**Lo que creas**: Archivos de implementación de servicios que contienen tu lógica de negocio real.

### What's Hand-Written vs Auto-Generated

| Tu Escribes | Goa Genera |
|-----------|---------------|
| `design/*.go` - Definiciones de API | `gen/` - Todo el código de transporte |
| `service.go` - Lógica de negocio | Especificaciones OpenAPI |
| `cmd/*/main.go` - Puesta en marcha del servidor | Definiciones de búfer de protocolo |
| Pruebas y middleware personalizado | Validación de peticiones |

## Guías de documentación

| Guía | Descripción | ~Tokens |
|-------|-------------|---------|
| Instalación de Goa y creación de su primer servicio
| [DSL Reference](dsl-reference/) | Referencia completa del lenguaje de diseño de Goa | ~2,900 | [Generación de código](quickstart/)
| [Generación de Código](code-generation/) | Entendiendo el proceso de generación de código de Goa | ~2,100 | [Guía HTTP](dsl-reference/) | Guía HTTP](dsl-reference/)
| [Guía HTTP](http-guide/) | Características del transporte HTTP, enrutamiento y patrones | ~1,700 | [Guía gRPC](code-generation/) | Entender el proceso de generación de código de Goa | ~2,100
| [Guía gRPC](grpc-guide/) | Características del transporte gRPC y streaming | ~1.800 | | [Gestión de errores](grpc-guide/)

| Interceptores](interceptors/) Interceptores y patrones de middleware | ~1.400
| [Producción](production/) | Observabilidad, seguridad y despliegue | ~1.300 |

**Sección total:** ~14.500 fichas

## Ejemplo rápido

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("hello", func() {
    Method("sayHello", func() {
        Payload(String, "Name to greet")
        Result(String, "Greeting message")
        HTTP(func() {
            GET("/hello/{name}")
        })
    })
})
```

Generar y ejecutar:

```bash
goa gen hello/design
goa example hello/design
go run ./cmd/hello
```

## Empezando

Empieza con la guía [Quickstart](quickstart/) para instalar Goa y construir tu primer servicio en minutos.

Para una cobertura completa de DSL, consulte la [Referencia DSL](dsl-reference/).
