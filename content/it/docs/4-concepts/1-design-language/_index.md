---
title: "Linguaggio di Design"
linkTitle: "Linguaggio di Design"
weight: 1
---

Scopri il Linguaggio di Design (DSL) di Goa, un potente linguaggio specifico di dominio per definire le API. Il DSL ti permette di esprimere il design del tuo servizio in modo chiaro e dichiarativo, applicando le migliori pratiche e mantenendo la coerenza.

## Concetti Chiave

### 1. [Modellazione dei Dati](./1-data-modeling)

Definisci le strutture dati del tuo servizio usando il sistema di tipi completo di Goa. Crea definizioni di tipo con attributi che corrispondono al tuo modello di dominio e aggiungi regole di validazione e vincoli per garantire l'integrità dei dati. Estendi il sistema di tipi con tipi personalizzati per gestire formati di dati specializzati. Usa la composizione e l'ereditarietà dei tipi per costruire strutture dati complesse da componenti più semplici, mantenendo una chiara separazione e riutilizzabilità.

### 2. [Definizione dell'API](./2-api)

Definisci le proprietà fondamentali della tua API inclusi metadati, server e impostazioni globali. Configura le impostazioni a livello di API come versioning, documentazione, schemi di sicurezza e termini di servizio. La definizione dell'API serve come punto di ingresso per il design del tuo servizio e stabilisce le fondamenta per tutti gli altri componenti.

### 3. [Servizi e Metodi](./3-services-methods)

Progetta l'interfaccia del tuo servizio definendo i componenti fondamentali della tua API. Crea definizioni di servizio che incapsulano funzionalità correlate e stabiliscono confini chiari. Specifica metodi che rappresentano operazioni discrete, completi di parametri di input e output attesi. Definisci payload di richiesta e risposta per modellare il flusso dei dati attraverso il tuo servizio. Implementa pattern completi di gestione degli errori per gestire elegantemente gli scenari di fallimento e fornire feedback significativi ai client.

### 4. [Mappatura dei Trasporti](./4-transport-mapping)

Configura come il tuo servizio comunica su diversi protocolli di trasporto. Definisci endpoint HTTP con routing flessibile, metodi di richiesta e codici di risposta. Mappa i metodi del tuo servizio su procedure gRPC con definizioni di messaggi protocol buffer. Gestisci vari tipi di contenuto attraverso encoder/decoder integrati e personalizzati. Imposta pattern di percorso intuitivi e binding di parametri di query che corrispondono ai requisiti della tua API.

### 5. [Sicurezza](./5-security)

Implementa misure di sicurezza robuste per la tua API usando il DSL di sicurezza di Goa. Definisci schemi di autenticazione inclusi Basic Auth, API Keys, JWT e OAuth2. Configura requisiti di autorizzazione a livello di API, servizio e metodo. Specifica ambiti e requisiti di sicurezza per un controllo degli accessi granulare. Gestisci la comunicazione sicura attraverso la configurazione della sicurezza a livello di trasporto (TLS).

Padroneggiando il Linguaggio di Design di Goa, sarai in grado di:
- Creare definizioni di API chiare e manutenibili
- Assicurare implementazioni di servizio coerenti
- Generare codice pronto per la produzione
- Supportare multipli protocolli di trasporto
- Implementare misure di sicurezza robuste

---

Inizia con [Modellazione dei Dati](./1-data-modeling) per imparare come definire i tipi e le strutture del tuo servizio. 