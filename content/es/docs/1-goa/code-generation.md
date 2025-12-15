---
title: Generación de código
weight: 3
description: "Complete guide to Goa's code generation - commands, process, generated code structure, and customization options."
llm_optimized: true
aliases:
---

La generación de código de Goa transforma su diseño en código listo para la producción. En lugar de un simple andamiaje, Goa genera implementaciones de servicios completas y ejecutables que siguen las mejores prácticas y mantienen la coherencia en toda la API.



## Herramientas de línea de comandos

### Instalación

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

### Comandos

Todos los comandos esperan rutas de importación de paquetes Go, no rutas de sistemas de ficheros:

```bash
# ✅ Correct: using Go package import path
goa gen goa.design/examples/calc/design

# ❌ Incorrect: using filesystem path
goa gen ./design
```

#### Generar código (`goa gen`)

```bash
goa gen <design-package-import-path> [-o <output-dir>]
```

El comando principal para la generación de código:
- Procesa su paquete de diseño y genera código de implementación
- Recrea todo el directorio `gen/` desde cero cada vez
- Se ejecuta después de cada cambio de diseño

#### Crear ejemplo (`goa example`)

```bash
goa example <design-package-import-path> [-o <output-dir>]
```

Un comando de andamiaje:
- Crea una implementación de ejemplo de una sola vez
- Genera stubs de manejadores con lógica de ejemplo
- Se ejecuta una vez al iniciar un nuevo proyecto
- NO sobrescribirá la implementación personalizada existente

#### Mostrar versión

```bash
goa version
```

### Flujo de trabajo de desarrollo

1. Crear diseño inicial
2. Ejecutar `goa gen` para generar el código base
3. Ejecuta `goa example` para crear stubs de implementación
4. Implementa la lógica de tu servicio
5. Ejecuta `goa gen` después de cada cambio de diseño

**Mejor práctica:** Confirmar el código generado al control de versiones en lugar de generarlo durante CI/CD. Esto asegura construcciones reproducibles y permite el seguimiento de los cambios en el código generado.

---

## Proceso de generación

Cuando se ejecuta `goa gen`, Goa sigue un proceso sistemático:

### 1. Fase de arranque

Goa crea un `main.go` temporal que:
- Importa los paquetes de Goa y tu paquete de diseño
- Ejecuta la evaluación DSL
- Activa la generación de código

### 2. Evaluación del diseño

- Las funciones DSL se ejecutan para crear objetos de expresión
- Las expresiones se combinan en un modelo API completo
- Se establecen relaciones entre las expresiones
- Se validan las reglas de diseño y las restricciones

### 3. Generación de código

- Las expresiones validadas pasan a los generadores de código
- Las plantillas se renderizan para producir archivos de código
- La salida se escribe en el directorio `gen/`

---

## Estructura del código generado

Un proyecto generado típico:

```
myservice/
├── cmd/                    # Generated example commands
│   └── calc/
│       ├── grpc.go
│       └── http.go
├── design/                 # Your design files
│   └── design.go
├── gen/                    # Generated code (don't edit)
│   ├── calc/               # Service-specific code
│   │   ├── client.go
│   │   ├── endpoints.go
│   │   └── service.go
│   ├── http/               # HTTP transport layer
│   │   ├── calc/
│   │   │   ├── client/
│   │   │   └── server/
│   │   └── openapi.json
│   └── grpc/               # gRPC transport layer
│       └── calc/
│           ├── client/
│           ├── server/
│           └── pb/
└── myservice.go            # Your service implementation
```

### Interfaces de servicio

Generadas en `gen/<service>/service.go`:

```go
// Service interface defines the API contract
type Service interface {
    Add(context.Context, *AddPayload) (res int, err error)
    Multiply(context.Context, *MultiplyPayload) (res int, err error)
}

// Payload types
type AddPayload struct {
    A int32
    B int32
}

// Constants for observability
const ServiceName = "calc"
var MethodNames = [2]string{"add", "multiply"}
```

### Endpoint Layer

Generada en `gen/<service>/endpoints.go`:

```go
// Endpoints wraps service methods in transport-agnostic endpoints
type Endpoints struct {
    Add      goa.Endpoint
    Multiply goa.Endpoint
}

// NewEndpoints creates endpoints from service implementation
func NewEndpoints(s Service) *Endpoints {
    return &Endpoints{
        Add:      NewAddEndpoint(s),
        Multiply: NewMultiplyEndpoint(s),
    }
}

// Use applies middleware to all endpoints
func (e *Endpoints) Use(m func(goa.Endpoint) goa.Endpoint) {
    e.Add = m(e.Add)
    e.Multiply = m(e.Multiply)
}
```

Ejemplo de middleware de punto final:

```go
func LoggingMiddleware(next goa.Endpoint) goa.Endpoint {
    return func(ctx context.Context, req any) (res any, err error) {
        log.Printf("request: %v", req)
        res, err = next(ctx, req)
        log.Printf("response: %v", res)
        return
    }
}

endpoints.Use(LoggingMiddleware)
```

