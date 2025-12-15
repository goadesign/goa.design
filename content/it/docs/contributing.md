---
title: "Contribuire alla documentazione"
linkTitle: "Contribuente"
weight: 100
description: "Guidelines for contributing to Goa documentation: canonical homes, cross-linking, and content strategy."
llm_optimized: true
content_scope: "Documentation Contribution Guide"
---

Questa guida aiuta i collaboratori della documentazione a mantenere la coerenza nella documentazione di Goa. Copre le case canoniche per gli argomenti, i modelli di collegamento incrociato e la strategia dei contenuti.

## Case canoniche

Ogni argomento della documentazione ha esattamente una **casetta canonica**, l'unica posizione autorevole che contiene tutti i dettagli. Le altre menzioni dovrebbero fornire brevi riassunti con collegamenti incrociati alla posizione canonica.

### Riferimento alla casa canonica

| Argomento | Home canonica | Categoria |
|-------|---------------|----------|
| **Modellazione dei dati** | [DSL di riferimento](1-goa/dsl-reference/#data-modeling) | Progettazione |
| **Servizi e metodi** | [DSL Reference](1-goa/dsl-reference/#services-and-methods) | Design |
| **Streaming (Design)** | [DSL Reference](1-goa/dsl-reference/#streaming) | Design |
| **File statici (Design)** | [DSL Reference](1-goa/dsl-reference/#static-files) | Design |
| **Gestione degli errori (Design)** | [DSL Reference](1-goa/dsl-reference/#error-handling) | Design |
| **Schemi di sicurezza** | [DSL Reference](1-goa/dsl-reference/#security) | Design |
| **Trasporto HTTP** | [Guida HTTP](1-goa/http-guide/) | Trasporto |
| **HTTP Streaming** | [Guida HTTP](1-goa/http-guide/#streaming) | Trasporto |
| **Risposte di errore HTTP** | [Guida HTTP](1-goa/http-guide/#error-responses) | Trasporto |
| **Trasporto gRPC** | [Guida gRPC](1-goa/grpc-guide/) | Trasporto |
| **gRPC Streaming** | [gRPC Guide](1-goa/grpc-guide/#streaming) | Transport |
| **codici di stato gRPC** | [Guida gRPC](1-goa/grpc-guide/#error-handling) | Trasporto |
| **Intercettatori** | [Intercettatori](1-goa/interceptors/) | Cross-Cutting |
| **Osservabilità** | [Indizio](3-ecosystem/clue/) | Ecosistema |
| **Eventi distribuiti** | [Pulse](3-ecosystem/pulse/) | Ecosistema |
| **Diagrammi di architettura** | [Modello](3-ecosystem/model/) | Ecosistema |

### Definizioni di categoria

**Progettazione**: Definizioni di API indipendenti dal protocollo che utilizzano il DSL Goa. Il contenuto deve concentrarsi su *cosa* si sta definendo, non su *come* si comporta in un trasporto specifico.

**Trasporto**: Dettagli di implementazione specifici del protocollo HTTP o gRPC. Il contenuto riguarda il comportamento, la configurazione e i modelli specifici del trasporto.

**Cross-Cutting**: Caratteristiche che si applicano a tutti i trasporti (intercettori, middleware).

**Ecosistema**: Librerie complementari (model, pulse, clue) che estendono le capacità di Goa.

## Strategia dei contenuti

### Documentazione a livello di progetto

Mantenere la documentazione a livello di progetto **concisa e focalizzata**:

- Spiegare la sintassi e la semantica del DSL
- Mostrare esempi di utilizzo di tipi strutturati
- Indicare quali trasporti supportano la funzione
- Includere link di "Ulteriore lettura" a guide sui trasporti

**Modello di esempio:**

```markdown
## Streaming

Goa supports streaming for both payloads and results using `StreamingPayload` 
and `StreamingResult`. The same design works for HTTP (WebSocket/SSE) and gRPC.

[code example]

**Further reading:**
- [HTTP Streaming](../http-guide/#streaming) — WebSocket and SSE implementation
- [gRPC Streaming](../grpc-guide/#streaming) — Bidirectional streaming patterns
```

### Documentazione a livello di trasporto

Le guide al trasporto devono essere **dettagliate e pratiche**:

- Iniziare con un richiamo "Design Recap" che rimanda al DSL di riferimento
- Trattare in modo approfondito il comportamento specifico del trasporto
- Includere opzioni di configurazione e modelli
- Mostrare esempi completi ed eseguibili

**Schema di richiamo alla progettazione:**

```markdown
{{< alert title="Design Recap" color="info" >}}
Streaming is defined at the design level using `StreamingPayload` and 
`StreamingResult`. See [Streaming in DSL Reference](../dsl-reference/#streaming) 
for design patterns. This section covers HTTP-specific implementation details.
{{< /alert >}}
```

### Documentazione dell'ecosistema

Le pagine degli strumenti dell'ecosistema devono essere **complete e autonome**:

- Fornire un contesto completo senza richiedere riferimenti esterni
- Includere tutte le importazioni e le impostazioni necessarie negli esempi di codice
- Documentare tutte le principali caratteristiche della libreria
- Collegarsi ai repository GitHub per ulteriori dettagli

## Linee guida per il collegamento incrociato

### Quando fare il collegamento incrociato

Aggiungere collegamenti incrociati quando:

- Un argomento è menzionato al di fuori della sua home canonica
- Concetti correlati possono aiutare il lettore
- Una caratteristica ha un comportamento specifico per il trasporto documentato altrove

### Schemi di collegamento incrociato

**Collegamenti in linea** per brevi citazioni:

```markdown
Goa supports [streaming](../dsl-reference/#streaming) for real-time data.
```

**Sezioni "Vedi anche "** per argomenti correlati:

```markdown
## See Also

- [Streaming Design](../dsl-reference/#streaming) — Design-level streaming concepts
- [gRPC Streaming](../grpc-guide/#streaming) — gRPC-specific streaming patterns
```

**Sezioni "Ulteriori letture "** alla fine degli argomenti di progettazione:

```markdown
**Further reading:**
- [HTTP Error Responses](../http-guide/#error-responses) — HTTP status code mapping
- [gRPC Error Handling](../grpc-guide/#error-handling) — gRPC status code mapping
```

## Strumenti dell'ecosistema Aggiornamento del flusso di lavoro

Quando si aggiorna la documentazione degli strumenti dell'ecosistema (modello, impulso, indizio):

1. **Aggiornare prima la pagina canonica** - Apportare le modifiche in `3-ecosystem/[tool].md`
2. **Aggiornare i riferimenti incrociati** - Verificare la presenza di citazioni in altre pagine da aggiornare
3. **Mantenere i sommari in sincronia** - Aggiornare l'indice dell'ecosistema (`3-ecosystem/_index.md`) se lo scopo dello strumento o le sue caratteristiche principali sono cambiate
4. **Non duplicare i dettagli** - Le altre pagine devono rimandare alla pagina dell'ecosistema, non ripetere il suo contenuto

### Fonte della verità

La documentazione dell'ecosistema deve riflettere il comportamento effettivo della libreria:

- **Clue**: [github.com/goadesign/clue](https://github.com/goadesign/clue)
- **Impulso**: [github.com/goadesign/pulse](https://github.com/goadesign/pulse)
- **Modello**: [github.com/goadesign/model](https://github.com/goadesign/model)

Quando il comportamento della libreria cambia, aggiornare la documentazione per adeguarsi.

## Contenuto ottimizzato per LLM

Tutta la documentazione deve essere ottimizzata sia per i lettori umani che per il consumo di LLM:

### Sezioni autocontenute

Ogni sezione deve fornire un contesto completo:

```markdown
## Health Checks

The `health` package provides HTTP health check endpoints for monitoring service 
availability. Health checks verify that the service and its dependencies (databases, 
external APIs) are functioning correctly.

// Include necessary imports
import "goa.design/clue/health"

// Show complete, runnable example
checker := health.NewChecker(
    health.NewPinger("database", dbAddr),
    health.NewPinger("cache", redisAddr),
)
```

### Definizioni in linea

Definite i termini tecnici in linea piuttosto che affidarvi esclusivamente ai link al glossario:

```markdown
The **canonical home** (the single authoritative location for a topic's detailed 
documentation) for streaming is the DSL Reference.
```

### Relazioni esplicite

Dichiarare esplicitamente le connessioni tra i concetti:

```markdown
Error handling spans two layers: the **design layer** where you define errors 
using the `Error` DSL, and the **transport layer** where errors map to HTTP 
status codes or gRPC status codes.
```

### Gerarchia delle intestazioni

Utilizzare una corretta gerarchia delle intestazioni senza saltare i livelli:

```markdown
## Main Topic (h2)
### Subtopic (h3)
#### Detail (h4)
```

## Organizzazione dei file

### Requisiti della materia prima

Ogni pagina di documentazione ha bisogno di un frontmatter adeguato:

```yaml
---
title: "Page Title"
linkTitle: "Short Title"  # Optional, for navigation
weight: 2                 # Controls sort order
description: "One-line description for SEO and previews."
llm_optimized: true       # Mark as LLM-optimized
content_scope: "What this page covers"
aliases:                  # Optional, for redirects
  - /old/path/
---
```

### Convenzioni di denominazione

- Utilizzare lettere minuscole con trattini: `http-guide.md`, `dsl-reference.md`
- File indice: `_index.md` per le pagine di destinazione delle sezioni
- Mantenere i nomi brevi ma descrittivi

## Esempio: Aggiunta di una nuova funzionalità

Quando si documenta una nuova funzionalità di Goa:

1. **Identificare la home canonica** - È a livello di progetto (DSL Reference), specifico per il trasporto (HTTP/gRPC Guide) o trasversale?

2. **Scrivere il contenuto canonico** - Tutti i dettagli, gli esempi e le spiegazioni nella posizione canonica

3. **Aggiungere link incrociati** - Brevi citazioni con link in pagine correlate

4. **Aggiornare l'indice** - Se si tratta di una caratteristica importante, aggiungerla all'indice della sezione pertinente

5. **Controllare la coerenza** - Assicurarsi che i nomi e i modelli degli esempi corrispondano nelle varie pagine

## Lista di controllo per i collaboratori

Prima di inviare modifiche alla documentazione:

- [ ] Il contenuto si trova nella home canonica corretta
- [I collegamenti incrociati puntano a posizioni canoniche (non a contenuti duplicati)
- [I documenti di progettazione sono concisi; i documenti di trasporto sono dettagliati
- [ ] Gli esempi di codice includono le importazioni e il contesto necessari
- [ ] La gerarchia delle intestazioni è corretta (nessun livello saltato)
- [ ] Il frontmatter è completo e accurato
- [I termini tecnici sono definiti in linea quando vengono utilizzati per la prima volta
- [Le sezioni "Vedi anche" o "Ulteriori letture" rimandano ad argomenti correlati
