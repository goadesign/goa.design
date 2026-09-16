---
title: "Sviluppa con un agente di coding"
linkTitle: "Flusso con agenti di coding"
weight: 1
description: "Fornisci un contratto esplicito, genera il codice ripetitivo e usa il compilatore per guidare l’implementazione."
---

Goa aiuta a **sviluppare software con un agente di coding** e a **integrare agenti IA nel software**. Goa genera contratti di servizio; Goa-AI estende la generazione a tool, output strutturati e integrazione degli agenti.

## Perché la generazione cambia il lavoro

Un LLM che scrive separatamente handler, client, schemi e validazione deve mantenerli coerenti. Goa li deriva dal progetto, lasciando al modello requisiti, decisioni di dominio e implementazione.

- **Meno scrittura ripetitiva.** Il generatore produce file senza farli scrivere all’LLM. Il risparmio totale dipende da contesto, iterazioni e revisione.
- **Contesto mirato.** Tipi, descrizioni, esempi e vincoli sono insieme nel progetto. Leggi progetto e interfaccia prima di esplorare tutta l’implementazione.
- **Responsabilità prevedibili.** Modifica progetto e applicazione; rigenera `gen/`. Riusa schemi e convenzioni invece di inventarli per ogni servizio.
- **Riscontri del compilatore.** Le firme generate rendono visibili chiamanti e implementazioni incompatibili. I cambiamenti di comportamento richiedono test.
- **Contratti collegati.** Goa-AI riusa tipi e collega tool ai metodi tramite schemi, codec e trasformazioni generati.

## Installa la skill Goa service designer {#install-the-skill}

