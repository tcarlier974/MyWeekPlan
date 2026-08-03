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
  const stock = Object.fromEntries(
    inventory.map(({ tag_ingredient, quantite_accumulee }) => [tag_ingredient, quantite_accumulee]),
  )

  return Object.fromEntries(
    Object.entries(requirements)
      .map(([tag, quantity]) => [tag, Math.max(0, quantity - (stock[tag] || 0))])
      .filter(([, quantity]) => quantity > 0),
  )
}
