---
title: Tool Payload Defaults
linkTitle: Tool Payload Defaults
weight: 9
description: "How Goa-AI applies Goa-style defaults to tool payloads (decode-body + transform) and what codegen contracts must hold."
llm_optimized: true
aliases:
---

Goa-AI génère à partir de votre design Goa des **structures typées pour les charges utiles d'outils**, des **schémas JSON** et des **codecs**. Cette page décrit un comportement essentiel : **l'application des valeurs par défaut aux charges utiles d'outils**, et la raison pour laquelle elle dépend de la représentation des champs par pointeur ou par valeur.

Cette implémentation suit le modèle HTTP de Goa : **décodage du corps → transformation**.

## Arguments du modèle et données d'exécution

Un outil peut accepter moins d'arguments du modèle que son exécuteur n'en exige.
Chaque entrée possède son propre schéma JSON et son codec (les fonctions
générées qui valident, décodent et encodent cette entrée) :

- `ToolSpec.Payload.Codec` correspond à `Payload.Schema` et à l'exemple
  défini dans le design. Il valide les arguments rédigés par le modèle.
- `ToolSpec.ExecutionPayloadCodec` correspond à `ExecutionPayloadSchema`.
  Il traite les données complètes d'exécution et restaure le travail sauvegardé.

Pour un outil de continuation qui conserve la requête initiale, le modèle envoie `{}` pour demander
la page suivante. Avant l'exécution, le runtime restaure la requête initiale et
le curseur du fournisseur. Le codec du modèle accepte donc `{}`, tandis que
le codec d'exécution exige les champs conservés de la requête et le curseur.
Un exemple vide ne doit pas empêcher l'enregistrement de l'outil simplement
parce que son exécution nécessite ces champs supplémentaires.

Les deux codecs sont obligatoires à l'enregistrement. Si les deux entrées ont
la même structure, le générateur réutilise une seule implémentation. Les champs
déclarés avec `Inject` n'apparaissent dans aucune des deux entrées JSON ;
le fournisseur les renseigne à partir du contexte d'exécution. Les codecs de
charges utiles typées et les descripteurs d'outils typés générés représentent
toujours les données d'exécution. Un codec du modèle peut renvoyer le même type
Go avec des champs encore non renseignés que le runtime fournira ; cette valeur
n'est pas encore prête à être exécutée.

### Mise à jour des spécifications d'outils

Régénérez les spécifications avec le framework mis à jour avant de démarrer les
workers. Les spécifications écrites à la main doivent aussi fournir
`ExecutionPayloadCodec`, avec son encodeur et son décodeur. Les consommateurs
qui décodent des données exécutées ou sauvegardées doivent utiliser ce codec ;
la validation des entrées du modèle continue d'utiliser `Payload.Codec`.
L'exécution ne se rabat pas sur le codec du modèle.

Ce changement concerne le contrat Go dans le processus, pas les messages du
registre, les schémas du modèle ni les formats des données sauvegardées.
Aucune migration des formats d'échange ou des données stockées n'est nécessaire.

## Résumé

- **Décoder le JSON dans un type auxiliaire** dont les champs sont des pointeurs (la forme « decode-body ») afin que le codec distingue une valeur **absente** d'une valeur **nulle**.
- **Transformer le type auxiliaire en charge utile finale** avec `codegen.GoTransform` de Goa.
- Pour les **charges utiles d'outils**, la structure finale respecte la sémantique des valeurs par défaut de Goa : les primitives facultatives assorties d'une valeur par défaut peuvent devenir des **valeurs** (et non des pointeurs), ce qui permet à `GoTransform` d'injecter les valeurs par défaut de manière déterministe.

Si ces contextes ne correspondent pas, le générateur peut produire des tests de nil ou des affectations invalides, et le code généré ne compile pas.

## Les deux représentations

### 1) Type auxiliaire de décodage JSON (champs pointeurs)

Le JSON entrant est décodé dans une structure auxiliaire dont les champs primitifs sont des pointeurs :

- champ absent → `nil`
- champ fourni → pointeur non nil

Cette représentation sert à :

- vérifier les champs obligatoires ;
- attribuer précisément les erreurs de validation ;
- déterminer si l'appelant a fourni un champ.

### 2) Type final de la charge utile (avec valeurs par défaut)

Le type final de la charge utile est celui que consomment les adaptateurs et les exécuteurs.

Pour les charges utiles, les primitives facultatives assorties d'une valeur par défaut sont générées sous forme de **valeurs**, afin que la transformation applique les valeurs par défaut de manière déterministe.

## Application des valeurs par défaut

Les valeurs par défaut sont appliquées pendant la **transformation du type auxiliaire vers la charge utile** :

- le type auxiliaire contient des pointeurs `nil` pour les champs absents ;
- la charge utile cible utilise des représentations compatibles avec les valeurs par défaut ;
- `codegen.GoTransform` de Goa génère le code qui :
  - copie les valeurs lorsque les pointeurs du type auxiliaire ne sont pas nil ;
  - affecte les littéraux par défaut lorsque ces pointeurs sont nil et qu'une valeur par défaut existe.

## Validation à la frontière et erreurs de contrat

Les codecs d'outils générés constituent la frontière entre le JSON produit par
le modèle et les valeurs typées Goa-AI. Ils ne se contentent pas d'appeler
`json.Unmarshal` :

- les charges utiles et résultats qui sont des objets fermés refusent les
  champs inconnus ;
- un champ inconnu produit un problème structuré `unknown_field` qui indique
  les clés autorisées à cet emplacement ;
- une incompatibilité de type JSON produit un problème structuré
  `invalid_field_type` contenant les noms générés des types JSON attendu et
  observé ;
- les codecs de résultats limités n'acceptent que les champs sémantiques du
  résultat et les champs limités canoniques de Goa-AI (`returned`, `total`,
  `truncated`, `refinement_hint` et, facultativement, `next_cursor`).

Un appel produit par le modèle qui ne respecte pas ce contrat est refusé avant
d'atteindre le planificateur ou l'exécuteur. Le client de modèle validé renvoie
`model.OutputValidationError`, puis le planificateur ou le runtime présente
l'échec sous forme de `planner.OutputContractError`, sans lancer de requête de
correction. Pour un appel construit par le planificateur,
`planner.NewToolRequest` renvoie directement l'erreur d'encodage.

La récupération structurée commence seulement après l'admission d'une charge
utile valide. Si l'exécuteur ou la frontière du domaine refuse ensuite
l'opération, il peut renvoyer un `ToolFailure` avec une `RecoveryDirective`.
Le runtime applique alors cette directive au tour suivant du planificateur.

## Contrat des mainteneurs du générateur (à préserver)

Toute modification du générateur qui touche l'un des éléments suivants :

- matérialisation du type de charge utile d'outil ;
- génération du type auxiliaire de décodage ;
- métadonnées de clés des objets fermés et enrichissement de la validation ;
- transformations des adaptateurs (charge utile d'outil → charge utile de méthode de service) ;

doit conserver une sémantique cohérente des valeurs par défaut entre :

- la génération du type de charge utile d'outil ;
- les codecs et transformations générés qui lisent ses champs.

Dans le cas contraire, le générateur de transformations de Goa peut produire du code qui ne compile pas, par exemple :

- `if in.Field != nil { ... }` lorsque `Field` est une valeur ;
- `out.Field = "x"` lorsque `Field` est un `*T`.
