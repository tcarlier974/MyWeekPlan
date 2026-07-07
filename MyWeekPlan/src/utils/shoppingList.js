import { supabase } from '../supabase'

// Ajout du paramètre portions
export async function generateShoppingList(menu, portions = 1) {
  try {
    const { data: produitsDb, error } = await supabase.from('produits_magasin').select('*')
    if (error) throw new Error("Erreur produits.")

    const mapProduits = {}
    produitsDb.forEach(p => {
      mapProduits[p.url_produit] = { nom: p.nom_produit, rayon: p.rayon }
    })

    const rawList = {}

    menu.forEach(recette => {
      if (recette.ingredients && Array.isArray(recette.ingredients)) {
        recette.ingredients.forEach(ing => {
          const id = ing.url_produit
          // ON MULTIPLIE LA QUANTITÉ D'ACHAT
          const quantiteTotale = ing.quantite * portions 
          
          if (rawList[id]) {
            rawList[id].quantite += quantiteTotale
          } else {
            rawList[id] = {
              id: id,
              quantite: quantiteTotale,
              nom: mapProduits[id]?.nom || "Produit inconnu",
              rayon: mapProduits[id]?.rayon || "Autre"
            }
          }
        })
      }
    })

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