Esegui questo comando nel repository della tua applicazione. La [Skills CLI](https://github.com/vercel-labs/skills) installa la skill completa e consente di scegliere il tuo strumento di sviluppo. Richiede Node.js e npm.

```bash
npx skills add goadesign/goa --skill goa-service-designer
```

La skill insegna all’agente a esaminare il progetto, modificare prima il design, eseguire il generatore corretto, implementare fuori da `gen/`, aggiornare i consumer interessati e verificare la modifica. Copre contratti dei servizi, HTTP/gRPC, validazione, errori e interceptor. Per Goa-AI, fornisci anche `AGENTS_QUICKSTART.md` generato; questa skill è dedicata ai servizi Goa.

Per selezionare strumenti specifici senza le domande dell’installer:

```bash
npx --yes skills add goadesign/goa --skill goa-service-designer \
  -a codex -a cursor -a claude-code --yes
```

L’installazione predefinita è locale al progetto. Aggiungi `--global` per un’installazione personale o `--copy` se l’ambiente non supporta i link simbolici. Senza Node.js, copia tutta la [directory `goa-service-designer`](https://github.com/goadesign/goa/tree/v3/skills/goa-service-designer) nella cartella delle skill supportata dal tuo strumento.

## Il ciclo di sviluppo

### 1. Fornisci il contesto necessario

Dai all’agente obiettivo, progetto e implementazione da modificare. Installa la [skill Goa service designer](https://github.com/goadesign/goa/tree/v3/skills) seguendo le istruzioni del tuo strumento.

Con Goa-AI, leggi anche **`AGENTS_QUICKSTART.md`** nella radice dell’applicazione. Deriva dal progetto, salvo `DisableAgentDocs()`, e descrive pacchetti generati e lavoro residuo. Usa le pagine Markdown o l’[indice](/it/llms.txt) per fornire riferimenti mirati. Non caricare tutti i trasporti generati per impostazione predefinita; consultali quando serve.

### 2. Modifica prima il progetto

Definisci operazioni, payload, risultati, errori e vincoli in `design/`. La validazione strutturale appartiene al progetto; autorizzazione e regole di business al codice applicativo responsabile. Descrivi quando usare un tool, cosa restituisce e il significato dei suoi campi. Riusa tipi di servizio quando rappresentano lo stesso contratto.

### 3. Genera e implementa

```bash
goa gen example.com/catalog/design
```

Implementa le interfacce fuori da `gen/`. `goa example` crea file iniziali una sola volta e non aggiorna la logica esistente. Non correggere errori di compilazione modificando `gen/`: correggi progetto o implementazione e rigenera.

### 4. Verifica il cambiamento completo

```bash
gofmt -w design
go test ./...
```

Rivedi il contratto pubblico e aggiungi test sul comportamento osservabile. Per l’IA, esegui valutazioni sugli esiti e sull’uso dei tool. Uno schema valido non dimostra che il modello abbia scelto il tool giusto. Autorizzazione, idempotenza degli effetti esterni e compatibilità con client distribuiti restano responsabilità applicative.

## Un progetto, due punti di ingresso {#one-design-two-entry-points}

Questo catalogo espone la stessa operazione via **HTTP, gRPC e JSON-RPC** e offre a un agente un tool associato. `LookupPayload` e `Product` definiscono entrambi i contratti. I campi numerati definiscono anche il mapping Protocol Buffer. Implementa ricerca dei prodotti e planner nel codice applicativo.

Crea il modulo e installa le versioni dell’esempio:

Questa guida usa uno snapshot di sviluppo Goa-AI fissato, non una release stabile. Il modulo Go seleziona la dipendenza Goa compatibile. Esegui il generatore con `go run` per usare quella versione. Usa la versione Go dichiarata dal modulo o una successiva.

```bash
mkdir catalog && cd catalog
go mod init example.com/catalog
go get goa.design/goa-ai@v0.78.8-0.20260915025548-ae0c418b7e77
mkdir design
```

Salva questo codice in `design/catalog.go`:

```go
package design

import (
    . "goa.design/goa/v3/dsl"
    . "goa.design/goa-ai/dsl"
)

var _ = API("catalog", func() {
    Title("Product catalog")
    Description("Find products through an API or an agent tool")
})

var LookupPayload = Type("LookupPayload", func() {
    Field(1, "sku", String, "Product stock-keeping unit", func() {
        MinLength(1)
    })
    Required("sku")
    Example(map[string]any{"sku": "BOOK-1"})
})

var Product = Type("Product", func() {
    Field(1, "sku", String, "Product stock-keeping unit")
    Field(2, "name", String, "Product name")
    Required("sku", "name")
    Example(map[string]any{"sku": "BOOK-1", "name": "The Go Book"})
})

var _ = Service("catalog", func() {
    Description("Provides product information to API clients and agents")
    JSONRPC(func() { POST("/rpc") })

    Method("lookup", func() {
        Description("Find a product by SKU")
        Payload(LookupPayload)
        Result(Product)

        HTTP(func() {
            GET("/products/{sku}")
            Response(StatusOK)
        })
        GRPC(func() {})
        JSONRPC(func() {})
    })

    Agent("assistant", "Find products", func() {
        Use("catalog", func() {
            Tool("lookup", "Find a product by SKU", func() {
                Args(LookupPayload)
                Return(Product)
                BindTo("lookup")
            })
        })
    })
})
```

Genera contratti e file iniziali:

```bash
go mod tidy
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy
go test ./...
```

Esamina interfaccia, server e client HTTP, OpenAPI, schemi e codec dei tool e `AGENTS_QUICKSTART.md`. Implementa la ricerca e sostituisci il planner di esempio prima dell’uso in un prodotto.

## Un prompt utile

```text
Read design/ and the relevant generated service interface. For Goa-AI,
also read AGENTS_QUICKSTART.md.

Implement the requested behavior by changing the design first when the
contract changes. Regenerate with the project's pinned Goa version.
Do not edit gen/ or maintain a second tool schema by hand.

Update application implementations and callers. Put structural validation
in the design; keep authorization and business rules in their owning code.
Run the project's tests and relevant agent evaluations. Report the contract
changes, checks performed, and any behavior still needing review.
```

Aggiungi l’esito richiesto e i criteri di accettazione. Il prompt definisce un processo, non sostituisce un compito chiaro o il giudizio ingegneristico.

## Misura il vantaggio

Confronta lo stesso compito, criteri, modello e codice iniziale in più esecuzioni. Registra token in ingresso e uscita, tempo totale, generazione, test, correzioni manuali, revisione e difetti. Includi preparazione e tentativi falliti. Le righe generate dimostrano lavoro svolto dal generatore, non un benchmark di risparmio.

Non c’è una promessa universale di 10×. Il vantaggio concreto è affidare lavoro ripetitivo a una generazione deterministica e dare a persone e agenti un obiettivo di implementazione più chiaro.

Continua con il [quickstart Goa](../1-goa/quickstart/) o il [quickstart Goa-AI](../2-goa-ai/quickstart/).
