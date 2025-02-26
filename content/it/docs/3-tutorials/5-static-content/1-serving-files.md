---
title: Serving dei File
linkTitle: Serving dei File
weight: 1
description: "Padroneggia le capacità di serving dei file di Goa per distribuire efficientemente risorse statiche come HTML, CSS, JavaScript e immagini attraverso endpoint HTTP con una corretta risoluzione dei percorsi."
---

Goa fornisce un modo semplice per servire risorse statiche come HTML, CSS,
JavaScript e immagini attraverso la funzione `Files` nel DSL del servizio. Questa
funzione ti permette di mappare percorsi HTTP a directory o file specifici sul disco,
consentendo al tuo servizio di distribuire contenuti statici in modo efficiente.

## Utilizzo della Funzione `Files`

La funzione `Files` definisce un endpoint che serve risorse statiche via HTTP. Si
comporta in modo simile alla funzione standard `http.ServeFile`, gestendo le richieste
per servire file o directory basandosi sul percorso definito.

### Sintassi

```go
Files(path, filename string, dsl ...func())
```

- **path:** Il percorso della richiesta HTTP. Può includere un carattere jolly (es. `{*filepath}`) per corrispondere a segmenti variabili dell'URL.
- **filename:** Il percorso del file system alla directory o al file da servire.
- **dsl:** Funzione DSL opzionale per fornire metadati aggiuntivi come descrizioni e documentazione.

### Esempi

#### Serving di un Singolo File

Per servire un singolo file, definisci la funzione `Files` con un percorso specifico e la posizione del file sul disco.

```go
var _ = Service("web", func() {
    Files("/index.html", "/www/data/index.html", func() {
        // Tutto opzionale, ma utile per la specifica OpenAPI
        Description("Serve la home page.")
        Docs(func() {
            Description("Documentazione aggiuntiva")
            URL("https://goa.design")
        })
    })
})
```

In questo esempio:

- **Path:** `/index.html` - Le richieste a `/index.html` serviranno il file situato in `/www/data/index.html`.
- **Filename:** `/www/data/index.html` - Percorso assoluto del file sul disco.
- **Funzioni DSL:** Forniscono una descrizione e documentazione aggiuntiva per l'endpoint.

#### Serving di Risorse Statiche con Carattere Jolly

Per servire più file da una directory, usa un carattere jolly nel percorso.

```go
var _ = Service("web", func() {
    Files("/static/{*path}", "/www/data/static", func() {
        Description("Serve risorse statiche come CSS, JS e immagini.")
    })
})
```

In questo esempio:

- **Path:** `/static/{*path}` - Il carattere jolly `{*path}` corrisponde a qualsiasi sottopercorso dopo `/static/`, permettendo il serving dinamico dei file.
- **Filename:** `/www/data/static` - Directory contenente le risorse statiche.
- **Description:** Fornisce una descrizione per l'endpoint.

#### Risoluzione dei Percorsi

Quando si usa un percorso con carattere jolly come `/static/{*path}`, Goa combina il valore del carattere jolly con la directory base per localizzare il file:

1. La porzione jolly del percorso URL viene estratta
2. Questa viene aggiunta alla directory base specificata in `Filename`
3. Il percorso risultante viene utilizzato per cercare il file

Per esempio, con la configurazione:

```go
Files("/static/{*path}", "/www/data/static")
```

Se il percorso URL è `/static/css/style.css`, Goa risolverà a `/www/data/static/css/style.css`.

## Gestione dei File Index

Quando si servono directory, assicurati che i file index (es. `index.html`) siano
mappati correttamente. Se non mappi esplicitamente `index.html` sotto un percorso
con carattere jolly, la chiamata sottostante `http.ServeFile` restituirà un reindirizzamento
a `./` invece del file `index.html`.

### Esempio

```go
var _ = Service("bottle", func() {
    Files("/static/{*path}", "/www/data/static", func() {
        Description("Serve risorse statiche per la SPA.")
    })
    Files("/index.html", "/www/data/index.html", func() {
        Description("Serve l'index.html della SPA per il routing lato client.")
    })
})
```

Questa configurazione assicura che le richieste a `/index.html` servano il file
`index.html`, mentre le richieste a `/static/*` servano i file dalla directory static.

## Integrazione con l'Implementazione del Servizio

Quando implementi il serving di file statici nel tuo servizio Goa, hai diverse
opzioni per gestire e servire i file:

* Usando il File System: Nella tua implementazione del servizio, usa il file system per
  servire file incorporati.

* Usando File Incorporati: Il pacchetto `embed` in Go 1.16+ ti permette di incorporare
  file statici direttamente nel tuo binario, rendendo il deployment più semplice e
  affidabile.

### Esempio di Implementazione del Servizio

Questo esempio dimostra come servire file statici usando il pacchetto `embed`.

Assumendo il seguente design:

```go
var _ = Service("web", func() {
    Files("/static/{*path}", "static")
})
```

L'implementazione del servizio può essere:

```go
package web

import (
    "embed"
    // ... altri import ...
)

//go:embed static
var StaticFS embed.FS

// ... altro codice del servizio ...
```

### Setup della Funzione Main

Nella funzione main, configura il server HTTP per servire file statici:

1. Creando un'istanza di `http.FS` dal `StaticFS` incorporato usando `http.FS(web.StaticFS)`
2. Passando questa istanza del file system come ultimo argomento alla funzione `New`
   generata
3. Questo permette al server HTTP di servire efficientemente i file statici incorporati
   attraverso gli endpoint definiti con `Files` nel design

L'istanza del file system fornisce accesso ai file incorporati mantenendo
la semantica e la sicurezza appropriate del file system.

```go
func main() {
    // Altro codice di setup...
    mux := goahttp.NewMuxer()
    server := genhttp.New(
        endpoints,
        mux,
        goahttp.RequestDecoder,
        goahttp.ResponseEncoder,
        nil,
        nil,
        http.FS(web.StaticFS), // Passa il file system incorporato
    )
    genhttp.Mount(mux, server)
    // Avvia il server...
}
```

In questo setup:

- **go:embed:** Incorpora la directory `static` nel binario.
- **http.FS:** Fornisce il file system incorporato al server per servire file statici.

## Riepilogo

L'utilizzo della funzione `Files` in Goa ti permette di servire contenuti statici
in modo efficiente nei tuoi servizi. Definendo percorsi specifici e posizioni dei file,
puoi gestire la distribuzione di risorse statiche senza problemi. Assicurati di mappare
correttamente i file index e utilizza i file system incorporati per deployments ottimizzati.