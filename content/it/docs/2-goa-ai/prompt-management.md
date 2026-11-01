---
nav_group: guides
title: "Gestione dei prompt"
linkTitle: "Gestione dei prompt"
weight: 28
description: "Dichiara i prompt nel design, rendili con argomenti tipizzati, modificali a runtime per uno scope e vedi quale versione di prompt ha costruito ogni richiesta al modello."
llm_optimized: true
---

<!-- PENDING(signatures): this draft describes contracts already settled in
review. Every block marked PENDING(signatures) waits for the reviewed goa-ai
prompt API; do not publish while any marker remains. -->

Un prompt è il testo che il tuo agente invia a un modello, come un system prompt
che spiega a un assistente di supporto come gestire i rimborsi. Goa-AI tratta i
prompt come parte del tuo design:

- Nel design dichiari ogni prompt, il suo ruolo e gli argomenti che accetta.
- `goa gen` verifica ogni template rispetto a quegli argomenti e genera una
  funzione tipizzata che lo rende.
- A runtime puoi sostituire il testo di un prompt per un cliente, per una
  sessione o per tutti, senza ricompilare né ridistribuire.
- Il rendering restituisce le versioni esatte dei prompt che ha usato. Allegale
  alla richiesta al modello che invia il testo, e la traccia della richiesta
  mostra quale testo ha prodotto quale risposta.

## Concetti {#concepts}

**Prompt baseline.** Il prompt così come è dichiarato nel design: il suo ID (per
esempio `support.system`), il suo ruolo (`system`, `user`, `tool` o `synthesis`),
il testo del template e i campi che il template può usare. Il runtime registra
ogni baseline una sola volta, e una baseline registrata non cambia mai. La sua
versione deriva dal testo del template, quindi se modifichi il testo nel design
ottieni una nuova versione.

**Override.** Testo sostitutivo per un prompt, salvato in un prompt store, che
si applica solo all'interno di uno scope. Ogni override ha una propria versione.

**Scope.** Dove si applica un override. Uno scope ha un ID di sessione
facoltativo e le etichette che scegli, come `account=acme` o `region=eu`. Un
override si applica a una richiesta quando:

- l'override non ha un ID di sessione, oppure il suo ID di sessione è uguale a
  quello della richiesta; e
- ogni etichetta dell'override è presente nella richiesta con lo stesso valore.

Un override senza sessione e senza etichette si applica ovunque.

**Quale override prevale.** Quando se ne applicano diversi, il runtime ne
sceglie uno:

1. Un override con ID di sessione prevale su uno senza.
2. Altrimenti, l'override con più etichette prevale su quello con meno.
3. Altrimenti, prevale l'override più recente.

La scelta è deterministica: anche gli override salvati nello stesso istante si
risolvono ogni volta nello stesso override.

Se non si applica alcun override, il runtime rende la baseline.

Per esempio, con questi override salvati per `support.system`:

| Scope dell'override | Si applica a una richiesta nella sessione `s-42` per `account=acme`, `region=eu`? |
| --- | --- |
| nessuna sessione, nessuna etichetta | sì |
| `account=acme` | sì |
| `account=acme`, `region=eu` | sì, e prevale: ha più etichette |
| `account=globex` | no: il valore dell'etichetta è diverso |

## Dichiarare i prompt nel design

<!-- PENDING(signatures): Prompt / SystemPrompt / Args DSL, agent-level and
service-level placement, and the exact generated names. Arguments are rendered
from the generated Go struct, so templates use exact generated Go field names. -->

## Registrare i prompt

Il runtime deve conoscere la baseline di un prompt prima che qualcosa possa
renderlo.

**I prompt di un agente** si registrano insieme al loro agente.
`AgentRegistration.PromptSpecs` elenca i prompt che appartengono a un agente, e
`Runtime.RegisterAgent` li gestisce:

1. Verifica prima ogni prompt elencato, prima di registrare qualsiasi cosa. Un
   template che non si analizza, un ID duplicato o un ID già registrato fanno
   fallire l'intera chiamata. Lo stesso accade per un template che usa un campo
   non dichiarato dal suo prompt, quando il prompt dichiara i suoi campi.
2. Registra l'agente presso il motore di workflow.
3. Solo se questo riesce, aggiunge i prompt a `Runtime.PromptRegistry`.

Un prompt che non supera le verifiche interrompe `RegisterAgent` prima che
l'agente raggiunga il motore di workflow. Costruire un valore di registrazione
non ha effetti collaterali: nulla viene registrato finché non chiami
`RegisterAgent`.

