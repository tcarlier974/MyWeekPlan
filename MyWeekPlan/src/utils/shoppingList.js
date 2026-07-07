import { supabase } from '../supabase'
import { getBestProduct } from './solver'

export async function generateShoppingList(menu, portions = 1) {
  try {
    const { data: produitsDb, error } = await supabase.from('produits_magasin').select('*')
    if (error) throw new Error("Erreur produits.")

    // 1. On regroupe le besoin global en grammes pour toute la semaine
    const besoinsParTag = {}

    menu.forEach(recette => {
      if (recette.ingredients && Array.isArray(recette.ingredients)) {
        recette.ingredients.forEach(ing => {
          const besoinTotal = (ing.besoin_grammes || 0) * portions
          
          if (besoinsParTag[ing.tag]) {
            besoinsParTag[ing.tag] += besoinTotal
          } else {
            besoinsParTag[ing.tag] = besoinTotal
          }
        })
      }
    })

    // 2. On choisit les meilleurs paquets pour la liste finale
    const rawList = {}

    // Remplace la partie "3. On choisit les meilleurs paquets" dans src/utils/shoppingList.js
    // ... dans src/utils/shoppingList.js
    Object.keys(besoinsParTag).forEach(tag => {
      const besoinSemaine = besoinsParTag[tag];
      const result = getBestProduct(tag, besoinSemaine, produitsDb);

      if (result.produitTrouve) {
        result.details.forEach(item => {
          // On utilise item.id directement, c'est infaillible
          if (!rawList[item.id]) {
            rawList[item.id] = { 
              id: item.id, 
              nom: item.nom, 
              quantite: item.quantite, 
              rayon: produitsDb.find(p => p.url_produit === item.id)?.rayon || "Autre" 
            };
          } else {
            rawList[item.id].quantite += item.quantite;
          }
        });
      }
    });

    // 3. On trie par rayon pour l'affichage
    const groupedList = {}
    Object.values(rawList).forEach(item => {
      if (!groupedList[item.rayon]) groupedList[item.rayon] = []
      groupedList[item.rayon].push(item)
    })

    return groupedList
  } catch (error) {
    console.error(error)
    return null
  }
}