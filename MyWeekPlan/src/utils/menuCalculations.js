export function validatePlanningInput(budget, mealsCount, portions) {
  return [budget, mealsCount, portions].every(
    value => Number.isFinite(value) && value > 0,
  )
}

export function getRequiredQuantities(menu, portions) {
  return menu.reduce((requirements, recipe) => {
    for (const ingredient of recipe.ingredients || []) {
      requirements[ingredient.tag] = (requirements[ingredient.tag] || 0)
        + ingredient.besoin_grammes * portions
    }
    return requirements
  }, {})
}

export function subtractInventory(requirements, inventory) {
  const stock = inventory.reduce(
    (quantities, { tag_ingredient, quantite_accumulee }) => ({
      ...quantities,
      [tag_ingredient]: (quantities[tag_ingredient] || 0) + quantite_accumulee,
    }),
    {},
  )

  return Object.fromEntries(
    Object.entries(requirements)
      .map(([tag, quantity]) => [tag, Math.max(0, quantity - (stock[tag] || 0))])
      .filter(([, quantity]) => quantity > 0),
  )
}

export function priceMenu(menu, portions, products, inventory) {
  const requirements = getRequiredQuantities(menu, portions)
  const quantitiesToBuy = subtractInventory(requirements, inventory)
  const productByTag = Object.fromEntries(
    products.map(product => [product.tag_ingredient, product]),
  )
  const missingTags = Object.keys(quantitiesToBuy).filter(tag => !productByTag[tag])
  const priceByTag = Object.fromEntries(
    Object.entries(quantitiesToBuy).flatMap(([tag, quantity]) => {
      const product = productByTag[tag]
      if (!product) return []

      return [[tag, (quantity / (product.poids_grammes || 1000)) * product.prix]]
    }),
  )
  const totalCost = Number(
    Object.values(priceByTag).reduce((total, price) => total + price, 0).toFixed(2),
  )
  const meals = menu.map(recipe => {
    const recipeCost = (recipe.ingredients || []).reduce((total, ingredient) => {
      const requirement = requirements[ingredient.tag]
      const price = priceByTag[ingredient.tag] || 0
      return total + (requirement ? price * (ingredient.besoin_grammes * portions / requirement) : 0)
    }, 0)

    return { ...recipe, prixCalcule: Number(recipeCost.toFixed(2)) }
  })

  return { totalCost, meals, missingTags }
}

export function normalizePlanningMode(mode) {
  return ['economic', 'balanced', 'quick', 'anti-gaspi'].includes(mode) ? mode : 'balanced'
}

export function selectAffordableMenu(recipes, budget, mealsCount, portions, products, inventory, options = {}) {
  if (!validatePlanningInput(budget, mealsCount, portions)) {
    return planningFailure('Le budget, le nombre de repas et les portions doivent être positifs.')
  }

  if (!Array.isArray(recipes) || recipes.length < mealsCount) {
    return planningFailure('Il n’y a pas assez de recettes disponibles.')
  }

  const mode = normalizePlanningMode(options.mode)

  const beamWidth = 20
  let frontier = [{
    menu: [],
    usedIds: new Set(),
    priced: { totalCost: 0, meals: [], missingTags: [] },
    score: 0,
  }]
  let sawMissingProduct = false

  for (let step = 0; step < mealsCount; step += 1) {
    const nextFrontier = []

    for (const state of frontier) {
      for (const recipe of recipes) {
        if (state.usedIds.has(recipe.id)) continue

        const candidateMenu = [...state.menu, recipe]
        const evaluated = evaluateMenu(candidateMenu, portions, products || [], inventory || [], mode)
        const priced = evaluated.priced

        if (priced.missingTags.length > 0) {
          sawMissingProduct = true
          continue
        }

        if (priced.totalCost > budget) continue

        nextFrontier.push({
          menu: priced.meals,
          usedIds: new Set([...state.usedIds, recipe.id]),
          priced,
          score: evaluated.score,
        })
      }
    }

    if (nextFrontier.length === 0) {
      return planningFailure(
        sawMissingProduct
          ? 'Le catalogue ne contient pas tous les produits nécessaires.'
          : 'Aucun menu ne respecte ce budget.',
      )
    }

    nextFrontier.sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score
      if (left.priced.totalCost !== right.priced.totalCost) {
        return left.priced.totalCost - right.priced.totalCost
      }
      return left.menu.length - right.menu.length
    })

    frontier = nextFrontier.slice(0, beamWidth)
  }

  const bestMatch = frontier[0]

  if (bestMatch) {
    return {
      success: true,
      menu: bestMatch.menu,
      totalCost: bestMatch.priced.totalCost,
      error: null,
    }
  }

  return planningFailure(
    sawMissingProduct
      ? 'Le catalogue ne contient pas tous les produits nécessaires.'
      : 'Aucun menu ne respecte ce budget.',
  )
}

function planningFailure(error) {
  return { success: false, menu: [], totalCost: 0, error }
}

function evaluateMenu(menu, portions, products, inventory, mode) {
  const priced = priceMenu(menu, portions, products, inventory)
  const requirements = getRequiredQuantities(menu, portions)
  const remaining = subtractInventory(requirements, inventory)
  const remainingQuantity = Object.values(remaining).reduce((sum, quantity) => sum + quantity, 0)
  const duration = menu.reduce((sum, recipe) => sum + (Number.isFinite(recipe.temps_prep) ? recipe.temps_prep : 0), 0)

  return {
    priced,
    score: computeModeScore(mode, priced.totalCost, remainingQuantity, duration),
  }
}

function computeModeScore(mode, totalCost, remainingQuantity, duration) {
  switch (normalizePlanningMode(mode)) {
    case 'economic':
      return totalCost * 1000 + remainingQuantity / 100 + duration / 100
    case 'quick':
      return duration * 1000 + totalCost * 10 + remainingQuantity / 1000
    case 'anti-gaspi':
      return remainingQuantity * 10 + totalCost * 100 + duration
    case 'balanced':
    default:
      return totalCost * 500 + remainingQuantity + duration * 10
  }
}
