export async function loadPlannerState(client, userId) {
  const [{ data: inventory, error: inventoryError }, { data: plan, error: planError }] = await Promise.all([
    client.from('inventaire_frigo').select('tag_ingredient, quantite_accumulee').eq('user_id', userId),
    client.from('weekly_plans').select('*').eq('user_id', userId).maybeSingle(),
  ])

  if (inventoryError) throw inventoryError
  if (planError) throw planError

  if (!plan) return { inventaireFrigo: inventory || [] }

  const { data: listItems, error: listError } = await client
    .from('shopping_list_items')
    .select('rayon, item_id, nom, quantite, tag, checked')
    .eq('plan_id', plan.id)

  if (listError) throw listError

  const shoppingList = (listItems || []).reduce((groups, item) => {
    groups[item.rayon] ||= []
    groups[item.rayon].push({ id: item.item_id, nom: item.nom, quantite: item.quantite, tag: item.tag })
    return groups
  }, {})
  const checkedItems = Object.fromEntries((listItems || []).filter(item => item.checked).map(item => [item.item_id, true]))

  return {
    inventaireFrigo: inventory || [],
    budget: plan.budget,
    mealsCount: plan.meals_count,
    portions: plan.portions,
    planningMode: plan.planning_mode,
    menu: plan.menu || [],
    totalCost: Number(plan.total_cost || 0),
    lockedMeals: plan.locked_meals || {},
    shoppingList: Object.keys(shoppingList).length ? shoppingList : null,
    checkedItems,
  }
}

export async function savePlannerState(client, userId, state) {
  const { data: plan, error: planError } = await client
    .from('weekly_plans')
    .upsert({
      user_id: userId,
      budget: state.budget,
      meals_count: state.mealsCount,
      portions: state.portions,
      planning_mode: state.planningMode,
      menu: state.menu,
      total_cost: state.totalCost,
      locked_meals: state.lockedMeals,
    }, { onConflict: 'user_id' })
    .select('id')
    .single()

  if (planError) throw planError

  const rows = Object.entries(state.shoppingList || {}).flatMap(([rayon, items]) =>
    items.map(item => ({
      plan_id: plan.id,
      user_id: userId,
      rayon,
      item_id: item.id,
      nom: item.nom,
      quantite: item.quantite,
      tag: item.tag,
      checked: Boolean(state.checkedItems?.[item.id]),
    }))
  )

  const { error: deleteError } = await client.from('shopping_list_items').delete().eq('plan_id', plan.id)
  if (deleteError) throw deleteError
  if (rows.length) {
    const { error: insertError } = await client.from('shopping_list_items').insert(rows)
    if (insertError) throw insertError
  }
}

export async function saveInventory(client, userId, inventory) {
  const rows = inventory.map(item => ({ ...item, user_id: userId }))
  const { error } = await client
    .from('inventaire_frigo')
    .upsert(rows, { onConflict: 'user_id,tag_ingredient' })
  if (error) throw error
}
