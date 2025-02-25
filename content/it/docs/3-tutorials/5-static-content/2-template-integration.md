---
title: "Integrazione dei Template"
linkTitle: Integrazione dei Template
weight: 2
description: "Integra il motore di template di Go con Goa per renderizzare contenuti HTML dinamici, inclusi composizione dei template, passaggio dei dati e gestione appropriata degli errori."
---

I servizi Goa possono renderizzare contenuti HTML dinamici utilizzando il pacchetto
standard `html/template` di Go. Questa guida ti mostra come integrare la renderizzazione
dei template nel tuo servizio Goa.

## Design

Prima, definisci gli endpoint del servizio che renderizzeranno i template HTML:

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = Service("front", func() {
    Description("Servizio front-end con renderizzazione dei template")

    Method("home", func() {
        Description("Renderizza la home page")
        
        Payload(func() {
            Field(1, "name", String, "Nome da visualizzare nella homepage")
            Required("name")
        })
        
        Result(Bytes)
        
        HTTP(func() {
            GET("/")
            Response(StatusOK, func() {
                ContentType("text/html")
            })
        })
    })
})
```

## Implementazione

### Struttura del Servizio

Crea un servizio che gestisce la renderizzazione dei template:

```go
package front

import (
    "embed"
    "html/template"
    "io"
    "path/filepath"
)

//go:embed templates/*
var templateFS embed.FS

type Service struct {
    templates *template.Template
}

func NewService() (*Service, error) {
    // Carica e analizza tutti i template dalla directory templates
    templates, err := template.ParseFS(templateFS, "templates/*.html")
    if err != nil {
        return nil, err
    }

    return &Service{
        templates: templates,
    }, nil
}
```

### Template HTML

Crea i template HTML nella directory `templates`:

```html
<!-- templates/home.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Benvenuto</title>
</head>
<body>
    <h1>Ciao, {{.Name}}!</h1>
</body>
</html>
```

### Implementazione del Metodo

Implementa il metodo `home` per renderizzare il template:

```go
func (s *Service) Home(ctx context.Context, p *front.HomePayload) ([]byte, error) {
    // Prepara i dati per il template
    data := struct {
        Name string
    }{
        Name: p.Name,
    }

    // Crea un buffer per la renderizzazione
    var buf bytes.Buffer

    // Esegui il template
    if err := s.templates.ExecuteTemplate(&buf, "home.html", data); err != nil {
        return nil, err
    }

    return buf.Bytes(), nil
}
```

## Gestione degli Errori

È importante gestire correttamente gli errori durante la renderizzazione dei template:

1. **Errori di Analisi:** Gli errori durante `template.ParseFS` indicano problemi
   con la sintassi del template.
   
2. **Errori di Esecuzione:** Gli errori durante `ExecuteTemplate` possono verificarsi
   se i dati non corrispondono a ciò che il template si aspetta.

### Esempio di Gestione degli Errori

```go
func (s *Service) Home(ctx context.Context, p *front.HomePayload) ([]byte, error) {
    data := struct {
        Name string
    }{
        Name: p.Name,
    }

    var buf bytes.Buffer
    if err := s.templates.ExecuteTemplate(&buf, "home.html", data); err != nil {
        // Converti l'errore del template in un errore Goa
        return nil, front.MakeInternalError(err)
    }

    return buf.Bytes(), nil
}
```

## Composizione dei Template

Go supporta la composizione dei template, permettendoti di creare layout riutilizzabili:

```html
<!-- templates/layout.html -->
<!DOCTYPE html>
<html>
<head>
    <title>{{.Title}}</title>
</head>
<body>
    <header>
        <nav>{{template "nav" .}}</nav>
    </header>
    <main>
        {{template "content" .}}
    </main>
    <footer>
        {{template "footer" .}}
    </footer>
</body>
</html>

<!-- templates/nav.html -->
{{define "nav"}}
<ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">Chi Siamo</a></li>
</ul>
{{end}}

<!-- templates/footer.html -->
{{define "footer"}}
<p>&copy; 2024 Il Mio Servizio Goa</p>
{{end}}
```

### Utilizzo del Layout

```go
func (s *Service) Home(ctx context.Context, p *front.HomePayload) ([]byte, error) {
    data := struct {
        Title string
        Name  string
    }{
        Title: "Home Page",
        Name:  p.Name,
    }

    var buf bytes.Buffer
    if err := s.templates.ExecuteTemplate(&buf, "layout.html", data); err != nil {
        return nil, front.MakeInternalError(err)
    }

    return buf.Bytes(), nil
}
```

## Riepilogo

L'integrazione dei template HTML in un servizio Goa ti permette di:

1. Renderizzare contenuti HTML dinamici
2. Utilizzare la composizione dei template per layout riutilizzabili
3. Gestire gli errori in modo appropriato
4. Incorporare i template nel binario usando `embed`

Questo approccio fornisce un modo robusto per servire contenuti web dinamici
mantenendo la type safety e le funzionalità di Goa.