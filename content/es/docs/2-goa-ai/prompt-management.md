---
nav_group: guides
title: "Gestión de prompts"
linkTitle: "Gestión de prompts"
weight: 28
description: "Declara prompts en el diseño, renderízalos con argumentos tipados, cámbialos en runtime para un scope y consulta qué versión de prompt construyó cada solicitud al modelo."
llm_optimized: true
---

Un prompt es el texto que tu agente envía a un modelo, como un prompt de sistema
que indica a un asistente de soporte cómo gestionar los reembolsos. Goa-AI trata
los prompts como parte de tu diseño:

- Declaras en el diseño cada prompt, su rol y los argumentos que recibe.
- `goa gen` comprueba cada plantilla con esos argumentos y genera una función
  tipada que la renderiza.
- En runtime puedes sustituir el texto de un prompt para un cliente, para una
  sesión o para todos, sin recompilar ni volver a desplegar.
- El renderizado devuelve las versiones exactas de prompt que usó. Adjúntalas a
  la solicitud al modelo que envía el texto, y la traza de la solicitud muestra
  qué texto produjo qué respuesta.

## Conceptos {#concepts}

**Prompt base.** El prompt tal como se declara en el diseño: su ID (por ejemplo
`support.assistant.system`), su rol (`system`, `user`, `tool` o `synthesis`), el
texto de su plantilla y los campos que la plantilla puede usar. El runtime
registra cada prompt base una sola vez, y un prompt base registrado nunca
cambia. Su versión se deriva del texto de la plantilla, de modo que cambiar el
texto en el diseño produce una nueva versión.

**Override.** Texto de sustitución para un prompt, guardado en un almacén de
prompts, que solo se aplica dentro de un scope. Cada override recibe su propia
versión.

**Scope.** Dónde se aplica un override. Un scope tiene un ID de sesión opcional
y las etiquetas que elijas, como `account=acme` o `region=eu`. Un override se
aplica a una solicitud cuando:

- el override no tiene ID de sesión, o su ID de sesión es igual al de la
  solicitud; y
- cada etiqueta del override está en la solicitud con el mismo valor.

Un override sin sesión y sin etiquetas se aplica en todas partes.

**Qué override gana.** Cuando se aplican varios overrides, el runtime elige uno:

1. Un override con ID de sesión gana a uno sin sesión.
2. Si no, el override con más etiquetas gana al que tiene menos.
3. Si no, gana el override más reciente.

Si no se aplica ningún override, el runtime renderiza el prompt base.

Por ejemplo, con estos overrides guardados para `support.assistant.system`:

| Scope del override | ¿Se aplica a una solicitud en la sesión `s-42` para `account=acme`, `region=eu`? |
| --- | --- |
| sin sesión, sin etiquetas | sí |
| `account=acme` | sí |
| `account=acme`, `region=eu` | sí, y gana: tiene más etiquetas |
| `account=globex` | no: el valor de la etiqueta es distinto |

## Declarar prompts en el diseño

Usa `SystemPrompt` dentro de `Agent` para el prompt de sistema base del agente
(`<service>.<agent>.system`, rol `system`), `Prompt` dentro de `Agent` para los
prompts propios del agente (`<service>.<agent>.<name>`, rol por defecto `user`)
y `Prompt` dentro de `Service` para los prompts compartidos entre agentes o
código que no es de agentes (`<service>.<name>`):

```go
var _ = Service("support", func() {
    Prompt("shared_safety", func() {
        Description("Shared safety rules")
        Role("system")
        Template("Never disclose internal credentials or personal data.")
    })

    Agent("assistant", "Answer refund questions", func() {
        SystemPrompt(func() {
            Description("Refund policy")
            Args(func() {
                Attribute("account_name", String)
                Attribute("refund_limit", Int)
                Required("account_name", "refund_limit")
            })
            Template("You help {{ .AccountName }} customers. " +
                "Approve refunds up to ${{ .RefundLimit }}. " +
                `{{ render "support.shared_safety" }}`)
        })
    })
})
```