### Código cliente

Generado en `gen/<service>/client.go`:

```go
// Client provides typed methods for service calls
type Client struct {
    AddEndpoint      goa.Endpoint
    MultiplyEndpoint goa.Endpoint
}

func NewClient(add, multiply goa.Endpoint) *Client {
    return &Client{
        AddEndpoint:      add,
        MultiplyEndpoint: multiply,
    }
}

func (c *Client) Add(ctx context.Context, p *AddPayload) (res int, err error) {
    ires, err := c.AddEndpoint(ctx, p)
    if err != nil {
        return
    }
    return ires.(int), nil
}
```

---

## Generación de código HTTP

### Implementación del servidor

Generado en `gen/http/<service>/server/server.go`:

```go
func New(
    e *calc.Endpoints,
    mux goahttp.Muxer,
    decoder func(*http.Request) goahttp.Decoder,
    encoder func(context.Context, http.ResponseWriter) goahttp.Encoder,
    errhandler func(context.Context, http.ResponseWriter, error),
    formatter func(ctx context.Context, err error) goahttp.Statuser,
) *Server

// Server exposes handlers for modification
type Server struct {
    Mounts   []*MountPoint
    Add      http.Handler
    Multiply http.Handler
}

// Use applies HTTP middleware to all handlers
func (s *Server) Use(m func(http.Handler) http.Handler)
```

Configuración completa del servidor:

```go
func main() {
    svc := calc.New()
    endpoints := gencalc.NewEndpoints(svc)
    mux := goahttp.NewMuxer()
    server := genhttp.New(
        endpoints,
        mux,
        goahttp.RequestDecoder,
        goahttp.ResponseEncoder,
        nil, nil)
    genhttp.Mount(mux, server)
    http.ListenAndServe(":8080", mux)
}
```

### Implementación del cliente

Generado en `gen/http/<service>/client/client.go`:

```go
func NewClient(
    scheme string,
    host string,
    doer goahttp.Doer,
    enc func(*http.Request) goahttp.Encoder,
    dec func(*http.Response) goahttp.Decoder,
    restoreBody bool,
) *Client
```

Configuración completa del cliente:

```go
func main() {
    httpClient := genclient.NewClient(
        "http",
        "localhost:8080",
        http.DefaultClient,
        goahttp.RequestEncoder,
        goahttp.ResponseDecoder,
        false,
    )

    client := gencalc.NewClient(
        httpClient.Add(),
        httpClient.Multiply(),
    )

    result, err := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
}
```

---

## Generación de código gRPC

### Protobuf Definition

Generado en `gen/grpc/<service>/pb/`:

```protobuf
syntax = "proto3";
package calc;

service Calc {
    rpc Add (AddRequest) returns (AddResponse);
    rpc Multiply (MultiplyRequest) returns (MultiplyResponse);
}

message AddRequest {
    int64 a = 1;
    int64 b = 2;
}
```

### Implementación del servidor

```go
func main() {
    svc := calc.New()
    endpoints := gencalc.NewEndpoints(svc)
    svr := grpc.NewServer()
    gensvr := gengrpc.New(endpoints, nil)
    genpb.RegisterCalcServer(svr, gensvr)
    lis, _ := net.Listen("tcp", ":8080")
    svr.Serve(lis)
}
```

### Implementación Cliente

```go
func main() {
    conn, _ := grpc.Dial("localhost:8080",
        grpc.WithTransportCredentials(insecure.NewCredentials()))
    defer conn.Close()

    grpcClient := genclient.NewClient(conn)
    client := gencalc.NewClient(
        grpcClient.Add(),
        grpcClient.Multiply(),
    )

    result, _ := client.Add(context.Background(), &gencalc.AddPayload{A: 1, B: 2})
}
```

---

## Personalización

### Control de generación de tipos

Forzar la generación de tipos no referenciados directamente por métodos:

```go
var MyType = Type("MyType", func() {
    // Force generation in specific services
    Meta("type:generate:force", "service1", "service2")
    
    // Or force generation in all services
    Meta("type:generate:force")
    
    Attribute("name", String)
})
```

### Organización del paquete

Generar tipos en un paquete compartido:

```go
var CommonType = Type("CommonType", func() {
    Meta("struct:pkg:path", "types")
    Attribute("id", String)
})
```

Crea:
```
gen/
└── types/
    └── common_type.go
```

### Personalización de campos

```go
var Message = Type("Message", func() {
    Attribute("id", String, func() {
        // Override field name
        Meta("struct:field:name", "ID")
        
        // Add custom struct tags
        Meta("struct:tag:json", "id,omitempty")
        Meta("struct:tag:msgpack", "id,omitempty")
        
        // Override type
        Meta("struct:field:type", "bson.ObjectId", "github.com/globalsign/mgo/bson", "bson")
    })
})
```

### Personalización del búfer de protocolo

