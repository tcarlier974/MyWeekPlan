import { supabase } from '../supabase'

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

    Object.keys(besoinsParTag).forEach(tag => {
      const besoinSemaine = besoinsParTag[tag]
      const produitsDispos = produitsDb.filter(p => p.tag_ingredient === tag)

      if (produitsDispos.length > 0) {
        let meilleurCout = Infinity
        let choixFinalProduit = null
        let nbPaquetsFinal = 0

        produitsDispos.forEach(p => {
          const poidsDuPaquet = p.poids_grammes || 1
          const paquetsRequis = Math.ceil(besoinSemaine / poidsDuPaquet)
          const coutTotal = paquetsRequis * p.prix

          if (coutTotal < meilleurCout) {
            meilleurCout = coutTotal
            choixFinalProduit = p
            nbPaquetsFinal = paquetsRequis
          }
        })

        // On ajoute le vainqueur à la liste de courses
        if (choixFinalProduit) {
          rawList[choixFinalProduit.url_produit] = {
            id: choixFinalProduit.url_produit,
            quantite: nbPaquetsFinal,
            nom: choixFinalProduit.nom_produit,
            rayon: choixFinalProduit.rayon || "Autre"
          }
        }
      }
    })

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