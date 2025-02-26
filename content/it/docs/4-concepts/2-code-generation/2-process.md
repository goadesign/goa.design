---
title: "Processo di Generazione"
linkTitle: "Processo di Generazione"
weight: 2
description: "Comprendi come Goa trasforma il tuo design in codice, inclusi la pipeline di generazione, la valutazione delle espressioni e la struttura dell'output."
---

## Pipeline di Generazione

Quando esegui `goa gen`, Goa segue un processo sistematico per trasformare il tuo
design in codice funzionante:

### 1. Fase di Bootstrap

Goa prima crea ed esegue un programma temporaneo:
Durante questa fase, Goa crea un programma temporaneo `main.go` che:

1. Importa i pacchetti Goa necessari per la generazione e valutazione del codice
2. Importa il tuo pacchetto di design
3. Esegue la valutazione DSL per elaborare il tuo design
4. Attiva il processo di generazione del codice

Questo programma temporaneo serve come punto di ingresso per trasformare il tuo design
in codice. Viene creato e rimosso automaticamente durante il processo di generazione,
quindi non hai mai bisogno di gestirlo direttamente.

### 2. Valutazione del Design

Durante questa fase, Goa carica e valuta il tuo pacchetto di design:

1. Le funzioni DSL vengono eseguite per creare oggetti espressione che rappresentano il design della tua API
2. Queste espressioni vengono combinate in un modello completo della struttura e del comportamento della tua API
3. Il sistema analizza e stabilisce relazioni tra le diverse espressioni
4. Tutte le regole e i vincoli del design vengono attentamente validati per garantire la correttezza

Questa fase di valutazione è critica poiché trasforma il tuo design dichiarativo in
un modello strutturato che può essere utilizzato per la generazione del codice.

### 3. Generazione del Codice

Una volta che le espressioni sono state validate, vengono passate ai generatori di
codice di Goa. I generatori utilizzano queste espressioni come dati di input per renderizzare vari
template di codice. Generano codice specifico per il trasporto HTTP e gRPC, creano
tutti i file di supporto necessari e scrivono l'output completo nella directory `gen/`.
Questo passaggio di generazione produce tutto il codice necessario per eseguire il tuo servizio
mantenendo la coerenza in tutto il codebase.

## Struttura Generata

Una tipica struttura di progetto generata:

```
myservice/
├── cmd/             # Comandi di esempio generati
│   └── calc/
│       ├── grpc.go
│       └── http.go
├── design/          # I tuoi file di design
│   └── design.go
├── gen/            # Codice generato
│   ├── calc/       # Codice specifico del servizio
│   │   ├── client/
│   │   ├── endpoints/
│   │   └── service/
│   └── http/       # Livello di trasporto
│       ├── client/
│       └── server/
└── myservice.go    # Stub di implementazione del servizio generato
```

Consulta la sezione
[Codice Generato](/4-concepts/2-code-generation/3-generated-code)
per maggiori dettagli sul codice generato. 