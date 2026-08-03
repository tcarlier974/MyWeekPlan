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

export function selectAffordableMenu(recipes, budget, mealsCount, portions, products, inventory) {
  if (!validatePlanningInput(budget, mealsCount, portions)) {
    return planningFailure('Le budget, le nombre de repas et les portions doivent être positifs.')
  }

  if (!Array.isArray(recipes) || recipes.length < mealsCount) {
    return planningFailure('Il n’y a pas assez de recettes disponibles.')
  }

  const candidates = combinations(recipes, mealsCount)
  let bestMatch = null
  let sawMissingProduct = false

  for (const candidate of candidates) {
    const priced = priceMenu(candidate, portions, products || [], inventory || [])
    if (priced.missingTags.length > 0) {
      sawMissingProduct = true
      continue
    }

    if (priced.totalCost > budget) continue

    const score = countPurchasedTags(candidate, portions, inventory || [])
    if (!bestMatch || score < bestMatch.score || (
      score === bestMatch.score && priced.totalCost < bestMatch.totalCost
    )) {
      bestMatch = { ...priced, score }
    }
  }

  if (bestMatch) {
    return {
      success: true,
      menu: bestMatch.meals,
      totalCost: bestMatch.totalCost,
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

function* combinations(items, count, start = 0, selected = []) {
  if (selected.length === count) {
    yield selected
    return
  }

  for (let index = start; index <= items.length - (count - selected.length); index += 1) {
    yield* combinations(items, count, index + 1, [...selected, items[index]])
  }
}

function countPurchasedTags(menu, portions, inventory) {
  return Object.keys(subtractInventory(getRequiredQuantities(menu, portions), inventory)).length
}
