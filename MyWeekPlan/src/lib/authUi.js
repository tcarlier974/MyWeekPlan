export const TRIAL_STORAGE_KEY = 'myweekplan:trial-state'

export function getAccountPanelView(user) {
  return user?.id ? 'profile' : 'login'
}

export function hasTrialData(state) {
  if (!state) return false

  return Boolean(
    state.menu?.length ||
    state.inventaireFrigo?.length ||
    Object.keys(state.shoppingList || {}).length
  )
}

export function readTrialState() {
  if (typeof window === 'undefined') return null

  try {
    return JSON.parse(window.localStorage.getItem(TRIAL_STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

export function writeTrialState(state) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(state))
}

export function clearTrialState() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TRIAL_STORAGE_KEY)
}