Las plantillas se renderizan con el struct de argumentos Go generado
(`SystemPromptArgs` o `<Name>PromptArgs`), de modo que las expresiones usan los
nombres exactos de los campos Go generados (`{{ .AccountName }}`,
`{{ .RefundLimit }}`). `goa gen` emite los helpers de prompts del agente en
`gen/<service>/agents/<agent>/prompts.go` (`SystemPromptID`, `Prompt<Name>ID`,
`SystemPromptArgs`, `<Name>PromptArgs`, `PromptSpecSystem()`,
`PromptSpec<Name>()`, `PromptSpecs()`, `RegisterPrompts`, `RenderSystemPrompt`,
`Render<Name>Prompt`, `RenderSystemPromptWithRegistry` y
`Render<Name>PromptWithRegistry`) y los helpers de prompts del servicio en
`gen/<service>/prompts/prompts.go`.

## Registrar prompts

El runtime debe conocer el prompt base de un prompt antes de que nada pueda
renderizarlo.

**Los prompts de agente** se registran con su agente.
`AgentRegistration.PromptSpecs` enumera los prompts que posee un agente, y
`Runtime.RegisterAgent` los gestiona:

1. Primero comprueba todos los prompts enumerados, antes de registrar nada. Una
   plantilla que no se puede analizar, un ID duplicado o un ID ya registrado
   hacen fallar toda la llamada. También la hace fallar una plantilla que usa un
   campo que su `ArgsType` no declara, cuando el prompt declara `ArgsType`.
2. Registra el agente en el motor de workflows.
3. Solo si eso tiene éxito, añade los prompts a `Runtime.PromptRegistry`.

Un prompt que no supera las comprobaciones detiene `RegisterAgent` antes de que
el agente llegue al motor de workflows. Construir un valor de registro no tiene
efectos secundarios: no se registra nada hasta que llamas a `RegisterAgent`.

**Los prompts propiedad de un servicio** pertenecen a un servicio y no a un solo
agente, de modo que varios agentes y código que no es de agentes pueden
compartirlos. Su `PromptSpec.AgentID` está vacío, y los registras en
`Runtime.PromptRegistry` con el helper `RegisterPrompts` del paquete de servicio
generado (o `Runtime.PromptRegistry.Register`):

```go
if err := supportprompts.RegisterPrompts(rt.PromptRegistry); err != nil {
    return err
}
if err := assistant.RegisterAssistantAgent(ctx, rt, assistant.AssistantAgentConfig{
    Planner: myPlanner,
}); err != nil {
    return err
}
```

`NewAssistantRegistration(rt, cfg)` rellena `AgentRegistration.PromptSpecs` a
partir del slice generado `PromptSpecs()` sin mutar el registro, y
`RegisterAssistantAgent` llama a `rt.RegisterAgent(ctx, reg)`.

**Los prompts que registras a mano** siguen funcionando. Construye un
`prompt.PromptSpec` y pásalo a `Runtime.PromptRegistry.Register`, como antes.
Una spec con `ArgsType` nulo acepta datos sin tipar, así que se comprueba la
sintaxis de su plantilla y las `Funcs` declaradas, pero no los nombres de campos
de un struct.

## Renderizar un prompt y registrar lo que se usó

El renderizado devuelve el texto y la lista de todas las versiones de prompt
usadas para construirlo. Esa lista incluye los prompts incorporados con
`{{ render "<prompt-id>" . }}`, en el orden en que se renderizaron. Pon esa
lista en la solicitud al modelo que usa el texto:

```go
content, err := assistant.RenderSystemPrompt(ctx, input.Agent, assistant.SystemPromptArgs{
    AccountName: "Acme",
    RefundLimit: 100,
})
if err != nil {
    return nil, err
}

system := &model.Message{
    Role:  model.ConversationRoleSystem,
    Parts: []model.Part{model.TextPart{Text: content.Text}},
}
resp, err := modelClient.Complete(ctx, &model.Request{
    Messages:   append([]*model.Message{system}, input.Messages...),
    PromptRefs: content.Refs,
})
```

Usa `content.Refs`, no `[]prompt.PromptRef{content.Ref}`. `content.Ref` solo
nombra el prompt de nivel superior y omite los prompts que compuso.