**I prompt di un servizio** appartengono a un servizio anziché a un singolo
agente, quindi più agenti e codice non legato ad agenti possono condividerli. Il
loro `PromptSpec.AgentID` è vuoto, e li registri direttamente con
`Runtime.PromptRegistry.Register`.

<!-- PENDING(signatures): the generated agent registration that fills
PromptSpecs and the generated service registration function. -->

**I prompt registrati a mano** continuano a funzionare. Costruisci un
`prompt.PromptSpec` e passalo a `Runtime.PromptRegistry.Register`, come prima.
Una spec senza `Fields` non dichiara alcun campo, quindi del suo template viene
verificata la sintassi ma non i nomi dei campi.

## Rendere un prompt e registrare cosa è stato usato

Il rendering restituisce il testo e l'elenco di ogni versione di prompt usata
per costruirlo. Quell'elenco include i prompt inclusi con
`{{ render "<prompt-id>" . }}`, nell'ordine in cui sono stati resi. Metti
quell'elenco sulla richiesta al modello che usa il testo:

<!-- PENDING(signatures): replace with the generated typed render helper once
its signature is final. -->

```go
content, err := input.Agent.RenderPrompt(ctx, "support.system", args)
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

Usa `content.Refs`, non `[]prompt.PromptRef{content.Ref}`. `content.Ref` indica
solo il prompt di primo livello e omette i prompt che ha composto.

Il runtime non allega le versioni dei prompt al posto tuo: ogni richiesta porta
l'elenco che il suo chiamante vi ha messo. Se un planner rende un prompt di
classificazione e un prompt di risposta separato per due chiamate al modello
nello stesso turno, dai a ogni richiesta i `Refs` del proprio rendering. Lo span
di traccia della chiamata al modello elenca gli ID e le versioni dei prompt
presenti su quella richiesta.

<!-- PENDING(signatures): exact span attribute names. -->

## Modificare un prompt a runtime

Salvare un override sostituisce il testo di un prompt per uno scope. Il runtime
verifica il nuovo template prima di salvare qualsiasi cosa. Per un prompt che
dichiara i suoi campi, un template che usa un campo sconosciuto viene rifiutato
al momento del salvataggio, invece di fallire in seguito a ogni rendering.

<!-- PENDING(signatures): state how generated prompts, including prompts with
no arguments, declare their fields. -->

<!-- PENDING(signatures): SetOverride / ValidateOverride signatures and return
values. -->

## Reimpostare un override

La reimpostazione rimuove gli override di un prompt in uno scope esatto, così il
rendering successivo ripiega sul successivo override che si applica, oppure
sulla baseline.

La reimpostazione è distruttiva:

- Elimina definitivamente ogni override salvato per quel prompt il cui scope è
  esattamente uguale a quello che passi: lo stesso ID di sessione e le stesse
  etichette, né più né meno.
- Gli override in altri scope restano intatti, inclusi quelli più ampi e quelli
  più ristretti.
- Dopo la reimpostazione, `History` restituisce solo gli override rimasti. La
  reimpostazione non conserva una traccia di audit di ciò che ha eliminato. Se
  te ne serve una, registrala prima di reimpostare.

Per esempio, reimpostare `support.system` nello scope `account=acme` elimina gli
override salvati esattamente in `account=acme`. Un override in
`account=acme, region=eu` resta, e lo stesso vale per uno senza etichette. Una
richiesta per `account=acme, region=eu` continua a usare l'override più
ristretto. Una richiesta solo per `account=acme` ora usa l'override senza
etichette.

<!-- PENDING(signatures): Registry.ResetOverride / Store.Reset call. -->

## Archiviare gli override

Gli override risiedono in un prompt store che passi al runtime con
`runtime.WithPromptStore`. Goa-AI ne include due:

- `prompt.NewInMemoryStore()`, per i test e lo sviluppo in un singolo processo;
- lo store MongoDB in `features/prompt/mongo`, per la produzione.

Senza un prompt store, ogni rendering usa la baseline.

### Store personalizzati

Uno `prompt.Store` personalizzato ora implementa anche `Reset`, con il
comportamento distruttivo e a scope esatto descritto sopra. Tratta le chiavi e i
valori delle etichette come semplici dati: una chiave può contenere punti, e un
valore può iniziare con `$`.

<!-- PENDING(signatures): final Store interface listing and migration note for
external implementers. -->
