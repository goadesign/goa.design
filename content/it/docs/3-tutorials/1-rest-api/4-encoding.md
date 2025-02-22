---
title: Personalizzare la Codifica delle Richieste/Risposte
linkTitle: Codifica
weight: 4
description: "Padroneggia il sistema di codifica di Goa imparando come personalizzare la codifica delle richieste/risposte, supportare diversi tipi di contenuto come JSON e MessagePack e implementare logica di serializzazione personalizzata."
---

Dopo aver implementato il tuo servizio Concerti, potresti aver bisogno di personalizzare il modo in cui i dati
vengono codificati e decodificati. Questo tutorial ti mostra come lavorare con il flessibile
sistema di codifica di Goa, permettendoti di supportare diversi tipi di contenuto e implementare
logica di serializzazione personalizzata.

## Comportamento Predefinito

Di default, il servizio Concerti che abbiamo costruito utilizza gli encoder e decoder standard di Goa, che gestiscono:
- JSON (application/json)
- XML (application/xml)
- Gob (application/gob)

Vediamo come personalizzarlo per le tue esigenze.

## Modificare la Configurazione del Server

Ricorda la nostra configurazione del server in `main.go`:

```go
func main() {
    // ... inizializzazione del servizio ...

    // Encoder e decoder predefiniti
    mux := goahttp.NewMuxer()
    handler := genhttp.New(
        endpoints,
        mux,
        goahttp.RequestDecoder,  // Decoder di richieste predefinito
        goahttp.ResponseEncoder, // Encoder di risposte predefinito
        nil,
        nil,
    )
}
```

### Aggiungere Tipi di Contenuto Personalizzati

Modifichiamo il nostro servizio Concerti per supportare la codifica MessagePack per migliori prestazioni:

```go
package main

import (
    "context"
    "net/http"
    
    "github.com/vmihailenco/msgpack/v5"
    goahttp "goa.design/goa/v3/http"
    "strings"
)

type (
    // Implementazione encoder MessagePack
    msgpackEnc struct {
        w http.ResponseWriter
    }

    // Implementazione decoder MessagePack
    msgpackDec struct {
        r *http.Request
    }
)

// Costruttore encoder personalizzato
func msgpackEncoder(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
    return &msgpackEnc{w: w}
}

func (e *msgpackEnc) Encode(v any) error {
    w.Header().Set("Content-Type", "application/msgpack")
    return msgpack.NewEncoder(e.w).Encode(v)
}

// Costruttore decoder personalizzato
func msgpackDecoder(r *http.Request) goahttp.Decoder {
    return &msgpackDec{r: r}
}

func (d *msgpackDec) Decode(v any) error {
    return msgpack.NewDecoder(d.r.Body).Decode(v)
}

func main() {
    // ... inizializzazione del servizio ...

    // Selezione encoder personalizzato basata sull'header Accept
    encodeFunc := func(ctx context.Context, w http.ResponseWriter) goahttp.Encoder {
        accept := ctx.Value(goahttp.AcceptTypeKey).(string)
        
        // Analizza l'header Accept che può contenere più tipi con q-values
        // es., "application/json;q=0.9,application/msgpack"
        types := strings.Split(accept, ",")
        for _, t := range types {
            mt := strings.TrimSpace(strings.Split(t, ";")[0])
            switch mt {
            case "application/msgpack":
                return msgpackEncoder(ctx, w)
            case "application/json", "*/*":
                return goahttp.ResponseEncoder(ctx, w)
            }
        }
        
        // Default a JSON se non viene trovato un tipo supportato
        return goahttp.ResponseEncoder(ctx, w)
    }

    // Selezione decoder personalizzato basata sul Content-Type
    decodeFunc := func(r *http.Request) goahttp.Decoder {
        if r.Header.Get("Content-Type") == "application/msgpack" {
            return msgpackDecoder(r)
        }
        return goahttp.RequestDecoder(r)
    }

    // Usa encoder/decoder personalizzati
    handler := genhttp.New(
        endpoints,
        mux,
        decodeFunc,
        encodeFunc,
        nil,
        nil,
    )
}
```

## Utilizzare Diversi Tipi di Contenuto

Ora puoi interagire con la tua API utilizzando diversi tipi di contenuto:

```bash
# Crea un concerto usando JSON
curl -X POST http://localhost:8080/concerts \
    -H "Content-Type: application/json" \
    -d '{"artist":"The Beatles","venue":"O2 Arena"}'

# Ottieni un concerto specificando l'header Accept
curl http://localhost:8080/concerts/123 \
    -H "Accept: application/msgpack" \
    --output concert.msgpack

# Crea un concerto usando MessagePack
curl -X POST http://localhost:8080/concerts \
    -H "Content-Type: application/msgpack" \
    --data-binary @concert.msgpack
```

## Best Practice

### Negoziazione del Contenuto
Quando si gestiscono richieste e risposte, una corretta negoziazione del contenuto è essenziale.
Il tuo servizio dovrebbe sempre controllare l'header Accept per determinare il formato di risposta
che il client si aspetta. Mentre JSON è tipicamente un buon formato predefinito, sii
pronto a restituire un codice di stato `406 Not Acceptable` se il client richiede un
tipo di contenuto non supportato. Questo assicura una chiara comunicazione sui formati
supportati.

### Considerazioni sulle Prestazioni
Scegli encoder che corrispondano ai requisiti del tuo caso d'uso. Per API ad alto throughput
o payload di grandi dimensioni, considera l'utilizzo di formati binari come MessagePack o Protocol
Buffers invece di formati basati su testo come JSON. Inoltre, implementare
il caching delle risposte può migliorare significativamente le prestazioni per le risorse
frequentemente accedute.

### Strategia di Gestione degli Errori
Una robusta gestione degli errori inizia con la validazione degli header Content-Type sulle richieste
in arrivo. Quando si verificano errori, restituisci messaggi di errore chiari e descrittivi che aiutino
i client a capire e risolvere il problema. Mantieni un formato di risposta degli errori coerente
in tutta la tua API per rendere la gestione degli errori prevedibile per i client.

### Approccio al Testing
Testa accuratamente la tua API con diversi tipi di contenuto per assicurare una corretta codifica
e decodifica. Includi test che verifichino le risposte di errore quando vengono forniti tipi di contenuto
non validi. Presta particolare attenzione alla gestione degli header - testa sia l'header
Accept per le risposte che l'header Content-Type per le richieste per assicurarti che la tua
negoziazione del contenuto funzioni come previsto.

Vedi la sezione [Supporto Tipi di Contenuto](../4-concepts/3-http/1-content.md) per
maggiori dettagli su come personalizzare la negoziazione del contenuto in Goa.

## Riepilogo

Personalizzando encoder e decoder, puoi:
- Supportare formati binari efficienti come MessagePack
- Gestire tipi di contenuto personalizzati
- Implementare logica di codifica speciale
- Controllare la negoziazione del contenuto

Questo completa la nostra serie di tutorial sull'API REST. Ora hai un'API Concerti
completamente funzionante con supporto per la codifica personalizzata! 