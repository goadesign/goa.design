---
title: "Transcript e Parti dei Messaggi"
linkTitle: "Transcript"
weight: 5
description: "Comprendi il modello di transcript di Goa-AI e come semplifica lo stato del planner e dell'UI."
---

## Perché i Transcript Sono Importanti

Goa-AI tratta il **transcript** come la singola fonte di verità per un run: una sequenza ordinata di messaggi e interazioni tool che è sufficiente per:

- ricostruire i payload del provider (Bedrock/OpenAI) per ogni chiamata al modello,
- guidare i planner (inclusi retry e riparazione tool),
- e alimentare UI con una cronologia accurata.

Poiché il transcript è autoritativo, **non** hai bisogno di gestire manualmente:

- liste separate di chiamate tool precedenti e risultati tool,
- strutture "stato conversazione" ad-hoc,
- o copie per-turno di messaggi user/assistant precedenti.

Persisti e passi **solo il transcript**; Goa-AI e i suoi adapter provider ricostruiscono tutto ciò di cui hanno bisogno da quello.

## Messaggi e Parti

Al confine del modello, Goa-AI usa valori `model.Message` (da `runtime/agent/model`) per rappresentare il transcript. Ogni messaggio ha un ruolo (`user`, `assistant`) e una lista ordinata di **parti**:

- **ThinkingPart**  
  Contenuto di ragionamento del provider (plaintext + firma o byte redatti). Non rivolto all'utente; usato per audit/replay e UI "thinking" opzionali.

- **TextPart**  
  Testo visibile mostrato all'utente (domande, risposte, spiegazioni).

- **ToolUsePart**  
  Chiamata tool iniziata dall'assistant:
  - `ID`: identificatore tool_use unico all'interno del run.
  - `Name`: ID tool canonico (separato da punti `service.toolset.tool`).
  - `Input`: payload JSON che corrisponde allo schema del tool.

- **ToolResultPart**  
  Risultato user/tool correlato a un precedente tool_use:
  - `ToolUseID`: l'`ID` del `ToolUsePart` corrispondente.
  - `Content`: payload JSON con il risultato del tool (qualsiasi forma).

L'ordine è sacro:

- Un messaggio assistant che usa tool tipicamente appare come:
  - `ThinkingPart`, poi uno o più `ToolUsePart`, poi `TextPart` opzionale.
- Un messaggio user/tool result tipicamente contiene uno o più `ToolResultPart` che referenziano ID tool_use precedenti, più testo utente opzionale.

Gli adapter provider di Goa-AI (es., Bedrock Converse) re-codificano queste parti in blocchi nativi del provider **senza riordinarle**.

## Il Contratto del Transcript

Il contratto transcript di alto livello in Goa-AI è:

- L'applicazione (o runtime) **persiste ogni evento** per un run in ordine:
  - thinking dell'assistant, testo, tool_use (ID + args),
  - tool_result dell'utente (tool_use_id + content),
  - messaggi assistant successivi, e così via.
- Prima di ogni chiamata al modello, il chiamante fornisce l'**intero transcript** per quel run come `[]*model.Message`, con l'ultimo elemento che è il nuovo delta (testo utente o tool_result).
- Goa-AI re-codifica quel transcript nel formato chat del provider nello stesso ordine, preservando:
  - quali tool sono stati chiamati, con quali input,
  - quali risultati sono stati restituiti, con quali output,
  - e tutto il testo visibile e thinking.

Non c'è **nessuna API separata per "cronologia tool"**; il transcript è la cronologia.

## Come Questo Semplifica Planner e UI

I transcript sbloccano un modello mentale molto più semplice sia per planner che UI:

- **Planner**:
  - Ricevono il transcript corrente in `planner.PlanInput.Messages` e `planner.PlanResumeInput.Messages`.
  - Possono decidere cosa fare basandosi puramente sui messaggi (incluso contenuto tool_use/tool_result precedente), senza threading di stato extra.
  - Quando chiamano tool, il runtime registra quelle chiamate/risultati come `ToolUsePart` / `ToolResultPart` ed estende automaticamente il transcript.

- **UI**:
  - Possono renderizzare cronologia chat, ribbon tool e card agenti dallo stesso transcript sottostante che persistono per il modello.
  - Non servono strutture "tool log" separate; ogni chiamata/risultato tool vive già nel transcript con ID correlati.

