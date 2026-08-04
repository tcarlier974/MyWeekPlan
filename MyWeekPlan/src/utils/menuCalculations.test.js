import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getRequiredQuantities,
  priceMenu,
  normalizePlanningMode,
  selectAffordableMenu,
  subtractInventory,
  validatePlanningInput,
} from './menuCalculations.js'

test('adds the same ingredient required by separate recipes', () => {
  const needs = getRequiredQuantities([
    { ingredients: [{ tag: 'riz', besoin_grammes: 150 }] },
    { ingredients: [{ tag: 'riz', besoin_grammes: 250 }] },
  ], 1)

  assert.deepEqual(needs, { riz: 400 })
})

test('subtracts fridge stock from cumulative requirements', () => {
  const needs = getRequiredQuantities([
    { ingredients: [{ tag: 'pates', besoin_grammes: 200 }] },
  ], 2)

  assert.deepEqual(
    subtractInventory(needs, [{ tag_ingredient: 'pates', quantite_accumulee: 250 }]),
    { pates: 150 },
  )
})

test('removes requirements fully covered by fridge stock', () => {
  const needs = getRequiredQuantities([
    { ingredients: [{ tag: 'pates', besoin_grammes: 200 }] },
  ], 2)

  assert.deepEqual(
    subtractInventory(needs, [{ tag_ingredient: 'pates', quantite_accumulee: 500 }]),
    {},
  )
})

test('adds duplicate fridge entries before subtracting stock', () => {
  assert.deepEqual(
    subtractInventory(
      { riz: 500 },
      [
        { tag_ingredient: 'riz', quantite_accumulee: 100 },
        { tag_ingredient: 'riz', quantite_accumulee: 150 },
      ],
    ),
    { riz: 250 },
  )
})

test('rejects non-finite or non-positive planning values', () => {
  assert.equal(validatePlanningInput(20, 7, 2), true)
  assert.equal(validatePlanningInput(0, 7, 2), false)
  assert.equal(validatePlanningInput(Number.POSITIVE_INFINITY, 7, 2), false)
  assert.equal(validatePlanningInput(20, Number.NaN, 2), false)
})

test('prices a menu after fridge deduction and reports missing products', () => {
  const result = priceMenu(
    [{ id: 1, ingredients: [{ tag: 'riz', besoin_grammes: 500 }] }],
    1,
    [{ tag_ingredient: 'riz', poids_grammes: 1000, prix: 2 }],
    [],
  )

  assert.equal(result.totalCost, 1)
  assert.equal(result.meals[0].prixCalcule, 1)
  assert.deepEqual(result.missingTags, [])
})

test('selects only a complete menu that fits the target budget', () => {
  const result = selectAffordableMenu(
    [
      { id: 1, ingredients: [{ tag: 'riz', besoin_grammes: 500 }] },
      { id: 2, ingredients: [{ tag: 'riz', besoin_grammes: 500 }] },
      { id: 3, ingredients: [{ tag: 'riz', besoin_grammes: 2000 }] },
    ],
    2,
    2,
    1,
    [{ tag_ingredient: 'riz', poids_grammes: 1000, prix: 2 }],
    [],
  )

  assert.equal(result.success, true)
  assert.equal(result.menu.length, 2)
  assert.equal(result.totalCost, 2)
  assert.ok(result.menu.every(recipe => Number.isFinite(recipe.prixCalcule)))
})

test('rejects invalid planning inputs and impossible menus', () => {
  const recipes = [{ id: 1, ingredients: [{ tag: 'riz', besoin_grammes: 500 }] }]
  const products = [{ tag_ingredient: 'riz', poids_grammes: 1000, prix: 2 }]

  assert.equal(selectAffordableMenu(recipes, 0, 1, 1, products, []).success, false)
  assert.equal(selectAffordableMenu(recipes, 10, 2, 1, products, []).success, false)
  assert.equal(selectAffordableMenu(recipes, 0.5, 1, 1, products, []).success, false)
  assert.equal(
    selectAffordableMenu([{ id: 1, ingredients: [{ tag: 'inconnu', besoin_grammes: 500 }] }], 10, 1, 1, products, []).success,
    false,
  )
})

test('selects a menu without enumerating every combination', () => {
  const recipes = Array.from({ length: 25 }, (_, index) => ({
    id: index + 1,
    ingredients: [{ tag: 'riz', besoin_grammes: 100 }],
  }))

  const result = selectAffordableMenu(
    recipes,
    10,
    7,
    1,
    [{ tag_ingredient: 'riz', poids_grammes: 1000, prix: 2 }],
    [],
  )

  assert.equal(result.success, true)
  assert.equal(result.menu.length, 7)
})

test('normalizes unknown planning modes to balanced', () => {
  assert.equal(normalizePlanningMode('random'), 'balanced')
  assert.equal(normalizePlanningMode('quick'), 'quick')
})

test('economic mode prefers the cheaper menu', () => {
  const recipes = [
    { id: 1, temps_prep: 30, ingredients: [{ tag: 'riz', besoin_grammes: 200 }] },
    { id: 2, temps_prep: 5, ingredients: [{ tag: 'riz', besoin_grammes: 1000 }] },
  ]

  const result = selectAffordableMenu(
    recipes,
    5,
    1,
    1,
    [{ tag_ingredient: 'riz', poids_grammes: 1000, prix: 1 }],
    [],
    { mode: 'economic' },
  )

  assert.equal(result.success, true)
  assert.equal(result.menu[0].id, 1)
})

test('quick mode prefers the fastest menu', () => {
  const recipes = [
    { id: 1, temps_prep: 30, ingredients: [{ tag: 'riz', besoin_grammes: 200 }] },
    { id: 2, temps_prep: 5, ingredients: [{ tag: 'riz', besoin_grammes: 1000 }] },
  ]

  const result = selectAffordableMenu(
    recipes,
    5,
    1,
    1,
    [{ tag_ingredient: 'riz', poids_grammes: 1000, prix: 1 }],
    [],
    { mode: 'quick' },
  )

  assert.equal(result.success, true)
  assert.equal(result.menu[0].id, 2)
})

test('anti-gaspi mode favors the menu that best covers fridge stock', () => {
  const recipes = [
    { id: 1, temps_prep: 30, ingredients: [{ tag: 'riz', besoin_grammes: 200 }] },
    { id: 2, temps_prep: 5, ingredients: [{ tag: 'riz', besoin_grammes: 1000 }] },
  ]

  const result = selectAffordableMenu(
    recipes,
    5,
    1,
    1,
    [{ tag_ingredient: 'riz', poids_grammes: 1000, prix: 1 }],
    [{ tag_ingredient: 'riz', quantite_accumulee: 900 }],
    { mode: 'anti-gaspi' },
  )

  assert.equal(result.success, true)
  assert.equal(result.menu[0].id, 1)
})
