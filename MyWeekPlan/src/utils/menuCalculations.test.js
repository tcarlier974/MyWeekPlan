import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getRequiredQuantities,
  priceMenu,
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
