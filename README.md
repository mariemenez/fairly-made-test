# Test technique Fairly Made

## Lancer le projet

### Installation

```bash
git clone https://github.com/mariemenez/fairly-made-test.git
cd fairly-made-test

cd backend && npm install
cd ../frontend && npm install
```

### Démarrage

```bash
cd backend
npm run start:dev
```

```bash
cd frontend
npm run dev
```

L'application est accessible sur http://localhost:3000.

### Tests

```bash
cd backend
npm test
```

### À savoir

- **Stockage en mémoire.** Au démarrage, le back charge les arbres de `data/trees/`.
  Les corrections et les versions publiées sont gardées en mémoire et perdues à chaque
  redémarrage du back : on repart de l'état initial.
- **Simuler un refresh.** Le bouton « Simuler un refresh » de la page d'un produit
  applique le prochain fichier de `data/refreshes/` concernant ce produit, par ordre
  de date.

### Démo suggérée

1. Ouvrir la marinière et corriger le fournisseur de l'étape de teinture du jersey.
2. Publier une première version.
3. Simuler un refresh : la correction tient, le fournisseur déclare désormais autre
   chose (conflit signalé)
4. Ouvrir les versions : la version 1 n'a pas bougé.

## Comment j'ai lu le problème

Un arbre de traçabilité décrit comment un vêtement a été fabriqué.

Tout en haut, le produit et ses étapes d'assemblage (coupe, confection…). En dessous,
ses composants (tissu, col, fil, étiquette…). Chaque composant a une composition
(les pourcentages de matières premières) et ses propres étapes de production.
Sous un composant, on peut trouver les matières, avec leurs étapes (culture, filature…).
Chaque étape indique, quand on le sait, le fournisseur et le pays.

**L'arbre est rarement complet.** Les trous ne sont pas des erreurs : c'est la liste
de ce que la responsable RSE doit encore aller chercher. Il faut les mettre en avant.

**Il y a deux sources de vérité :**

- la responsable RSE de la marque, qui corrige un champ via l'interface
- le fournisseur, qui remplit un formulaire, ce qui renvoie l'arbre entier (un refresh).

Aucune ne doit effacer l'autre : si un refresh écrase les corrections, la responsable
arrête de faire confiance à l'outil;si les corrections bloquent les refresh, l'arbre
ne se met plus à jour.

**Un arbre publié ne bouge plus.** Il sert à un score, d'autres systèmes s'appuient dessus.

**Conclusion :** l'arbre que voit l'utilisatrice n'est pas stocké. Il est recalculé
à chaque fois, en appliquant les corrections de la marque par-dessus le dernier arbre
déclaré par les fournisseurs, et chaque valeur indique si elle vient d'une déclaration
ou d'une correction. Une version publiée est une copie figée de cet arbre calculé.

## Modèle et architecture

### Les objets du domaine

Tous les types sont dans `backend/src/domain/types.ts`.

- **`DeclaredTree`** : un arbre tel que l'envoient les fournisseurs, fidèle au JSON reçu.
- **`Correction`** : une correction de la marque, ciblée par id. Trois types :
  `SET_STEP_FIELD` (fournisseur ou pays d'une étape), `ADD_STEP` (nouvelle étape sur
  un élément), `SET_COMPOSITION` (nouvelle composition d'un composant). Chaque
  correction mémorise la valeur que déclarait le fournisseur au moment où elle a été
  faite (`declaredValueAtCorrection`), pour détecter plus tard s'il a changé d'avis.
- **`ResolvedTree`** : l'arbre de travail, ce que voit l'utilisatrice.
  Il n'est jamais stocké, il est calculé. Chaque valeur corrigeable est un
  `TrackedValue` qui indique sa provenance (`DECLARED` ou `CORRECTED`) et, pour une
  correction, son statut et la valeur déclarée d'en face.
- **`PublishedVersion`** : une copie figée d'un `ResolvedTree`, numérotée et datée.

Pour chaque produit, le store garde trois listes séparées : les arbres déclarés reçus
(le courant est le dernier), les corrections, et les versions publiées.

### Où vivent les règles

Toutes les règles métier sont dans `backend/src/domain/`

- `resolve.ts` : réception d'un refresh (ignoré s'il est identique au dernier) et calcul
  de l'arbre de travail, avec le statut de chaque correction (`APPLIED`, `CONFLICT`,
  `ORPHANED`)
