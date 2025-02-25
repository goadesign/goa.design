---
title: Upload e Download di File
weight: 2
description: "Impara come implementare funzionalità efficienti di upload e download di file in Goa usando lo streaming"
---

# Upload e Download di File

Quando si costruiscono servizi web, la gestione di upload e download di file è un
requisito comune. Che tu stia costruendo un servizio di condivisione file, un'API
per il caricamento di immagini o un sistema di gestione documenti, avrai bisogno
di gestire i trasferimenti di file binari in modo efficiente.

Questa sezione dimostra come implementare funzionalità di upload e download di file
in Goa usando lo streaming per gestire i file binari in modo efficiente. L'approccio
mostrato qui usa lo streaming HTTP diretto, permettendo sia al codice server che
client di processare il contenuto senza caricare l'intero payload in memoria. Questo
è particolarmente importante quando si ha a che fare con file di grandi dimensioni,
poiché caricarli interamente in memoria potrebbe causare problemi di prestazioni o
addirittura far crashare il tuo servizio.

## Panoramica del Design

La chiave per implementare upload e download di file efficienti in Goa è l'uso di due
funzioni DSL speciali che modificano il modo in cui Goa gestisce i body delle richieste
e risposte HTTP:

- `SkipRequestBodyEncodeDecode`: Usato per gli upload per bypassare la codifica/decodifica
  del body della richiesta. Questo permette lo streaming diretto dei file caricati senza
  prima caricarli in memoria.
- `SkipResponseBodyEncodeDecode`: Usato per i download per bypassare la codifica/decodifica
  del body della risposta. Questo abilita lo streaming dei file direttamente dal disco
  al client senza bufferizzare l'intero file in memoria.

Queste funzioni dicono a Goa di saltare la generazione di encoder e decoder per i
body delle richieste e risposte HTTP, fornendo invece accesso diretto agli stream
IO sottostanti. Questo è cruciale per gestire file di grandi dimensioni in modo
efficiente.

## Esempio di Implementazione

Vediamo come implementare un servizio completo che gestisce sia upload che download di file.
Creeremo un servizio che:
- Accetta upload di file via multipart form data
- Memorizza i file su disco
- Permette il download dei file precedentemente caricati
- Gestisce gli errori in modo appropriato
- Usa lo streaming per l'efficienza

### Design dell'API

Prima, dobbiamo definire l'API e il servizio nel tuo pacchetto di design. Qui è
dove specifichiamo gli endpoint, i loro parametri e come si mappano su HTTP:

```go
var _ = API("upload_download", func() {
    Description("Esempio di upload e download di file")
})

var _ = Service("updown", func() {
    Description("Servizio per la gestione di upload e download di file")

    // Endpoint di upload
    Method("upload", func() {
        Payload(func() {
            // Definisce header e parametri necessari per l'upload
            // content_type è richiesto per il parsing dei dati multipart form
            Attribute("content_type", String, "Header Content-Type con boundary multipart")
            // dir specifica dove memorizzare i file caricati
            Attribute("dir", String, "Percorso directory di upload")
        })

        HTTP(func() {
            POST("/upload/{*dir}")  // Endpoint POST con directory come parametro URL
            Header("content_type:Content-Type")  // Mappa content_type su header Content-Type
            SkipRequestBodyEncodeDecode()  // Abilita streaming per gli upload
        })
    })

    // Endpoint di download
    Method("download", func() {
        Payload(String)  // Nome file da scaricare
        
        Result(func() {
            // Restituiremo la dimensione del file nell'header Content-Length
            Attribute("length", Int64, "Lunghezza contenuto in byte")
            Required("length")
        })

        HTTP(func() {
            GET("/download/{*filename}")  // Endpoint GET con nome file come parametro URL
            SkipResponseBodyEncodeDecode()  // Abilita streaming per i download
            Response(func() {
                Header("length:Content-Length")  // Mappa length su header Content-Length
            })
        })
    })
})
```

Questo design crea due endpoint:
1. `POST /upload/{dir}` - Accetta upload di file e li memorizza nella directory specificata
2. `GET /download/{filename}` - Fa lo streaming del file richiesto al client

### Implementazione del Servizio

Ora vediamo come implementare il servizio che gestisce questi endpoint. L'implementazione
dovrà processare i dati multipart form per gli upload di file, fare lo streaming dei
file in modo efficiente sia verso che dal disco, gestire correttamente le risorse di
sistema come handle di file e memoria, e gestire gli errori in modo robusto. Questo
richiede attenzione ai dettagli per assicurare che i file siano processati correttamente
e le risorse siano pulite, anche in caso di errori.

L'implementazione del servizio dimostrerà le best practice per gestire upload e download
di file di grandi dimensioni in un ambiente di produzione. Vedremo come analizzare i
boundary multipart, fare lo streaming dei dati in chunk per evitare problemi di memoria,
e chiudere correttamente le risorse usando statement defer.

