# Correctifs du parcours MyWeekPlan

## Objectif

Rendre fiable le parcours existant : configuration, inventaire du frigo,
génération du menu, remplacement d'un repas et liste de courses. Les nouvelles
fonctionnalités (authentification, PWA hors ligne, préférences alimentaires et
optimisation combinatoire des formats) sont hors périmètre.

## Architecture et flux de données

- `App.jsx` initialise et importe toutes les dépendances utilisées par l'écran.
  Les erreurs de chargement et de calcul sont affichées à l'utilisateur.
- Le module de calcul devient la source unique des besoins cumulés, de la
  déduction du frigo et du coût. Chaque recette proposée est enrichie d'un
  prix calculé, utilisable par l'interface.
- La liste de courses réutilise les besoins après déduction du frigo. Elle
  affiche les quantités exactes à acheter, groupées par rayon.
- Le remplacement d'un repas ne retourne que des alternatives respectant le
  budget. Lorsqu'il n'en existe pas, le menu est conservé et un message est
  affiché.

## Gestion des erreurs et règles métier

- Budget, portions et nombre de repas doivent être des nombres finis,
  strictement positifs.
- Si les données Supabase sont indisponibles ou incomplètes, aucune transition
  d'écran n'est effectuée et une erreur explicite est affichée.
- Si le nombre de recettes disponibles est insuffisant ou le budget impossible,
  le générateur renvoie une erreur lisible.
- Un ingrédient sans produit associé est signalé dans le résultat de calcul ;
  il ne doit pas être traité comme gratuit.

## Tests

Les fonctions de calcul pures seront testées sans connexion Supabase :

1. calcul des besoins selon les portions ;
2. déduction du stock du frigo ;
3. prix des recettes présents dans le menu ;
4. rejet d'un budget impossible et d'entrées invalides ;
5. liste de courses limitée aux besoins restant à acheter.

## Critères d'acceptation

- L'écran de configuration se rend sans erreur JavaScript.
- Un menu réalisable affiche un prix pour chaque repas et un total cohérent.
- Un menu impossible ne mène pas à l'écran de menu.
- La liste de courses ne contient pas les ingrédients déjà couverts par le
  frigo.
- Le reroll garde le budget respecté ou explique qu'il n'y a pas d'alternative.
