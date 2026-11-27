---
title: "Sviluppa con un coding agent"
linkTitle: "Flusso con coding agent"
weight: 1
description: "Fornisci al tuo coding agent un contratto esplicito, genera il codice ripetitivo e usa i riscontri del compilatore per guidare l'implementazione."
---

Goa supporta due attività complementari: **sviluppare software con un coding agent** e **integrare agenti IA in quel software**. Lo stesso flusso design-first aiuta in entrambi i casi. Goa genera i contratti dei servizi; Goa-AI estende la generazione a tool, output strutturati e integrazione degli agenti.

## Perché la generazione cambia il flusso di lavoro

Quando un LLM scrive separatamente handler, client, schemi JSON e validazione, deve mantenere allineate tutte queste rappresentazioni. Goa le deriva dal design, lasciando che il modello si concentri su requisiti, decisioni di dominio e implementazione.

- **Meno scrittura ripetitiva.** Il generatore produce il codice senza che un LLM debba scrivere ogni singolo file generato. Questo riduce il lavoro sui token di output; il risparmio complessivo dipende da quanto contesto, iterazioni e revisione richiede il compito.
- **Un punto di partenza mirato.** Il design raccoglie nello stesso posto tipi, descrizioni, esempi, vincoli e operazioni. Carica il design e l'interfaccia rilevanti prima di chiedere all'agente di esplorare un'implementazione più ampia.
- **Responsabilità prevedibili.** Modifica il design e il codice applicativo; rigenera `gen/`. Un coding agent non deve inventare un nuovo pattern di trasporto per ogni servizio o una convenzione di schema diversa per ogni tool.
- **Riscontro del compilatore.** Una modifica alla firma di un metodo generato rende immediatamente visibili al compilatore Go le implementazioni e i chiamanti incompatibili. Le modifiche comportamentali richiedono comunque test dedicati.
- **Contratti di servizi e tool collegati.** Goa-AI può riusare i tipi Goa e associare i tool ai metodi dei servizi. Schemi, codec e trasformazioni generati mantengono collegate queste rappresentazioni.

## Installa la skill Goa service designer {#install-the-skill}

