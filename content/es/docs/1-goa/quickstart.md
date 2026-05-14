---
title: Inicio rápido
weight: 1
description: "Complete guide to installing Goa and building your first service - from setup to running a working HTTP endpoint."
llm_optimized: true
aliases:
---

Esta guía te guía a través de la instalación de Goa y la creación de tu primer servicio. Al final, tendrás una API HTTP funcional que podrás ampliar y personalizar.

## Prerrequisitos

Antes de comenzar, asegúrate de que tu entorno cumple estos requisitos:

- **Go 1.18 o posterior** - Goa aprovecha las características modernas de Go
- **Go Modules activado** - Esto es lo predeterminado en Go 1.16+, pero verifícalo con `GO111MODULE=on` si es necesario
- **curl o cualquier cliente HTTP** - Para probar su servicio

## Instalación

Instale los paquetes Goa y la herramienta CLI:

```bash
# Pull the Goa packages
go get goa.design/goa/v3/...

# Install the Goa CLI
go install goa.design/goa/v3/cmd/goa@latest

# Verify the installation
goa version
```

Debería ver la versión actual de Goa (por ejemplo, `v3.x.x`). Si el comando `goa` no se encuentra, asegúrese de que su directorio Go bin está en su PATH:

```bash
export PATH=$PATH:$(go env GOPATH)/bin
```

---

## Cree su primer servicio

Ahora vamos a construir un simple servicio "hola mundo" que demuestre el enfoque de diseño primero de Goa.

### 1. Configuración del Proyecto

Crea un nuevo directorio e inicializa un módulo Go:

```bash
mkdir hello-goa && cd hello-goa  
go mod init hello
```

> **Nota:** Estamos usando un nombre de módulo simple `hello` para esta guía. En proyectos reales, normalmente usarías un nombre de dominio como `github.com/yourusername/hello-goa`. Los conceptos funcionan exactamente de la misma manera.

### 2. Diseñe su API

Goa utiliza un potente DSL (Domain Specific Language) para describir tu API. Crea un directorio y un archivo de diseño:

```bash
mkdir design
```

Crear `design/design.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
)

var _ = Service("hello", func() {
    Description("A simple service that says hello.")

    Method("sayHello", func() {
        Payload(String, "Name to greet")
        Result(String, "A greeting message")

        HTTP(func() {
            GET("/hello/{name}")
        })
    })
})
```

Vamos a desglosar lo que hace este diseño:

- **`Service("hello", ...)`** - Define un nuevo servicio llamado "hola"
- **`Method("sayHello", ...)`** - Define un método dentro del servicio
- **`Payload(String, ...)`** - Especifica la entrada: una cadena que representa el nombre a saludar
- **`Result(String, ...)`** - Especifica la salida: un mensaje de saludo
- **`HTTP(func() { GET("/hello/{name}") })`** - Asigna el método a un punto final HTTP GET en el que `{name}` se vincula automáticamente a la carga útil

Este enfoque declarativo significa que usted describe *lo* que hace su API, y Goa se encarga de los detalles de implementación: vinculación de parámetros, enrutamiento, validación y documentación OpenAPI.

### 3. Generar código

Transforme su diseño en una estructura de servicio completamente funcional:

```bash
goa gen hello/design
```

Esto crea una carpeta `gen` que contiene:
- Interfaces de servicio y puntos finales
- Capa de transporte HTTP (manejadores, codificadores, decodificadores)
- Especificaciones OpenAPI/Swagger
- Código cliente

A continuación, el andamiaje de una implementación operativa:

```bash
goa example hello/design
```

> **Importante:** El comando `gen` regenera la carpeta `gen/` cada vez que lo ejecutas. El comando `example` crea archivos de implementación de inicio que usted posee y personaliza - Goa no los sobrescribirá en ejecuciones posteriores.

La estructura de su proyecto ahora se ve así:

```
hello-goa/
├── cmd/
│   ├── hello/           # Server executable
│   │   ├── http.go
│   │   └── main.go
│   └── hello-cli/       # CLI client
│       ├── http.go
│       └── main.go
├── design/
│   └── design.go        # Your API design
├── gen/                 # Generated code (don't edit)
│   ├── hello/
│   └── http/
└── hello.go             # Your service implementation
```

### 4. Implementar el servicio

Abre `hello.go` y busca el método `SayHello`. Sustitúyelo por tu implementación:

```go
func (s *hellosrvc) SayHello(ctx context.Context, name string) (string, error) {
    log.Printf(ctx, "hello.sayHello")
    return fmt.Sprintf("Hello, %s!", name), nil
}
```

Esa es toda la lógica de negocio que necesitas - Goa se encarga de todo lo demás.

### 5. Ejecutar y probar

Primero, descarga las dependencias:

```bash
go mod tidy
```

Inicie el servidor:

```bash
go run ./cmd/hello --http-port=8080
```

Debería ver:

```
INFO[0000] http-port=8080
INFO[0000] msg=HTTP "SayHello" mounted on GET /hello/{name}
INFO[0000] msg=HTTP server listening on "localhost:8080"
```

Prueba con curl (en un nuevo terminal):

```bash
curl http://localhost:8080/hello/Alice
```

Respuesta:

```
"Hello, Alice!"
```

🎉 ¡Enhorabuena! Has construido tu primer servicio Goa.

#### Usando el cliente CLI generado

Goa también ha generado un cliente de línea de comandos. Pruébalo:

```bash
go run ./cmd/hello-cli --url=http://localhost:8080 hello say-hello -p=Alice
```

Explora los comandos disponibles:

```bash
go run ./cmd/hello-cli --help
```

---

## Desarrollo en curso

A medida que su servicio evolucione, modificará el diseño y regenerará el código:

```bash
# After updating design/design.go
goa gen hello/design
```

Puntos clave:
- **`gen/` carpeta** - Regenerada cada vez; nunca edites estos archivos directamente
- **Tus archivos de implementación** - Puedes personalizarlos; Goa no los sobrescribirá
- **Nuevos métodos** - Añádelos a tu diseño, regenéralos e implementa los stubs de los nuevos métodos

---

## Próximos pasos

Ya has aprendido los fundamentos del enfoque "design-first" de Goa. Continúe su viaje:

- **[Referencia DSL](./dsl-reference.md)** - Guía completa del lenguaje de diseño de Goa
- **[Guía HTTP](./http-guide.md)** - Guía detallada de las características de transporte HTTP
- **[Guía gRPC](./grpc-guide.md)** - Construya servicios gRPC con Goa
- **[Tratamiento de errores](./error-handling.md)** - Defina y gestione los errores adecuadamente
- **[Generación de código](./code-generation.md)** - Entender qué genera Goa y cómo personalizarlo
