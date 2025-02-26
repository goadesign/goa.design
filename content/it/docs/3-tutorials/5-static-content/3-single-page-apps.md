---
title: "Integrazione di Single Page Application"
linkTitle: Single Page Application
weight: 3
description: "Impara a incorporare e servire Single Page Applications (SPA) nel tuo servizio Goa, inclusi integrazione React, supporto al routing lato client e strategie di deployment in produzione."
---

Per applicazioni semplici, puoi incorporare la tua applicazione React direttamente nel binario Go usando
`go:embed`. Questo approccio combina i benefici dello sviluppo frontend moderno con
le capacità di deployment snello di Go. Impacchettando l'intera applicazione - sia
l'API backend che il frontend React - in un singolo eseguibile autonomo, elimini
la necessità di gestire artefatti di deployment separati o configurare server web
aggiuntivi per servire file statici. Basta compilare il binario, deployarlo ed
eseguirlo. Questo approccio semplifica significativamente il deployment assicurando che
le versioni del frontend e del backend rimangano sincronizzate.

## Struttura del Progetto

Una struttura di progetto con una SPA React potrebbe apparire così:

```
myapp/
├── cmd/                  # Applicazione principale
├── design/              # Costrutti di design condivisi
│   ├── design.go        # Importa i design dei servizi non-API
│   └── shared/          # Costrutti di design condivisi
├── gen/                 # Codice Goa generato per servizi non-API
└── services/
    ├── api/
    │   ├── design/      # Design dell'API
    │   ├── gen/         # Codice Goa generato
    │   ├── api.go       # Implementazione API
    │   └── ui/
    │       ├── build/   # Build UI
    │       ├── src/     # Sorgente React
    │       └── public/  # Asset statici
    ├── service1/        # Altri servizi
    :
```

L'organizzazione del design segue un pattern specifico per mantenere una chiara separazione delle responsabilità:

1. Il servizio API HTTP pubblico (`services/api`) ha il proprio pacchetto `design` e
   directory `gen`. Questo isolamento mantiene la specifica OpenAPI generata
   focalizzata esclusivamente sugli endpoint API pubblici.

2. Tutti gli altri design dei servizi sono importati nel pacchetto `design` di alto livello
   e il loro codice è generato nella directory `gen` radice. Questo approccio
   semplifica la generazione del codice a soli due comandi:
   - `goa gen myapp/services/api/design` per l'API pubblica
   - `goa gen myapp/design` per tutti gli altri servizi

## Design del Servizio

Il design del servizio deve includere endpoint per servire sia l'applicazione React
che le sue risorse statiche:

```go
var _ = Service("web", func() {
    // Serve l'applicazione React
    Files("/", "services/api/ui/build/index.html")
    
    // Serve le risorse statiche dalla directory build
    Files("/static/{*path}", "services/api/ui/build/static/")
    
    // Serve altri file dalla directory build
    Files("/{*path}", "services/api/ui/build/")
})
```

Questo design:

1. Serve `index.html` come pagina predefinita per la root `/`
2. Serve i file statici (CSS, JS, immagini) dalla directory `/static`
3. Serve altri file (favicon.ico, manifest.json, ecc.) dalla directory build

## Implementazione

### Incorporare l'Applicazione React

Usa `go:embed` per incorporare l'applicazione React compilata nel binario:

```go
package web

import "embed"

//go:embed ui/build
var uiFS embed.FS

type Service struct{}

func NewService() *Service {
    return &Service{}
}
```

### Supporto al Routing Lato Client

Per supportare il routing lato client in React, devi configurare il servizio per
reindirizzare tutte le richieste non corrispondenti a `index.html`:

```go
var _ = Service("web", func() {
    // Serve l'applicazione React per tutte le richieste non corrispondenti
    Files("/{*path}", "services/api/ui/build/index.html", func() {
        Description("Supporto al routing lato client per React")
    })
})
```

### Ottimizzazione delle Performance

Per ottimizzare le performance di serving:

1. **Compressione:** Abilita la compressione gzip/brotli per i file statici

```go
var _ = Service("web", func() {
    HTTP(func() {
        Encoding("gzip")
        Encoding("br")
    })
    
    Files("/static/{*path}", "services/api/ui/build/static/")
})
```

2. **Cache:** Configura header di cache appropriati

```go
var _ = Service("web", func() {
    Files("/static/{*path}", "services/api/ui/build/static/", func() {
        HTTP(func() {
            Header("Cache-Control", "public, max-age=31536000")
        })
    })
})
```

