---
title: "Controlli di Salute"
description: "Implementare i controlli di salute con Clue"
weight: 5
---

# Controlli di Salute

I controlli di salute sono cruciali per il monitoraggio e l'orchestrazione dei servizi.
Aiutano ad assicurare che il tuo servizio funzioni correttamente e che tutte le sue
dipendenze siano disponibili. Clue fornisce un sistema standard di controllo della
salute che monitora le dipendenze del servizio e riporta il loro stato, rendendo
facile l'integrazione con orchestratori di container e sistemi di monitoraggio.

## Panoramica

Il sistema di controllo della salute di Clue fornisce un monitoraggio completo della salute del servizio:

- **Monitoraggio Dipendenze**: Traccia la salute di database, cache e altri servizi
- **Endpoint Standard**: Endpoint HTTP compatibili con Kubernetes e altre piattaforme
- **Stato Dettagliato**: Informazioni di stato ricche inclusi uptime e versione
- **Controlli Personalizzati**: Supporto per criteri di salute specifici del business
- **Configurazione Flessibile**: Timeout, percorsi e formati di risposta personalizzabili

## Setup Base

Configurare i controlli di salute nel tuo servizio è semplice. Ecco un esempio base:

```go
// Crea checker di salute
checker := health.NewChecker()

// Monta endpoint di controllo salute
// Questo crea un endpoint GET /health che restituisce lo stato del servizio
mux.Handle("GET", "/health", health.Handler(checker))
```

Con questo setup base, il tuo servizio acquisisce diverse capacità essenziali di
monitoraggio della salute. Ottieni un endpoint standardizzato di controllo della
salute che i sistemi esterni possono interrogare in modo affidabile per verificare
lo stato del tuo servizio. L'endpoint restituisce risposte in formato JSON,
rendendo facile per gli strumenti di monitoraggio analizzare ed elaborare i dati
sulla salute. Il sistema usa codici di stato HTTP standard per indicare chiaramente
se il tuo servizio è in salute o sta riscontrando problemi. Inoltre, aggrega
automaticamente lo stato di tutte le dipendenze del tuo servizio, dandoti una
vista completa della salute del tuo sistema a colpo d'occhio.

## Formato di Risposta

L'endpoint di controllo della salute restituisce una risposta JSON che include lo stato
di tutte le dipendenze monitorate:

```json
{
    "status": {
        "PostgreSQL": "OK",
        "Redis": "OK",
        "PaymentService": "NOT OK"
    },
    "uptime": 3600,
    "version": "1.0.0"
}
```

La risposta include:
- **status**: Mappa dei nomi delle dipendenze al loro stato corrente
- **uptime**: Tempo di attività del servizio in secondi
- **version**: Informazioni sulla versione del servizio

Codici di stato HTTP:
- **200 OK**: Tutte le dipendenze sono in salute
- **503 Service Unavailable**: Una o più dipendenze non sono in salute

## Implementare i Controlli di Salute

Per rendere un servizio o una dipendenza controllabile per la salute, implementa
l'interfaccia `Pinger`. Questa interfaccia è semplice ma potente:

```go
// Interfaccia Pinger
type Pinger interface {
    Name() string                    // Identificatore unico per la dipendenza
    Ping(context.Context) error      // Controlla se la dipendenza è in salute
}

// Controllo salute database
// Esempio di implementazione per un database PostgreSQL
type DBClient struct {
    db *sql.DB
}

func (c *DBClient) Name() string {
    return "PostgreSQL"
}

func (c *DBClient) Ping(ctx context.Context) error {
    // Usa la funzionalità di ping integrata del database
    return c.db.PingContext(ctx)
}

// Controllo salute Redis
// Esempio di implementazione per una cache Redis
type RedisClient struct {
    client *redis.Client
}

func (c *RedisClient) Name() string {
    return "Redis"
}

func (c *RedisClient) Ping(ctx context.Context) error {
    // Usa il comando PING di Redis
    return c.client.Ping(ctx).Err()
}
```

Quando implementi i controlli di salute, ci sono diversi fattori importanti da
considerare. Prima di tutto, i controlli di salute dovrebbero essere leggeri ed
eseguire velocemente per evitare di impattare le prestazioni del tuo servizio.
Questo è particolarmente importante poiché i controlli di salute potrebbero essere
chiamati frequentemente dai sistemi di monitoraggio.

La gestione appropriata dei timeout è anche critica. Ogni controllo di salute
dovrebbe rispettare i timeout passati via context e ritornare prontamente se il
timeout viene raggiunto. Questo previene che i controlli di salute si blocchino
e potenzialmente causino problemi più ampi nel sistema.

