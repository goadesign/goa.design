---
title: "Trasporti e combinazioni di streaming"
linkTitle: "Trasporti"
weight: 6
description: "Combinazioni di trasporto consentite per servizio e metodo, con modalità di streaming e vincoli."
---

Questa pagina spiega quali combinazioni di trasporto un servizio Goa e i suoi
metodi possono esporre e quali modalità di streaming sono valide per ogni
trasporto. L'obiettivo è fornire a nuovi utenti ed esperti un riferimento unico
e autorevole su cosa significhi "mescolare i trasporti" in Goa e quali
combinazioni sono consentite o vietate.

Contenuti:
- Trasporti disponibili: HTTP (plain), HTTP Server‑Sent Events (SSE), HTTP
  WebSocket, JSON‑RPC 2.0 (su HTTP, SSE, WebSocket) e gRPC.
- Modalità di streaming: nessuno, client‑stream, server‑stream, bidirezionale.
- Cosa può esporre contemporaneamente un singolo servizio.
- Cosa può esporre un singolo metodo per ciascun trasporto.


## Terminologia

- Nessuno: richiesta/risposta standard (unario).
- Client‑stream: il client invia uno stream di payload al server.
- Server‑stream: il server invia uno stream di risultati al client.
- Bidirezionale: entrambi i lati fanno streaming.
- Risultati misti: un metodo definisce sia `Result` sia `StreamingResult` con
  tipi diversi. Abilita la negoziazione tra una risposta normale e una risposta
  in streaming (supportata solo da SSE).


## Livello servizio: quali trasporti si possono mescolare?

Nella tabella seguente, "sì" indica che i trasporti possono coesistere nello
stesso servizio Goa. Le note spiegano i vincoli.

| Trasporto nello stesso servizio | Con HTTP (plain) | Con HTTP (WS) | Con HTTP (SSE) | Con JSON‑RPC (HTTP) | Con JSON‑RPC (WS) | Con JSON‑RPC (SSE) | Con gRPC |
|---------------------------------|------------------|---------------|----------------|---------------------|-------------------|--------------------|----------|
| HTTP (plain)                    | —                | sì            | sì             | sì                  | no [S2]           | sì                 | sì       |
| HTTP (WebSocket)                | sì               | —             | sì             | sì                  | no [S2]           | sì                 | sì       |
| HTTP (SSE)                      | sì               | sì            | —              | sì                  | no [S2]           | sì                 | sì       |
| JSON‑RPC (HTTP)                 | sì               | sì            | sì             | —                   | no [S1]           | sì                 | sì       |
| JSON‑RPC (WebSocket)            | no [S2]          | no [S2]       | no [S2]        | no [S1]             | —                 | no [S1]            | sì       |
| JSON‑RPC (SSE)                  | sì               | sì            | sì             | sì                  | no [S1]           | —                  | sì       |
| gRPC                            | sì               | sì            | sì             | sì                  | sì                | sì                 | —        |

Note:
- [S1] JSON‑RPC WebSocket non può essere mescolato con altri trasporti JSON‑RPC
  nello stesso servizio. Un servizio JSON‑RPC deve essere solo WebSocket oppure
  HTTP/SSE (che possono coesistere), non entrambi.
- [S2] Un servizio non può mescolare endpoint WebSocket JSON‑RPC con endpoint
  WebSocket "puri" HTTP. JSON‑RPC usa una singola connessione WS condivisa da
  tutti i metodi, mentre HTTP puro crea una connessione WS per endpoint.

Comportamenti a livello servizio:
- JSON‑RPC HTTP e JSON‑RPC SSE possono condividere lo stesso endpoint POST e
  vengono selezionati tramite l'header `Accept` (es. `text/event-stream` vs.
  `application/json`).
- gRPC è indipendente e può essere combinato liberamente con HTTP e JSON‑RPC.


## Livello metodo: modalità valide per trasporto

Nella tabella seguente, "sì" indica che la modalità è valida per un metodo su
quel trasporto. "sì (misti)" è valido se il metodo usa risultati misti (tipi
`Result` e `StreamingResult` diversi) e l'endpoint abilita SSE. "no" è vietato.

