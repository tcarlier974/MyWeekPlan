import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getAccountPanelView,
  hasTrialData,
  TRIAL_STORAGE_KEY,
} from './authUi.js'

test('shows the login view while no authenticated user is available', () => {
  assert.equal(getAccountPanelView(null), 'login')
})

test('shows the profile view for an authenticated user', () => {
  assert.equal(getAccountPanelView({ id: 'user-1' }), 'profile')
})

test('recognizes meaningful temporary planning data', () => {
  assert.equal(hasTrialData({ menu: [{ nom: 'Pâtes' }] }), true)
  assert.equal(hasTrialData({ inventaireFrigo: [{ tag_ingredient: 'pates' }] }), true)
  assert.equal(hasTrialData({ shoppingList: { Épicerie: [] } }), true)
})

test('ignores an empty temporary planning state', () => {
  assert.equal(hasTrialData({ menu: [], inventaireFrigo: [], shoppingList: {} }), false)
  assert.equal(TRIAL_STORAGE_KEY, 'myweekplan:trial-state')
})
