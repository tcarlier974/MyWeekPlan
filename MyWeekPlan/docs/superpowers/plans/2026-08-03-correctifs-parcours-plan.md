# Correctifs du parcours MyWeekPlan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le parcours de planification fiable, du formulaire à la liste de courses déduite du frigo.

**Architecture:** Extraire les calculs déterministes dans un module pur et testé. Le solveur Supabase l'utilise pour enrichir chaque recette et l'interface ne change d'écran que lorsqu'un résultat valide est reçu.

**Tech Stack:** React 19, Vite 8, Supabase JS, Node test runner.

## Global Constraints

- Ne pas ajouter d’authentification, de PWA hors ligne ou de nouveaux filtres.
- Les entrées budget, repas et portions doivent être finies et strictement positives.
- Les ingrédients sans produit référencé doivent empêcher un calcul de prix présenté comme fiable.
- La liste affiche uniquement les quantités qui restent à acheter après stock.

---

## Structure des fichiers

- Créer `src/utils/menuCalculations.js` : fonctions pures de validation, agrégation, déduction du frigo et valorisation.
- Créer `src/utils/menuCalculations.test.js` : régressions du moteur, exécutées avec `node --test`.
- Modifier `src/utils/solver.js` : orchestration Supabase et règles de sélection/reroll, sans logique de calcul dupliquée.
- Modifier `src/utils/shoppingList.js` : lecture Supabase et appel aux calculs partagés.
- Modifier `src/App.jsx` : états/imports manquants, erreurs utilisateur et transitions conditionnelles.
- Modifier `package.json` : script `test` fondé sur `node --test`.

### Task 1: Calculs de besoins et de stock

**Files:**
- Create: `src/utils/menuCalculations.js`
- Create: `src/utils/menuCalculations.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `validatePlanningInput(budget, mealsCount, portions)`, `getRequiredQuantities(menu, portions)`, `subtractInventory(requirements, inventory)`, `priceMenu(menu, portions, products, inventory)`.
- `priceMenu` returns `{ totalCost, meals, missingTags }`.

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { getRequiredQuantities, subtractInventory } from './menuCalculations.js'

test('subtracts fridge stock from cumulative requirements', () => {
  const needs = getRequiredQuantities([{ ingredients: [{ tag: 'pates', besoin_grammes: 200 }] }], 2)
  assert.deepEqual(subtractInventory(needs, [{ tag_ingredient: 'pates', quantite_accumulee: 250 }]), {})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/utils/menuCalculations.test.js`

Expected: FAIL because `menuCalculations.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export function getRequiredQuantities(menu, portions) {
  return menu.reduce((requirements, recipe) => {
    for (const ingredient of recipe.ingredients || []) {
      requirements[ingredient.tag] = (requirements[ingredient.tag] || 0) + ingredient.besoin_grammes * portions
    }
    return requirements
  }, {})
}

export function subtractInventory(requirements, inventory) {
  const stock = Object.fromEntries(inventory.map(({ tag_ingredient, quantite_accumulee }) => [tag_ingredient, quantite_accumulee]))
  return Object.fromEntries(Object.entries(requirements).map(([tag, quantity]) => [tag, Math.max(0, quantity - (stock[tag] || 0))]).filter(([, quantity]) => quantity > 0))
}
```

- [ ] **Step 4: Verify the test passes and activate the test script**

Run: `node --test src/utils/menuCalculations.test.js`

Expected: PASS.

Add to `package.json`:

```json
"test": "node --test"
```

- [ ] **Step 5: Commit**

```bash
git add package.json src/utils/menuCalculations.js src/utils/menuCalculations.test.js
git commit -m "test: cover menu quantity calculations"
```

### Task 2: Coûts fiables et solveur conforme au budget

**Files:**
- Modify: `src/utils/menuCalculations.js`
- Modify: `src/utils/menuCalculations.test.js`
- Modify: `src/utils/solver.js`

**Interfaces:**
- Consumes: `priceMenu(menu, portions, products, inventory)` from Task 1.
- Produces: `generateWeeklyMenu` result `{ success, menu, totalCost, error }`; each menu recipe has finite `prixCalcule`.

- [ ] **Step 1: Write the failing test**