Esegui questo comando nel repository della tua applicazione. La [Skills CLI](https://github.com/vercel-labs/skills) installa la skill completa e ti permette di scegliere il tuo strumento di programmazione. Richiede Node.js e npm.

```bash
npx skills add goadesign/goa --skill goa-service-designer
```

La skill insegna all'agente a esaminare il progetto, modificare prima il design, eseguire il generatore corrispondente, implementare fuori da `gen/`, aggiornare i consumer interessati e verificare la modifica. Include indicazioni per contratti dei servizi, HTTP/gRPC, validazione, errori e interceptor. Per Goa-AI, fornisci anche il file generato `AGENTS_QUICKSTART.md`; la skill service designer è focalizzata sui servizi Goa.

Per selezionare strumenti specifici senza le domande interattive dell'installer:

```bash
npx --yes skills add goadesign/goa --skill goa-service-designer \
  -a codex -a cursor -a claude-code --yes
```

L'impostazione predefinita è locale al progetto. Aggiungi `--global` per un'installazione personale o `--copy` se l'ambiente non supporta i link simbolici. Senza Node.js, copia l'intera [cartella `goa-service-designer`](https://github.com/goadesign/goa/tree/v3/skills/goa-service-designer) nella directory delle skill supportata dal tuo strumento.

## Il ciclo di sviluppo

### 1. Fornisci il contesto rilevante

Consegna al coding agent l'obiettivo, i file di design e l'implementazione da modificare. Per un servizio, installa la [skill Goa service designer](https://github.com/goadesign/goa/tree/v3/skills) seguendo le istruzioni del tuo strumento.

Per Goa-AI, leggi anche **`AGENTS_QUICKSTART.md`** nella radice dell'applicazione. Goa-AI genera questa guida dal design dell'agente salvo che sia impostato `DisableAgentDocs()`: descrive i pacchetti generati e il lavoro di implementazione rimanente.

Usa le pagine Markdown di questo sito o l'[indice della documentazione](/it/llms.txt) per fornire materiale di riferimento mirato. Evita di caricare per impostazione predefinita tutti i trasporti generati nel contesto del modello; ispezionali quando il task lo richiede.

### 2. Modifica prima il design

Descrivi operazioni, payload, risultati, errori e vincoli in `design/`. Metti la validazione strutturale nel design. Mantieni autorizzazione e regole di business nel livello applicativo che ne è responsabile.

Per il tool di un agente, scrivi una descrizione che spieghi quando usarlo e cosa restituisce. Dai a ogni campo una descrizione utile. Riusa i tipi di servizio esistenti quando esprimono lo stesso contratto di dominio.

### 3. Genera e implementa

```bash
goa gen example.com/catalog/design
```

Implementa o aggiorna le interfacce generate nei file di proprietà dell'applicazione. `goa example` crea i file iniziali una sola volta e non aggiorna la logica di business esistente quando il design cambia. Non modificare mai `gen/` per far sparire un errore del compilatore: correggi il design o l'implementazione applicativa e rigenera.

### 4. Verifica l'intera modifica

```bash
gofmt -w design
go test ./...
```

Esamina il diff del design e il contratto pubblico risultante. Aggiungi test comportamentali per ciò che i chiamanti devono osservare. Per le applicazioni IA, esegui valutazioni che verifichino gli esiti e l'uso dei tool: argomenti conformi allo schema non dimostrano che un modello abbia scelto il tool giusto o prodotto una risposta utile.

La generazione non garantisce l'autorizzazione, non rende idempotenti gli effetti collaterali esterni e non dimostra la compatibilità con i client già distribuiti. Testa queste proprietà nel codice applicativo che le possiede.

## Un design, due punti di ingresso {#one-design-two-entry-points}

Questo catalogo espone la stessa operazione su **HTTP, gRPC e JSON-RPC** e fornisce a un agente un tool collegato a essa. `LookupPayload` e `Product` definiscono entrambi i contratti; i campi numerati definiscono anche il mapping Protocol Buffer. Implementa la ricerca dei prodotti e il planner nel codice applicativo.

Crea un modulo e installa le versioni usate in questo esempio:

Questa guida usa la release `v0.90.0` di Goa-AI (che richiede Go 1.27.3 o successivo). Il suo modulo Go seleziona automaticamente una dipendenza compatibile Goa `v3.35+` (oppure esegui `go get goa.design/goa/v3@v3.36.0` per fissare l'ultima release di Goa). Esegui il generatore tramite `go run` affinché utilizzi la versione selezionata dal modulo.

```bash
mkdir catalog && cd catalog
go mod init example.com/catalog
go get goa.design/goa-ai@v0.90.0
mkdir design
```

Salva quanto segue in `design/catalog.go`:

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

Genera i contratti e i file applicativi iniziali:

```bash
go mod tidy
go run goa.design/goa/v3/cmd/goa gen example.com/catalog/design
go run goa.design/goa/v3/cmd/goa example example.com/catalog/design
go mod tidy
go test ./...
```

Esamina l'interfaccia del servizio generata, il server e il client HTTP, le specifiche OpenAPI, gli schemi e i codec dei tool dell'agente e `AGENTS_QUICKSTART.md`. Su questo `design/catalog.go` di 54 righe, `goa gen` produce 57 file sotto `gen/` (~5.400 righe di Go più OpenAPI, Protobuf e schemi JSON dei tool) oltre ad `AGENTS_QUICKSTART.md` senza consumare token di output del modello. Lo scaffolding applicativo è un punto di partenza: implementa la logica di lookup e sostituisci il planner di esempio prima dell'uso in produzione.

## Un prompt operativo efficace

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

Aggiungi il risultato concreto atteso e i criteri di accettazione. Questo prompt definisce un flusso di lavoro; non sostituisce un task chiaro né il giudizio ingegneristico.

## Coordina più coding agent con Chorus {#coordinate-multiple-agents}

Quando un task coinvolge più ruoli o famiglie di modelli — ad esempio un agente che revisiona contratti e sicurezza (`arch`), un secondo che implementa il servizio Goa (`api`) e un terzo che esegue test concorrenti `-race` e di integrazione (`qa`) — usa [Chorus](/it/docs/3-ecosystem/chorus/) (`github.com/goadesign/chorus`) per collegare le sessioni su un server MCP locale condiviso (`http://localhost:9440/mcp`).

Installa e avvia Chorus (registra MCP e la skill `chorus` nei tuoi coding agent):

```bash
brew install goadesign/tap/chorus && chorus up
```

Oppure senza Homebrew (`curl` o `npx` con Node.js 18+):

```bash
curl -fsSL https://raw.githubusercontent.com/goadesign/chorus/main/scripts/install.sh | sh
```

```bash
npx @goadesign/chorus up
```

Assegna poi a ogni sessione del coding agent il proprio handle e canale nel prompt:

```text
Use Chorus as arch in #catalog and review the LookupPayload contract with api and qa.
```

Gli agenti entrano nei `#channels`, scambiano messaggi diretti `@agent`, ricevono le risposte non lette allegate a `send` e attendono in background tramite `chorus watch <handle>` finché un compagno non li menziona o risponde. Consulta la [guida di Chorus](/it/docs/3-ecosystem/chorus/) per il riferimento completo dei tool e l'architettura.

## Separa scrittura dei test e verifica con Highbay {#build-and-verify-with-highbay}

Quando vuoi che un coding agent scriva i test di accettazione e un coding agent diverso scriva l'implementazione — con un server che verifichi entrambi rispetto a un contratto concordato prima del merge — usa [Highbay](/it/docs/3-ecosystem/highbay/) (`github.com/goadesign/highbay`).

Installa Highbay e registra il server MCP `highbay` e la skill `/highbay` (`$highbay` in Codex) nei tuoi coding agent:

```bash
go install github.com/goadesign/highbay/cmd/highbay@latest
highbay up
```

Invoca poi `/highbay` in una cartella vuota (o in un repository Goa esistente che abbia già un commit Git e una suite `<module>/eval` oppure impostazioni di verifica salvate):

```text
/highbay — build a refund assistant: refunds up to $50 get instant store credit; larger ones wait for a manager.
```

Il tuo coding agent inizializza un guscio Go ed `eval/` pulito e neutrale rispetto al dominio quando la cartella è vuota (`highbay init -example` o `worked_example: true` aggiunge un esempio eseguibile se lo desideri), redige i flussi di business in `design/story.go` e apre una Change Card nel browser. Una volta confermata la scheda, Highbay assegna test writer (`.highbay-tests`) e builder (`.highbay-build`) a copie di lavoro separate, controlla e accetta la suite `eval/`, verifica il commit del builder contro di essa e ti permette di unire i commit approvati nel tuo branch locale con un clic. Vedi la [pagina Highbay](/it/highbay/) e la [guida dell'ecosistema Highbay](/it/docs/3-ecosystem/highbay/).

## Misura il vantaggio nel tuo progetto

Confronta lo stesso task, gli stessi criteri di accettazione, lo stesso modello e la stessa codebase di partenza su più esecuzioni. Registra token di input e output, tempo complessivo, tempo di rigenerazione e test, correzioni manuali, impegno di revisione e difetti comportamentali, includendo configurazione e tentativi falliti. Le righe di codice generate misurano il lavoro svolto dal generatore, non un benchmark automatico di risparmio token o produttività.

Non c'è alcuna promessa universale di 10×. Il vantaggio concreto è che la generazione deterministica del codice sottrae il lavoro ripetitivo sui contratti alla scrittura del modello e offre sia alle persone sia ai coding agent un obiettivo di implementazione più netto.

Continua con il [quickstart di Goa](../1-goa/quickstart/) o con il [quickstart di Goa-AI](../2-goa-ai/quickstart/).
