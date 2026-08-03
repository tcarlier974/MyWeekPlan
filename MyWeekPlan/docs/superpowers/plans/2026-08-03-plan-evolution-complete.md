# MyWeekPlan Evolution Plan

> **Purpose:** documenter une feuille de route unique pour faire évoluer MyWeekPlan, tout en permettant de suivre l’avancement étape par étape.

> **How to use this file:** cocher les items terminés, ajouter une date de livraison quand une phase est validée, et garder une seule source de vérité pour le produit.

## Goal

Faire évoluer MyWeekPlan d’un planificateur de menus fonctionnel vers une vraie application de préparation de repas: plus agréable à utiliser, plus fiable, plus utile au quotidien, et plus facile à faire évoluer.

## Current Baseline

- L’app génère déjà un menu hebdomadaire.
- Le frigo peut être pris en compte.
- La liste de courses est déjà générée.
- Le design principal a déjà été enrichi avec un hero, un step tracker et un résumé visuel.
- Les plats peuvent être verrouillés avant reroll.

## Global Principles

- Ne pas casser le flux principal: budget -> menu -> courses.
- Garder une UI simple, lisible et rapide.
- Préférer des changements petits et testables.
- Ajouter des tests à chaque évolution métier importante.
- Préserver le mode dégradé quand Supabase n’est pas disponible.

## Tracking Legend

- `[ ]` not started
- `[-]` in progress
- `[x]` done

## Phase 1: Reliability and Core UX

### 1.1 Stabiliser les états de l’application

- [x] Supabase ne doit pas faire crasher l’UI si la config manque.
- [x] La génération de menu doit échouer proprement avec un message lisible.
- [x] Le reroll doit afficher une erreur inline au lieu d’un `alert`.
- [x] Le chargement doit être reset dans un `finally`.
- [x] Ajouter un état de chargement visuel plus explicite sur les écrans menu et courses.
- [x] Empêcher les doubles clics pendant une génération ou un reroll.

### 1.2 Sécuriser les entrées

- [x] Budget, nombre de repas et portions sont validés comme des nombres positifs.
- [x] Ajouter des messages d’aide sous chaque champ de formulaire.
- [x] Limiter les valeurs extrêmes pour éviter des menus irréalistes.
- [x] Ajouter une validation fine des quantités du frigo.

### 1.3 Nettoyer les retours métier

- [x] Le solveur retourne un contrat cohérent avec `success`, `menu`, `totalCost`, `error`.
- [ ] Unifier tous les retours d’erreur dans un format commun.
- [ ] Harmoniser les noms des propriétés de recette et de shopping list.

## Phase 2: Design System and Visual Polish

### 2.1 Renforcer l’identité visuelle

- [x] Ajouter un hero panel plus fort.
- [x] Ajouter un step tracker visible.
- [x] Ajouter des métriques rapides pour budget, repas, portions et frigo.
- [x] Définir une palette de composants stable dans `App.css`.
- [x] Donner un thème plus marqué à l’application: saisonnier, cuisine maison, marché ou bistro.
- [x] Introduire une variante visuelle par état: normal, vide, erreur, succès.

### 2.2 Améliorer la densité d’information

- [x] Ajouter un résumé compact du menu généré.
- [x] Ajouter une zone “résumé de la semaine” plus complète avec coût/jour et coût/portion.
- [x] Afficher les économies générées par le frigo.
- [x] Afficher la part de stock déjà couverte avant achat.

### 2.3 Polir l’interaction

- [x] Ajouter des transitions entre les étapes plus douces.
- [x] Ajouter des micro-interactions sur les boutons et cartes.
- [x] Ajouter un feedback plus visible au clic sur verrouillage, reroll et validation.
- [ ] Prévoir des skeletons pendant le chargement des données.

## Phase 3: Menu Engine and Anti-Gaspi

### 3.1 Rendre la génération plus intelligente

- [x] Remplacer la recherche exhaustive par une recherche bornée pour éviter les explosions combinatoires.
- [ ] Ajouter un mode “menu économique”.
- [ ] Ajouter un mode “menu équilibré”.
- [ ] Ajouter un mode “rapide à préparer”.
- [ ] Ajouter un mode “anti-gaspi prioritaire”.

### 3.2 Verrouillage et reroll

- [x] Verrouiller un plat avant reroll.
- [ ] Verrouiller plusieurs plats d’un coup.
- [ ] Conserver l’ordre du menu lors des rerolls.
- [ ] Proposer automatiquement des alternatives proches du plat verrouillé.
- [ ] Afficher un score de compatibilité pour chaque alternative.

### 3.3 Diversité du menu

