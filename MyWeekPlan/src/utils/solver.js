import { supabase } from '../supabase'

export async function generateWeeklyMenu(targetBudget, mealsCount = 7) {
  try {
    const { data: recettesDb, error: errRecettes } = await supabase.from('recettes').select('*')
    const { data: produitsDb, error: errProduits } = await supabase.from('produits_magasin').select('*')

    if (errRecettes || errProduits) throw new Error("Erreur de récupération des données depuis Supabase")
    if (!recettesDb || recettesDb.length === 0) throw new Error("Aucune recette trouvée dans la base.")

    const mapPrixProduits = {}
    produitsDb.forEach(produit => {
      mapPrixProduits[produit.url_produit] = produit.prix
    })

    const recettesAvecPrix = recettesDb.map(recette => {
      let prixTotalRecette = 0
      if (recette.ingredients && Array.isArray(recette.ingredients)) {
        recette.ingredients.forEach(ingredient => {
           const prixUnitaire = mapPrixProduits[ingredient.url_produit] || 0
           prixTotalRecette += (prixUnitaire * ingredient.quantite)
        })
      }
      return { ...recette, prixCalcule: prixTotalRecette }
    })

    let meilleurMenu = []
    let prixMeilleurMenu = 0
    
    for (let i = 0; i < 100; i++) {
        const recettesMelangees = [...recettesAvecPrix].sort(() => 0.5 - Math.random())
        const menuTest = recettesMelangees.slice(0, mealsCount)
        const coutTest = menuTest.reduce((somme, repas) => somme + repas.prixCalcule, 0)
        
        if (coutTest <= targetBudget) {
            return { menu: menuTest, coutTotal: coutTest, succes: true }
        }
        if (meilleurMenu.length === 0 || coutTest < prixMeilleurMenu) {
            meilleurMenu = menuTest
            prixMeilleurMenu = coutTest
        }
    }
    return { menu: meilleurMenu, coutTotal: prixMeilleurMenu, succes: false }
  } catch (error) {
    return { menu: [], coutTotal: 0, succes: false, erreur: error.message }
  }
}

// --- NOUVELLE FONCTION : CHANGER UN SEUL PLAT ---
export async function getAlternativeMeal(currentMenu, indexToReplace, targetBudget) {
  try {
    const { data: recettesDb } = await supabase.from('recettes').select('*')
    const { data: produitsDb } = await supabase.from('produits_magasin').select('*')

    const mapPrixProduits = {}
    produitsDb.forEach(p => mapPrixProduits[p.url_produit] = p.prix)

    const recettesAvecPrix = recettesDb.map(recette => {
      let prixTotal = 0
      if (recette.ingredients) {
        recette.ingredients.forEach(ing => {
           prixTotal += (mapPrixProduits[ing.url_produit] || 0) * ing.quantite
        })
      }
      return { ...recette, prixCalcule: prixTotal }
    })

    // 1. Calculer combien coûtent les AUTRES plats du menu
    const menuSansAncien = currentMenu.filter((_, idx) => idx !== indexToReplace)
    const coutRestant = menuSansAncien.reduce((sum, repas) => sum + repas.prixCalcule, 0)
    
    // 2. Calculer le budget qu'il nous reste pour ce nouveau plat
    const budgetDispo = targetBudget - coutRestant

    // 3. Récupérer les IDs des plats actuels pour ne pas retomber sur le même
    const currentIds = currentMenu.map(r => r.id)

    // 4. Trouver les recettes qui rentrent dans le budget
    const recettesPossibles = recettesAvecPrix.filter(r => !currentIds.includes(r.id) && r.prixCalcule <= budgetDispo)

    if (recettesPossibles.length > 0) {
      // On tire au sort parmi celles qui respectent le budget
      const nouvelleRecette = recettesPossibles[Math.floor(Math.random() * recettesPossibles.length)]
      return { succes: true, recette: nouvelleRecette }
    } else {
      // Si aucune ne rentre dans le budget, on prend au sort parmi le reste
      const autresRecettes = recettesAvecPrix.filter(r => !currentIds.includes(r.id))
      if (autresRecettes.length > 0) {
         const nouvelleRecette = autresRecettes[Math.floor(Math.random() * autresRecettes.length)]
         return { succes: true, recette: nouvelleRecette, depassement: true }
      }
      return { succes: false, erreur: "Pas d'autre recette dispo." }
    }
  } catch (error) {
    return { succes: false, erreur: "Erreur serveur" }
  }
}