I messaggi di errore restituiti dai controlli di salute dovrebbero essere chiari
e azionabili. Quando un controllo fallisce, il messaggio di errore dovrebbe
fornire dettagli sufficienti per gli operatori per comprendere e affrontare
rapidamente il problema. Questo potrebbe includere codici di errore specifici,
stati dei componenti o suggerimenti per il troubleshooting.

Per controlli di salute che sono intensivi in termini di risorse o colpiscono
servizi esterni, considera l'implementazione di un meccanismo di caching. Questo
può aiutare a ridurre il carico mentre fornisce ancora uno stato di salute
ragionevolmente attuale. La durata della cache dovrebbe essere bilanciata
rispetto alle tue necessità di accuratezza - durate più brevi danno risultati
più attuali ma aumentano il carico.

## Servizi Downstream

Monitorare la salute dei servizi downstream è cruciale per i sistemi distribuiti.
Ecco come implementare controlli di salute per diversi tipi di servizi:

```go
// Controllo salute servizio HTTP
type ServiceClient struct {
    name   string
    client *http.Client
    url    string
}

func (c *ServiceClient) Name() string {
    return c.name
}

func (c *ServiceClient) Ping(ctx context.Context) error {
    // Crea richiesta con context per gestione timeout
    req, err := http.NewRequestWithContext(ctx,
        "GET", c.url+"/health", nil)
    if err != nil {
        return err
    }
    
    // Esegui richiesta di controllo salute
    resp, err := c.client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    
    // Controlla stato risposta
    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("servizio non in salute: %d", resp.StatusCode)
    }
    
    return nil
}

// Controllo salute servizio gRPC
type GRPCClient struct {
    name string
    conn *grpc.ClientConn
}

func (c *GRPCClient) Name() string {
    return c.name
}

func (c *GRPCClient) Ping(ctx context.Context) error {
    // Usa protocollo standard di controllo salute gRPC
    return c.conn.Invoke(ctx,
        "/grpc.health.v1.Health/Check",
        &healthpb.HealthCheckRequest{},
        &healthpb.HealthCheckResponse{})
}
```

## Controlli di Salute Personalizzati

Oltre ai controlli di connettività base, puoi implementare controlli di salute
personalizzati per requisiti specifici del business:

```go
// Controllo logica di business personalizzata
type BusinessCheck struct {
    store *Store
}

func (c *BusinessCheck) Name() string {
    return "BusinessLogic"
}

func (c *BusinessCheck) Ping(ctx context.Context) error {
    // Controlla condizioni di business critiche
    ok, err := c.store.CheckConsistency(ctx)
    if err != nil {
        return err
    }
    if !ok {
        return errors.New("rilevata inconsistenza dati")
    }
    return nil
}

// Controllo risorse di sistema
type ResourceCheck struct {
    threshold float64
}

func (c *ResourceCheck) Name() string {
    return "SystemResources"
}

func (c *ResourceCheck) Ping(ctx context.Context) error {
    // Controlla utilizzo memoria
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    memoryUsage := float64(m.Alloc) / float64(m.Sys)
    if memoryUsage > c.threshold {
        return fmt.Errorf("utilizzo memoria troppo alto: %.2f", memoryUsage)
    }
    
    return nil
}
```

## Integrazione con Kubernetes

Configura i controlli di salute del tuo servizio in Kubernetes usando le probe.
Questo esempio mostra sia probe di liveness che di readiness:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myservice
spec:
  template:
    spec:
      containers:
      - name: myservice
        image: myservice:latest
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 3
          periodSeconds: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Best Practice

1. **Controlli delle Dipendenze**:
   - Includi tutte le dipendenze critiche
   - Imposta timeout appropriati
   - Gestisci fallimenti transitori
   - Monitora prestazioni dei controlli

2. **Tempi di Risposta**:
   - Mantieni i controlli leggeri
   - Usa controlli concorrenti
   - Usa cache quando appropriato
   - Monitora latenza dei controlli

3. **Gestione Errori**:
   - Fornisci messaggi di errore chiari
   - Includi contesto degli errori
   - Logga fallimenti dei controlli
   - Allerta su fallimenti ripetuti

4. **Sicurezza**:
   - Proteggi gli endpoint di salute
   - Limita le informazioni esposte
   - Monitora pattern di accesso
   - Usa autenticazione appropriata

## Per Saperne di Più

Per maggiori informazioni sui controlli di salute:

- [Pacchetto Health di Clue](https://pkg.go.dev/goa.design/clue/health)
  Documentazione completa delle capacità di controllo salute di Clue

- [Probe Kubernetes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
  Documentazione ufficiale Kubernetes sulla configurazione delle probe

- [Pattern di Controllo Salute](https://microservices.io/patterns/observability/health-check-api.html)
  Pattern comuni e best practice per API di controllo salute 