- [ ] Éviter les répétitions d’ingrédients trop proches dans la semaine.
- [ ] Favoriser la variété protéines / légumes / féculents.
- [ ] Ajouter une logique de rotation des familles de plats.
- [ ] Ajouter une contrainte de diversité sur les déjeuners et dîners.

## Phase 4: Shopping List and Fridge Experience

### 4.1 Liste de courses plus utile

- [ ] Afficher un sous-total par rayon.
- [ ] Trier les items par ordre de magasin.
- [ ] Permettre de masquer les quantités déjà couvertes par le frigo.
- [ ] Garder l’état coché en localStorage.
- [ ] Ajouter un export imprimable ou PDF.

### 4.2 Frigo plus riche

- [ ] Ajouter des quantités au frigo par unité plus claire: g, kg, ml, l, pièces.
- [ ] Permettre de supprimer un ingrédient du frigo.
- [ ] Ajouter une recherche dans les tags disponibles.
- [ ] Préremplir des quantités fréquentes en un clic.
- [ ] Ajouter un indicateur “à consommer rapidement”.

### 4.3 Déduction plus fine

- [ ] Afficher précisément ce qui est pris dans le frigo et ce qui reste à acheter.
- [ ] Gérer les unités mixtes de façon plus robuste.
- [ ] Gérer les arrondis de manière claire pour éviter des quantités bizarres.

## Phase 5: Recettes, Navigation and Product Features

### 5.1 Navigation et découverte

- [ ] Ajouter une vue calendrier semaine.
- [ ] Ajouter une vue carte par jour.
- [ ] Permettre de cliquer sur un plat pour voir les étapes de préparation détaillées.
- [ ] Ajouter un accès direct aux recettes favorites.

### 5.2 Filtres utiles

- [ ] Filtrer par temps de préparation.
- [ ] Filtrer par type de plat.
- [ ] Filtrer par régime ou préférence.
- [ ] Filtrer par présence d’ingrédients à la maison.

### 5.3 Personnalisation

- [ ] Permettre de modifier manuellement un plat du menu.
- [ ] Permettre de dupliquer un menu précédent.
- [ ] Permettre de sauvegarder un profil foyer.
- [ ] Proposer des menus selon le nombre de personnes et le jour de la semaine.

## Phase 6: History, Sharing and Retention

### 6.1 Historique

- [ ] Enregistrer les menus générés.
- [ ] Permettre de recharger un ancien menu.
- [ ] Ajouter une page “mes dernières semaines”.
- [ ] Montrer les menus les plus efficaces en budget.

### 6.2 Partage

- [ ] Générer une image récapitulative du menu.
- [ ] Générer un lien de partage.
- [ ] Exporter la liste de courses pour quelqu’un d’autre.

### 6.3 Favoris et habitudes

- [ ] Sauvegarder les recettes aimées.
- [ ] Sauvegarder les ingrédients souvent utilisés.
- [ ] Réutiliser les patterns de menus qui plaisent le plus.

## Phase 7: Quality, Tests and Maintenance

### 7.1 Tests

- [x] Les calculs de base sont couverts par des tests Node.
- [ ] Ajouter un test sur le verrouillage des plats.
- [ ] Ajouter un test sur le reroll refusé quand un plat est verrouillé.
- [ ] Ajouter un test sur la génération de menu avec un grand catalogue.
- [ ] Ajouter un test sur la liste de courses avec frigo partiellement couvert.

### 7.2 Observabilité

- [ ] Ajouter des logs métier plus lisibles en dev.
- [ ] Ajouter un reporting des erreurs de chargement Supabase.
- [ ] Ajouter un indicateur visible quand les données viennent du cache ou du mode dégradé.

### 7.3 Maintenance

- [ ] Extraire plus de logique UI dans des composants dédiés.
- [ ] Extraire les constantes métiers dans des fichiers de configuration.
- [ ] Réduire les styles inline restants.
- [ ] Nettoyer les noms de variables et normaliser les conventions FR/EN.

## Suggested Delivery Order

1. Fiabilité et entrées.
2. Design et lisibilité.
3. Menu engine et anti-gaspi.
4. Liste de courses et frigo.
5. Recettes, partage et historique.
6. Tests et maintenance.

## Definition of Done for Each Phase

- Le comportement attendu est visible dans l’UI.
- Le build passe.
- Les tests pertinents passent.
- Le nouveau comportement est documenté ici.
- La phase peut être suivie sans relire tout le code.

## Notes

- Les tâches marquées `[x]` correspondent à ce qui est déjà en place dans le code actuel.
- Les autres items servent de backlog de progression.
- Quand une nouvelle fonctionnalité est ajoutée, la déplacer de la liste à faire vers la section terminée.