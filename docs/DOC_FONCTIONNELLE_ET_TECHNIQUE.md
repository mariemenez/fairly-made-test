# Documentation fonctionnelle et technique — Traçabilité produits

> Document de préparation à la restitution. Il décrit **ce que fait l'application**
> (partie fonctionnelle), **comment le code le fait, fichier par fichier** (partie
> technique), puis **les limites connues** et **les questions probables du debrief**.
>
> Tout ce qui est écrit ici a été vérifié sur le code du dépôt : les 17 tests passent,
> et les scénarios de refresh ont été rejoués sur l'API lancée.

---

## Sommaire

1. [L'idée en une phrase](#1-lidée-en-une-phrase)
2. [Documentation fonctionnelle](#2-documentation-fonctionnelle)
   - 2.1 Vocabulaire
   - 2.2 Les trois écrans
   - 2.3 Les scénarios de l'énoncé : couverts ou non
   - 2.4 Les règles métier, une par une
   - 2.5 Les données et les refresh de test
   - 2.6 Déroulé complet d'une démo, état par état
3. [Documentation technique](#3-documentation-technique)
   - 3.1 Architecture et stack
   - 3.2 Arborescence commentée
   - 3.3 Le modèle de données (`types.ts`)
   - 3.4 Le domaine, fonction par fonction
   - 3.5 Le back NestJS
   - 3.6 Référence de l'API REST
   - 3.7 Le front Nuxt
   - 3.8 Les tests
   - 3.9 Les flux de bout en bout (séquences)
4. [Limites, bugs et dettes connus](#4-limites-bugs-et-dettes-connus)
5. [Préparer le debrief : questions probables et réponses](#5-préparer-le-debrief--questions-probables-et-réponses)
6. [Antisèche React / Express → Vue / Nuxt / Nest](#6-antisèche-react--express--vue--nuxt--nest)

---

## 1. L'idée en une phrase

**L'arbre que voit l'utilisatrice n'est jamais stocké : il est recalculé à chaque
lecture en posant les corrections de la marque (stockées à part) par-dessus le dernier
arbre déclaré par les fournisseurs. Une version publiée est une copie figée de ce
résultat.**

L'image à retenir : **un calque posé sur un plan**.

```
   Corrections de la marque   ── le calque (stocké à part, ne bouge pas au refresh)
            +
   Dernier arbre déclaré      ── le plan (remplacé en entier à chaque refresh)
            =
   Arbre de travail           ── ce qu'on affiche (calculé, jamais stocké)
            │
            └── « Publier » ──► Version N  (copie figée, gelée, jamais modifiée)
```

Conséquences directes :

- Un refresh **remplace le plan**, pas le calque → les corrections survivent
  automatiquement, au 1er comme au 10e refresh.
- Une version publiée est **stockée séparément** de l'arbre de travail → un refresh
  ne peut pas la modifier.
- Chaque valeur affichée sait **d'où elle vient** (`DECLARED` ou `CORRECTED`), parce
  que c'est le calcul qui la produit qui le sait.

---

## 2. Documentation fonctionnelle

### 2.1 Vocabulaire

| Terme | Sens dans l'application |
|---|---|
| **Arbre de traçabilité** | Produit → composants → matières. Chaque élément porte des *étapes* de production. |
| **Élément** (*item*) | Un nœud de l'arbre : `PRODUCT` (racine), `COMPONENT` (tissu, col, fil, étiquette…) ou `MATERIAL` (coton, élasthanne…). |
| **Étape** (*step*) | Une opération de production (tricotage, teinture, coupe…) avec, si on le sait, un **fournisseur** et un **pays**. `null` = inconnu. |
| **Composition** | Pour un composant : la liste `matière / % / pays d'origine`. **Doit faire 100 %.** |
| **Arbre déclaré** | L'arbre tel que le système de collecte l'envoie (issu des formulaires fournisseurs). |
| **Refresh** | L'arrivée d'un nouvel arbre déclaré **complet** pour un produit (jamais un patch). |
| **Correction** | Une modification faite par la marque dans l'app. Stockée à part, ciblée par id. |
| **Arbre de travail** | Arbre déclaré courant + corrections. C'est ce que l'utilisatrice voit et édite. |
| **Version publiée** | Copie figée et numérotée (v1, v2…) de l'arbre de travail à un instant donné. |
| **Provenance** | Pour chaque valeur : `DECLARED` (vient du fournisseur) ou `CORRECTED` (vient de la marque). |
| **Statut d'une correction** | `APPLIED`, `CONFLICT` ou `ORPHANED` (voir §2.4). |

### 2.2 Les trois écrans

#### Écran 1 — Liste des produits (`/`, fichier `pages/index.vue`)

Un tableau, une ligne par produit :

| Colonne | Contenu | Source |
|---|---|---|
| Produit | Nom (lien vers l'arbre de travail) + référence | `ProductSummary.name / reference` |
| Saison | ex. `SS26` | `season` |
| Dernière version publiée | « Version N » + date, ou « Jamais publié » | `lastVersion` |
| État | Tag jaune « Modifications à publier » ou vert « À jour » | `hasUnpublishedChanges` |
| Dernière modification | Date de la dernière correction ou du dernier refresh accepté | `lastModifiedAt` |
| (lien) | « Versions » → page des versions | — |

→ Couvre entièrement le scénario *Browse my trees*.

#### Écran 2 — Arbre de travail d'un produit (`/products/:id`, fichier `pages/products/[productId]/index.vue`)

En-tête :
- Nom, référence, saison ; tag « vN publiée » ou « Jamais publié » ; tag « Modifications à publier » si besoin.
- Bouton **« Simuler un refresh »** : applique le prochain fichier de `data/refreshes/` pour ce produit.
- Bouton **« Publier une version »** : **désactivé** si une composition est invalide **ou** si rien n'a changé depuis la dernière version.

Alertes (sous l'en-tête) :
- Rouge : « Publication bloquée : une composition est invalide ».
- Orange : une ligne par **correction orpheline** (« l'élément concerné a été retiré par le fournisseur ») avec un bouton **Supprimer**.

Corps :
- **« Assemblage du produit »** : tableau des étapes de la racine.
- **« Composants »** : une carte par composant, avec :
  - en-tête : catégorie d'usage (tag) + « X % du produit » ;
  - **Composition** : tableau matière / part / origine, bouton **« Corriger la composition »** ;
  - **Étapes de production** : tableau étape / fournisseur / pays ;
  - **Matières** : une sous-carte par matière (même structure, avec l'origine en en-tête).

Dans chaque cellule fournisseur/pays :
- valeur inconnue → tag rouge **« À renseigner »** (les trous sont mis en avant : c'est la to-do list de la marque) ;
- valeur corrigée → texte **bleu gras** + tag **« Corrigé »** (bleu) ou **« Conflit »** (orange) + « déclaré : X » (ce que dit le fournisseur) ;
- icône crayon → édition (select + Enregistrer / Annuler). Le libellé est « Renseigner » si vide, « Corriger » sinon ;
- sur une correction `APPLIED` : bouton **Annuler** (supprime la correction) ;
- sur une correction `CONFLICT` : boutons **Garder** et **Revenir**.

Sous chaque tableau d'étapes : **« + Ajouter une étape »** (étape, fournisseur optionnel, pays optionnel). Une étape ajoutée porte le tag **« Ajoutée par la marque »** et un bouton **Supprimer** ; ses champs ne sont pas éditables (il faut la supprimer et la recréer).

#### Écran 3 — Versions publiées (`/products/:id/versions`, fichier `pages/products/[productId]/versions.vue`)

- Menu à gauche : les versions, la plus récente en haut, sélectionnée par défaut.
- À droite : « Version N — Publiée le … » + l'arbre complet **en lecture seule** (même composant `TreeView`, sans boutons d'édition).
- Si aucune version : « Aucune version publiée. Publiez depuis l'arbre de travail. »
- **Pas de diff** avec la version précédente (coupé, voir §4).

### 2.3 Les scénarios de l'énoncé : couverts ou non

| Scénario Gherkin | Statut | Où / comment |
|---|---|---|
| **Browse** : liste, dernière version ou « jamais publié », changé depuis, date de dernière modif | ✅ | `GET /products` → `listProducts()` ; écran 1 |
| **Edit** : changer le fournisseur d'une étape | ✅ | Correction `SET_STEP_FIELD` (champ `supplierId`) |
| **Edit** : ajouter une étape | ✅ | Correction `ADD_STEP` |
| **Edit** : modifier une composition | ✅ | Correction `SET_COMPOSITION` |
| **Edit** : la modif s'applique tout de suite, sans créer de version | ✅ | La route renvoie l'arbre recalculé ; aucune version n'est créée |
| **Edit** : composition ≠ 100 % refusée avec message clair | ✅ | `compositionError()` → 400 « La composition fait 90 % au lieu de 100 %. » (+ bouton désactivé côté front) |
| **Versions** : publier crée une version depuis l'arbre de travail | ✅ | `POST /versions` → `publishVersion()` |
| **Versions** : devient la dernière version publiée | ✅ | Ajout en fin de liste ; `lastVersion = versions.at(-1)` |
| **Versions** : les versions précédentes ne bougent pas | ✅ | `structuredClone` + `deepFreeze` ; liste en ajout seul |
| **Versions** : ouvrir une version passée en lecture seule | ✅ | Écran 3 |
| **Versions** : voir ce qui a changé par rapport à la précédente | ❌ coupé | Design décrit au §5 |
| **Refresh** : la correction survit | ✅ | Corrections stockées à part, réappliquées à chaque calcul |
| **Refresh** : le reste du refresh est pris tel quel | ✅ | Tout ce qui n'est pas ciblé par une correction sort `DECLARED` |
| **Refresh** : distinguer déclaration / correction sur chaque valeur | ✅ (fournisseur, pays, composition) | `TrackedValue.provenance` ; affichage bleu + tag |
| **Refresh** : survit à tous les refresh suivants | ✅ | Même mécanisme ; testé avec 3 arbres successifs |
| **Refresh** : appliquer deux fois le même refresh ne change rien | ✅ | `receiveDeclaredTree` ignore un arbre identique au dernier |
| **Contradiction** : la correction gagne | ✅ | Statut `CONFLICT`, la valeur de la marque reste affichée |
| **Contradiction** : on me montre le désaccord | ✅ | Tag « Conflit » + « déclaré : X » |
| **Contradiction** : je peux revenir à la déclaration | ✅ | Bouton « Revenir » = suppression de la correction |
| **Suppression** : l'étape n'est pas ressuscitée par la correction | ✅ | Statut `ORPHANED`, correction non appliquée |
| **Suppression** : la correction n'est pas détruite silencieusement | ✅ | Conservée, listée dans l'alerte orange, suppression manuelle |
| **Version publiée** : ne bouge pas après un refresh | ✅ | Testé (`publish.spec.ts`) et vérifié sur l'API |

### 2.4 Les règles métier, une par une

**R1 — Une correction cible un id, jamais une position ou un libellé.** Les ids sont
stables (hypothèse autorisée par l'énoncé). Cibles possibles :
`(stepId, supplierId)`, `(stepId, countryCode)`, `itemId` pour une composition,
`itemId` pour un ajout d'étape.

**R2 — Une seule correction par cible.** Corriger deux fois le même champ remplace
l'ancienne correction (`hasSameTarget`). Exception : `ADD_STEP` n'a jamais de « même
cible », on peut ajouter plusieurs étapes au même élément.

**R3 — Une correction mémorise ce que déclarait le fournisseur au moment où elle est
faite** (`declaredValueAtCorrection`). C'est le **point de repère** qui permet de savoir
si le fournisseur a changé d'avis depuis.

**R4 — Le statut d'une correction est recalculé à chaque lecture**, en comparant la
déclaration **actuelle** au repère :

```
la cible n'existe plus dans l'arbre déclaré ?          → ORPHANED   (pas appliquée)
déclaré actuel == valeur de la marque ?                → APPLIED    (le fournisseur est d'accord)
déclaré actuel == déclaré au moment de la correction ? → APPLIED    (rien de neuf côté fournisseur)
sinon                                                  → CONFLICT   (appliquée quand même + alerte)
```

Point important : **on ne compare pas la marque au fournisseur, on compare le
fournisseur à lui-même dans le temps.** Une correction qui contredit la déclaration
dès le départ n'est *pas* en conflit : c'est justement le but d'une correction. Le
conflit signifie « il y a une information **nouvelle** en face de ta correction ».

**R5 — En cas de conflit, la marque gagne** (sa valeur reste affichée) et deux actions sont proposées :
- **Garder** : le repère est remis à jour avec la déclaration actuelle → la correction repasse `APPLIED`. Si le fournisseur change encore d'avis plus tard, un nouveau conflit apparaîtra.
- **Revenir** : la correction est supprimée → la valeur déclarée réapparaît, en `DECLARED`.

**R6 — Un conflit peut se résoudre tout seul.** Si un refresh ultérieur revient à la
valeur du repère (ou adopte la valeur de la marque), le statut repasse `APPLIED`.
*Vérifié sur l'API :* correction teinture → Biella ; refresh 1 déclare Malhas → `CONFLICT` ;
refresh 2 redéclare Tintoria (= repère) → `APPLIED`.

**R7 — Une correction orpheline n'est jamais appliquée et jamais supprimée
automatiquement.** Elle est affichée à part ; la marque la supprime à la main. Si un
refresh ultérieur ramenait la cible **avec le même id**, la correction redeviendrait
active automatiquement (conséquence du recalcul, non testée).

**R8 — Une étape ajoutée par la marque (`ADD_STEP`) est `APPLIED` tant que son élément
parent existe, `ORPHANED` sinon.** Elle ne peut pas être en conflit (il n'y a rien en face).
Elle s'ajoute à la fin des étapes de l'élément. Ses champs ne se corrigent pas : on la
supprime et on la recrée.

**R9 — La composition d'un composant doit faire 100 %** (tolérance 0,01 pour les
décimales, ex. 33,3 + 33,3 + 33,4). Appliqué :
- **strictement à la saisie** d'une correction de composition (refus 400) ;
- **en signalement** sur l'arbre de travail (une déclaration fournisseur fausse est affichée, avec une alerte) ;
- **strictement à la publication** : on ne publie pas un arbre qui contient une composition fausse.

**R10 — Un refresh identique au dernier arbre reçu est ignoré** (idempotence). Comparaison
en JSON strict du document entier.

**R11 — On ne publie pas si rien n'a changé** depuis la dernière version (comparaison de
`product` + `rootItem` de l'arbre de travail avec ceux de la dernière version, provenance
et statuts compris).

**R12 — Une version est numérotée `nombre de versions + 1`, datée, copiée en profondeur
et gelée (`Object.freeze` récursif).** La liste des versions ne fait que grandir.

**R13 — Une version embarque aussi la liste des corrections et leurs statuts** au moment
de la publication (champ `tree.corrections`) : on sait après coup ce que la marque avait
corrigé dans la version communiquée.

### 2.5 Les données et les refresh de test

Au démarrage, le back charge `data/trees/*.json` (3 produits), `data/suppliers.json`,
`data/processes.json` et tous les fichiers de `data/refreshes/`.

| Produit | Id | Arbre initial | Refresh(es) disponibles |
|---|---|---|---|
| Marinière Manches Longues (FM-TS-0142) | `prd_ts0142` | 14/06/2026 | 20/09 (fourni) puis 05/10 (créé) |
| Veste Denim Brut (FM-JK-0207) | `prd_jk0207` | 29/08/2026, **composition denim à 98 %** | 25/09 (créé) |
| Écharpe Laine Mérinos (FM-AC-0031) | `prd_ac0031` | 02/09/2026 | 27/09 (créé) |

**Refresh marinière 20/09 (fourni par Fairly Made)** — teste tous les cas difficiles :

| Cas | Détail | Effet dans l'app |
|---|---|---|
| Comble un trou | FINISHING du jersey (`stp_b3`) : `null` → Textil Duarte / PT ; FIBER_PRODUCTION du coton (`stp_c1`) : fournisseur → Kaveri | Pris tel quel |
| Contredit | DYEING du jersey (`stp_b2`) : Tintoria Nord / IT → Malhas do Ave / PT | Si corrigé avant : `CONFLICT` |
| Change une composition | Jersey 95/5 → 92/8, origine élasthanne `null` → CN | Si corrigée avant : `CONFLICT` |
| Ajoute une étape | Élasthanne : première étape SPINNING (`stp_c3`) | Pris tel quel |
| Ajoute un élément | Nouveau composant « Renfort col thermocollant » (`itm_ts0142_c5`) | Pris tel quel |
| Supprime une étape | PACKAGING racine (`stp_a3`) disparaît | Si corrigée avant : `ORPHANED` |
| Renomme | Jersey 180 → 185 g/m² (même id) | Pris tel quel (le libellé n'est pas corrigeable) |
| Divers | Poids 220 → 225 g ; fil à coudre 8 % → 6 % | Pris tel quel |

**Refresh marinière 05/10 (créé pour la démo)** — le « 2e refresh » :
- DYEING revient à Tintoria Nord / IT → démontre R6 (conflit qui se résout seul) ;
- le composant « Renfort col » disparaît → un composant ajouté puis retiré ;
- PACKAGING revient **sous un nouvel id** `stp_a4` → la correction sur `stp_a3` reste orpheline (l'étape n'est pas « ressuscitée ») ;
- étiquette : origine polyester `null` → BD ; poids 222 g ; fil 6 % → 8 %.

**Refresh denim 25/09 (créé)** — le fournisseur corrige la composition à 98/2 = 100 %
(la veste devient publiable sans correction), comble des trous (Anadolu Denim, TR),
ajoute une matière Élasthanne, ajoute une étape à la doublure, et **redéclare l'étape
MAKING des rivets sous un nouvel id** (`stp_k1` → `stp_k2`) : une correction sur `stp_k1`
devient orpheline.

**Refresh écharpe 27/09 (créé)** — supprime l'étape FINISHING (`stp_m2`), ajoute un
composant « Fil de couture », origine laine IT → AU, comble la teinture (Tintoria Nord / IT).

**Données surprenantes relevées** (à citer au debrief) :
1. **Denim à 98 %** (96 coton + 2 élasthanne) : viole la règle des 100 %. Choix : on l'affiche avec une alerte, on bloque la publication tant que la marque ne l'a pas corrigée (ou qu'un refresh ne l'a pas fait).
2. **Le pays est stocké deux fois** : sur l'étape (`countryCode`) et sur le fournisseur (`suppliers.json`). Corriger le fournisseur ne change pas le pays de l'étape → on peut obtenir une usine italienne sur une étape « Portugal ». Non résolu, signalé.
3. Autres incohérences possibles à mentionner si on vous pousse : l'origine d'une matière existe à deux endroits (entrée de composition **et** élément `MATERIAL`) ; le denim n'a pas d'élément `MATERIAL` élasthanne alors que sa composition en contient ; le fil à coudre pèse 8 % du produit (très élevé pour du fil) ; FIBER_PRODUCTION du coton attribuée à une filature (Kaveri Spinning) dans le refresh.

### 2.6 Déroulé complet d'une démo, état par état

Rejoué réellement sur l'API (produit marinière, back fraîchement démarré) :

| # | Action | Corrections (statut) | v1 | Remarque |
|---|---|---|---|---|
| 1 | Corriger fournisseur DYEING `stp_b2` : Tintoria → **Biella** | `stp_b2` APPLIED (repère = Tintoria) | — | Valeur bleue + « Corrigé · déclaré : Tintoria Nord Srl » |
| 2 | Corriger fournisseur PACKAGING `stp_a3` : inconnu → **Atelier Rouvray** | + `stp_a3` APPLIED (repère = null) | — | |
| 3 | Publier | idem | **créée** (poids 220, étapes a1/a2/a3) | |
| 4 | Publier encore | — | — | 400 « Rien n'a changé depuis la dernière version. » |
| 5 | Simuler un refresh (20/09) | `stp_b2` **CONFLICT** (déclaré Malhas), `stp_a3` **ORPHANED** | inchangée | « Modifications à publier » |
| 6 | Simuler un refresh (05/10) | `stp_b2` **APPLIED** (Tintoria revenu = repère), `stp_a3` ORPHANED | inchangée | Conflit résolu tout seul (R6) |
| 7 | Simuler un refresh | inchangé | inchangée | `accepted: false` → « Rien de nouveau » |
| 8 | Ouvrir v1 | — | poids **220**, étapes **a1/a2/a3** | La version n'a pas bougé |

---

## 3. Documentation technique

### 3.1 Architecture et stack

```
┌───────────────────────── frontend/ (Nuxt 4, Vue 3, port 3000) ─────────────────────────┐
│  pages/  index.vue · products/[productId]/index.vue · products/[productId]/versions.vue │
│  components/  TreeView → ItemCard (récursif) → CompositionBlock / StepsTable → StepField │
│  api.ts (fetch) · types.ts (copie des types du back) · labels.ts · referenceData.ts     │
│  treeActions.ts (provide/inject : présent = éditable, absent = lecture seule)           │
└───────────────────────────────────────┬─────────────────────────────────────────────────┘
                                        │ HTTP JSON (REST), http://localhost:3001, CORS ouvert
┌───────────────────────────────────────▼──────────── backend/ (NestJS 12, port 3001) ────┐
│  traceability/  (couche « framework » : HTTP, DI, stockage)                              │
│    TraceabilityController  → routes, ne fait que transmettre                             │
│    TraceabilityService     → orchestre : lit le store, appelle le domaine, sauvegarde    │
│    TraceabilityStore       → Map en mémoire, charge data/ au démarrage                   │
│    DomainErrorFilter       → DomainError ⇒ HTTP 400                                      │
│  domain/  (TypeScript pur : aucune dépendance à Nest, testable seul)                     │
│    types.ts · resolve.ts · corrections.ts · composition.ts · publish.ts · domain-error.ts │
└───────────────────────────────────────┬─────────────────────────────────────────────────┘
                                        │ lecture fichiers au démarrage
                                   data/ (JSON)
```

**Principe de découpage** : toutes les règles métier sont dans `backend/src/domain/`,
sous forme de **fonctions pures** (elles reçoivent l'état, renvoient un nouvel état, ne
modifient rien, ne connaissent ni HTTP ni Nest ni le stockage). La couche
`traceability/` n'est que de la plomberie autour. Conséquences :
- les tests du domaine n'ont besoin ni de serveur ni de Nest ;
- passer à une vraie base = réécrire uniquement `TraceabilityStore` ;
- passer à Express = réécrire controller/filtre, le domaine ne bouge pas.

| Choix | Justification |
|---|---|
| **REST** plutôt que GraphQL | Peu de routes, ressources simples ; GraphQL n'apporte rien ici. |
| **Un seul module Nest** (`AppModule`) | Un seul contexte métier ; l'énoncé préfère « peu de modules bien choisis ». Le vrai découpage est domaine / infrastructure, pas en modules Nest. |
| **Stockage en mémoire** | Autorisé par l'énoncé ; tout est perdu au redémarrage. |
| **CommonJS + Jest** | Configuration Nest par défaut, la plus documentée. |
| **Pas d'ORM** | Pas de base. |
| **`ssr: false`** côté Nuxt | Outil interne, pas de SEO ; fonctionne comme une SPA. |
| **ant-design-vue** | Tableaux, formulaires, alertes prêts à l'emploi ; temps concentré sur le cœur. |
| **Pas de store global (Pinia)** | L'état d'une page = la dernière réponse du serveur (`view`). Le serveur renvoie toujours l'arbre recalculé complet. |
| **Pas de package de types partagé** | Types recopiés à la main dans `frontend/app/types.ts` (dette, voir §4). |

**Lancer** : `cd backend && npm install && npm run start:dev` puis
`cd frontend && npm install && npm run dev` → http://localhost:3000.
**Tests** : `cd backend && npm test`.

### 3.2 Arborescence commentée

```
fairly-made-test/
├── README.md, synthese.md, TIMEBOX.md    livrables écrits
├── data/                                  entrées (ne sont jamais réécrites)
│   ├── trees/*.json                       état initial des 3 produits
│   ├── refreshes/*.json                   refresh fourni + 3 créés
│   ├── suppliers.json                     registre des fournisseurs
│   └── processes.json                     vocabulaires : procédés, matières, catégories
├── backend/
│   ├── src/main.ts                        démarrage Nest, CORS, port 3001
│   ├── src/app.module.ts                  déclaration du module (controller, providers, filtre)
│   ├── src/domain/                        ★ règles métier, TypeScript pur
│   │   ├── types.ts                       tous les types du domaine
│   │   ├── resolve.ts                     réception d'un refresh + calcul de l'arbre de travail
│   │   ├── corrections.ts                 ajouter / retirer / garder une correction
│   │   ├── composition.ts                 règle des 100 %
│   │   ├── publish.ts                     publication d'une version
│   │   ├── domain-error.ts                erreur « règle métier refusée »
│   │   └── *.spec.ts                      tests unitaires (17)
│   ├── src/traceability/                  couche Nest
│   │   ├── traceability.controller.ts     routes REST
│   │   ├── traceability.service.ts        orchestration
│   │   ├── traceability.store.ts          stockage en mémoire + chargement de data/
│   │   └── domain-error.filter.ts         DomainError → 400
│   └── test/fixtures.ts                   chargement des vrais JSON + helpers de test
└── frontend/
    ├── nuxt.config.ts                     ssr:false, CSS, TS strict
    └── app/
        ├── app.vue                        layout, chargement des données de référence
        ├── api.ts                         un appel fetch par route
        ├── types.ts                       miroir des types du back
        ├── referenceData.ts               fournisseurs/procédés/matières (état global réactif)
        ├── labels.ts                      traductions FR des codes, formats de date, pays
        ├── treeActions.ts                 clé d'injection des actions d'édition
        ├── assets/main.css                mise en page
        ├── pages/…                        3 pages (routing par fichiers)
        └── components/…                   7 composants
```

### 3.3 Le modèle de données (`backend/src/domain/types.ts`)

Il y a **quatre familles de types**, qui correspondent aux quatre « choses » du modèle.

#### a) L'arbre déclaré — fidèle au JSON reçu

```ts
DeclaredTree = { brand, product: ProductInfo, rootItem: ProductItem }
TreeItem     = ProductItem | ComponentItem | MaterialItem     // union discriminée par `kind`
Step         = { id, process, supplierId: string|null, countryCode: string|null }
CompositionEntry = { id, rawMaterial, percentage, originCountryCode }
RefreshFile  = DeclaredTree & { comment?, refreshedAt }       // forme des fichiers de refresh
DeclaredTreeRecord = { receivedAt, tree }                      // une entrée de l'historique
```

- **Union discriminée** : `kind` dit quel type d'élément on a ; TypeScript sait alors
  que seul un `COMPONENT` a `composition`, seul un `MATERIAL` a `rawMaterial`, etc.
  (`if (item.kind === 'COMPONENT') item.composition // OK`).
- On garde **l'historique** de tous les arbres reçus (`DeclaredTreeRecord[]`), le courant
  étant le dernier. L'historique n'est pas encore exploité (il le serait pour un audit
  ou un diff « qu'a changé le fournisseur »).

#### b) La correction — l'intention de la marque

```ts
SetStepFieldCorrection  { type:'SET_STEP_FIELD',  target:{stepId, field}, value, declaredValueAtCorrection }
AddStepCorrection       { type:'ADD_STEP',        target:{itemId},        value: Step }
SetCompositionCorrection{ type:'SET_COMPOSITION', target:{itemId},        value: CompositionEntry[], declaredValueAtCorrection }
Correction = union des trois, chacune avec { id: 'cor_<uuid>', createdAt }
```

- `CorrectableStepField = 'supplierId' | 'countryCode'` : les deux seuls champs d'étape corrigeables.
- `ADD_STEP` n'a pas de `declaredValueAtCorrection` : il n'y avait rien en face.
- **`CorrectionInput`** est la forme **envoyée par le front** (plus simple : pas d'id,
  pas de date, pas de repère). C'est le domaine qui construit la vraie `Correction` —
  le client ne peut donc pas falsifier le repère.

#### c) L'arbre de travail — le résultat du calcul

```ts
TrackedValue<T> = { provenance:'DECLARED', value }
               | { provenance:'CORRECTED', value, correctionId, status:'APPLIED'|'CONFLICT', declaredValue }

ResolvedStep = { id, process, supplierId: TrackedValue, countryCode: TrackedValue,
                 provenance, addedByCorrectionId? }
ResolvedComponentItem.composition : TrackedValue<CompositionEntry[]>
ResolvedTree = { brand, product, rootItem: ResolvedProductItem, corrections: CorrectionWithStatus[] }
```

- **`TrackedValue` est la pièce centrale de l'affichage** : chaque valeur corrigeable
  arrive au front avec sa provenance. Si elle est corrigée, on a aussi le statut, l'id
  de la correction (pour les boutons Annuler/Garder/Revenir) et la valeur déclarée d'en
  face (pour afficher « déclaré : X »).
- `ResolvedStep.provenance` dit si **l'étape entière** vient du fournisseur ou a été
  ajoutée par la marque (`addedByCorrectionId`).
- `ResolvedTree.corrections` liste **toutes** les corrections avec leur statut, y compris
  les `ORPHANED` (qui ne sont appliquées nulle part dans l'arbre, d'où la nécessité de
  les lister à part pour les afficher).
- Les champs non corrigeables (`label`, `usagePercentage`, `rawMaterial`,
  `originCountryCode` d'une matière, `process`) restent des valeurs brutes.

#### d) La version publiée

```ts
PublishedVersion { readonly versionNumber, readonly publishedAt, readonly tree: ResolvedTree }
```

Elle contient un **`ResolvedTree` complet** (valeurs + provenances + corrections), pas
des références vers un arbre déclaré et des corrections. Choix délibéré : une version
doit pouvoir être relue telle quelle même si les règles de calcul changent un jour.

#### Autres types

`CompositionProblem { itemId, itemLabel, message }`, `Supplier`, `ProcessDefinition`.

#### Côté stockage (`traceability.store.ts`)

```ts
ProductRecord = {
  declaredTrees: DeclaredTreeRecord[]   // historique des arbres reçus (le dernier = courant)
  corrections:   Correction[]           // le calque
  versions:      PublishedVersion[]     // ajout seul
  lastModifiedAt: string                // dernière correction ou dernier refresh accepté
}
```

Trois listes **indépendantes** : c'est ce qui rend le modèle robuste. Un refresh touche
`declaredTrees`, une correction touche `corrections`, une publication touche `versions`.
Aucune opération n'écrit dans la liste d'une autre.

### 3.4 Le domaine, fonction par fonction

#### `resolve.ts` — le cœur

| Fonction | Rôle | Détail |
|---|---|---|
| `isSame(a, b)` | Égalité profonde | `JSON.stringify(a) === JSON.stringify(b)`. Simple, mais sensible à l'ordre des clés (voir §4). |
| `receiveDeclaredTree(history, incoming, receivedAt)` | Ajoute un refresh à l'historique | Si identique au dernier → **renvoie le même tableau** (même référence). Sinon renvoie un **nouveau** tableau avec une copie profonde (`structuredClone`) de l'arbre. Le service détecte « accepté ou non » en comparant les références. |
| `currentDeclaredTree(history)` | Dernier arbre reçu | Lève une `Error` si l'historique est vide (impossible en pratique : chaque produit démarre avec son arbre initial). |
| `computeStatus(correction, declared)` | Statut d'**une** correction face à l'arbre déclaré courant | `ADD_STEP` : APPLIED si l'élément existe, sinon ORPHANED. `SET_STEP_FIELD` : ORPHANED si l'étape n'existe plus, sinon `compare`. `SET_COMPOSITION` : ORPHANED si l'élément n'existe plus ou n'est plus un composant, sinon `compare`. |
| `compare(currentDeclared, correction)` | Règle R4 | APPLIED si déclaré == valeur marque **ou** déclaré == repère ; sinon CONFLICT. |
| `resolveWorkingTree(declared, corrections)` | **Calcule l'arbre de travail** | 1) statut de chaque correction ; 2) filtre les actives (≠ ORPHANED) ; 3) reconstruit l'arbre en recopiant chaque élément (`...root`, `...item`) et en remplaçant étapes et composition par leurs versions « résolues » ; 4) joint la liste complète des corrections avec statut. |
| `resolveItem(item, active)` | Récursion sur un élément | Résout ses étapes, ses enfants (récursivement) et, si composant, sa composition. |
| `resolveComposition(itemId, declaredValue, active)` | Composition d'un composant | Cherche une correction `SET_COMPOSITION` active sur cet id → `CORRECTED` (avec statut et valeur déclarée actuelle) ; sinon `DECLARED`. |
| `resolveSteps(item, active)` | Étapes d'un élément | Chaque étape déclarée → `ResolvedStep` avec ses deux champs résolus, provenance `DECLARED`. Puis **ajoute à la fin** les étapes des corrections `ADD_STEP` actives ciblant cet élément, provenance `CORRECTED`, champs `CORRECTED`/`APPLIED` avec `declaredValue: null`. |
| `resolveStepField(step, field, active)` | Un champ d'étape | Correction `SET_STEP_FIELD` active sur `(stepId, field)` → `CORRECTED` ; sinon `DECLARED`. |
| `corrected(value, correctionId, status, declaredValue)` | Fabrique un `CorrectedValue` | Petit helper. |
| `findItem(item, id)` / `findStep(item, id)` | Recherche récursive (parcours en profondeur) | Utilisées par `computeStatus` et `corrections.ts`. |

Pourquoi l'arbre déclaré n'est **jamais modifié** : toutes les fonctions construisent de
nouveaux objets (spread `...`, `map`) au lieu de muter. L'arbre stocké reste la copie
fidèle de ce que le fournisseur a envoyé.

Complexité : pour chaque champ, on parcourt la liste des corrections actives
→ O(nombre de champs × nombre de corrections). Suffisant ici ; pour de gros arbres, on
indexerait les corrections par cible dans une `Map` (voir §5).

#### `corrections.ts` — modifier le calque

| Fonction | Rôle |
|---|---|
| `addCorrection(declared, corrections, input)` | Construit la correction (`buildCorrection`), retire l'éventuelle correction existante sur la même cible (`hasSameTarget`), ajoute la nouvelle **en fin de liste**. Contient 3 `console.log` de debug oubliés (voir §4). |
| `removeCorrection(corrections, id)` | Vérifie que l'id existe (sinon `DomainError`), puis filtre. Sert à « Annuler », « Revenir », « Supprimer » (étape ajoutée ou orpheline). |
| `keepCorrection(declared, corrections, id)` | Refuse si la correction n'est pas en `CONFLICT`. Sinon remplace son repère par la déclaration actuelle (`withCurrentDeclaredValue`) → elle redevient `APPLIED`. Met aussi à jour `createdAt`. |
| `buildCorrection(declared, corrections, input)` | Valide et construit selon le type : **SET_STEP_FIELD** : refuse si l'étape a été ajoutée par la marque (« supprimez-la puis ajoutez-la à nouveau ») ; refuse si l'étape n'existe pas ; mémorise le repère `step[field]`. **ADD_STEP** : refuse si l'élément n'existe pas ; génère un id d'étape `stp_app_<uuid>` (« app » = créé par l'application). **SET_COMPOSITION** : refuse si l'élément n'est pas un composant ; génère `cmp_app_<uuid>` pour les nouvelles lignes ; **valide les 100 %** ; mémorise la composition déclarée comme repère. |
| `hasSameTarget(a, b)` | Même type **et** même cible (`stepId`+`field`, ou `itemId` pour une composition). Toujours `false` pour `ADD_STEP`. |
| `withCurrentDeclaredValue(correction, declared)` | Recopie la correction avec le repère actualisé. |
| `findCorrection` / `now` | Utilitaires. |

#### `composition.ts`

| Fonction | Rôle |
|---|---|
| `compositionError(entries)` | Somme des pourcentages ; `null` si `|total − 100| < 0,01`, sinon le message « La composition fait X % au lieu de 100 %. » (arrondi à 2 décimales). |
| `findCompositionProblems(tree)` | Parcourt tous les éléments de l'arbre **résolu** (donc après corrections) et renvoie un `CompositionProblem` par composant invalide. Utilisé pour l'affichage et pour bloquer la publication. |
| `listItems(item)` | Aplatit l'arbre en liste. |

#### `publish.ts`

| Fonction | Rôle |
|---|---|
| `publishVersion(versions, workingTree, publishedAt)` | 1) refuse s'il existe un problème de composition (« Publication impossible — Denim 12 oz : … ») ; 2) refuse si rien n'a changé ; 3) crée `{ versionNumber: n+1, publishedAt, tree: structuredClone(workingTree) }` ; 4) le gèle en profondeur. **Ne modifie pas** la liste : c'est le service qui l'ajoute. |
| `hasChangesSince(lastVersion, workingTree)` | `true` s'il n'y a pas de version ; sinon compare `{product, rootItem}` des deux arbres. La liste `corrections` est volontairement exclue de la comparaison (une correction orpheline ajoutée/supprimée ne change pas ce qui est publié). |
| `deepFreeze(value)` | `Object.freeze` récursif : toute tentative d'écriture lève une erreur en mode strict (testé). |

Pourquoi **copier ET geler** : `structuredClone` coupe tout lien avec l'arbre de travail
(aucune référence partagée) ; `deepFreeze` empêche un bug de code de modifier la version
après coup. Deux protections différentes.

#### `domain-error.ts`

`class DomainError extends Error {}` — un type d'erreur dédié à « une règle métier a
refusé ». Il permet à la couche HTTP de distinguer un refus métier (→ 400) d'un bug (→ 500),
sans que le domaine connaisse HTTP.

### 3.5 Le back NestJS

#### `main.ts`
Crée l'application à partir d'`AppModule`, active **CORS** (le front tourne sur un autre
port), écoute sur `PORT` ou **3001**.

#### `app.module.ts`
```ts
@Module({
  controllers: [TraceabilityController],
  providers: [TraceabilityStore, TraceabilityService, { provide: APP_FILTER, useClass: DomainErrorFilter }],
})
```
- `controllers` : les classes qui déclarent des routes.
- `providers` : les classes que Nest instancie et **injecte** (injection de dépendances).
  `TraceabilityStore` et `TraceabilityService` sont des **singletons** : une seule instance
  pour toute l'application — c'est pour ça que la `Map` du store garde l'état entre requêtes.
- `APP_FILTER` : enregistre le filtre d'erreur **globalement** (sur toutes les routes).

#### `TraceabilityStore` (`@Injectable`)
- Au **constructeur** : lit `data/trees/*.json` (triés par nom), et pour chaque arbre crée
  un `ProductRecord` avec un historique d'un élément (`receivedAt` = `product.lastModifiedAt`
  du fichier), zéro correction, zéro version.
- Propriétés lues une fois au démarrage : `refreshFiles` (tous les fichiers de refresh) et
  `referenceData` (fournisseurs + procédés + matières premières ; `usageCategories` n'est pas repris).
- API : `listProductIds()`, `findProduct(id)`, `saveProduct(id, record)` (remplacement complet).
- `DATA_DIR = join(__dirname, '..', '..', '..', 'data')` : depuis `backend/dist/traceability/`
  (ou `backend/src/traceability/` en test) on remonte à la racine du dépôt.
- **Seul endroit à remplacer pour une vraie base.**

#### `TraceabilityService` (`@Injectable`)
Le store lui est injecté par le constructeur (`constructor(private readonly store: TraceabilityStore)`).
Schéma de chaque méthode d'écriture : **lire → appeler une fonction pure du domaine →
sauvegarder → renvoyer la vue recalculée**.

| Méthode | Ce qu'elle fait |
|---|---|
| `getReferenceData()` | Renvoie les données de référence. |
| `listProducts()` | Pour chaque produit : calcule la vue (`buildView`) et en extrait un `ProductSummary`. **Recalcule tous les arbres à chaque appel.** |
| `getWorkingTree(id)` | `buildView` du produit. |
| `addCorrection(id, input)` | Arbre déclaré courant + `addCorrection` du domaine → `saveCorrections`. |
| `removeCorrection(id, corId)` | `removeCorrection` → `saveCorrections`. |
| `keepCorrection(id, corId)` | `keepCorrection` → `saveCorrections`. |
| `receiveRefresh(id, tree)` | Vérifie que `tree.product.id` correspond (sinon **400** `BadRequestException`) ; `receiveDeclaredTree` avec `receivedAt = maintenant` ; `accepted = nouvelle référence ?` ; si accepté, sauvegarde et met à jour `lastModifiedAt`. Renvoie `{ accepted, workingTree }`. |
| `simulateRefresh(id)` | Filtre les fichiers de refresh du produit, les trie par `refreshedAt`, prend **le premier dont `product.lastModifiedAt` est postérieur** à celui de l'arbre déclaré courant, et le passe à `receiveRefresh`. S'il n'y en a plus : `accepted: false`. Aucun fichier pour ce produit : **404**. |
| `publish(id)` | `publishVersion` sur l'arbre de travail résolu, ajoute la version à la liste, sauvegarde. Ne change pas `lastModifiedAt`. |
| `listVersions(id)` | Références `{versionNumber, publishedAt}` (sans l'arbre). |
| `getVersion(id, n)` | La version complète, ou **404**. |
| `getProduct(id)` *(privée)* | Produit ou **404** « Produit X introuvable. ». |
| `resolve(product)` *(privée)* | `resolveWorkingTree(currentDeclaredTree(...), corrections)`. |
| `buildView(product)` *(privée)* | `{ tree, compositionProblems, hasUnpublishedChanges, lastVersion }`. |
| `saveCorrections(id, corrections)` *(privée)* | Sauvegarde les corrections, `lastModifiedAt = maintenant`, renvoie la vue. |

Types de réponse définis dans le service : `VersionReference`, `ProductSummary`,
`WorkingTreeView`, `RefreshOutcome`.

#### `TraceabilityController`
`@Controller()` sans préfixe. Chaque méthode récupère les paramètres avec `@Param` /
`@Body` et appelle le service. `ParseIntPipe` convertit `:versionNumber` en nombre (et
renvoie 400 si ce n'est pas un entier). `@HttpCode(200)` force 200 sur certains POST
(par défaut Nest renvoie 201 sur un POST).

#### `DomainErrorFilter`
`@Catch(DomainError)` : Nest l'appelle dès qu'une `DomainError` sort d'une route ; il
répond `400 { statusCode: 400, message }`. Les exceptions Nest (`NotFoundException`,
`BadRequestException`) sont gérées par Nest lui-même ; toute autre erreur donne un 500.

### 3.6 Référence de l'API REST

Base : `http://localhost:3001`. Toutes les réponses sont en JSON.

| Méthode | Route | Corps | Réponse | Codes |
|---|---|---|---|---|
| GET | `/reference-data` | — | `{ suppliers, processes, rawMaterials }` | 200 |
| GET | `/products` | — | `ProductSummary[]` | 200 |
| GET | `/products/:productId/working-tree` | — | `WorkingTreeView` | 200, 404 |
| POST | `/products/:productId/corrections` | `CorrectionInput` | `WorkingTreeView` | **201**, 400, 404 |
| DELETE | `/products/:productId/corrections/:correctionId` | — | `WorkingTreeView` | 200, 400, 404 |
| POST | `/products/:productId/corrections/:correctionId/keep` | — | `WorkingTreeView` | 200, 400 (pas en conflit), 404 |
| POST | `/products/:productId/refreshes` | `DeclaredTree` complet | `RefreshOutcome` | 200, 400 (mauvais produit), 404 |
| POST | `/products/:productId/refreshes/simulate` | — | `RefreshOutcome` | 200, 404 (aucun fichier) |
| POST | `/products/:productId/versions` | — | `PublishedVersion` | **201**, 400 (composition / rien n'a changé), 404 |
| GET | `/products/:productId/versions` | — | `VersionReference[]` | 200, 404 |
| GET | `/products/:productId/versions/:versionNumber` | — | `PublishedVersion` | 200, 400 (pas un entier), 404 |

Exemples de `CorrectionInput` :

```json
{ "type": "SET_STEP_FIELD", "stepId": "stp_b2", "field": "supplierId", "value": "sup_8b23" }
{ "type": "SET_STEP_FIELD", "stepId": "stp_b3", "field": "countryCode", "value": null }
{ "type": "ADD_STEP", "itemId": "itm_ts0142_m2", "process": "SPINNING", "supplierId": null, "countryCode": "CN" }
{ "type": "SET_COMPOSITION", "itemId": "itm_ts0142_c1",
  "composition": [ { "id": "cmp_c1_1", "rawMaterial": "COTTON_ORGANIC", "percentage": 94, "originCountryCode": "IN" },
                   { "rawMaterial": "ELASTANE", "percentage": 6, "originCountryCode": null } ] }
```

Choix de conception de l'API à savoir défendre :
- **Une seule route pour les trois types de correction** (discriminées par `type`) : le
  front et le back partagent la même union `CorrectionInput`.
- **« Revenir à la déclaration » = `DELETE` de la correction** : pas besoin d'une action
  dédiée, supprimer le calque fait réapparaître le plan.
- **Les écritures renvoient l'arbre de travail recalculé** : le front remplace sa vue par
  la réponse, sans deuxième requête ni logique de fusion côté client.
- **Le refresh réel** (`POST /refreshes`) et **le refresh simulé** coexistent : le premier
  est le point d'entrée qu'appellerait le système de collecte ; le second sert la démo.

### 3.7 Le front Nuxt

#### Configuration (`nuxt.config.ts`)
`ssr: false` (rendu navigateur uniquement), CSS reset d'Ant Design + `main.css`,
TypeScript strict. Nuxt fournit : le **routing par fichiers** (`pages/`), l'**auto-import**
des composants (`<NuxtLink>`, `<NuxtPage>`), l'alias `~` = dossier `app/`.

#### `app.vue` — le layout
- Au montage, charge les **données de référence** (fournisseurs, procédés, matières).
- `<ConfigProvider :locale="frFR">` : textes Ant Design en français.
- En-tête avec lien vers `/`.
- `<NuxtPage v-else-if="referenceData" />` : **les pages ne s'affichent qu'une fois les
  données de référence chargées** (sinon les noms de fournisseurs ne pourraient pas être
  résolus). En cas d'échec, affiche le message d'erreur.

#### `api.ts`
Une fonction par route. `request<T>()` :
- `fetch` vers `http://localhost:3001` (URL codée en dur) ;
- si le réseau échoue : « Le serveur ne répond pas. Le backend est-il lancé (port 3001) ? » ;
- si le statut n'est pas 2xx : lève une `Error` avec le `message` renvoyé par le back
  (c'est ainsi que les messages métier comme « La composition fait 90 %… » arrivent à l'écran).

#### `types.ts`
Copie manuelle des types du back nécessaires au front (`ResolvedTree`, `TrackedValue`,
`CorrectionInput`, `WorkingTreeView`…). Aucune garantie automatique qu'ils restent synchrones.

#### `referenceData.ts`
Un `ref` global (état réactif partagé par tous les composants, sans Pinia) et
`supplierName(id)` qui traduit un id en nom (ou renvoie l'id si inconnu).

#### `labels.ts`
Traductions françaises des codes (procédés, matières, catégories d'usage, types
d'élément, types de correction), liste fixe de 25 pays proposés dans les selects,
noms de pays via `Intl.DisplayNames` (« IT » → « Italie »), format de date `fr-FR`,
`stepFieldText` (id → nom fournisseur ou nom de pays, `null` → « non renseigné »),
`compositionText`, `orphanedCorrectionText`.

#### `treeActions.ts` — le mécanisme lecture/écriture ★
```ts
export interface TreeActions { addCorrection, removeCorrection, keepCorrection }  // renvoient Promise<boolean>
export const TREE_ACTIONS: InjectionKey<TreeActions> = Symbol("tree-actions")
export function useTreeActions() { return inject(TREE_ACTIONS, null) }
```
- La **page arbre de travail** fait `provide(TREE_ACTIONS, actions)`.
- La **page versions** ne fournit rien.
- Chaque composant d'édition appelle `useTreeActions()` : s'il reçoit `null`, il
  **masque tous les boutons**. C'est ainsi que **le même `TreeView` sert en édition et en
  lecture seule**, sans prop à faire descendre à travers tous les niveaux.
- Équivalent React : un `Context` avec un `Provider` sur la page d'édition uniquement.
- Les actions renvoient `true`/`false` pour que le composant sache s'il peut fermer son
  formulaire (on le garde ouvert en cas d'erreur).

#### Pages

**`pages/index.vue`** : `onMounted` → `getProducts()` → tableau Ant Design avec slot
`#bodyCell` pour personnaliser chaque colonne. `asProduct(record)` est un simple cast
TypeScript (le slot d'Ant Design type `record` en `any`/`unknown`).

**`pages/products/[productId]/index.vue`** (le `[productId]` dans le nom de dossier crée
le paramètre de route) :
- `view` (`WorkingTreeView | null`) = **tout l'état de la page**, remplacé par chaque réponse du serveur ;
- `run(action)` : met `busy` à `true`, exécute, affiche un toast de succès ou d'erreur (`message.success/error`), renvoie `true/false` ;
- définit et **fournit** les trois actions ;
- `simulateRefresh` : message différent selon `accepted` ;
- `publish` : publie puis **recharge l'arbre de travail** (car la route de publication renvoie la version, pas la vue) ;
- `orphans` (computed) : corrections `ORPHANED` pour l'alerte orange.

**`pages/products/[productId]/versions.vue`** : charge la liste, sélectionne la dernière ;
un `watch` sur `selectedKeys` charge la version choisie ; affiche `<TreeView>` **sans
`compositionProblems` et sans actions fournies** → lecture seule.

#### Composants (hiérarchie)

```
TreeView                       (racine : « Assemblage du produit » + « Composants »)
├── StepsTable                 (étapes de la racine)
│   ├── StepField ×2 / ligne   (fournisseur, pays)
│   │   └── CorrectionNotice   (si corrigé)
│   └── AddStepForm            (si éditable)
└── ItemCard ×N                (un par composant)
    ├── CompositionBlock       (si COMPONENT)
    │   └── CorrectionNotice   (si composition corrigée)
    ├── StepsTable             (idem)
    └── ItemCard ×M            (récursif : les matières)
```

| Composant | Props | Comportement |
|---|---|---|
| `TreeView` | `product`, `compositionProblems?` | Affiche les étapes de la racine puis un `ItemCard` par enfant. |
| `ItemCard` | `item`, `compositionProblems?` | Carte titrée par le libellé. En-tête : catégorie + % (composant) ou origine / « Origine à renseigner » (matière). Bloc Composition si composant, puis étapes, puis **s'appelle lui-même** pour les enfants (un SFC peut se référencer par son nom de fichier). |
| `CompositionBlock` | `item`, `problem?` | Mode lecture : alerte si problème, tableau, `CorrectionNotice` si corrigée, bouton « Corriger la composition ». Mode édition : une ligne par matière (select matière, % de 0 à 100, select origine, « Retirer »), « + Ajouter une matière », **total en direct** (vert si 100, rouge sinon), « Enregistrer » **désactivé si ≠ 100**. Les lignes existantes gardent leur `id`, les nouvelles n'en ont pas (le back en génère). |
| `StepsTable` | `steps`, `itemId`, `itemKind` | Tableau étape / fournisseur / pays. Étape ajoutée par la marque → tag + « Supprimer » (= supprimer la correction `ADD_STEP`). Message « Aucune étape renseignée » si vide. `AddStepForm` si éditable. |
| `StepField` | `step`, `field` | Affiche la valeur (ou « À renseigner »), bleu si corrigée. Crayon seulement si éditable **et** étape déclarée. Édition : select avec recherche et effacement (effacer = corriger vers « inconnu »). `CorrectionNotice` seulement pour une étape déclarée (pour une étape ajoutée, le tag de l'étape suffit). |
| `CorrectionNotice` | `correctionId`, `status`, `declaredText` | Tag « Corrigé » / « Conflit », « déclaré : X ». APPLIED → « Annuler ». CONFLICT → « Garder » / « Revenir » (avec infobulles). Rien si lecture seule. |
| `AddStepForm` | `itemId`, `itemKind` | Bouton « + Ajouter une étape » qui ouvre 3 selects. **Les procédés proposés sont filtrés par `appliesTo`** du type d'élément. Fournisseur et pays optionnels. « Ajouter » désactivé sans procédé. |

### 3.8 Les tests

`npm test` → 4 suites, **17 tests**, tous au vert. Ils portent **uniquement sur le
domaine**, sur les **vrais fichiers de `data/`** (via `test/fixtures.ts`), ce qui les rend
lisibles comme des scénarios métier.

`test/fixtures.ts` : charge marinière, refresh marinière 20/09 et denim ; `receiveAll()`
construit un historique ; `setStepField()` fabrique une correction avec un repère choisi ;
`findResolvedStep / getResolvedStep / findResolvedItem / statusOf` pour interroger un arbre résolu.

| Fichier | Test | Scénario couvert |
|---|---|---|
| `resolve.spec.ts` | correction de pays survit, reste du refresh pris tel quel (poids 225, FINISHING comblé, nouveau composant présent) | *corrections survive a refresh* |
| | survit à plusieurs refresh successifs (3 arbres, poids 230, APPLIED) | *every later refresh* |
| | appliquer deux fois le même refresh → même référence | idempotence |
| | refresh qui contredit → CONFLICT, valeur de la marque, `declaredValue` = nouvelle déclaration | *contradicts* |
| | abandonner la correction → valeur déclarée, `DECLARED` | *drop my correction* |
| | refresh qui supprime l'étape → étape absente + ORPHANED | *removes something I corrected* |
| | fournisseur déclare maintenant la valeur corrigée → APPLIED | R4 cas « d'accord » |
| | ADD_STEP ajoute à la fin, `CORRECTED` | ajout d'étape |
| `corrections.spec.ts` | le repère est mémorisé | R3 |
| | nouvelle correction sur la même cible remplace l'ancienne | R2 |
| | garder un conflit → APPLIED | R5 |
| `composition.spec.ts` | 100 % accepté, décimales comprises | R9 |
| | 98 % refusé avec message clair | R9 |
| | denim déclaré signalé | données surprenantes |
| `publish.spec.ts` | version inchangée après refresh + écriture impossible (gelée) | *published version does not move* |
| | refus si composition invalide | R9 |
| | refus si rien n'a changé | R11 |

Non testés : controller/service (pas de tests e2e — supprimés au nettoyage), front,
correction orpheline qui redevient active, `keepCorrection` sur une composition.

### 3.9 Les flux de bout en bout (séquences)

**Corriger un fournisseur**
```
StepField (crayon → select → Enregistrer)
  → actions.addCorrection({type:'SET_STEP_FIELD', stepId, field, value})   [inject]
  → page.run → api.addCorrection → POST /products/:id/corrections
  → Controller.addCorrection → Service.addCorrection
      declared = currentDeclaredTree(history)
      corrections' = domain.addCorrection(declared, corrections, input)
          buildCorrection : vérifie, mémorise declaredValueAtCorrection
          retire l'ancienne correction de même cible, ajoute la nouvelle
      store.saveProduct({...product, corrections', lastModifiedAt: now})
      return buildView → resolveWorkingTree + problèmes + hasUnpublishedChanges
  ← 201 WorkingTreeView
  → view.value = réponse → Vue re-rend tout l'arbre → toast « Correction enregistrée. »
```

**Recevoir un refresh**
```
Bouton « Simuler un refresh » → POST /refreshes/simulate
  → Service.simulateRefresh : choisit le prochain fichier (par date)
  → Service.receiveRefresh : vérifie product.id
      history' = receiveDeclaredTree(history, tree, now)   // même tableau si identique
      accepted = history' !== history
      si accepté : sauvegarde declaredTrees + lastModifiedAt
  ← { accepted, workingTree }   // corrections intactes, statuts recalculés
```
**Rien n'est fait aux corrections pendant un refresh.** Leur survie n'est pas une
opération : c'est une conséquence du fait qu'elles sont stockées ailleurs.

**Garder / Revenir sur un conflit**
```
Garder  → POST /corrections/:cid/keep → keepCorrection : repère := déclaration actuelle → APPLIED
Revenir → DELETE /corrections/:cid    → la correction disparaît → la valeur redevient DECLARED
```

**Publier**
```
Bouton « Publier une version » → POST /versions
  → publishVersion(versions, resolve(product), now)
      problème de composition ? → DomainError → 400
      rien de changé ?          → DomainError → 400
      version = deepFreeze({ n+1, date, structuredClone(arbre de travail) })
  → store : versions' = [...versions, version]
  ← 201 PublishedVersion → le front recharge l'arbre de travail (tag « vN publiée »)
```

---

## 4. Limites, bugs et dettes connus

À connaître pour ne pas être prise de court — et pour montrer que vous les avez vues.

**Bugs / comportements discutables**

1. **Ressaisir la valeur déclarée crée une correction.** Si la marque remet elle-même la
   valeur du fournisseur, on obtient une correction dont `value == declaredValueAtCorrection`
   → affichée « Corrigé » et « Modifications à publier » alors que rien n'a changé à l'écran.
   Correctif simple : dans `addCorrection`, si la valeur saisie égale la déclaration
   actuelle, **supprimer** la correction existante au lieu d'en créer une.
2. **`console.log` de debug** oubliés dans `addCorrection` (`corrections.ts` l. 12-18) —
   ils s'affichent dans le terminal du back.
3. **`isSame` via `JSON.stringify` dépend de l'ordre des clés.** Deux arbres identiques
   avec des clés dans un ordre différent sont vus comme différents (un refresh identique
   serait alors accepté → historique qui grossit, `lastModifiedAt` qui bouge ; l'arbre
   affiché reste correct). Idem pour la comparaison des compositions : l'ordre des lignes compte.
4. **Le conflit de composition compare tout** (ids, ordre, origines). Un refresh qui ne
   change que l'origine d'une matière déclenche un `CONFLICT` sur toute la composition.
   C'est cohérent (une composition est corrigée en bloc) mais grossier ; un grain plus fin
   (par ligne) serait plus juste.
5. **`ADD_STEP` peut créer un doublon** : si la marque ajoute une étape SPINNING et que
   le fournisseur la déclare ensuite, l'arbre en contient deux. Il n'y a pas de détection
   « le fournisseur a fini par déclarer ce que j'avais ajouté ».
6. **Une correction orpheline se réactive toute seule** si la cible revient avec le même id.
   Comportement probablement souhaitable, mais non testé et non signalé à l'utilisatrice.
7. **« Garder » réécrit `createdAt`** : on perd la date d'origine de la correction (pas d'historique).
8. **`hasUnpublishedChanges` inclut les changements de statut** : un refresh qui fait passer
   une correction en `CONFLICT` sans changer aucune valeur affichée marque quand même
   « Modifications à publier » (la provenance/le statut font partie de ce qu'on compare).
9. **Filtrage des procédés par `appliesTo`** dans `AddStepForm`, alors que `processes.json`
   précise « vocabulaire contrôlé, pas une contrainte stricte ». Le back, lui, ne vérifie rien.
10. **Incohérence pays de l'étape / pays du fournisseur** non gérée (cf. §2.5).
11. **`simulateRefresh` compare `product.lastModifiedAt`** (date déclarée dans le fichier),
    alors que `receivedAt` est l'heure serveur : deux notions de date coexistent.

**Ce qui a été coupé (et comment le faire)**

- **Diff entre versions** — voir §5.
- **Validation des entrées de l'API** : le back fait confiance à la forme des corps de
  requête (un `rawMaterial` vide, un pourcentage négatif, un code pays inventé passent).
  À faire avec `ValidationPipe` + DTO `class-validator`, ou un schéma zod par type de correction.
- **Persistance** : trois tables (`declared_trees` en ajout seul, `corrections`,
  `versions` en ajout seul, JSONB pour les arbres), en remplaçant uniquement le store.
- **Corrections supplémentaires** : origine d'une matière, suppression d'une étape
  déclarée à tort, libellé… Le modèle s'étend en ajoutant un type à l'union `Correction`
  + un `case` dans `buildCorrection`, `computeStatus`, et la résolution.
- **Tests e2e** des routes et tests du front.

**Dette technique**

- Types dupliqués front/back (risque de divergence) → package partagé dans un monorepo
  (workspaces npm) ou génération depuis un schéma OpenAPI.
- URL de l'API codée en dur dans le front → `runtimeConfig` de Nuxt.
- `listProducts` recalcule tous les arbres à chaque appel.
- README par défaut de Nest et Nuxt laissés dans `backend/` et `frontend/`.
- Timebox dépassée (~6 h) et commits par phase en fin de session (assumé dans `TIMEBOX.md`).

---

## 5. Préparer le debrief : questions probables et réponses

### Les 5 questions annoncées dans l'énoncé

**« Une correction existe depuis deux ans et la branche qu'elle vise n'existe plus. »**
Elle est `ORPHANED` : jamais appliquée, jamais supprimée automatiquement, visible dans
l'alerte orange. Aujourd'hui elle y reste indéfiniment. En production, j'ajouterais :
une date d'orphelinage, un archivage automatique après un délai (ou à la publication
suivante), et la possibilité de **rattacher** la correction à une nouvelle cible (cas du
PACKAGING redéclaré sous un nouvel id `stp_a4`). Le vrai risque, c'est un changement
d'ids en masse côté collecte : toutes les corrections deviennent orphelines d'un coup —
il faut un contrat d'ids stables avec l'équipe collecte, et une alerte si beaucoup de
corrections deviennent orphelines dans un même refresh.

**« Deux utilisateurs éditent en même temps. »**
Aujourd'hui : dernier arrivé gagne, sans aucun contrôle. Les méthodes du service sont
synchrones et Node exécute une requête à la fois, donc pas de corruption en mémoire ;
mais l'utilisatrice B peut corriger à partir d'un écran périmé et écraser sans le savoir
la correction que A vient de faire sur le même champ. Avec une vraie base (lecture puis
écriture asynchrones de tout le `ProductRecord`), on risquerait en plus de perdre des
écritures. Mais le modèle aide : les corrections sont **indépendantes
par cible**. Donc (1) stocker les corrections en lignes séparées (une ligne par
correction) élimine la plupart des collisions : deux personnes qui corrigent deux champs
différents n'entrent jamais en conflit ; (2) pour la même cible, **verrou optimiste** :
le client envoie le `correctionId`/une version qu'il a vue, le serveur refuse (409) si
elle a changé ; (3) le front se rafraîchit à partir de la réponse, qui contient l'état
complet.

**« L'arbre devient 10× plus gros. »**
Le calcul est linéaire en taille d'arbre mais multiplie par le nombre de corrections
(boucle sur les corrections pour chaque champ). Pistes : indexer les corrections par
cible dans une `Map` (O(1) par champ) ; mettre en cache l'arbre résolu (invalidé à chaque
correction ou refresh — facile puisque ce sont les deux seuls événements) ; ne pas
recalculer tous les arbres dans `listProducts` mais stocker un résumé ; côté front,
replier les composants / paginer ; côté API, éventuellement renvoyer un sous-arbre.

**« Un consommateur aval doit savoir qu'une version a été publiée. »**
La publication est l'**unique** point de sortie vers les consommateurs (score, page
publique, éco-conception) : ils ne doivent lire que des versions, jamais l'arbre de
travail. À la publication, émettre un événement `TreeVersionPublished { productId,
versionNumber, publishedAt }` (bus / file de messages, ou webhook). Pour ne pas perdre
d'événement si la sauvegarde réussit mais l'envoi échoue : **outbox pattern** (l'événement
est écrit dans la même transaction que la version, puis envoyé par un worker). Les
consommateurs récupèrent la version complète par l'API (`GET /versions/:n`), qui est
immuable et donc cacheable indéfiniment.

**« La règle métier s'avère fausse. »**
Les règles sont isolées dans `domain/` → une modification = un fichier + ses tests.
Exemples : si la règle des 100 % doit tolérer ±1 %, on change `compositionError` ; si
le fournisseur doit finalement gagner en cas de conflit, on change la résolution
(`resolveStepField` renvoie la valeur déclarée quand le statut est `CONFLICT`), sans
toucher au stockage — parce que **l'arbre de travail n'est jamais stocké**, changer la
règle change immédiatement l'affichage de tous les produits, sans migration. En
revanche, **les versions publiées ne changent pas** : elles stockent l'arbre résolu, pas
la recette → ce qui a été communiqué reste exact. C'est un argument fort du modèle.

### Autres questions probables

**Pourquoi recalculer l'arbre au lieu de stocker l'arbre corrigé ?**
Si on stocke l'arbre corrigé, chaque refresh doit faire une **fusion** entre le nouvel
arbre et l'ancien arbre corrigé, et on perd l'information « qu'est-ce qui venait de qui ».
En gardant les deux sources séparées, un refresh est un simple remplacement, la survie
des corrections est automatique, la provenance est calculée gratuitement, et « revenir
à la déclaration » est une suppression.

**Pourquoi `declaredValueAtCorrection` ? Pourquoi ne pas comparer marque vs fournisseur ?**
Parce qu'une correction contredit **par définition** la déclaration : comparer marque vs
fournisseur mettrait toutes les corrections en conflit en permanence. Ce qu'on veut
détecter, c'est une **information nouvelle** du fournisseur — donc le comparer à lui-même.

**Pourquoi la marque gagne-t-elle en cas de conflit ?**
Exigence du Gherkin (« my correction still wins ») et logique produit : une correction
est une décision humaine explicite, plus fiable qu'un formulaire ; mais on ne la laisse
pas « figer » la branche puisque le conflit est signalé et que le reste de la branche
continue d'être mis à jour.

**Pourquoi une version stocke-t-elle l'arbre résolu et pas (arbre déclaré + corrections) ?**
Pour qu'une version soit **autoportante** : relisible même si la logique de résolution
évolue, directement consommable par les systèmes aval, et diffable simplement.

**Comment feriez-vous le diff entre versions ?**
Les ids sont stables : on aplatit les deux arbres en `Map<id, élément/étape>` ; id présent
seulement dans la nouvelle = **ajout**, seulement dans l'ancienne = **suppression**, dans
les deux avec des valeurs différentes = **modification** (champ par champ :
fournisseur, pays, composition, libellé…). Pure fonction dans `domain/diff.ts`, route
`GET /versions/:n/diff` (contre n-1), affichage en surlignant les éléments dans le même
`TreeView`. Même fonction réutilisable pour « qu'est-ce que ce refresh a changé ».

**Pourquoi une seule correction par cible ?**
Simplicité et lisibilité : la dernière intention de la marque est la seule qui compte.
Contrepartie : on perd l'historique des corrections. Évolution possible : stocker les
corrections en **journal** (ajout seul) et ne considérer que la dernière par cible.

**Pourquoi l'idempotence ne compare-t-elle qu'au dernier arbre reçu ?**
L'énoncé garantit que les refresh arrivent entiers et dans l'ordre. Le même refresh
rejoué juste après est donc le seul cas de doublon. Sans cette garantie, il faudrait un
identifiant ou un hash de refresh et rejeter les refresh plus anciens que le courant.

**Pourquoi un seul module Nest ?**
Un seul contexte métier. La vraie frontière est **domaine pur / infrastructure Nest**.
Si le système grandissait : un module `inventory` (fournisseurs, référentiels), un module
`traceability`, un module `publication` (versions + événements aval).

**Pourquoi un `DomainError` + filtre plutôt que lever des `BadRequestException` dans le domaine ?**
Le domaine ne doit pas dépendre de HTTP : les mêmes fonctions pourraient être appelées
par un worker, un CLI ou un test. Le filtre fait la traduction erreur métier → 400 à un seul endroit.

**Comment le front sait-il si c'est éditable ?**
`provide`/`inject` : la page d'édition fournit les actions, la page versions non. Les
composants masquent leurs boutons si `useTreeActions()` renvoie `null`.

**Pourquoi la règle des 100 % n'est-elle pas appliquée aux déclarations ?**
On ne peut pas refuser une déclaration fournisseur (elle arrive d'un autre système, et la
rejeter ferait perdre toutes les autres informations du refresh). On la **signale** et on
**bloque la publication** : l'erreur ne peut pas sortir vers les consommateurs.

**Comment avez-vous utilisé l'IA ?**
Voir la section du README : Claude pour comprendre le métier et construire le design
(image du calque), Claude Code pour écrire le code phase par phase avec une pause
d'explication à chaque étape, puis relecture complète du code généré (~1 h dans la
timebox). Soyez honnête sur ce que vous avez relu et compris — ce document a été fait
pour ça.

---

## 6. Antisèche React / Express → Vue / Nuxt / Nest

| Ce que vous connaissez | Ici | Fichier |
|---|---|---|
| `useState` | `ref()` (lire/écrire via `.value` dans le script, sans `.value` dans le template) | partout |
| `useMemo` | `computed()` | `StepField.vue`, `CompositionBlock.vue` |
| `useEffect(() => …, [])` | `onMounted()` | pages |
| `useEffect(…, [dep])` | `watch(dep, …)` | `versions.vue` |
| Context `Provider` / `useContext` | `provide()` / `inject()` | `treeActions.ts` |
| props | `defineProps<…>()` (+ `withDefaults`) | composants |
| `{cond && <X/>}` / ternaire | `v-if` / `v-else-if` / `v-else` | templates |
| `.map(x => <X key=…/>)` | `v-for="x in xs" :key="x.id"` | templates |
| `value` + `onChange` | `v-model:value` | selects, inputs |
| `onClick={f}` | `@click="f"` | boutons |
| `prop={expr}` | `:prop="expr"` | templates |
| render props / children nommés | slots (`<template #bodyCell>`, `#extra`, `#icon`) | tableaux, cartes |
| React Router `<Link>` / `<Outlet>` | `<NuxtLink>` / `<NuxtPage>` | `app.vue` |
| routes déclarées à la main | routing par fichiers (`pages/products/[productId]/index.vue`) | `pages/` |
| `app.get('/x', handler)` | `@Get('x')` dans un `@Controller` | controller |
| `req.params.id` / `req.body` | `@Param('id')` / `@Body()` | controller |
| middleware d'erreur `(err, req, res, next)` | `ExceptionFilter` + `@Catch(DomainError)` | `domain-error.filter.ts` |
| `require` d'un module singleton | injection de dépendances (`@Injectable`, constructeur) | service, store |
| `app.use(cors())` | `app.enableCors()` | `main.ts` |
