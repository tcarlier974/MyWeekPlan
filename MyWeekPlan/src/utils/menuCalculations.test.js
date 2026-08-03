import test from 'node:test'
import assert from 'node:assert/strict'
import { getRequiredQuantities, subtractInventory } from './menuCalculations.js'

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
