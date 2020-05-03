+++
title = "Domande Frequenti"
weight = 3

[menu.main]
name = "FAQ"
parent = "learn"
+++

# Quando vengono effettivamente applicate le validazioni definite nel design?

C'è un trade-off fra performance e robustezza quando si parla di applicare una validazione
definita nel design. Goa assume che il codice scritto dallo sviluppatore "faccia 
le cose giuste" e valida solo i dati che arrivano da fuori ("input"). Questo 
significa che Goa valida tutte le richieste server-side e le risposte 
client-side. In questo modo è garantito un dato valido allo sviluppatore,
ma non ci sono pecche di performance.

# Quando un campo di una struct generata è un puntatore?

Ci sono un po' di considerazioni fatte dal generatore di codice per quanto 
riguarda questo. L'obiettivo è di evitare di usare i puntatori quando
non è necessario poiché tendono a rendere il codice complesso e forniscono
la possibilità di errori. Questa affermazione tuttavia vale solo per i tipi
primitivi: gli array e le map non usano mai puntatori.

L'idea generale è che se un attributo specificato è obbligatorio o ha un valore
di default (e di conseguenza il suo valore non può mai essere `nil`) tale
attributo non ha bisogno di essere un puntatore. Tuttavia il codice generato che
decodifica richieste o risposte HTTP deve tenere conto che questi campi potrebbero 
mancare (in caso di risposta malformata, ad esempio) quindi devono usare strutture
dati che al loro interno hanno dei puntatori per tutti i campi, per controllare 
che non siano `nil`.

La seguente tabella elenca quando un attributo di un tipo generato usa i puntatori
 (\*) o direttamente valori (-).

* (s) : struttura dati generata per il server
* (c) : struttura dati generata per il client

| Proprietà / Struttura Dati  | Payload / Result | Req. Body (s) | Resp. Body (s) | Req. Body (c) | Resp. Body (c) |
------------------------------|------------------|---------------|----------------|---------------|----------------|
| Required OPPURE Default     | -                | *             | -              | -             | *              |
| No Required, No Default     | *                | *             | *              | *             | *              |

# Come sono usati i valori di default?

Il DSL permette di specificare i valori di default per gli attributi. Tali valori
vengono usati in 2 fasi dai generatori di codice.

Durante la generazione del codice di codifica (server-side per la codifica della
risposta o client-side per la codifica della richiesta) i valori di default sono
usati per inizializzare i capi qualora fossero `nil`. Come discusso nella sezione
precedente questo non può avvenire se l'attributo è un tipo primitivo, visto che
in questi casi il campo non è un puntatore. Può tuttavia capitare per array e map.

Durante la generazione del codice di decodifica (server-side per la decodifica
della richiesta in arrivo e client-side per la decodifica della risposta) i valori
di default vengono usati per inizializzare i campi mancanti. Nota che se l'attributo
è obbligatorio il generatore di codice ritorna un errore. Quindi il valore di
default si applica solo ai valori non obbligatori. Per gli endpoint gRPC, il 
valore di default durante la decodifica varia poiché il protocol buffer v3 imposta
un default value (tipicamente uno zero-value) per i campi mancanti quando avviene
la codifica del messaggio. Vedi https://developers.google.com/protocol-buffers/docs/proto3#default
per maggiori informazioni. Diventa impossibile sapere quando questi zero-values
sono impostati dall'applicazione o dal protocol buffer. Oltretutto, durante la
decodifica di un messaggio protocol buffer, goa imposta il suo valore solamente
per i campi opzionali e solamente se il messaggio contiene uno zero-value per
quel campo. Gli attributi opzionali di tipo boolean sono un eccezione, se durante
la decodifica non vengono impostati valori di default per gli attributi.
Gli attributi obbligatori e hanno valori di default hanno il loro valore impostato
al default qualora ci sia uno zero-value.

# Come vengono decodificati gli attributi opzionali in gRPC?

Protocol buffer v3 non differenzia fra attributi opzionali e obbligatori
(vedi https://developers.google.com/protocol-buffers/docs/proto3#default).
Diventa quindi impossibile sapere se gli zero-value sono impostati dall'applicazione
o dal protocol buffer. Durante la generazione di codice di decodifica (server-side
per decodificare le richieste protocol buffer e client-side per le risposte),
gli attributi opzionali sono impostati a valori non-nil solamente se i campi
protocol buffer corrispondenti non sono zero-values. Gli attributi opzionali
di tipo booleano sono un'eccezione, per esempio se gli attributi sono impostati
a `false` (zero-value del tipo booleano), la decodifica imposta i campi 
corrispondenti a uno zero-value.

# Come vengono calcolati i Result Types?

Le viste possono essere definite su un result type. Se un metodo ritorna un 
result type:
* il service method ritorna una vista extra insieme al result e un errore se
  il result type ha più di una vista. La funzione di endpoint generata usa
  questa vista per generare un result type.
* un package di una vista viene generato a livello di servizio che definisce un
  result type per ogni risultato del metodo. Questo result type ha gli stessi
  nomi dei campi e tipi ma usa puntatori per tutti i campi in modo che la 
  logica di validazione può essere generata. I costruttori vengono generati in
  un service package per convertire un result type in un result type con vista
  e viceversa.

La risposta server-side viene codificata nel tipo ritornato dall'endpoint
omettendo tutti gli attributi con valori nulli.
La vista usata per renderizzare il result type viene passata al client 
nell'header "Goa-View".

La risposta client-side viene decodificata nel client type che viene trasformato
nel result type adatto leggendo l'header "Goa-View". Esso permette la validazione
da un result type con vista a un result type corretto con il costruttore corretto.

>NOTA: Se un result type viene definito senza viste, una view "default" viene aggiunta
>automaticamente da goa. Se non vuoi usare le viste, puoi definire un method
>result usando il DSL `Type` che bypassera le logiche specifiche per le viste.