## Sviluppo

Durante lo sviluppo, puoi:

1. Eseguire il server di sviluppo React (`npm start`) sulla porta 3000
2. Eseguire il servizio Goa sulla porta 8000
3. Configurare il proxy nel `package.json` di React:

```json
{
  "proxy": "http://localhost:8000"
}
```

## Deployment in Produzione

Per il deployment in produzione:

1. Compila l'applicazione React:
   ```bash
   cd services/api/ui
   npm run build
   ```

2. Compila il servizio Goa:
   ```bash
   go build ./cmd/myapp
   ```

3. Distribuisci il binario risultante:
   ```bash
   ./myapp -http-addr :8000
   ```

## Riepilogo

L'integrazione di una SPA React in un servizio Goa offre:

1. Deployment semplificato con un singolo binario
2. Gestione efficiente dei file statici
3. Supporto al routing lato client
4. Ottimizzazioni delle performance integrate

Questo approccio è ideale per applicazioni di piccole e medie dimensioni dove
la semplicità di deployment è una priorità.

## Best Practice

1. **Organizzazione delle API**
   Quando organizzi i tuoi endpoint API, segui una struttura consistente posizionando
   tutti gli endpoint API sotto un prefisso `/api`. Questo rende chiaro quali route
   sono per l'API rispetto ai contenuti statici. Inoltre, assicurati che le tue
   risposte di errore seguano un formato standardizzato su tutti gli endpoint per fornire
   un'esperienza consistente per i consumatori dell'API. Infine, organizza gli endpoint
   correlati in gruppi logici basati sulla loro funzionalità o tipo di risorsa per
   mantenere una struttura API pulita e intuitiva.

2. **Configurazione CORS**
   Quando configuri il CORS in produzione, sii specifico riguardo a quali origini sono
   autorizzate ad accedere alla tua API - evita di usare caratteri jolly ed elenca
   esplicitamente i domini fidati. Implementa un caching appropriato delle richieste
   preflight per ridurre le richieste OPTIONS non necessarie e migliorare le performance.
   Esponi solo gli header e i metodi HTTP di cui la tua API ha effettivamente bisogno,
   seguendo il principio del minimo privilegio. Infine, considera attentamente le
   implicazioni di sicurezza dell'abilitazione della modalità credentials, poiché
   permette l'inclusione di cookie e header di autenticazione nelle richieste cross-origin -
   abilitala solo se specificamente richiesto dal modello di sicurezza della tua applicazione.

3. **Serving della SPA**
   Quando servi la tua SPA, è importante servirla sotto un percorso dedicato
   (come `/ui`) per separarla chiaramente dalle tue route API. Dovresti anche
   implementare una gestione appropriata dei reindirizzamenti root per assicurare URL
   puliti e user-friendly. Inoltre, la configurazione del tuo server deve supportare il
   routing lato client gestendo correttamente tutte le route definite nella tua
   applicazione frontend e restituendo il file `index.html` principale per quelle route.

4. **Sviluppo**
   Durante lo sviluppo, usa il server di sviluppo di React con la configurazione
   proxy per instradare le richieste API al tuo servizio Go. Questo fornisce hot
   reloading e altre funzionalità di sviluppo mantenendo una comunicazione fluida
   con il tuo backend. Mantieni il tuo codice UI organizzato vicino al servizio
   che lo serve per mantenere una chiara relazione tra i componenti frontend e
   backend. Inoltre, implementa una gestione appropriata del CORS (Cross-Origin
   Resource Sharing) per le tue chiamate API per assicurare una comunicazione
   sicura tra frontend e backend durante lo sviluppo e la produzione.

5. **Produzione**
   Per i deployment in produzione, ci sono diverse considerazioni importanti da
   tenere a mente. Prima di tutto, assicurati di compilare sempre la tua applicazione
   React prima di compilare il binario Go - questo assicura che il codice frontend
   più recente sia incorporato nel tuo servizio. Implementa header di cache appropriati
   per le risorse statiche come JavaScript, CSS e immagini per migliorare le performance
   e ridurre il carico del server. Configura logging e strumentazione completi per
   monitorare la salute e le performance della tua applicazione in produzione. Infine,
   implementa una gestione appropriata dello shutdown graceful per assicurare che le
   richieste in corso vengano completate con successo quando il servizio deve fermarsi. 