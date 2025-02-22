---
title: "Generazione del Codice"
linkTitle: "Generazione del Codice"
weight: 2
description: "Scopri come Goa genera il codice dal tuo design, incluso l'uso da riga di comando, il processo di generazione e le opzioni di personalizzazione."
---

Il sistema di generazione del codice di Goa trasforma il tuo design in codice pronto per la produzione.
Invece di fornire solo uno scaffolding, Goa genera implementazioni di servizi complete ed eseguibili
che seguono le best practice e mantengono la coerenza in tutta la tua API.

## Concetti Chiave

### 1. [Strumenti da Riga di Comando](./1-commands)

Scopri gli strumenti CLI di Goa per la generazione del codice. Comprendi i diversi
comandi disponibili, i loro scopi e come utilizzarli efficacemente nel tuo
flusso di lavoro di sviluppo.

### 2. [Processo di Generazione](./2-process)

Approfondisci come Goa trasforma il tuo design in codice. Comprendi la pipeline di generazione dal caricamento del design all'output del codice finale, inclusa la validazione e la gestione delle espressioni.

### 3. [Personalizzazione](./3-customization)

Scopri modi per personalizzare ed estendere la generazione del codice. Usa i metadati per controllare l'output, crea plugin per nuove funzionalità e adatta la generazione alle tue esigenze specifiche.

## Vantaggi della Generazione del Codice

- **Coerenza**: Il codice generato segue pattern e best practice coerenti
- **Sicurezza dei Tipi**: Tipizzazione forte in tutta l'implementazione generata
- **Validazione**: Validazione automatica delle richieste basata sulle regole del tuo design
- **Documentazione**: Specifiche OpenAPI e documentazione generate
- **Supporto ai Trasporti**: Protocolli di trasporto multipli da un singolo design
- **Manutenibilità**: Le modifiche al design si riflettono automaticamente nell'implementazione

Inizia con [Strumenti da Riga di Comando](./1-commands) per imparare come generare codice dai tuoi design.

## Panoramica della Generazione del Codice

La generazione del codice di Goa prende i tuoi file di design e produce implementazioni di servizi complete ed eseguibili.

## Strumenti da Riga di Comando

### Installazione

Installa gli strumenti da riga di comando di Goa usando:

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

### Comandi Principali

Goa fornisce due comandi per aiutarti a generare e creare lo scaffolding dei tuoi servizi.
Tutti i comandi si aspettano un percorso di importazione del pacchetto Go, non un percorso del filesystem:

```bash
# ✅ Corretto: uso del percorso di importazione del pacchetto Go
goa gen goa.design/examples/calc/design

# ❌ Errato: uso del percorso del filesystem
goa gen ./design
```

#### Genera Codice (`goa gen`)

```bash
goa gen <percorso-importazione-pacchetto-design> [-o <directory-output>]
```

Il comando principale per la generazione del codice. Esso:
- Elabora il tuo pacchetto di design e genera il codice di implementazione
- Ricrea l'intera directory `gen/` da zero ogni volta
- Deve essere eseguito dopo ogni modifica al design
- Permette una posizione di output personalizzata con il flag `-o` (predefinito a `./gen`)

#### Crea Esempio (`goa example`)

```bash
goa example <percorso-importazione-pacchetto-design> [-o <directory-output>]
```

Un comando di scaffolding che:
- Crea un'implementazione di esempio una tantum del tuo servizio
- Genera stub di handler con logica di esempio
- Dovrebbe essere eseguito solo una volta quando si inizia un nuovo progetto
- Non è destinato a essere rieseguito dopo modifiche al design
- NON sovrascriverà alcuna implementazione personalizzata se rieseguito

#### Mostra Versione (`goa version`)

```bash
goa version
```

Visualizza la versione installata di Goa.

## Processo di Generazione

Quando esegui i comandi di generazione del codice di Goa, Goa segue un processo sistematico
per trasformare il tuo design in codice funzionante:

### Caricamento del Design

Il processo di generazione avviene in diverse fasi:

1. **Bootstrap**: 
   Prima, Goa crea un file temporaneo `main.go` che importa il tuo pacchetto
   di design e i pacchetti Goa. Questo file temporaneo viene poi compilato ed
   eseguito come processo separato per avviare la generazione del codice.

2. **Esecuzione DSL**:
   Le funzioni di inizializzazione del pacchetto di design vengono eseguite per prime, seguite dalle
   funzioni DSL che costruiscono oggetti espressione in memoria. Queste espressioni
   lavorano insieme per creare un modello completo che rappresenta l'intero design della tua API.

3. **Validazione**:
   Durante la validazione, Goa esegue controlli completi sull'albero delle espressioni
   per assicurarsi che sia completo e ben formato. Verifica che tutte le relazioni richieste
   tra le espressioni siano definite correttamente e che il design
   segua tutte le regole e i vincoli. Questo passaggio di validazione aiuta a individuare potenziali
   problemi all'inizio del processo di sviluppo prima che venga generato qualsiasi codice.