Ecco l'implementazione con spiegazioni dettagliate:

```go
// service struct contiene la configurazione per il nostro servizio di upload/download
type service struct {
    dir string  // Directory base per memorizzare i file
}

// Upload implementa la gestione degli upload di file via multipart form data
func (s *service) Upload(ctx context.Context, p *updown.UploadPayload, req io.ReadCloser) error {
    // Chiudi sempre il body della richiesta quando abbiamo finito
    defer req.Close()

    // Analizza i dati multipart form dalla richiesta
    // Questo richiede l'header Content-Type con il parametro boundary
    _, params, err := mime.ParseMediaType(p.ContentType)
    if err != nil {
        return err  // Header Content-Type non valido
    }
    mr := multipart.NewReader(req, params["boundary"])

    // Processa ogni file nel form multipart
    for {
        part, err := mr.NextPart()
        if err == io.EOF {
            break  // Nessun altro file
        }
        if err != nil {
            return err  // Errore nella lettura della parte
        }
        
        // Crea il file di destinazione
        // Unisce la directory base con il nome del file caricato
        dst := filepath.Join(s.dir, part.FileName())
        f, err := os.Create(dst)
        if err != nil {
            return err  // Errore nella creazione del file
        }
        defer f.Close()  // Assicura che il file sia chiuso anche se usciamo prima

        // Fa lo streaming del contenuto del file dalla richiesta al disco
        // io.Copy gestisce lo streaming in modo efficiente
        if _, err := io.Copy(f, part); err != nil {
            return err  // Errore nella scrittura del file
        }
    }
    return nil
}

// Download implementa lo streaming dei file dal disco al client
func (s *service) Download(ctx context.Context, filename string) (*updown.DownloadResult, io.ReadCloser, error) {
    // Costruisce il percorso completo del file
    path := filepath.Join(s.dir, filename)
    
    // Ottiene informazioni sul file (principalmente per la dimensione)
    fi, err := os.Stat(path)
    if err != nil {
        return nil, nil, err  // File non trovato o altro errore
    }

    // Apre il file per la lettura
    f, err := os.Open(path)
    if err != nil {
        return nil, nil, err  // Errore nell'apertura del file
    }

    // Restituisce la dimensione del file e il reader del file
    // Il chiamante è responsabile della chiusura del reader
    return &updown.DownloadResult{Length: fi.Size()}, f, nil
}
```

## Utilizzo

Dopo aver implementato il servizio e generato il codice con `goa gen`, puoi
usare il servizio in diversi modi. Ecco come usare lo strumento CLI generato
per il testing:

```bash
# Prima, avvia il server in un terminale
$ go run cmd/upload_download/main.go

# In un altro terminale, carica un file
# Il flag --stream dice alla CLI di fare lo streaming del file direttamente dal disco
$ go run cmd/upload_download-cli/main.go updown upload \
    --stream /path/to/file.jpg \
    --dir uploads

# Scarica un file precedentemente caricato
# L'output è rediretto a un nuovo file
$ go run cmd/upload_download-cli/main.go updown download file.jpg > downloaded.jpg
```

Per applicazioni reali, tipicamente chiamerai questi endpoint usando client HTTP.
Ecco un esempio usando `curl`:

```bash
# Carica un file
$ curl -X POST -F "file=@/path/to/file.jpg" http://localhost:8080/upload/uploads

# Scarica un file
$ curl http://localhost:8080/download/file.jpg -o downloaded.jpg
```

## Punti Chiave e Best Practice

1. Usa `SkipRequestBodyEncodeDecode` per gli upload per:
   - Bypassare la generazione del decoder del body della richiesta
   - Ottenere accesso diretto al reader del body della richiesta HTTP
   - Fare lo streaming di file grandi senza problemi di memoria
   - Gestire i dati multipart form in modo efficiente

2. Usa `SkipResponseBodyEncodeDecode` per i download per:
   - Bypassare la generazione dell'encoder del body della risposta
   - Fare lo streaming delle risposte direttamente ai client
   - Gestire file grandi in modo efficiente
   - Impostare header Content-Length appropriati

3. Le implementazioni del servizio ricevono e restituiscono interfacce `io.Reader`,
   permettendo uno streaming efficiente dei dati. Questo è cruciale per:
   - Efficienza della memoria
   - Prestazioni con file grandi
   - Gestione di upload/download multipli concorrenti

4. Ricorda sempre di gestire correttamente le risorse:
   - Chiudi reader e file usando `defer`
   - Gestisci gli errori in modo appropriato ad ogni passo
   - Valida percorsi e tipi di file per la sicurezza
   - Imposta permessi file appropriati
   - Considera l'implementazione di rate limiting per uso in produzione

5. Considerazioni di Sicurezza:
   - Valida tipi e dimensioni dei file
   - Sanifica i nomi dei file per prevenire attacchi di directory traversal
   - Implementa autenticazione e autorizzazione
   - Considera l'uso di scansione virus per i file caricati 