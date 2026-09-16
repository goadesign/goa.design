---
title: "Goa-AI: agentes a partir de un diseño"
linkTitle: "Goa-AI"
weight: 2
description: "Diseña herramientas tipadas y contratos de agentes en Go. Genera la integración y utiliza un modelo de ejecución explícito."
llm_optimized: true
---

## Introducción

Goa-AI amplía el lenguaje y el generador de Goa a las aplicaciones de IA. Define agentes, entradas y resultados de herramientas, respuestas estructuradas, políticas y evaluaciones. Genera tipos, esquemas, códecs y enlaces; escribe planificadores y comportamiento de la aplicación.

**[Crea tu primer agente](quickstart/)** o sigue el **[flujo con un agente de programación](../ai-development/)**. No necesitas desplegar antes un servicio Goa separado.

## Desarrolla con un agente de programación

Los esquemas y códecs Go proceden del mismo diseño. Una herramienta reutiliza tipos e implementación de un servicio mediante `BindTo`. La generación también produce **`AGENTS_QUICKSTART.md`**, una guía basada en tu diseño. Dásela al agente junto con los archivos de diseño e implementa planificadores y ejecutores fuera de `gen/`. Regenera, compila y ejecuta evaluaciones al evolucionar.

Esto evita que el modelo redacte esquemas e integraciones repetitivos. No garantiza un porcentaje de ahorro: mide tareas completas, incluyendo contexto, intentos y revisión.

## Integra agentes en el producto

### Contratos de herramientas {#design-first-agents}

Define entradas y resultados con tipos Goa, descripciones, ejemplos y validación. El generador produce esquemas JSON y códecs tipados. Los argumentos del modelo se validan antes de ejecutar. Consulta [herramientas](toolsets/).

### Salidas estructuradas {#typed-direct-completions}

`Completion(...)` declara una respuesta tipada. Las funciones generadas, también en streaming, validan el resultado completo. Consulta [DSL](dsl-reference/) y [runtime](runtime/).

### Evaluaciones {#generated-evaluations}

Declara suites y escenarios, genera hooks tipados e implementa comprobaciones de resultados. El juicio semántico requiere calibración. Consulta [evaluaciones generadas](evaluations/).

### Composición {#run-trees-composition}

Expón un agente como herramienta de otro. Las ejecuciones hijas tienen identidad, enlace al padre e historial. Consulta [composición](agent-composition/).

### Streaming {#structured-streaming}

El runtime emite eventos tipados para respuestas, herramientas, intervención humana y estado. La aplicación decide qué exponer y cómo transportarlo. Consulta [streaming](production/#ui-de-streaming).

### Ejecución duradera {#temporal-durability}

Utiliza el motor en memoria en local. Configura Temporal para persistencia, recuperación y reintentos de actividades. Los efectos externos requieren idempotencia y políticas de reintento adecuadas en la aplicación. Consulta [producción](production/).

### Servidores MCP y registros de herramientas alojados {#tool-registries}

**Crea servidores MCP.** Expón métodos como herramientas, publica recursos y proporciona plantillas de prompts mediante protocolo y adaptadores generados. Los agentes también pueden consumir herramientas MCP externas. Consulta [integración MCP](mcp-integration/).

**Aloja un registro de herramientas.** Ejecuta el servidor incluido como catálogo compartido y pasarela de invocación, respaldado por Redis y Pulse. Los proveedores publican conjuntos y esquemas; los consumidores descubren herramientas e invocan proveedores disponibles. Los helpers generados conectan las aplicaciones al registro. Consulta [operación del registro](registry/).

### Modelos y estado {#model-providers}

Hay adaptadores para OpenAI, Anthropic, AWS Bedrock y Google Vertex AI. Sus capacidades varían: consulta el [runtime](runtime/). La aplicación aporta almacenamiento y controla sesiones, autorización y memoria. Consulta [memoria y sesiones](memory-sessions/).

## Arquitectura

El diseño define contratos estáticos; el código generado los convierte en paquetes tipados. El runtime coordina la ejecución y el motor aporta workflows locales o duraderos. Los planificadores toman decisiones semánticas; los servicios implementan el comportamiento de negocio.

## Guías

Empieza por la guía rápida local y añade herramientas, modelos, estado y despliegue. Consulta DSL y runtime para los contratos exactos.
