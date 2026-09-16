---
title: "Goa: servicios a partir de un diseño"
linkTitle: "Goa"
weight: 1
description: "Define el contrato API en Go. Genera tipos, transportes, clientes, validación y documentación."
llm_optimized: true
---

## Introducción

Goa construye servicios Go a partir de un diseño. Describe tipos, operaciones, errores y transportes en un lenguaje específico del dominio (DSL) escrito en Go. El generador produce el código derivado de esas decisiones; tú implementas el comportamiento con las interfaces generadas.

**[Crea tu primer servicio](quickstart/)** o sigue el **[flujo con un agente de programación](../ai-development/)**.

## Por qué ayuda a los agentes de programación

El agente parte del contrato en lugar de reconstruirlo a partir de manejadores, clientes y esquemas separados. Cambia el diseño, regenera y utiliza los errores del compilador para actualizar la aplicación. El generador escribe el código repetitivo sin que lo redacte el modelo. Proporciona el diseño, la interfaz relevante y la implementación; consulta los transportes generados cuando la tarea lo requiera.

## Cómo funciona

### Diseña {#phase-1-design-you-write}

Define métodos, datos, resultados, validación y correspondencias HTTP, gRPC o JSON-RPC en `design/*.go`. Las descripciones y ejemplos alimentan la documentación API.

### Genera {#phase-2-generate-automated}

```bash
goa gen example.com/myservice/design
```

Los transportes elegidos determinan los tipos, interfaces, servidores, clientes, validaciones, especificaciones OpenAPI y definiciones Protocol Buffer generados. No edites `gen/`: se reemplaza. `goa example` crea archivos iniciales sin sobrescribir los existentes.

### Implementa {#phase-3-implement-you-write}

Escribe lógica, autorización, persistencia y pruebas. Tras cambiar una firma, regenera y compila para encontrar implementaciones y llamadas incompatibles.

## Responsabilidades {#whats-hand-written-vs-auto-generated}

Tú y el agente mantenéis diseño, decisiones de dominio, lógica, autorización, inicio y pruebas. Goa genera tipos, interfaces, rutas, códecs, validación, clientes y especificaciones API. La validación comprueba las restricciones declaradas; la corrección de negocio, seguridad y compatibilidad con clientes desplegados requieren diseño y pruebas.

## Añade capacidades de IA

[Goa-AI](../2-goa-ai/) utiliza el mismo modelo para herramientas tipadas, respuestas estructuradas y agentes. Una herramienta puede reutilizar tipos y métodos de servicio para conectar los contratos.

## Guías

Empieza por la guía rápida, utiliza las guías de transporte para tareas prácticas y la referencia DSL para modificar diseños.
