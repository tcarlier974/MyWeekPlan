import { supabase } from '../supabase'

export async function generateShoppingList(menu, portions = 1) {
  if (!supabase) {
    return null
  }

  try {
    const { data: produitsDb, error } = await supabase.from('produits_magasin').select('*')
    if (error) throw new Error("Erreur produits.")

    // 1. On additionne les besoins exacts en grammes pour toute la semaine
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

    // 2. On groupe par rayon et on prépare l'affichage
    const groupedList = {}

    Object.keys(besoinsParTag).forEach(tag => {
      const quantiteExacte = besoinsParTag[tag]
      
      // On cherche le produit dans la DB juste pour récupérer son vrai nom et son rayon
      const produitRef = produitsDb.find(p => p.tag_ingredient === tag)
      const rayon = produitRef?.rayon || "Autre"
      // On nettoie le nom (ex: "Poulet (à compléter)" devient "Poulet")
      const nomNettoye = produitRef ? produitRef.nom_produit.replace(' (à compléter)', '') : tag.replace(/_/g, ' ')

      if (!groupedList[rayon]) groupedList[rayon] = []

      groupedList[rayon].push({
        id: tag, // On utilise le tag comme ID unique
        nom: nomNettoye,
        quantite: quantiteExacte,
        tag: tag
      })
    })

    return groupedList
  } catch (error) {
    console.error(error)
    return null
  }
}