- `corrections.ts` : ajouter, retirer ou garder une correction
- `composition.ts` : validation « la composition fait 100 % »
- `publish.ts` : publication d'une version.

### Le back NestJS

- **`TraceabilityController`** : déclare les routes REST et ne fait que transmettre.
- **`TraceabilityService`** : orchestre. Il lit l'état dans le store, appelle les
  fonctions du domaine, enregistre le résultat et renvoie l'arbre de travail recalculé.
- **`TraceabilityStore`** : le stockage, en mémoire. Il charge `data/` au démarrage.
  C'est le seul endroit à remplacer pour passer à une vraie base de données.
- **`DomainErrorFilter`** : transforme toute `DomainError` en réponse 400 avec son message.
  Le domaine n'a donc pas à connaître HTTP.

### Le front Nuxt

Trois pages : la liste des produits, l'arbre de travail d'un produit, et ses versions
publiées.

### Choix de stack

- **CommonJS + Jest** côté back : la configuration par défaut de Nest, la plus documentée,
  pour limiter les risques sur une stack que je découvrais.
- **Stockage en mémoire** : autorisé par l'énoncé, réinitialisé à chaque démarrage.
- **Rendu côté navigateur uniquement** (`ssr: false`) : outil interne, pas de référencement.
- **ant-design-vue** : pour ne pas passer de temps sur l'affichage (tableaux, formulaires,
  alertes) et le concentrer sur le cœur du sujet.

Avec ma stack habituelle, l'architecture aurait été la même : le dossier `domain/`
identique, un routeur Express à la place du contrôleur Nest, un module à la place du
service et du store, et un middleware d'erreur à la place du `DomainErrorFilter`.
Côté front, des composants React avec un Context pour les actions d'édition, là où
j'ai utilisé `provide` / `inject` en Vue.

## Comment une correction survit à un refresh

La correction est stockée à part et "posée" sur le dernier arbre déclaré a chaque fois qu'on recalcule l'abre de travail. Le refresh ajoyte un nouvel arbe déclaré mais les corrections ne bougent pas. Les corrections sont toujours "par-dessus" l'arbre déclaré.

Une correction contient :

- la valeur affirmée par la marque (`value`)
- la valeur que déclarait le fournisseur au moment de la correction
  (`declaredValueAtCorrection`), qui sert de point de repère pour savoir si le
  fournisseur a changé d'avis depuis.

Il y a une seule correction par id. Si on corrige deux fois le même item on garde la dernière correction.

Seules les corrections de la marque ont un statut. Une valeur que la marque n'a jamais
corrigée est simplement affichée comme déclarée.

Quand la marque corrige une valeur, la correction est créée avec le statut `APPLIED`.
Ensuite, à chaque refresh, ce statut est recalculé. Il ne compare pas la marque au
fournisseur : il compare **ce que déclarait le fournisseur au moment de la correction**
à **ce qu'il déclare maintenant**.

| Statut     | Quand                                                                                                                                                                                                                                                                                                                             | Effet                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `APPLIED`  | Juste après la correction, puis tant que le fournisseur ne déclare rien de nouveau. Aussi quand le fournisseur finit par déclarer la même valeur que la marque.                                                                                                                                                                   | La correction s'applique, sans alerte. |
| `CONFLICT` | Après un refresh où le fournisseur déclare une nouvelle valeur, différente de celle d'avant et de celle de la marque. La correction s'applique quand même, et l'écran signale la nouvelle déclaration. La marque peut garder sa correction (elle repasse en `APPLIED`) ou revenir à la déclaration (la correction est supprimée). |
| `ORPHANED` | Après un refresh qui ne contient plus la cible de la correction.                                                                                                                                                                                                                                                                  |

## Versioning

C'est une copie figée de l'abre de travail (dernier arbredéclaré + corrections) avec la provenance des valeurs. Les versions sont numérotées v1, v2 etc.
Les versions sont uniquement ajoutées, jamais modifiées ni supprimées.

- **Refus si une composition est invalide** (ne fait pas 100 %) : on ne publie pas un
  arbre faux. Conséquence : la veste en denim, déclarée à 98 %, ne peut pas être publiée
  tant que la marque n'a pas corrigé sa composition.
