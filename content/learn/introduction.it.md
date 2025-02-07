+++
title = "Introduzione a Goa"
weight = 1

[menu.main]
name = "Introduzione"
parent = "learn"
+++

## Cosa è Goa?

Goa è un framework Go per la scrittura di microservizi, che propone le best 
practice grazie a una singola fonte di verità, da cui vengono creati il codice
di server e client, e la documentazione. Il codice generato da Goa segue il 
pattern chiamato clean architecture dove moduli componibili sono generati per
trasporto dei dati, endpoint e logica di business. Il package Goa contiene
anche middleware, plugin e altre funzionalità complementari che possono far
leva su loro stessi a vicenda, similmente a un tandem. Usando Goa per lo 
sviluppo, chi implementa non si deve preoccupare della documentazione non 
aggiornata, dato che Goa si prende carico della creazione di specifiche
OpenAPI sia per servizi HTTP che gRPC. I revisori del codice e i suoi
fruitori sono anche assicurati dal fatto che codice e documentazione 
vengano generati dalla stessa sorgente.

## Separazione dei livelli

Dalla v2 il DSL a Goa permette di descrivere i servizi in un trasporto
modo agnostico.
I DSL dei service methods descrivono gli input e gli output, mentre i DSL
di trasporto descrivono come il metodo stesso viene costruito dai dati in arrivo
e come l'output viene serializzato.
Per esempio, un metodo può specificare che accetta un oggetto composto di due
campi come input e il DSL specifico HTTP può specificare da che parti della 
richiesta leggere i valori (header oppure corpo della richiesta oppure altro).

Questo disaccoppiamento completo significa che lo stesso servizio può essere 
implementato su diversi livelli di trasporto, come HTTP o gRPC. Goa si prende
carico di tutto il codice transport-specific come codifica, decodifica e 
validazione. Lo sviluppatore deve semplicemente implementare la logica 
effettiva dei metodi.

## Tipi di dato base

I tipi primitivi includono `Int`, `Int32`, `Int64`, `UInt` `UInt32`, `UInt64`,
`Float32`, `Float64` e `Bytes`. Ciò rende possibile supportare livelli di trasporto
come gRPC, ma anche di definire interfacce HTTP migliori di come farebbe un JSON 
nudo e crudo.

## Generazione componibile di codice

La generazione di codice ora consiste in un processo a 2 fasi, dove la prima
consiste in un set di writers, esponente ognuno i propri template che possono 
essete ulteriormente modificati prima di eseguire la seconda, che crea il set
finale di artefatti. Ciò rende possibile creare dei plugin che alterano il 
codice generato di default.

## Quale è la differenza fra Goa v2 e Goa v1?

* Goa v2 è **componibile**. Il package, la generazione di codice e il codice
  generator sono più modulari e vengono fatte meno assunzioni rispetto a quelle
  che faceva la v1.
* Un microservizio progettato con Goa v2 è **transport-agnostic**. IL disaccoppiamento
  del livello di trasporto dalla effettiva implementazione del servizio significa che
  lo stesso servizio può esporre differenti livelli come HTTP e/o gRPC senza problemi.
  Goa v2 si occupa di generare tutto il codice specifico ai livelli di trasporto
  usati, inclusi codifica, decodifica e validazione di richieste e risposte. Goa
  v1 funzionava solamente con il livello di trasporto HTTP.
* Il codice generato segue una **stretta separazione dei concetti** dove l'effettiva
  implementazione è isolata dal livello di trasporto. Lo sviluppatore deve
  concentrarsi solamente sull'implementazione della logica di business.
* Goa v2 genera codice che **si basa per lo più su standard ufficiali Go**
  rendendo semplice l'interoperabilità con codice esterno.
* Il plugin [goa-kit](https://github.com/goadesign/plugins/tree/v3/goakit) permette di
  generare package go-kit a partire dai design Goa.

## Quale è la differenza fra Goa v3 e Goa v2?

* Goa v3 richiede e supporta i moduli Go.