El runtime no adjunta las versiones de prompt por ti: cada solicitud lleva la
lista que su llamador puso en ella. Si un planificador renderiza un prompt de
clasificación y un prompt de respuesta distinto para dos llamadas al modelo en
el mismo turno, da a cada solicitud los `Refs` de su propio renderizado. El span
de cliente `gen_ai.chat` registra `gen_ai.prompt.ids`, `gen_ai.prompt.versions`
y `goa_ai.prompt.refs` (`"<id>@<version>"`) de esa solicitud.

## Cambiar un prompt en runtime

Guardar un override sustituye el texto de un prompt para un scope. El runtime
comprueba la nueva plantilla antes de guardar nada. Los prompts generados
asignan `PromptSpec.ArgsType` a `reflect.TypeFor[<Name>PromptArgs]()` cuando se
declara `Args`, o a `reflect.TypeFor[struct{}]()` cuando el prompt no recibe
argumentos, de modo que una plantilla que usa un campo desconocido se rechaza al
guardarla en lugar de fallar más tarde en cada renderizado:

```go
scope := prompt.Scope{
    Labels: map[string]string{"account": "acme"},
}
if err := rt.PromptRegistry.ValidateOverride(assistant.SystemPromptID, newTemplate); err != nil {
    return err
}
if err := rt.PromptRegistry.SetOverride(ctx, assistant.SystemPromptID, scope, newTemplate, map[string]string{
    "author": "ops@acme.com",
}); err != nil {
    return err
}
```

## Restablecer un override

Restablecer elimina los overrides de un prompt en un scope exacto, de modo que
el siguiente renderizado vuelve al siguiente override que se aplique, o al
prompt base.

El restablecimiento es destructivo:

- Elimina de forma permanente todos los overrides guardados para ese prompt
  cuyo scope es exactamente igual al que pasas: el mismo ID de sesión y las
  mismas etiquetas, ni más ni menos.
- Los overrides de otros scopes no se modifican, incluidos los más amplios y los
  más estrechos.
- Después, `History` devuelve solo los overrides que quedan. El
  restablecimiento no conserva un registro de auditoría de lo que eliminó. Si
  necesitas uno, guarda una copia antes de restablecer.

Por ejemplo, restablecer `support.assistant.system` en el scope `account=acme`
elimina los overrides guardados exactamente en `account=acme`. Un override en
`account=acme, region=eu` permanece, igual que uno sin etiquetas. Una solicitud
para `account=acme, region=eu` sigue usando el override más estrecho. Una
solicitud solo para `account=acme` usa ahora el override sin etiquetas.

```go
if err := rt.PromptRegistry.ResetOverride(ctx, assistant.SystemPromptID, prompt.Scope{
    Labels: map[string]string{"account": "acme"},
}); err != nil {
    return err
}
```

## Almacenar overrides

Los overrides se guardan en un almacén de prompts que pasas al runtime con
`runtime.WithPromptStore`. Goa-AI incluye dos:

- `prompt.NewInMemoryStore()`, para pruebas y desarrollo en un solo proceso;
- el almacén MongoDB de `features/prompt/mongo`, para producción.

Sin un almacén de prompts, cada renderizado usa el prompt base.

### Almacenes personalizados

Un `prompt.Store` personalizado implementa `Reset` con el comportamiento
destructivo y de scope exacto descrito arriba. Trata las claves y los valores de
las etiquetas como datos simples: una clave puede contener puntos, y un valor
puede empezar por `$`.

```go
type Store interface {
    Resolve(ctx context.Context, promptID Ident, scope Scope) (*Override, error)
    Set(ctx context.Context, promptID Ident, scope Scope, template string, metadata map[string]string) error
    Reset(ctx context.Context, promptID Ident, scope Scope) error
    History(ctx context.Context, promptID Ident) ([]*Override, error)
    List(ctx context.Context) ([]*Override, error)
}
```

Si tu aplicación implementa un `prompt.Store` personalizado, añade
`Reset(ctx, promptID, scope)` para que elimine de forma permanente los overrides
cuyo `PromptID`, `Scope.SessionID` y `Scope.Labels` coincidan exactamente con
`scope` (y devuelva `nil` cuando no exista ningún override en ese scope exacto).
