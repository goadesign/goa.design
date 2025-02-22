---
title: "Strumento da Riga di Comando"
linkTitle: "Strumento da Riga di Comando"
weight: 1
description: "Scopri lo strumento da riga di comando di Goa per la generazione del codice, inclusi installazione, utilizzo e best practice."
---

## Installazione

Installa gli strumenti da riga di comando di Goa usando:

```bash
go install goa.design/goa/v3/cmd/goa@latest
```

## Comandi Disponibili

### Genera Codice (`goa gen`)

```bash
goa gen <percorso-importazione-pacchetto-design> [-o <directory-output>]
```

Il comando `goa gen` è lo strumento principale per la generazione del codice in Goa. Quando viene eseguito,
elabora il tuo pacchetto di design e genera il codice di implementazione completo
per i tuoi servizi. Ricrea l'intera directory `gen/` da zero,
assicurando che tutto il codice generato rimanga sincronizzato con il tuo design. Dovresti eseguire questo
comando ogni volta che apporti modifiche al tuo design per rigenerare il
codice di implementazione.

### Crea Esempio (`goa example`)

```bash
goa example <percorso-importazione-pacchetto-design> [-o <directory-output>]
```

Il comando `goa example` ti aiuta a creare lo scaffolding della tua implementazione iniziale del servizio.
Crea implementazioni di esempio e genera stub di handler
con logica di base per aiutarti a iniziare. Questo comando è pensato per essere eseguito
una sola volta quando si avvia un nuovo progetto, poiché fornisce una base per la tua
implementazione personalizzata. È importante notare che è progettato per essere sicuro - non sovrascriverà
alcun codice personalizzato che hai già scritto, preservando il tuo lavoro esistente.

### Mostra Versione (`goa version`)

```bash
goa version
```

Visualizza la versione installata di Goa.

## Linee Guida per l'Utilizzo

### Percorsi dei Pacchetti vs Percorsi dei File

Tutti i comandi si aspettano percorsi di importazione dei pacchetti Go, non percorsi del filesystem:

```bash
# ✅ Corretto: uso del percorso di importazione del pacchetto Go
goa gen goa.design/examples/calc/design

# ❌ Errato: uso del percorso del filesystem
goa gen ./design
```

### Flusso di Sviluppo

Passi di inizializzazione per un nuovo progetto Goa:

1. Crea il design iniziale
2. Esegui `goa gen` per generare il codice base
3. Esegui `goa example` per creare gli stub di implementazione
4. Distribuisci il servizio stub

Distribuire il servizio stub all'inizio allinea il tuo sviluppo iniziale con i flussi
di lavoro di manutenzione regolari. Questo approccio ti permette di:
- Validare le procedure di distribuzione prima di aggiungere logica complessa
- Configurare il monitoraggio e l'osservabilità fin dal primo giorno
- Seguire lo stesso ciclo di sviluppo sia per servizi nuovi che esistenti

Una volta che il tuo servizio stub è distribuito, inizia il ciclo di sviluppo regolare. Questo
comporta l'implementazione della tua logica di servizio effettiva negli handler generati,
l'esecuzione di `goa gen` ogni volta che apporti modifiche al tuo design, e il continuo
test e iterazione sulla tua implementazione. Questo ciclo assicura che la tua
implementazione rimanga sincronizzata con il tuo design mentre ti permette di concentrarti sulla
costruzione della logica di business principale del tuo servizio.

## Best Practice

Il codice generato dovrebbe essere committato nel controllo versione piuttosto che generato durante le pipeline CI/CD. Ecco perché:

- **Build Riproducibili**: Il codice generato committato assicura build consistenti in tutti gli ambienti
- **Risoluzione delle Dipendenze**: Strumenti come `go get` funzionano in modo affidabile con il codice committato nei repository
- **Vantaggi del Controllo Versione**: 
  - Traccia le modifiche nel codice generato nel tempo
  - Revisiona le modifiche del codice generato durante la code review
  - Torna a versioni precedenti se necessario
- **Efficienza CI/CD**: Evita di eseguire i generatori in CI/CD, rendendo le pipeline più veloci e affidabili

{{< alert title="Suggerimenti per la Riga di Comando" color="primary" >}}
- Distribuisci il servizio stub all'inizio dello sviluppo per validare il design
- Esegui `goa gen` dopo ogni modifica al design per mantenere l'implementazione sincronizzata
- Usa il controllo versione per tracciare sistematicamente le modifiche al codice generato
{{< /alert >}} 