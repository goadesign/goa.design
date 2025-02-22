---
title: Esecuzione del Servizio Concerti
linkTitle: Esecuzione
weight: 3
description: "Impara come eseguire il tuo servizio Concerti basato su Goa, testare gli endpoint REST utilizzando richieste HTTP ed esplorare la documentazione OpenAPI generata automaticamente."
---

Hai progettato la tua API e implementato i metodi del servizio. Ora è il momento di eseguire il servizio Concerti e testare i suoi endpoint.

{{< alert title="In Questo Tutorial" color="primary" >}}
1. Avviare il server
2. Testare gli endpoint con richieste HTTP
3. Esplorare la documentazione OpenAPI generata automaticamente
{{< /alert >}}

## 1. Avviare il Server

Dalla radice del tuo progetto, compila ed esegui la tua app:

```bash
go run concerts/cmd/concerts
```

Il servizio ascolta sulla porta 8080 di default (a meno che non sia stato modificato in `main.go`).

## 2. Testare gli Endpoint

Puoi inviare richieste al servizio utilizzando strumenti come `curl`, HTTPie o Postman.

### Elencare i Concerti
```bash
curl http://localhost:8080/concerts
```

### Creare un Concerto
```bash
curl -X POST http://localhost:8080/concerts \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "The Rolling Stones",
    "date": "2025-05-01",
    "venue": "Wembley Stadium",
    "price": 150
  }'
```

### Mostrare un Concerto
Sostituisci `<concertID>` con un ID restituito dalla creazione:
```bash
curl http://localhost:8080/concerts/<concertID>
```

### Aggiornare un Concerto
```bash
curl -X PUT http://localhost:8080/concerts/<concertID> \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "The Beatles",
    "venue": "Madison Square Garden"
  }'
```

### Eliminare un Concerto
```bash
curl -X DELETE http://localhost:8080/concerts/<concertID>
```

## 3. Accedere alla Documentazione API

Goa genera automaticamente la documentazione OpenAPI per la tua API sia in formato versione 2.x che 3.0.0. Questi file si trovano nella directory `gen/http/`.

### Utilizzare Swagger UI

{{< alert title="Configurazione Rapida" color="primary" >}}
1. **Prerequisiti**
   - Docker installato sul tuo sistema

2. **Avviare Swagger UI**
   ```bash
   docker run -p 8081:8080 swaggerapi/swagger-ui
   ```

3. **Visualizzare la Documentazione**
   - Apri `http://localhost:8081` nel tuo browser
   - Inserisci `http://localhost:8080/openapi3.yaml` in Swagger UI
{{< /alert >}}

### Strumenti di Documentazione Alternativi

- **Redoc**: Un altro visualizzatore di documentazione OpenAPI popolare
- **OpenAPI Generator**: Genera librerie client in vari linguaggi
- **Speakeasy**: Genera SDK con un'esperienza di sviluppo migliorata

## Prossimi Passi

Ora che hai esplorato le operazioni API di base, scopri di più su come Goa gestisce la [codifica e decodifica HTTP](../4-encoding) per comprendere come vengono elaborate le richieste e le risposte. 