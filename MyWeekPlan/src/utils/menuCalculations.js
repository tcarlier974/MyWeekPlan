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