4. **Generazione del Codice**:
   Una volta completata la validazione, Goa passa le espressioni valide ai generatori
   di codice. Questi generatori utilizzano i dati delle espressioni per renderizzare i template,
   che producono i file di codice effettivi. I file generati vengono poi scritti nella
   directory `gen/` nel tuo progetto, organizzati per servizio e livello
   di trasporto.

## Personalizzazione della Generazione

### Uso dei Metadati

La funzione `Meta` ti permette di personalizzare il comportamento della generazione del codice. Ecco
i tag di metadati chiave che influenzano la generazione:

#### Controllo della Generazione dei Tipi

Il tag `"type:generate:force"` può essere usato per forzare la generazione di un tipo
anche se non è direttamente referenziato da alcun metodo. I valori sono i nomi
dei servizi che necessitano della generazione del tipo.

```go
var MyType = Type("MyType", func() {
    // Forza la generazione del tipo anche se non utilizzato
    Meta("type:generate:force", "service1", "service2")
    
    Attribute("name", String)
})
```

#### Personalizzazione del Pacchetto e della Struttura

Il tag `"struct:pkg:path"` ti permette di specificare il pacchetto e il percorso per un
tipo. Il valore è il percorso del pacchetto relativo al pacchetto `gen`.

```go
var MyType = Type("MyType", func() {
    // Genera il tipo in un pacchetto personalizzato
    Meta("struct:pkg:path", "types")
    
    Attribute("ssn", String, func() {
        // Sovrascrive il nome del campo
        Meta("struct:field:name", "SSN")
        // Tag struct personalizzati
        Meta("struct:tag:json", "ssn,omitempty")
    })
})
```

#### Personalizzazione del Protocol Buffer

Il tag `"struct:name:proto"` ti permette di specificare il nome del messaggio
protocol buffer per un tipo. I valori sono il percorso del pacchetto, il nome del messaggio,
e il percorso di importazione del tipo protocol buffer.

```go
var Timestamp = Type("Timestamp", func() {
    // Sovrascrive il nome del messaggio protobuf
    Meta("struct:name:proto", "MyProtoType")
    
    Field(1, "created_at", String, func() {
        // Usa il tipo timestamp di Google
        Meta("struct:field:proto", 
            "google.protobuf.Timestamp",
            "google/protobuf/timestamp.proto",
            "Timestamp",
            "google.golang.org/protobuf/types/known/timestamppb")
    })
})
```

#### Generazione OpenAPI

Il tag `"openapi:generate"` ti permette di disabilitare la generazione OpenAPI per un
servizio. I valori sono i nomi dei servizi che necessitano della generazione del tipo.

Il tag `"openapi:operationId"` ti permette di specificare l'ID dell'operazione per un
metodo. I valori sono il nome del servizio e il nome del metodo.

Il tag `"openapi:tag"` ti permette di specificare i tag OpenAPI per un servizio.
I valori sono il nome del servizio e il nome del tag.

```go
var _ = Service("MyService", func() {
    // Disabilita la generazione OpenAPI per questo servizio
    Meta("openapi:generate", "false")
    
    Method("MyMethod", func() {
        // ID operazione personalizzato
        Meta("openapi:operationId", "{service}.{method}")
        // Aggiungi tag OpenAPI
        Meta("openapi:tag:Backend", "Backend API")
    })
})
```

Usi comuni dei metadati:
- Controlla quali tipi vengono generati
- Personalizza campi e tag delle struct generate
- Sovrascrive le posizioni dei pacchetti
- Configura la generazione dei protocol buffer
- Personalizza la documentazione API

{{< alert title="Suggerimenti sui Metadati" color="primary" >}}
- Usa `type:generate:force` quando i tipi sono referenziati solo indirettamente
- Mantieni i percorsi dei pacchetti (`struct:pkg:path`) coerenti tra tipi correlati
- Considera l'impatto sulla documentazione quando personalizzi la generazione OpenAPI
- Usa la personalizzazione dei campi con moderazione per mantenere la coerenza
{{< /alert >}}

### Sistema dei Plugin

Il sistema dei plugin di Goa ti permette di estendere e personalizzare il processo di generazione
del codice. I plugin intercettano la pipeline di generazione in punti specifici, permettendoti
di aggiungere funzionalità, modificare il codice generato o creare output completamente nuovi.

#### Capacità dei Plugin

I plugin possono interagire con Goa in tre modi principali:

1. **Aggiungere Nuovi DSL**  
   I plugin possono fornire costrutti del linguaggio di design aggiuntivi che lavorano insieme
   al DSL core di Goa. Per esempio, il
   [plugin CORS](https://github.com/goadesign/plugins/tree/master/cors) aggiunge DSL per
   definire politiche di cross-origin: 