```go
var MyType = Type("MyType", func() {
    // Override protobuf message name
    Meta("struct:name:proto", "CustomProtoType")
    
    Field(1, "status", Int32, func() {
        // Override protobuf field type
        Meta("struct:field:proto", "int32")
    })

    // Use Google's timestamp type
    Field(2, "created_at", String, func() {
        Meta("struct:field:proto", 
            "google.protobuf.Timestamp",
            "google/protobuf/timestamp.proto",
            "Timestamp",
            "google.golang.org/protobuf/types/known/timestamppb")
    })
})

// Specify protoc include paths
var _ = API("calc", func() {
    Meta("protoc:include", "/usr/include", "/usr/local/include")
})
```

### Personalización de OpenAPI

```go
var _ = API("MyAPI", func() {
    // Control generation
    Meta("openapi:generate", "false")
    
    // Format JSON output
    Meta("openapi:json:prefix", "  ")
    Meta("openapi:json:indent", "  ")
    
    // Disable example generation
    Meta("openapi:example", "false")
})

var _ = Service("UserService", func() {
    // Add tags
    HTTP(func() {
        Meta("openapi:tag:Users")
        Meta("openapi:tag:Backend:desc", "Backend API Operations")
    })
    
    Method("CreateUser", func() {
        // Custom operation ID
        Meta("openapi:operationId", "{service}.{method}")
        
        // Custom summary
        Meta("openapi:summary", "Create a new user")
        
        HTTP(func() {
            // Add extensions
            Meta("openapi:extension:x-rate-limit", `{"rate": 100}`)
            POST("/users")
        })
    })
})

var User = Type("User", func() {
    // Override type name in OpenAPI spec
    Meta("openapi:typename", "CustomUser")
})
```

---

## Tipos y validación

### Aplicación de la validación

Goa valida los datos en los límites del sistema:
- **Lado del servidor**: Valida las peticiones entrantes
- **Del lado del cliente**: Valida las respuestas entrantes
- **Código interno De confianza para mantener invariantes

### Reglas de puntero para campos Struct

| Propiedades | Carga útil/Resultado | Cuerpo de la solicitud (servidor) | Cuerpo de la respuesta (servidor) |
|------------|---------------|----------------------|---------------------|
| Requerido O Por Defecto | Directo (-) | Puntero (*) | Directo (-) | No Requerido, Sin Defecto
| No requerido, sin valor por defecto Puntero (*) Puntero (*) Puntero (*)

Tipos especiales:
- **Objetos (structs)**: Utilice siempre punteros
- **Arrays y Mapas**: Nunca utilizar punteros (ya son tipos de referencia)

Ejemplo:
```go
type Person struct {
    Name     string             // required, direct value
    Age      *int               // optional, pointer
    Hobbies  []string           // array, no pointer
    Metadata map[string]string  // map, no pointer
}
```

### Manejo de valores por defecto

- **Marshaling**: Los valores por defecto inicializan arrays/maps nulos
- **Desmarcado**: Los valores por defecto se aplican a los campos opcionales que faltan (no a los campos obligatorios que faltan)

---

## Vistas y tipos de resultados

Las vistas controlan cómo se muestran los tipos de resultados en las respuestas.

### Cómo funcionan las vistas

1. El método de servicio incluye un parámetro de vista
2. Se genera un paquete de vistas a nivel de servicio
3. La validación específica de la vista se genera automáticamente

### Respuesta del lado del servidor

1. El tipo de resultado visto es marshalled
2. Se omiten los atributos nulos
3. El nombre de la vista se pasa en la cabecera "Goa-View

### Respuesta del lado del cliente

1. La respuesta no está marcada
2. Transformada en tipo de resultado visualizado
3. Nombre de la vista extraído de la cabecera "Goa-View
4. Validación específica de la vista
5. Conversión a tipo de resultado de servicio

### Vista por defecto

Si no se definen vistas, Goa añade una vista "por defecto" que incluye todos los campos básicos.

---

## Sistema de plugins

El sistema de plugins de Goa extiende la generación de código. Los plugins pueden:

1. **Añadir nuevos DSL** - Construcciones de lenguaje de diseño adicionales
2. **Modificar el código generado** - Inspeccionar y modificar archivos, añadir nuevos archivos

Ejemplo de uso del plugin CORS:

```go
import (
    . "goa.design/goa/v3/dsl"
    cors "goa.design/plugins/v3/cors/dsl"
)

var _ = Service("calc", func() {
    cors.Origin("/.*localhost.*/", func() {
        cors.Headers("X-Shared-Secret")
        cors.Methods("GET", "POST")
    })
})
```

Casos de uso comunes del plugin:
- Soporte de protocolos (CORS, etc.)
- Formatos de documentación adicionales
- Reglas de validación personalizadas
- Cuestiones transversales (registro, métricas)
- Generación de archivos de configuración

---

## Véase también

- [Referencia DSL](dsl-reference/) - Referencia DSL completa para archivos de diseño
- [HTTP Guide](http-guide/) - Características y personalización del transporte HTTP
- [Guía gRPC](grpc-guide/) - Características del transporte gRPC y búferes de protocolo
- [Quickstart](quickstart/) - Introducción a la generación de código
