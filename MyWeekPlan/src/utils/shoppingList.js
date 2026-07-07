// src/utils/shoppingList.js
import { supabase } from '../supabase'

/**
 * Génère la liste de courses agrégée à partir d'un menu donné.
 * @param {Array} menu - Le tableau de recettes généré par le solveur.
 */
export async function generateShoppingList(menu) {
  try {
    // 1. Récupérer tous les produits pour connaître leur nom et leur rayon
    const { data: produitsDb, error } = await supabase.from('produits_magasin').select('*')
    if (error) throw new Error("Erreur lors de la récupération des produits.")

    // 2. Transformer en dictionnaire pour un accès facile
    const mapProduits = {}
    produitsDb.forEach(p => {
      mapProduits[p.url_produit] = { 
        nom: p.nom_produit, 
        rayon: p.rayon 
      }
    })

    // 3. Agréger (additionner) les ingrédients du menu
    const rawList = {}

    menu.forEach(recette => {
      if (recette.ingredients && Array.isArray(recette.ingredients)) {
        recette.ingredients.forEach(ing => {
          const id = ing.url_produit // (ou url_produit selon ce que tu as mis dans ton JSON)
          
          if (rawList[id]) {
            // L'ingrédient est déjà dans la liste, on additionne la quantité
            rawList[id].quantite += ing.quantite
          } else {
            // Nouvel ingrédient dans la liste
            rawList[id] = {
              id: id,
              quantite: ing.quantite,
              nom: mapProduits[id]?.nom || "Produit inconnu",
              rayon: mapProduits[id]?.rayon || "Autre"
            }
          }
        })
      }
    })

    // 4. Grouper par rayon pour l'affichage final
    const groupedList = {}
    
    // On transforme notre objet rawList en un vrai tableau
    Object.values(rawList).forEach(item => {
      if (!groupedList[item.rayon]) {
        groupedList[item.rayon] = [] // On crée le rayon s'il n'existe pas encore
      }
      groupedList[item.rayon].push(item) // On range l'article dans son rayon
    })

    return groupedList

  } catch (error) {
    console.error("Erreur dans le générateur de liste :", error)
    return null
  }
}