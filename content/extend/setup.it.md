+++
title = "Contribuisci a Goa"
weight = 2

[menu.main]
name = "Contribuisci a Goa"
parent = "extend"
+++

# Development Setup

Questa sezione descrive i passi necessari per creare un ambiente di sviluppo per contribuire allo 
sviluppo di Goa.

## 1. Installa Go

Il primo passo è installare la distribuzione di Go. Segui i passi descritti nella 
[Getting Started guide di Go](https://golang.org/doc/install) per sapere come fare.

## 2. Clona la repository di Goa

> Nota: Questo step richiede git, la cui installazione non è documentata qui.

Una volta che Go è installato e la [GOPATH](https://github.com/golang/go/wiki/SettingGOPATH) è impostata, clona Goa:

```bash
cd $GOPATH/src
mkdir -p goa.design
cd goa.design
git clone https://github.com/goadesign/goa
cd goa
git checkout v3
```

## 3. Installa le dipendenze

Ottieni tutti i package da cui Goa dipende:

```bash
go get -v -u ./...
```

## 4. Compila Goa

Installa il tool goa:

```bash
cd cmd/goa
go install .
```

## 5. Testa il setup

Infine, per essere sicuri che sia tutto impostato correttamente esegui i test:

```bash
cd $GOPATH/src/goa.design/goa
make
```

## 6. Sviluppa

Ora hai una installazione di Goa completa e sei pronto per un pò di hacking!
Se non lo hai ancora fatto, dovresti unirti al nostro 
[channel](https://gophers.slack.com/messages/goa/) Slack (Iscriviti
[qui](https://gophersinvite.herokuapp.com/)) per fare domande.

Una volta che sei pronto ad aggiungere le tue modifiche apri semplicemente una 
[PR](https://help.github.com/en/articles/about-pull-requests) alla nostra repository
Github, qualcuno revisionera i tuoi cambiamenti proposti e ti darà un feedback.
Puoi trovare maggiori informazioni su come contribuire nella [repository](https://github.com/goadesign/goa/blob/v3/CONTRIBUTING.md).