- **Adapter provider**:
  - Non indovinano mai quali tool sono stati chiamati o quali risultati appartengono dove; mappano semplicemente parti transcript → blocchi provider.
  - Evitano double-encoding o proiezioni con perdita; il transcript è già pronto per il provider.

In altre parole, una volta persistito il transcript, puoi:

- ri-emettere chiamate al modello (per retry, nuovi prompt, o analisi),
- ricostruire viste UI (chat, debug, audit),
- ed eseguire diagnostica—**senza alcun bookkeeping extra oltre al transcript**.

## Da Dove Vengono i Transcript

Ci sono due modi comuni in cui i transcript vengono costruiti e usati:

- **Dentro i run agenti Goa-AI**  
  Quando usi gli agenti generati e il runtime:
  - Il runtime emette eventi hook (`ToolCallScheduled`, `ToolResultReceived`, `AssistantMessageEvent`, `ThinkingBlockEvent`, ecc.).
  - I subscriber di memoria (`memory.Store`) e/o l'applicazione li persistono come `memory.Event`.
  - Planner e adapter provider vedono il transcript corrente tramite `planner.PlanInput.Messages` / `PlanResumeInput.Messages`.
  - Raramente hai bisogno di toccare `model.Message` direttamente a meno che tu non stia costruendo un client modello custom.

- **Client modello custom / orchestratori esterni**  
  Quando chiami `features/model/*` direttamente:
  - Assembli o carichi il transcript come `[]*model.Message`.
  - Lo passi al client modello ad ogni chiamata; il client gestisce encoding e streaming del provider.
  - Aggiorni il transcript basandoti su parti tool_use/tool_result e testo stremate, poi lo persisti per la prossima chiamata.

Entrambi i percorsi condividono la stessa invariante: il transcript è l'unico stato di cui hai bisogno.

## Transcript e Streaming

Streaming e transcript sono complementari:

- Il **layer di streaming** (`runtime/agent/stream`) emette eventi real-time come `AssistantReply`, `PlannerThought`, `ToolStart`, `ToolEnd`, `AgentRunStarted`, ecc. Questi sono ottimizzati per UI e osservabilità.
- Il **layer transcript** è ottimizzato per **replay e chiamate provider**: registra thinking/text/tool_use/tool_result in forma `model.Message`.

Pattern tipico:

1. Un run esegue; lo stream subscriber invia eventi al tuo sink UI (SSE, WebSocket, Pulse).
2. Un subscriber di memoria scrive eventi durevoli (messaggi, chiamate/risultati tool, note planner, thinking) allo store scelto.
3. Quando devi chiamare di nuovo il modello, ricostruisci `[]*model.Message` per il run dal transcript memorizzato e lo passi al client modello.

Puoi pensare allo stream come "quello che l'utente/operatore vede ora" e al transcript come "quello che il modello vede (e vedrà di nuovo)".

## Linee Guida di Design per Agenti Transcript-Friendly

Per ottenere il massimo dal modello transcript:

- **Correla sempre i risultati tool**  
  Assicurati che le implementazioni tool e i planner preservino gli ID tool_use e mappino i risultati tool al `ToolUsePart` corretto tramite `ToolResultPart.ToolUseID`.

- **Usa schemi forti e descrittivi**  
  Tipi `Args` / `Return` ricchi, descrizioni ed esempi nel tuo design Goa producono payload/risultati tool più chiari nel transcript, che:
  - aiuta gli LLM a riparare chiamate invalide,
  - e rende UI e audit più facili.

- **Lascia che il runtime possieda lo stato**  
  Evita di mantenere array "cronologia tool" paralleli o slice "messaggi precedenti" nel tuo planner. Invece:
  - leggi da `PlanInput.Messages` / `PlanResumeInput.Messages`,
  - e fai affidamento sul runtime per appendere nuove parti thinking/tool_use/tool_result.

- **Persisti i transcript una volta, riusali ovunque**  
  Qualunque store tu scelga (Mongo, in-memory, custom), tratta il transcript come infrastruttura riutilizzabile:
  - lo stesso transcript che supporta chiamate al modello, UI chat, UI debug, e analisi offline.

Per regole dettagliate a livello provider (specialmente i requisiti thinking/tool_use di Bedrock), consulta i doc del runtime Goa-AI nel repo `goa-ai` (es., `docs/runtime.md` e `docs/ui_thinking_rendering.md`).