```js
import { priceMenu } from './menuCalculations.js'

test('prices recipes and reports products that have no catalogue entry', () => {
  const result = priceMenu([{ id: 1, ingredients: [{ tag: 'riz', besoin_grammes: 500 }] }], 1, [{ tag_ingredient: 'riz', poids_grammes: 1000, prix: 2 }], [])
  assert.equal(result.totalCost, 1)
  assert.equal(result.meals[0].prixCalcule, 1)
  assert.deepEqual(result.missingTags, [])
})
```

- [ ] **Step 2: Verify the test fails**

Run: `node --test src/utils/menuCalculations.test.js`

Expected: FAIL because `priceMenu` is not exported.

- [ ] **Step 3: Implement cost and selection rules**

`priceMenu` must use cumulative quantities after fridge deduction and attach the allocated recipe price only for display. `generateWeeklyMenu` must reject invalid input, a catalogue gap, fewer recipes than requested and a target budget with no valid combination. Remove the duplicate `generateShoppingList` export from `solver.js`.

- [ ] **Step 4: Verify the tests pass**

Run: `node --test src/utils/menuCalculations.test.js`

Expected: PASS, including an added invalid-input test.

- [ ] **Step 5: Commit**

```bash
git add src/utils/menuCalculations.js src/utils/menuCalculations.test.js src/utils/solver.js
git commit -m "fix: enforce planning budget and recipe prices"
```

### Task 3: Liste et reroll cohérents

**Files:**
- Modify: `src/utils/menuCalculations.js`
- Modify: `src/utils/menuCalculations.test.js`
- Modify: `src/utils/shoppingList.js`
- Modify: `src/utils/solver.js`

**Interfaces:**
- Produces: `buildShoppingList(menu, portions, products, inventory)` returning grouped items after stock deduction.
- `getAlternativeMeal` returns `{ success: false, error }` when no replacement respects the target budget.

- [ ] **Step 1: Write the failing tests**

```js
import { buildShoppingList } from './menuCalculations.js'

test('omits ingredients fully covered by fridge stock', () => {
  const list = buildShoppingList([{ ingredients: [{ tag: 'oeufs', besoin_grammes: 200 }] }], 1, [{ tag_ingredient: 'oeufs', nom_produit: 'Œufs', rayon: 'Frais' }], [{ tag_ingredient: 'oeufs', quantite_accumulee: 200 }])
  assert.deepEqual(list, {})
})
```

- [ ] **Step 2: Verify the test fails**

Run: `node --test src/utils/menuCalculations.test.js`

Expected: FAIL because `buildShoppingList` is not exported.

- [ ] **Step 3: Implement the shared shopping-list builder and strict reroll**

`shoppingList.js` loads both product catalogue and inventory, then delegates grouping to `buildShoppingList`. `getAlternativeMeal` only selects candidates whose recomputed complete menu cost is within budget; it no longer returns an over-budget success.

- [ ] **Step 4: Verify the tests pass**

Run: `node --test src/utils/menuCalculations.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/menuCalculations.js src/utils/menuCalculations.test.js src/utils/shoppingList.js src/utils/solver.js
git commit -m "fix: deduct fridge stock from shopping list"
```

### Task 4: Interface robuste

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `{ success, menu, totalCost, error }` from `generateWeeklyMenu` and `{ success, recette, error }` from `getAlternativeMeal`.

- [ ] **Step 1: Write the failing build expectation**

Run: `npm run build`

Expected: baseline cannot currently run until dependencies are installed; after setup, the application must build without undefined symbols.

- [ ] **Step 2: Verify the current browser-breaking references**

Inspect `App.jsx` and confirm `tagsDisponibles`, `setTagsDisponibles`, and `supabase` are referenced without matching declarations/import.

- [ ] **Step 3: Implement minimal UI corrections**

Add the Supabase import and `tagsDisponibles` state. Make error messages depend on `success`/`error`, reset loading in `finally`, validate finite positive numeric form values and display reroll errors rather than `alert`. Keep the current visual layout.

- [ ] **Step 4: Verify build and tests**

Run: `npm test && npm run lint && npm run build`

Expected: all commands PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "fix: handle planning errors in interface"
```

### Task 5: Final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Reconcile documentation**

Remove the claim that the app already optimises combinations of package formats. Document the current exact-quantity calculation and fridge deduction.

- [ ] **Step 2: Run full verification**

Run: `npm test && npm run lint && npm run build && git diff --check`

Expected: PASS with no diff whitespace errors.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: align shopping behaviour description"
```

