import { supabase } from '../supabase'
import { normalizePlanningMode, priceMenu, selectAffordableMenu, validatePlanningInput } from './menuCalculations'

// Fonction de mélange absolu (Fisher-Yates) pour garantir le vrai aléatoire
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

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
    
    // Vrai aléatoire : on mélange totalement les recettes avant de générer la semaine
    let recipes = recipesResult.data || []
    recipes = shuffleArray(recipes)

    const products = productsResult.data || []
    const inventory = inventoryResult.data || []

    let result = selectAffordableMenu(
      recipes,
      targetBudget,
      mealsCount,
      portions,
      products,
      inventory,
      { mode: normalizePlanningMode(mode) }
    )

    // FALLBACK : Si le budget est trop strict, on force la génération (Best-effort)
    if (!result.success && result.error && result.error.includes('budget')) {
      result = selectAffordableMenu(
        recipes,
        Number.POSITIVE_INFINITY,
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

    const allCandidates = recettesDb
      .filter(recette => !currentIds.includes(recette.id))
      .map(recette => {
        const candidateMenu = [...menuSansAncien, recette]
        const priced = priceMenu(candidateMenu, portions, produitsDb, inventory)
        
        // PRIX ISOLÉ DE LA NOUVELLE RECETTE
        const pricedCandidate = priced.meals.find(m => m.id === recette.id)
        const coutDeCetteRecetteSeule = pricedCandidate ? pricedCandidate.prixCalcule : 0

        return {
          recette: { ...recette, prixCalcule: coutDeCetteRecetteSeule },
          totalCost: priced.totalCost,
          missingTags: priced.missingTags
        }
      })
      .filter(candidate => candidate.missingTags.length === 0)

    if (allCandidates.length === 0) {
      return { succes: false, erreur: 'Aucune recette de remplacement (ingrédients manquants en base).' }
    }

    // TENTATIVE 1 : On filtre pour ne garder QUE celles qui respectent le budget restant
    let validCandidates = allCandidates.filter(candidate => candidate.totalCost <= budgetDispo)

    // TENTATIVE 2 : S'il n'y a rien dans le budget, on prend toutes les recettes possibles (dépassement)
    if (validCandidates.length === 0) {
      validCandidates = allCandidates
    }

    // ANTI PING-PONG : On mélange TOTALEMENT les candidats valides
    validCandidates = shuffleArray(validCandidates)

    // On prend simplement le premier du tableau mélangé !
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