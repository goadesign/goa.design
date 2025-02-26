---
title: "Stream di Dati Binari Raw su HTTP"
linkTitle: "Streaming Binario Raw"
weight: 7
description: "Impara come fare streaming efficiente di dati binari raw come file e contenuti multimediali su HTTP usando le capacità di streaming di basso livello di Goa."
---

Mentre `StreamingPayload` e `StreamingResult` di Goa funzionano bene per stream
di dati tipizzati, a volte hai bisogno di accesso diretto allo stream di dati binari raw. Questo è
comune quando gestisci upload, download di file o stream multimediali. Goa
fornisce questa capacità attraverso le sue funzionalità `SkipRequestBodyEncodeDecode` e
`SkipResponseBodyEncodeDecode`.

## Scegliere il Tuo Approccio allo Streaming

Goa offre due approcci distinti allo streaming, ognuno adatto a diverse esigenze:

L'approccio `StreamingPayload` e `StreamingResult` è ideale quando stai
lavorando con dati strutturati che hanno tipi conosciuti. È particolarmente utile quando
hai bisogno di type safety, validazione o compatibilità gRPC. Questo approccio sfrutta
il sistema di tipi di Goa per assicurare che i tuoi stream di dati mantengano la loro struttura attesa.

L'approccio `SkipRequestBodyEncodeDecode` ti dà accesso diretto allo stream
del body HTTP raw. Questa è la scelta giusta quando hai a che fare con dati binari come
file o quando hai bisogno di controllo completo sull'elaborazione dei dati. È
particolarmente efficiente per file grandi poiché evita qualsiasi passo non necessario
di codifica/decodifica.

## Streaming delle Richieste

Lo streaming delle richieste permette al tuo servizio di elaborare i dati in arrivo mentre arrivano,
invece di aspettare il payload completo. Ecco come implementare upload di file
usando lo streaming raw:

```go
var _ = Service("upload", func() {
    Method("upload", func() {
        Payload(func() {
            // Nota: Non si possono definire attributi del body quando si usa lo streaming
            Attribute("content_type", String)
            Attribute("dir", String)
        })
        HTTP(func() {
            POST("/upload/{*dir}")
            Header("content_type:Content-Type")
            SkipRequestBodyEncodeDecode()
        })
    })
})
```

La tua implementazione del servizio riceve un `io.ReadCloser` per lo streaming del body della richiesta:

```go
func (s *service) Upload(ctx context.Context, p *upload.Payload, body io.ReadCloser) error {
    defer body.Close()
    
    buffer := make([]byte, 32*1024)
    for {
        n, err := body.Read(buffer)
        if err == io.EOF {
            break
        }
        if err != nil {
            return err
        }
        // Elabora buffer[:n]
    }
    return nil
}
```

## Streaming delle Risposte

Lo streaming delle risposte permette al tuo servizio di inviare dati incrementalmente ai client. Questo è
perfetto per download di file o feed di dati in tempo reale. Ecco come implementarlo:

```go
var _ = Service("download", func() {
    Method("download", func() {
        Payload(String)
        Result(func() {
            Attribute("length", Int64)
        })
        HTTP(func() {
            GET("/download/{*filename}")
            SkipResponseBodyEncodeDecode()
            Response(func() {
                Header("length:Content-Length")
            })
        })
    })
})
```

L'implementazione del servizio restituisce sia il risultato che un `io.ReadCloser`:

```go
func (s *service) Download(ctx context.Context, p string) (*download.Result, io.ReadCloser, error) {
    file, err := os.Open(p)
    if err != nil {
        return nil, nil, err
    }
    
    stat, err := file.Stat()
    if err != nil {
        file.Close()
        return nil, nil, err
    }
    
    return &download.Result{
        Length: stat.Size(),
    }, file, nil
}
```

## Esempio Completo

Ecco un esempio completo che dimostra sia lo streaming di upload che di download di file in un singolo servizio:

```go
package design

import . "goa.design/goa/v3/dsl"

var _ = API("streaming", func() {
    Title("Esempio di API di Streaming")
})

var _ = Service("files", func() {
    Method("upload", func() {
        Payload(func() {
            Attribute("content_type", String)
            Attribute("filename", String)
        })
        HTTP(func() {
            POST("/upload/{filename}")
            Header("content_type:Content-Type")
            SkipRequestBodyEncodeDecode()
        })
    })
    
    Method("download", func() {
        Payload(String)
        Result(func() {
            Attribute("length", Int64)
        })
        HTTP(func() {
            GET("/download/{*filepath}")
            SkipResponseBodyEncodeDecode()
            Response(func() {
                Header("length:Content-Length")
            })
        })
    })
})
```

L'implementazione mostra un servizio file completo che gestisce sia upload che download:

```go
type filesService struct {
    storageDir string
}

func (s *filesService) Upload(ctx context.Context, p *files.UploadPayload, body io.ReadCloser) error {
    defer body.Close()
    
    fpath := filepath.Join(s.storageDir, p.Filename)
    f, err := os.Create(fpath)
    if err != nil {
        return err
    }
    defer f.Close()
    
    _, err = io.Copy(f, body)
    return err
}

func (s *filesService) Download(ctx context.Context, p string) (*files.DownloadResult, io.ReadCloser, error) {
    fpath := filepath.Join(s.storageDir, p)
    f, err := os.Open(fpath)
    if err != nil {
        return nil, nil, err
    }
    
    stat, err := f.Stat()
    if err != nil {
        f.Close()
        return nil, nil, err
    }
    
    return &files.DownloadResult{
        Length: stat.Size(),
    }, f, nil
}
```

Esaminiamo gli aspetti chiave di questa implementazione:

Il servizio è costruito attorno a un semplice concetto di directory di storage. Ogni istanza è
configurata con una directory base dove tutti i file verranno memorizzati e recuperati.
Questo contenimento all'interno di una directory specifica fornisce un confine di sicurezza
di base per le operazioni sui file.

Per gli upload, abbiamo implementato un approccio di streaming che minimizza l'uso della memoria.
Invece di bufferizzare l'intero file in memoria, facciamo streaming dei dati direttamente dal
body della richiesta al file system usando `io.Copy`. L'implementazione gestisce attentamente
le risorse usando statement `defer` per assicurare una corretta pulizia, indipendentemente dal
fatto che l'operazione abbia successo o fallisca.

L'implementazione del download è ugualmente efficiente. Quando viene richiesto un download,
prima apriamo il file e recuperiamo i suoi metadati in una singola operazione. Questo
ci permette di fornire la dimensione del file a Goa (che la usa per l'header Content-Length)
mentre otteniamo anche l'handle del file per lo streaming. Nota che non chiudiamo il file
nel caso di successo - Goa prende possesso dell'handle del file e lo chiuderà dopo
aver fatto lo streaming del contenuto al client.

Durante entrambe le operazioni, la gestione degli errori è un focus chiave. Il codice include
una corretta pulizia delle risorse quando si verificano errori, una chiara propagazione degli errori
al chiamante e una gestione sicura dei percorsi dei file per prevenire attacchi di directory traversal.
Questa attenzione alla gestione degli errori aiuta ad assicurare che il servizio rimanga robusto e
sicuro sotto varie condizioni di fallimento.

Questa implementazione dimostra uno streaming efficiente:
- Usando lo streaming diretto del file system
- Gestendo correttamente le risorse con statement defer
- Fornendo informazioni accurate sulla lunghezza del contenuto
- Implementando una corretta gestione degli errori
- Assicurando una gestione sicura dei percorsi dei file

Per contenuti correlati sulla gestione di file statici e template, vedi la sezione [Contenuto Statico](../5-static-content). 