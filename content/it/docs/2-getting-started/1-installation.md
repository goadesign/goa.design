---
title: Installazione
weight: 1
description: "Guida passo-passo all'installazione di Goa e alla configurazione del tuo ambiente di sviluppo, inclusi prerequisiti e passi di verifica."
---

## Prerequisiti

Goa richiede l'uso dei **moduli Go**, quindi assicurati che siano abilitati nel tuo ambiente Go.

- Usa **Go 1.18+** (raccomandato).
- Abilita i **Moduli Go**: Conferma che siano abilitati nel tuo ambiente (es., `GO111MODULE=on` o usando le impostazioni predefinite di Go 1.16+).

## Installa Goa

```bash
# Scarica i package di Goa
go get goa.design/goa/v3/...

# Installa la CLI di Goa
go install goa.design/goa/v3/cmd/goa@latest

# Verifica l'installazione
goa version
```

Dovresti vedere la versione corrente di Goa (es., `v3.x.x`).

---

Continua con [Primo Servizio](./2-first-service/) per imparare come creare il tuo primo servizio. 