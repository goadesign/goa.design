---
title: "Diagrammi Architetturali come Codice"
linkTitle: "Diagrammi Architetturali"
weight: 3
description: >
  Impara come creare e mantenere diagrammi architetturali usando Model, un progetto open source per la modellazione C4, e la sua integrazione con Goa attraverso il plugin model.
---

# Diagrammi Architetturali come Codice

Le architetture software moderne, specialmente quelle costruite attorno ai microservizi, richiedono
documentazione chiara e manutenibile. Mentre i contratti dei servizi e la documentazione delle API
sono essenziali, comprendere come i servizi interagiscono e si inseriscono nel sistema più ampio
spesso si rivela una sfida. È qui che i diagrammi architetturali diventano preziosi.

## Comprendere Model

[Model](https://github.com/goadesign/model) è un progetto open source che porta
la potenza del codice alla documentazione dell'architettura. Implementa l'approccio del modello C4,
che fornisce un modo gerarchico per descrivere e comunicare l'architettura software
attraverso diversi livelli di astrazione.

Definendo i diagrammi architetturali nel codice, Model ti permette di:
- Controllare le versioni della tua documentazione architettonica
- Mantenere i diagrammi insieme alla tua implementazione
- Automatizzare gli aggiornamenti dei diagrammi
- Assicurare la coerenza in tutta la documentazione

Per iniziare con Model, installa gli strumenti da riga di comando necessari:

```bash
# Installa l'editor e il visualizzatore di diagrammi
go install goa.design/model/cmd/mdl@latest
```

### Creare il Tuo Primo Diagramma

Creiamo un semplice diagramma di sistema che mostra un utente che interagisce con un servizio
che usa un database. Il seguente esempio dimostra i concetti chiave del linguaggio
di design di Model:

```go
package design

import . "goa.design/model/dsl"

var _ = Design("Per Iniziare", "Questo è un modello del mio sistema software.", func() {
    // Definisci il sistema software principale - questo rappresenta l'intera applicazione
    var System = SoftwareSystem("Sistema Software", "Il mio sistema software.", func() {
        // Definisci un container database all'interno del sistema
        Database = Container("Database", "Memorizza informazioni", "MySQL", func() {
            Tag("Database")  // I tag aiutano con lo stile e il filtraggio
        })
        
        // Definisci un container servizio che usa il database
        Container("Servizio", "Il mio servizio", "Go e Goa", func() {
            Uses(Database, "Legge e scrive dati")
        })
    })

    // Definisci un utente esterno del sistema
    Person("Utente", "Un utente del mio sistema software.", func() {
        Uses(System, "Usa")  // Crea una relazione con il sistema
        Tag("person")        // Tag per lo stile
    })

    // Crea una vista per visualizzare l'architettura
    Views(func() {
        SystemContextView(System, "Sistema", "Diagramma del Contesto del Sistema.", func() {
            AddAll()                    // Includi tutti gli elementi
            AutoLayout(RankLeftRight)   // Disponi gli elementi automaticamente
        })
    })
})
```

Questo esempio introduce diversi concetti chiave:
1. La funzione `Design` definisce l'ambito della tua architettura
2. `SoftwareSystem` rappresenta la tua applicazione
3. `Container` definisce i componenti principali (servizi, database, ecc.)
4. `Person` rappresenta utenti o ruoli
5. `Uses` crea relazioni tra elementi
6. `Views` definisce diversi modi per visualizzare la tua architettura

### Comprendere le Viste C4

Model implementa l'approccio gerarchico del modello C4 per descrivere l'architettura
software. Ogni tipo di vista serve uno scopo specifico e un pubblico, come definito dal
[Modello C4](https://c4model.com/):

```go
Views(func() {
    // System Landscape: Mostra tutti i sistemi e le persone nel panorama aziendale
    SystemLandscapeView("panorama", "Panoramica", func() {
        AddAll()
        AutoLayout(RankTopBottom)
    })

    // System Context: Concentrati su un sistema e le sue relazioni immediate
    SystemContextView(System, "contesto", func() {
        AddAll()
        AutoLayout(RankLeftRight)
    })

    // Container: Mostra i blocchi tecnici di alto livello
    ContainerView(System, "container", func() {
        AddAll()
        AutoLayout(RankTopBottom)
    })

    // Component: Dettagli gli interni di un container specifico
    ComponentView("System/Container", "componenti", func() {
        AddAll()
        AutoLayout(RankLeftRight)
    })
})
```

Esaminiamo ogni tipo di vista in dettaglio:

#### Vista del Panorama di Sistema
Questa vista mostra il quadro generale del panorama dei tuoi sistemi software. Aiuta
gli stakeholder a capire come il tuo sistema si inserisce nell'ambiente IT aziendale
complessivo.

#### Vista del Contesto di Sistema
Questo diagramma mostra il tuo sistema software nel suo ambiente, concentrandosi sulle persone
che lo usano e gli altri sistemi con cui interagisce. È un eccellente punto di partenza
per documentare e comunicare il contesto sia con il pubblico tecnico che non tecnico.

#### Vista dei Container
Come descritto nella [guida ai Diagrammi Container del Modello C4](https://c4model.com/diagrams/container),
una vista container fa uno zoom nel tuo sistema software per mostrare i blocchi tecnici
di alto livello. Un "container" in questo contesto rappresenta un'unità
eseguibile/distribuibile separatamente che esegue codice o memorizza dati, come:

- Applicazioni web lato server
- Applicazioni a pagina singola
- Applicazioni desktop
- App mobili
- Schemi di database
- File system

Questa vista aiuta gli sviluppatori e il personale operativo a capire:
- La forma di alto livello dell'architettura software
- Come sono distribuite le responsabilità
- Le principali scelte tecnologiche
- Come i container comunicano tra loro

Nota che questo diagramma intenzionalmente omette i dettagli di deployment come clustering, load
balancer e replicazione, poiché questi tipicamente variano tra gli ambienti.

#### Vista dei Componenti
Questa vista fa uno zoom in un singolo container per mostrare i suoi componenti e le loro
interazioni. È utile per gli sviluppatori che lavorano sulla base di codice per capire come
il container è strutturato internamente.

## Lavorare con i Diagrammi

Model fornisce un editor interattivo attraverso il comando `mdl` che rende facile
raffinare ed esportare i tuoi diagrammi. Avvia l'editor con:

```bash
# Avvia con la directory di output predefinita (./gen)
mdl serve goa.design/examples/model/design

# O specifica una directory di output personalizzata
mdl serve goa.design/examples/model/design -dir diagrammi
```

Questo lancia un'interfaccia web su http://localhost:8080 dove puoi:
- Disporre gli elementi trascinandoli
- Regolare i percorsi delle relazioni
- Visualizzare le modifiche in tempo reale
- Esportare i diagrammi come file SVG

### Modifica Interattiva

L'editor fornisce diversi modi per manipolare i tuoi diagrammi:

1. Posizionamento degli Elementi:
   - Trascina gli elementi per posizionarli
   - Usa i tasti freccia per regolazioni fini
   - Tieni premuto SHIFT con i tasti freccia per movimenti più ampi

2. Gestione delle Relazioni:
   - ALT + click per aggiungere vertici alle relazioni
   - Seleziona e cancella i vertici con BACKSPACE o DELETE
   - Trascina i vertici per regolare i percorsi delle relazioni

3. Strumenti di Selezione:
   - Click per selezionare elementi individuali
   - SHIFT + click o trascina per selezionare più elementi
   - CTRL + A per selezionare tutto
   - ESC per cancellare la selezione

### Riferimento Scorciatoie da Tastiera

Le seguenti scorciatoie ti aiutano a lavorare efficientemente con l'editor:

| Categoria | Scorciatoia | Effetto |
|-----------|-------------|---------|
| Aiuto | ?, SHIFT + F1 | Mostra scorciatoie da tastiera |
| File | CTRL + S | Salva SVG |
| Cronologia | CTRL + Z | Annulla |
| Cronologia | CTRL + SHIFT + Z, CTRL + Y | Ripeti |
| Zoom | CTRL + =, CTRL + rotella | Zoom avanti |
| Zoom | CTRL + -, CTRL + rotella | Zoom indietro |
| Zoom | CTRL + 9 | Zoom per adattare |
| Zoom | CTRL + 0 | Zoom 100% |
| Selezione | CTRL + A | Seleziona tutto |
| Selezione | ESC | Deseleziona |
| Movimento | Tasti freccia | Sposta selezione |
| Movimento | SHIFT + Tasti freccia | Sposta selezione più velocemente |

### Stile dei Tuoi Diagrammi

Model ti permette di personalizzare l'aspetto dei tuoi diagrammi attraverso gli stili:

```go
Views(func() {
    // Definisci la vista
    SystemContextView(System, "contesto", func() {
        AddAll()
        AutoLayout(RankTopBottom)
    })
    
    // Applica stili personalizzati
    Styles(func() {
        // Stile per elementi taggati come "system"
        ElementStyle("system", func() {
            Background("#1168bd")  // Sfondo blu
            Color("#ffffff")       // Testo bianco
        })
        
        // Stile per elementi taggati come "person"
        ElementStyle("person", func() {
            Shape(ShapePerson)     // Usa icona persona
            Background("#08427b")  // Sfondo blu scuro
            Color("#ffffff")       // Testo bianco
        })
    })
})
```

## Integrazione con Structurizr

Mentre lo strumento `mdl` è perfetto per lo sviluppo locale e l'esportazione SVG, Model si integra
anche con il servizio [Structurizr](https://structurizr.com/) per funzionalità
avanzate di visualizzazione e condivisione. 