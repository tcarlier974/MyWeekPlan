// src/utils/solver.js
import { supabase } from '../supabase'

/**
 * Fonction principale pour générer un menu de la semaine dans le budget imparti.
 * @param {number} targetBudget - Le budget maximum fixé par l'utilisateur.
 * @param {number} mealsCount - Le nombre de repas à générer (par ex: 7, 10 ou 14).
 */
export async function generateWeeklyMenu(targetBudget, mealsCount = 7) {
  try {
    // 1. Récupérer TOUTES les recettes et TOUS les prix depuis Supabase
    const { data: recettesDb, error: errRecettes } = await supabase.from('recettes').select('*')
    const { data: produitsDb, error: errProduits } = await supabase.from('produits_magasin').select('*')

    if (errRecettes || errProduits) throw new Error("Erreur de récupération des données depuis Supabase")
    if (!recettesDb || recettesDb.length === 0) throw new Error("Aucune recette trouvée dans la base.")

    // 2. Transformer la liste des produits en un "dictionnaire" pour un accès instantané au prix
    // ex: mapPrixProduits["ref123"] = 0.95
    const mapPrixProduits = {}
    produitsDb.forEach(produit => {
      mapPrixProduits[produit.url_produit] = produit.prix
    })

    // 3. Calculer le coût total de chaque recette à l'avance
    const recettesAvecPrix = recettesDb.map(recette => {
      let prixTotalRecette = 0
      
      // On vérifie que la recette a bien des ingrédients (format JSON)
      if (recette.ingredients && Array.isArray(recette.ingredients)) {
        recette.ingredients.forEach(ingredient => {
           // On multiplie la quantité requise par le prix unitaire du produit
           const prixUnitaire = mapPrixProduits[ingredient.url_produit] || 0
           prixTotalRecette += (prixUnitaire * ingredient.quantite)
        })
      }
      return { ...recette, prixCalcule: prixTotalRecette }
    })

    // 4. Le Solveur (L'algorithme d'essais-erreurs)
    let meilleurMenu = []
    let prixMeilleurMenu = 0
    const tentativeMax = 100 // On essaie 100 combinaisons aléatoires maximum
    
    for (let i = 0; i < tentativeMax; i++) {
        // A. Mélanger les recettes (copie du tableau pour ne pas altérer l'original)
        const recettesMelangees = [...recettesAvecPrix].sort(() => 0.5 - Math.random())
        
        // B. Prendre les N premiers repas
        const menuTest = recettesMelangees.slice(0, mealsCount)
        
        // C. Calculer le coût total de ce menu
        const coutTest = menuTest.reduce((somme, repas) => somme + repas.prixCalcule, 0)
        
        // D. Vérifier si on respecte la contrainte de budget
        if (coutTest <= targetBudget) {
            return { menu: menuTest, coutTotal: coutTest, succes: true }
        }
        
        // E. (Optionnel) Sauvegarder le menu le "moins pire" au cas où on ne trouve rien de parfait
        if (meilleurMenu.length === 0 || coutTest < prixMeilleurMenu) {
            meilleurMenu = menuTest
            prixMeilleurMenu = coutTest
        }
    }

    // 5. Si après 100 tentatives on n'a rien trouvé sous le budget, on renvoie la combinaison la plus proche
    console.warn(`Impossible de trouver un menu sous ${targetBudget}€. Voici le plus proche (${prixMeilleurMenu}€).`)
    return { menu: meilleurMenu, coutTotal: prixMeilleurMenu, succes: false }

  } catch (error) {
    console.error("Erreur dans le solveur :", error)
    return { menu: [], coutTotal: 0, succes: false, erreur: error.message }
  }
}