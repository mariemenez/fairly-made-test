# Synthèse : corrections et versions des arbres de traçabilité

## Où ça se branche

La fonctionnalité se place dans le bloc **Traçabilité**.

- Elle reçoit les arbres complets reconstruits à partir des formulaires fournisseurs.
- Elle intègre les corrections apportées par la marque, stockées séparément des déclarations fournisseurs.
- En sortie, elle génère des versions publiées, qui sont utilisées par la page publique, les calculs d’impact et les fonctionnalités d’éco-conception.

## Ce que ça pourrait casser

- **Le pays d'une étape peut contredire le pays de son fournisseur.** Le pays est
  stocké à deux endroits : dans l'inventaire (le pays de l'usine) et dans l'arbre
  (le pays de l'étape). Quand la marque corrige le fournisseur d'une étape, le pays
  de l'étape ne change pas. Le calcul d'impact, qui dépend du pays, et la page publique
  pourraient alors s'appuyer sur une information incohérente. Il faudrait décider
  lequel fait foi, ou au minimum signaler l'incohérence à la marque.
- **Tout repose sur des ids stables.** Si le système de collecte change les ids d'un
  arbre, toutes les corrections de ce produit deviennent orphelines d'un coup.

## Ce dont elle a besoin de ses voisins

- **Du système de collecte** : des identifiants stables d’un refresh à l’autre, des arbres complets transmis dans le bon ordre, avec leur date.
- **De l’inventaire** : un registre à jour des fournisseurs

## Ce que je voudrais savoir avant de le construire pour de vrai

- Une marque peut-elle corriger sans justification ?
- Les fournisseurs sont-ils informés des corrections de la marque ?
- Quelle est la fréquence de publication de version ?
