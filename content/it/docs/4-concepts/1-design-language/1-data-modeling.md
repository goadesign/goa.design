---
title: "Modellazione dei Dati"
linkTitle: "Modellazione dei Dati"
weight: 1
description: >
  Definisci le strutture dati del tuo servizio usando il sistema di tipi completo di Goa. Crea definizioni di tipo che corrispondono al tuo modello di dominio garantendo l'integrità dei dati attraverso regole di validazione e vincoli.
---

Goa fornisce un potente sistema di tipi che ti permette di modellare il tuo dominio con precisione e chiarezza. Dai primitivi semplici alle strutture nidificate complesse, il DSL offre un modo naturale per esprimere relazioni tra dati, vincoli e regole di validazione.

## Tipi Base

La fondazione del sistema di tipi di Goa inizia con i tipi primitivi e le definizioni di tipo base. Questi blocchi di costruzione ti permettono di creare strutture dati semplici ma espressive.

### Tipi Primitivi
Goa fornisce un ricco set di tipi primitivi integrati che servono come fondamento per tutta la modellazione dei dati:

```go
Boolean  // booleano JSON
Int      // intero con segno
Int32    // intero con segno a 32 bit
Int64    // intero con segno a 64 bit
UInt     // intero senza segno
UInt32   // intero senza segno a 32 bit
UInt64   // intero senza segno a 64 bit
Float32  // numero in virgola mobile a 32 bit
Float64  // numero in virgola mobile a 64 bit
String   // stringa JSON
Bytes    // dati binari
Any      // valore JSON arbitrario
```

### Definizione di Tipo
La funzione DSL Type è il modo principale per definire tipi di dati strutturati. Supporta attributi, validazioni e documentazione:

```go
var Person = Type("Person", func() {
    Description("Una persona")
    
    // Attributo base
    Attribute("name", String)
    
    // Attributo con validazione
    Attribute("age", Int32, func() {
        Minimum(0)
        Maximum(120)
    })
    
    // Campi obbligatori
    Required("name", "age")
})
```

## Tipi Complessi

Quando si modellano domini del mondo reale, spesso si necessita di strutture dati più sofisticate. Goa fornisce un supporto completo per collezioni e tipi nidificati.

### Array
Gli array ti permettono di definire collezioni ordinate di qualsiasi tipo, con regole di validazione opzionali:

```go
var Names = ArrayOf(String, func() {
    // Valida elementi dell'array
    MinLength(1)
    MaxLength(10)
})

var Team = Type("Team", func() {
    Attribute("members", ArrayOf(Person))
})
```

### Mappe
Le mappe forniscono associazioni chiave-valore con type safety e validazione sia per le chiavi che per i valori:

```go
var Config = MapOf(String, Int32, func() {
    // Validazione chiave
    Key(func() {
        Pattern("^[a-z]+$")
    })
    // Validazione valore
    Elem(func() {
        Minimum(0)
    })
})
```

## Composizione dei Tipi

Goa supporta pattern sofisticati di composizione dei tipi che abilitano il riuso del codice e una chiara separazione delle responsabilità.

### Reference
Usa Reference per impostare proprietà predefinite per gli attributi da un altro tipo. Quando un attributo nel tipo corrente ha lo stesso nome di uno nel tipo referenziato, eredita le proprietà dell'attributo referenziato. Possono essere specificate multiple reference, con le proprietà cercate nell'ordine di apparizione:

```go
var Employee = Type("Employee", func() {
    // Riusa definizioni di attributi da Person
    Reference(Person)
    Attribute("name") // Non serve definire l'attributo name di nuovo
    Attribute("age")  // Non serve definire l'attributo age di nuovo

    // Aggiungi nuovi attributi
    Attribute("employeeID", String, func() {
        Format(FormatUUID)
    })
})
```

### Extend

`Extend` crea un nuovo tipo basato su uno esistente, perfetto per modellare
relazioni gerarchiche. A differenza di `Reference`, `Extend` eredita automaticamente
tutti gli attributi dal tipo base.

```go
var Manager = Type("Manager", func() {
    // Estendi tipo base
    Extend(Employee)
    
    // Aggiungi campi specifici del manager
    Attribute("reports", ArrayOf(Employee))
})
```

## Regole di Validazione

Goa fornisce capacità di validazione complete per assicurare l'integrità dei dati e applicare regole di business:
Ecco le regole di validazione chiave disponibili in Goa:

### Validazioni String
- `Pattern(regex)` - Valida contro un'espressione regolare
- `MinLength(n)` - Lunghezza minima stringa
- `MaxLength(n)` - Lunghezza massima stringa
- `Format(format)` - Valida contro formati predefiniti (email, URI, ecc)

### Validazioni Numeriche
- `Minimum(n)` - Valore minimo (inclusivo)
- `Maximum(n)` - Valore massimo (inclusivo)
- `ExclusiveMinimum(n)` - Valore minimo (esclusivo)
- `ExclusiveMaximum(n)` - Valore massimo (esclusivo)

### Validazioni Array e Mappe
- `MinLength(n)` - Numero minimo di elementi
- `MaxLength(n)` - Numero massimo di elementi

### Validazioni Oggetti
- `Required("field1", "field2")` - Campi obbligatori

### Validazioni Generiche
- `Enum(value1, value2)` - Restringe a valori enumerati

Inoltre gli elementi di array e mappe possono essere validati usando le stesse regole
degli attributi.

Le regole di validazione possono essere combinate per creare logica di validazione completa:

```go
var UserProfile = Type("UserProfile", func() {
    Attribute("username", String, func() {
        Pattern("^[a-z0-9]+$") // Pattern regex
        MinLength(3)           // Lunghezza minima stringa
        MaxLength(50)          // Lunghezza massima stringa
    })
    
    Attribute("email", String, func() {
        Format(FormatEmail)    // Formato integrato
    })
    
    Attribute("age", Int32, func() {
        Minimum(18)            // Valore minimo
        ExclusiveMaximum(150)  // Valore massimo esclusivo
    })
    
    Attribute("tags", ArrayOf(String, func() { Enum("tag1", "tag2", "tag3") }), func() {
                              // Valori enum per elementi array
        MinLength(1)          // Lunghezza minima array
        MaxLength(10)         // Lunghezza massima array
    })
    
    Attribute("settings", MapOf(String, String), func() {
        MaxLength(20)         // Lunghezza massima mappa
    })

    Required("username", "email", "age") // Campi obbligatori
})
```

## Tipi Personalizzati

Crea tipi personalizzati riutilizzabili per incapsulare formati specifici del dominio e regole di validazione:

```go
// Definisci formato personalizzato
var UUID = Type("UUID", String, func() {
    Format(FormatUUID)
    Description("UUID RFC 4122")
})

// Usa tipo personalizzato
var Resource = Type("Resource", func() {
    Attribute("id", UUID)
    Attribute("name", String)
})
```

Vedi il [DSL Type](https://pkg.go.dev/goa.design/goa/v3/dsl#Type) per maggiori dettagli.

## Formati Integrati

Goa include un set completo di formati predefiniti per pattern di dati comuni. Questi formati forniscono validazione automatica e chiaro significato semantico:

- `FormatDate` - valori data RFC3339
- `FormatDateTime` - valori data e ora RFC3339
- `FormatUUID` - valori UUID RFC4122
- `FormatEmail` - indirizzi email RFC5322
- `FormatHostname` - nomi host Internet RFC1035
- `FormatIPv4` - valori indirizzo IPv4 RFC2373
- `FormatIPv6` - valori indirizzo IPv6 RFC2373
- `FormatIP` - valori indirizzo IPv4 o IPv6 RFC2373
- `FormatURI` - valori URI RFC3986
- `FormatMAC` - valori indirizzo MAC IEEE 802 MAC-48, EUI-48 o EUI-64
- `FormatCIDR` - valori indirizzo IP in notazione CIDR RFC4632 e RFC4291
- `FormatRegexp` - sintassi espressione regolare accettata da RE2
- `FormatJSON` - testo JSON
- `FormatRFC1123` - valori data e ora RFC1123

## DSL Attribute vs Field

Goa fornisce due modi equivalenti per definire attributi di tipo: `Attribute` e `Field`. La differenza principale è che `Field` prende un parametro tag aggiuntivo che viene usato per i numeri di campo dei messaggi gRPC.

### DSL Attribute
Usato quando non hai bisogno del supporto gRPC o quando definisci tipi che non saranno usati nei messaggi gRPC:

```go
var Person = Type("Person", func() {
    Attribute("name", String)
    Attribute("age", Int32)
})
```

### DSL Field
Usato quando si definiscono tipi che saranno usati nei messaggi gRPC. Il primo argomento è il tag numero di campo:

```go
var Person = Type("Person", func() {
    Field(1, "name", String)
    Field(2, "age", Int32)
})
``` 