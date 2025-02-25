---
title: Esecuzione del Servizio Concerti
linkTitle: Esecuzione
weight: 3
description: "Impara come eseguire il tuo servizio Concerti basato su Goa, testare gli endpoint REST usando richieste HTTP ed esplorare la documentazione OpenAPI auto-generata."
---

Hai progettato la tua API e implementato i metodi del servizio. Ora è il momento di
eseguire il servizio Concerti e testare i suoi endpoint.

## 1. Avvia il Server

Dalla radice del tuo progetto, compila ed esegui la tua app:

```bash
go run concerts/cmd/concerts
```

Il servizio ascolta sulla porta 8080 di default (a meno che non sia stato modificato in `main.go`).

## 2. Testa gli Endpoint

Esploriamo la tua nuova API scintillante! Puoi interagire con il tuo servizio usando strumenti HTTP popolari:

- `curl` per test rapidi da riga di comando
- [HTTPie](https://httpie.org) per un'esperienza CLI più user-friendly
- [Postman](https://www.postman.com/) per un'interfaccia GUI potente con cronologia delle richieste e collezioni

Scegli il tuo strumento preferito e iniziamo a fare alcune richieste! 🚀
Useremo `curl` per questi esempi poiché è universalmente disponibile sulla maggior parte dei
sistemi. Tuttavia, sentiti libero di adattare gli esempi al tuo client HTTP preferito,
i concetti rimangono gli stessi indipendentemente dallo strumento che usi.

Ecco cosa testeremo:
- Creare un nuovo concerto (`POST`)
- Elencare tutti i concerti con paginazione (`GET`)
- Recuperare un concerto specifico (`GET`)
- Aggiornare i dettagli di un concerto (`PUT`)
- Eliminare un concerto (`DELETE`)

### Crea un Concerto

Creiamo un nuovo concerto! Questa richiesta invia un POST con i dettagli del concerto
in formato JSON. Il server genererà un ID univoco e restituirà l'oggetto concerto
completo:

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

Creiamone un altro per illustrare la paginazione:

```bash
curl -X POST http://localhost:8080/concerts \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "Pink Floyd",
    "date": "2025-07-15", 
    "venue": "Madison Square Garden",
    "price": 200
  }'
```

### Elenca i Concerti

Ottieni tutti i concerti con parametri di paginazione opzionali:

- `page`: Numero di pagina (default: 1)
- `limit`: Risultati per pagina (default: 10, max: 100)

L'endpoint di elenco supporta la paginazione per aiutarti a gestire grandi set di dati dei concerti in modo efficiente. Puoi controllare quanti risultati vedere per pagina e quale pagina visualizzare.

Recupera tutti i concerti (usa la paginazione predefinita):

```bash
curl http://localhost:8080/concerts
```

Ottieni un risultato per pagina:

```bash
curl "http://localhost:8080/concerts?page=1&limit=1"
```

### Mostra un Concerto

Quando hai bisogno di informazioni dettagliate su un concerto specifico, usa l'endpoint show. Questo è utile per visualizzare i dettagli di singoli concerti o verificare le informazioni dopo creazione/aggiornamenti.

Sostituisci `<concertID>` con un ID restituito dalla creazione:
```bash
curl http://localhost:8080/concerts/<concertID>
```

### Aggiorna un Concerto

Hai bisogno di cambiare i dettagli di un concerto? L'endpoint di aggiornamento ti permette di modificare le informazioni di un concerto esistente. Devi includere solo i campi che vuoi aggiornare - gli altri campi manterranno i loro valori attuali.

```bash
curl -X PUT http://localhost:8080/concerts/<concertID> \
  -H "Content-Type: application/json" \
  -d '{
    "artist": "The Beatles",
    "venue": "Madison Square Garden"
  }'
```

### Elimina un Concerto

Se un concerto deve essere rimosso dal sistema (magari è stato cancellato o inserito per errore), usa l'endpoint di eliminazione. Questa operazione è permanente, quindi usala con attenzione!

```bash
curl -X DELETE http://localhost:8080/concerts/<concertID>
```

## 3. Accedi alla Documentazione API

Goa genera automaticamente la documentazione OpenAPI per la tua API sia in formato versione 2.x che 3.0.0. Questi file si trovano nella directory `gen/http/`.

### Uso di Swagger UI

{{< alert title="Setup Rapido" color="primary" >}}
1. **Prerequisiti**
   - Docker installato sul tuo sistema

2. **Avvia Swagger UI**
   ```bash
   docker run -p 8081:8080 swaggerapi/swagger-ui
   ```

3. **Visualizza la Documentazione**
   - Apri `http://localhost:8081` nel tuo browser
   - Inserisci `http://localhost:8080/openapi3.yaml` in Swagger UI
{{< /alert >}}

### Strumenti di Documentazione Alternativi

- **Redoc**: Un altro visualizzatore di documentazione OpenAPI popolare
- **OpenAPI Generator**: Genera librerie client in vari linguaggi
- **Speakeasy**: Genera SDK con esperienza sviluppatore migliorata

## Prossimi Passi

Ora che hai esplorato le operazioni API di base, scopri di più su come Goa gestisce la [codifica e decodifica HTTP](../4-encoding) per comprendere come vengono elaborate le richieste e le risposte. 