- **Refus si rien n'a changé** depuis la dernière version, pour éviter des versions
  identiques.

Les corrections survivent aux refresh parce qu'elles sont stockées à part de l'arbre déclaré;
les versions ne bougent pas parce qu'elles sont stockées à part de l'arbre de travail.

## Données surprenantes

**La composition du denim fait 98 %** (96 % coton + 2 % élasthanne), alors que la règle
impose 100 %. Elle est signalée comme invalide dans l'arbre de travail, et elle bloque
la publication tant que la marque ne l'a pas corrigée. La règle des 100 % s'applique
donc strictement aux corrections de la marque, et aux versions publiées.

**Le pays d'une étape peut contredire celui de son fournisseur.** Le pays est stocké
à deux endroits : sur l'étape, et sur le fournisseur dans `suppliers.json`. Si la marque
corrige le fournisseur d'une étape, le pays de l'étape ne change pas : on peut obtenir
une usine d'un pays X sur une étape située dans un pays Y.

## Ce que j'ai coupé, et ce que je ferais ensuite

J'ai concentré mon temps sur la découverte de Nuxt et Nest et sur le cœur de l'exercice :
les corrections qui survivent aux refresh, et les versions qui ne bougent pas. Le reste
a été coupé ou simplifié. Dans l'ordre où je le reprendrais :

**Le diff entre versions.** Chaque version s'ouvre en lecture seule, mais sans afficher
ce qui a changé par rapport à la précédente. Comme les ids sont stables, il se calculerait
en comparant les deux copies par id : un id présent seulement dans la nouvelle version est
un ajout, seulement dans l'ancienne une suppression, et dans les deux avec des valeurs
différentes une modification.

**Corriger le bug de la valeur ressaisie**.
Si la marque change un fournisseur, puis ressaisit elle-même l'ancien
fournisseur dans le champ, l'app indique « modifications à publier » alors que rien
n'a changé à l'écran. Ressaisir l'ancienne valeur ne supprime pas la correction : ça en crée
une nouvelle, dont la valeur est identique à la déclaration.

**Valider les données reçues par l'API.** Le back fait confiance à la forme du corps
des requêtes, donc rien ne vérifie réellement ce qui arrive.

**La persistance.** Tout est en mémoire et perdu au redémarrage, ce que l'énoncé
autorise. Le passage à une base se ferait en remplaçant uniquement le store, avec trois
tables : arbres déclarés, corrections, versions (ces dernières en écriture seule).

**Élargir ce qui est corrigeable.** Seuls le fournisseur et le pays d'une étape,
l'ajout d'étape et la composition sont corrigeables, parce que ce sont les actions du
Gherkin. La marque pourrait aussi vouloir corriger l'origine d'une matière ou supprimer
une étape déclarée à tort; le modèle le permet en ajoutant de nouveaux types de correction.

## Utilisation de l'IA

J'ai utilisé deux outils : Claude (conversation) pour comprendre, concevoir et rédiger,
et Claude Code pour écrire le code.

**Pour comprendre et concevoir.** L'énoncé et le métier étaient nouveaux pour moi.
J'ai utilisé Claude comme un interlocuteur pour comprendre ce qu'est un arbre de
traçabilité, qui voit quoi (fournisseur, marque, consommateur), et pour construire le
design : stocker les déclarations et les corrections séparément, et calculer l'arbre de
travail en superposant les unes sur les autres. J'ai posé beaucoup de questions jusqu'à
pouvoir l'expliquer avec mes mots (l'image du calque posé sur un plan).

**Pour la stack.** Je n'avais jamais utilisé Nest ni Nuxt. L'IA m'a aidée à installer
les deux et à faire le lien avec ce que je connais (Context React ↔ provide/inject,
middleware Express ↔ filtre d'exception Nest).

**Pour le code.** J'ai donné à Claude Code un prompt décrivant le design, et je lui ai
demandé d'avancer phase par phase (types, calcul, corrections, API, front) en s'arrêtant
à chaque fois pour m'expliquer.

**Pour la rédaction.** Ce README a été rédigé avec l'aide de Claude à partir de mon code
et de nos échanges.
