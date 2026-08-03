import { supabase } from '../supabase'
import { selectAffordableMenu, validatePlanningInput } from './menuCalculations'

// Kept for the reroll function; weekly planning uses priceMenu so its calculation
// is shared with the shopping-list workflow.
export function getBestProduct(tag, besoinTotalGrammes, produitsDb) {
  const produitKilo = produitsDb.find(produit => produit.tag_ingredient === tag)
  if (!produitKilo || besoinTotalGrammes <= 0) {
    return { cout: 0, produitTrouve: Boolean(produitKilo) }
  }

  const poidsReference = produitKilo.poids_grammes || 1000
  const cout = (besoinTotalGrammes / poidsReference) * produitKilo.prix
  return {
    cout: Number(cout.toFixed(4)),
    produitTrouve: true,
    nom: produitKilo.nom_produit,
  }
}

export async function generateWeeklyMenu(targetBudget, mealsCount = 7, portions = 1) {
  if (!validatePlanningInput(targetBudget, mealsCount, portions)) {
    return planningFailure('Le budget, le nombre de repas et les portions doivent être positifs.')
  }

  if (!supabase) {
    return planningFailure('Supabase n’est pas configuré. La génération du menu est indisponible.')
  }

  try {
    const [recipesResult, productsResult, inventoryResult] = await Promise.all([
      supabase.from('recettes').select('*'),
      supabase.from('produits_magasin').select('*'),
      supabase.from('inventaire_frigo').select('*'),
    ])

    if (recipesResult.error || productsResult.error || inventoryResult.error) {
      throw new Error('Erreur de chargement des données de planification.')
    }

    return selectAffordableMenu(
      recipesResult.data || [],
      targetBudget,
      mealsCount,
      portions,
      productsResult.data || [],
      inventoryResult.data || [],
    )
  } catch (error) {
    console.error(error)
    return planningFailure('Impossible de charger les données de planification.')
  }
}

export async function getAlternativeMeal(currentMenu, indexToReplace, targetBudget, portions = 1) {
  if (!supabase) {
    return { succes: false, erreur: 'Supabase n’est pas configuré.' }
  }

  try {
    const { data: recettesDb } = await supabase.from('recettes').select('*')
    const { data: produitsDb } = await supabase.from('produits_magasin').select('*')

    const recettesAvecPrix = recettesDb.map(recette => {
      let prixTotal = 0
      if (recette.ingredients) {
        recette.ingredients.forEach(ingredient => {
          const besoinTotal = (ingredient.besoin_grammes || 0) * portions
          prixTotal += getBestProduct(ingredient.tag, besoinTotal, produitsDb).cout
        })
      }
      return { ...recette, prixCalcule: prixTotal }
    })

    const menuSansAncien = currentMenu.filter((_, index) => index !== indexToReplace)
    const coutRestant = menuSansAncien.reduce((sum, repas) => sum + repas.prixCalcule, 0)
    const budgetDispo = targetBudget - coutRestant
    const currentIds = currentMenu.map(recette => recette.id)
    const recettesPossibles = recettesAvecPrix.filter(
      recette => !currentIds.includes(recette.id) && recette.prixCalcule <= budgetDispo,
    )

    if (recettesPossibles.length > 0) {
      return {
        succes: true,
        recette: recettesPossibles[Math.floor(Math.random() * recettesPossibles.length)],
      }
    }

    const autresRecettes = recettesAvecPrix.filter(recette => !currentIds.includes(recette.id))
    if (autresRecettes.length > 0) {
      return {
        succes: true,
        recette: autresRecettes[Math.floor(Math.random() * autresRecettes.length)],
        depassement: true,
      }
    }

    return { succes: false, erreur: "Pas d'autre recette dispo." }
  } catch (error) {
    return { succes: false, erreur: 'Erreur serveur' }
  }
}

function planningFailure(error) {
  return { success: false, menu: [], totalCost: 0, error }
}