| Trasporto           | Nessuno              | Client‑stream | Server‑stream       | Bidirezionale |
|---------------------|----------------------|---------------|---------------------|---------------|
| HTTP (plain)        | sì                   | no            | sì (misti) [M1]     | no            |
| HTTP (SSE)          | sì (misti) [M2]      | no            | sì [M3]             | no            |
| HTTP (WebSocket)    | no                   | sì [M4]       | sì [M4]             | sì [M4]       |
| JSON‑RPC (HTTP)     | sì                   | no            | sì (misti) [M1,M5]  | no            |
| JSON‑RPC (SSE)      | sì (misti) [M2,M5]   | no            | sì [M6]             | no            |
| JSON‑RPC (WebSocket)| no                   | sì [M7]       | sì [M8]             | sì [M7]       |
| gRPC                | sì                   | sì            | sì                  | sì            |

Note:
- [M1] I risultati misti richiedono SSE sull'endpoint e vietano
  `StreamingPayload`. Si usa per negoziare tra risposta normale e flusso SSE.
- [M2] Usare SSE con un metodo non in streaming è valido solo con risultati
  misti (il percorso SSE serve il risultato in streaming; il percorso non‑SSE
  serve il risultato normale).
- [M3] SSE è solo server‑to‑client; non può essere usato con client o
  bidirezionale.
- [M4] Gli endpoint WebSocket HTTP puri devono usare GET e non possono avere un
  body. Mappare gli input con header/parametri. (JSON‑RPC WS è un'eccezione.)
- [M5] JSON‑RPC HTTP e JSON‑RPC SSE possono coesistere con risultati misti; il
  server sceglie in base all'header `Accept`.
- [M6] JSON‑RPC SSE usa POST sull'endpoint condiviso; il campo `id` di SSE
  mappa l'attributo ID del risultato.
- [M7] JSON‑RPC WebSocket supporta client‑stream, server‑stream e
  bidirezionale. I metodi non in streaming non sono supportati su WS.
- [M8] Con JSON‑RPC WS e server‑stream, definire i dati in `Payload` e non
  anche in `StreamingPayload`.


## Dettagli JSON‑RPC

- WebSocket:
  - Una sola connessione WS per servizio condivisa da tutti i metodi JSON‑RPC.
  - Nessun mapping di header/cookie/parametri sugli endpoint WS.
  - Tre pattern supportati:
    - Solo `StreamingPayload()` (notifiche client‑to‑server).
    - Solo `StreamingResult()` (notifiche server‑to‑client, senza `id`).
    - Entrambi (bidirezionale).
  - I metodi non in streaming non sono supportati su WS JSON‑RPC.

- HTTP e SSE:
  - Condividono la stessa route JSON‑RPC (POST). Il server seleziona la
    modalità in base a `Accept`.
  - I risultati misti abilitano la negoziazione tra risposta JSON‑RPC normale
    e flusso SSE.

- Gestione degli ID:
  - Non‑streaming: il framework copia l'`id` della richiesta nel campo ID del
    risultato se non impostato dall'utente.
  - Streaming (WS): le risposte del server riusano l'`id` originale; le
    notifiche server‑initiated non hanno `id`.
  - SSE: `SendAndClose` invia una risposta JSON‑RPC; l'`id` è l'ID del
    risultato se presente, altrimenti l'`id` della richiesta.


## Dettagli HTTP

- Endpoint WS devono usare GET. Endpoint SSE possono usare GET o POST. JSON‑RPC
  SSE usa POST.
- Endpoint WS (HTTP puro) non possono avere body: mappare gli input via
  header/parametri. (JSON‑RPC WS è esente perché i messaggi viaggiano nel canale
  WS.)


## Dettagli gRPC

gRPC non impone vincoli aggiuntivi rispetto a HTTP/JSON‑RPC in Goa. Unario,
client streaming, server streaming e bidirezionale sono tutti supportati e
combinabili liberamente con gli altri trasporti.


## Riferimenti di implementazione

- `expr/method.go`: helper sul tipo di stream; rilevamento risultati misti.
- `dsl/payload.go`, `dsl/result.go`: come `StreamingPayload`/`StreamingResult`
  impostano il tipo di stream.
- `expr/http_endpoint.go`: vincoli SSE; requisiti risultati misti; validazioni
  WS HTTP puro; validazioni endpoint JSON‑RPC.
- `expr/http_service.go`: regole di mixing JSON‑RPC; conflitto JSON‑RPC WS vs.
  HTTP WS; preparazione route JSON‑RPC e metodi (GET per WS, POST altrimenti).
- `dsl/jsonrpc.go`, `jsonrpc/README.md`: comportamento trasporti JSON‑RPC
  (batching, notifiche, semantica WS/SSE), inclusi “WS richiede streaming” e
  “HTTP+SSE content negotiation”.


