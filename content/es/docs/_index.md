---
title: "Construir con Goa"
linkTitle: "Documentación"
weight: 1
description: "Un lenguaje de diseño para servicios Go y agentes de IA. Un flujo claro para desarrolladores y agentes de programación."
hide_children: true
---

Goa es un framework Go que da a los agentes de programación menos código que escribir y un único contrato sobre el que razonar. Genera API, clientes y validación. Crea agentes de IA, servidores MCP y registros de herramientas con Goa-AI.

## Elige por dónde empezar

- **[Crear un servicio con Goa](1-goa/quickstart/).** Define una API en Go, genera el servidor y cliente HTTP e implementa la lógica de negocio.
- **[Crear un agente de IA con Goa-AI](2-goa-ai/quickstart/).** Define herramientas tipadas, genera un agente local y conecta tu planificador y modelo.
- **[Desarrollar con un agente de programación](ai-development/).** Proporciona un diseño concreto, límites de edición explícitos y un ciclo repetible de generación y pruebas.

Goa y Goa-AI comparten lenguaje y generador. Usa Goa de forma independiente, empieza directamente con Goa-AI o expón un método de servicio como herramienta con los mismos tipos.

## Cómo encajan las piezas

**El diseño describe el contrato.** Tipos, descripciones, validación, ejemplos y operaciones se definen en Go. Goa-AI añade agentes, conjuntos de herramientas, respuestas estructuradas y evaluaciones.

**El generador deriva el código.** `goa gen` produce interfaces, transportes, clientes, esquemas y enlaces. `gen/` contiene código generado; el código de la aplicación queda fuera.

**La aplicación implementa el comportamiento.** Tú y tu agente escribís lógica, planificadores, persistencia, autorización y pruebas. Tras cambiar un contrato, regenera y utiliza el compilador y las pruebas para actualizar la implementación.

## Documentación para personas y agentes

La navegación separa primeros pasos, guías y referencia. Cada página ofrece **Copiar página** y una versión **Markdown**. El [índice para agentes](/es/llms.txt) enlaza páginas concretas para aportar el contexto necesario.

Explora el [ecosistema Goa](3-ecosystem/) para observabilidad, eventos distribuidos y diagramas. Consulta [cómo contribuir](contributing/) para informar de errores o mejorar estas guías.
