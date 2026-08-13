import { supabase } from '../supabase'
import { normalizePlanningMode, priceMenu, selectAffordableMenu, validatePlanningInput } from './menuCalculations'

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

export async function generateWeeklyMenu(targetBudget, mealsCount = 7, portions = 1, mode = 'balanced') {
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
    
    const recipes = recipesResult.data || []
    const products = productsResult.data || []
    const inventory = inventoryResult.data || []

    // TENTATIVE 1 : On essaie de respecter le budget strict de l'utilisateur
    let result = selectAffordableMenu(
      recipes,
      targetBudget,
      mealsCount,
      portions,
      products,
      inventory,
      { mode: normalizePlanningMode(mode) }
    )

    // TENTATIVE 2 (FALLBACK) : Si l'algorithme échoue à cause du budget, on retire la limite !
    // L'algorithme renverra le menu le plus optimisé possible, même s'il dépasse.
    // L'interface affichera ce dépassement en rouge.
    if (!result.success && result.error && result.error.includes('budget')) {
      result = selectAffordableMenu(
        recipes,
        Number.POSITIVE_INFINITY, // Budget infini pour forcer la génération
        mealsCount,
        portions,
        products,
        inventory,
        { mode: normalizePlanningMode(mode) }
      )
    }

    return result
  } catch (error) {
    console.error(error)
    return planningFailure('Impossible de charger les données de planification.')
  }
}

export async function getAlternativeMeal(currentMenu, indexToReplace, targetBudget, portions = 1, mode = 'balanced') {
  if (!supabase) {
    return { succes: false, erreur: 'Supabase n’est pas configuré.' }
  }

  try {
    const [recettesResult, produitsResult, inventoryResult] = await Promise.all([
      supabase.from('recettes').select('*'),
      supabase.from('produits_magasin').select('*'),
      supabase.from('inventaire_frigo').select('*'),
    ])

    if (recettesResult.error || produitsResult.error || inventoryResult.error) {
      throw new Error('Erreur de chargement des données de reroll.')
    }

    const recettesDb = recettesResult.data || []
    const produitsDb = produitsResult.data || []
    const inventory = inventoryResult.data || []

    const menuSansAncien = currentMenu.filter((_, index) => index !== indexToReplace)
    const coutRestant = menuSansAncien.reduce((sum, repas) => sum + (repas.prixCalcule || 0), 0)
    const budgetDispo = targetBudget - coutRestant
    const currentIds = currentMenu.map(recette => recette.id)

    // On prépare tous les candidats qui ont tous leurs ingrédients dans la base
    const allCandidates = recettesDb
      .filter(recette => !currentIds.includes(recette.id))
      .map(recette => {
        const candidateMenu = [...menuSansAncien, recette]
        const priced = priceMenu(candidateMenu, portions, produitsDb, inventory)
        const duration = candidateMenu.reduce((sum, item) => sum + (Number.isFinite(item.temps_prep) ? item.temps_prep : 0), 0)
        return {
          recette: { ...recette, prixCalcule: priced.totalCost },
          totalCost: priced.totalCost,
          missingTags: priced.missingTags,
          duration,
          score: scoreRerollCandidate(normalizePlanningMode(mode), priced.totalCost, duration, priced.missingTags.length),
        }
      })
      .filter(candidate => candidate.missingTags.length === 0)

    if (allCandidates.length === 0) {
      return { succes: false, erreur: 'Aucune recette de remplacement (ingrédients manquants en base).' }
    }

    // TENTATIVE 1 : On essaie de trouver un candidat qui rentre dans le budget restant
    let validCandidates = allCandidates.filter(candidate => candidate.totalCost <= budgetDispo)

    // TENTATIVE 2 (FALLBACK) : Si rien ne rentre dans le budget, on prend les recettes au-dessus du budget
    if (validCandidates.length === 0) {
      validCandidates = allCandidates
    }

    validCandidates.sort((left, right) => left.score - right.score || left.totalCost - right.totalCost || left.duration - right.duration)

    return {
      succes: true,
      recette: validCandidates[0].recette,
    }
  } catch (error) {
    console.error(error)
    return { succes: false, erreur: 'Erreur serveur' }
  }
}

function planningFailure(error) {
  return { success: false, menu: [], totalCost: 0, error }
}

function scoreRerollCandidate(mode, totalCost, duration, missingTagsCount) {
  switch (mode) {
    case 'economic':
      return totalCost * 1000 + duration * 10 + missingTagsCount * 10000
    case 'quick':
      return duration * 1000 + totalCost * 10 + missingTagsCount * 10000
    case 'anti-gaspi':
      return missingTagsCount * 100000 + totalCost * 100 + duration
    case 'balanced':
    default:
      return totalCost * 500 + duration * 50 + missingTagsCount * 10000
  }
}