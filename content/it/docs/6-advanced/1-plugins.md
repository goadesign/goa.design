---
title: Plugin
weight: 1
description: >
  Scopri come estendere Goa con plugin personalizzati per una maggiore flessibilità e controllo sulla generazione del codice.
---

Per esigenze di personalizzazione più avanzate, Goa fornisce un sistema di plugin. I plugin offrono un controllo più profondo sulla generazione del codice quando i metadati da soli non sono sufficienti.

### Capacità dei Plugin

I plugin possono:

1. **Aggiungere Nuove Funzioni DSL**
   Creare DSL personalizzati che si integrano con il DSL core di Goa:

```go
var _ = Service("calc", func() {
    // DSL Core di Goa
    Description("Servizio calcolatrice")
    
    // DSL del Plugin
    cors.Origin("/.*localhost.*/", func() {
        cors.Headers("X-Shared-Secret")
    })
})
```

2. **Modificare il Codice Generato**
   Trasformare o migliorare l'output generato:

```go
func Generate(genpkg string, roots []eval.Root, files []*codegen.File) ([]*codegen.File, error) {
    // Modifica o aggiungi file generati
    return files, nil
}
```

### Utilizzo dei Plugin

Per utilizzare un plugin esistente:
1. Importa il pacchetto del plugin
2. Usa il suo DSL nel tuo design
3. Esegui `goa gen` come al solito

```go
import (
    . "goa.design/goa/v3/dsl"
    cors "goa.design/plugins/v3/cors/dsl"
)
```

Per informazioni dettagliate sulla creazione e l'utilizzo dei plugin, consulta la sezione [Plugin](/6-advanced/plugins).

## Migliori Pratiche

{{< alert title="Consigli per la Personalizzazione" color="primary" >}}
- Inizia con i metadati per personalizzazioni semplici
- Usa i plugin solo quando i metadati non sono sufficienti
- Mantieni le personalizzazioni coerenti in tutto il codice
- Documenta il comportamento della generazione personalizzata
- Testa accuratamente il codice generato
{{< /alert >}} 