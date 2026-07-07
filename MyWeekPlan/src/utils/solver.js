import { supabase } from '../supabase'

// Ajout du paramètre "portions" (par défaut à 1)
export async function generateWeeklyMenu(targetBudget, mealsCount = 7, portions = 1) {
  try {
    const { data: recettesDb, error: errRecettes } = await supabase.from('recettes').select('*')
    const { data: produitsDb, error: errProduits } = await supabase.from('produits_magasin').select('*')

    if (errRecettes || errProduits) throw new Error("Erreur de récupération des données")
    if (!recettesDb || recettesDb.length === 0) throw new Error("Aucune recette trouvée.")

    const mapPrixProduits = {}
    produitsDb.forEach(produit => {
      mapPrixProduits[produit.url_produit] = produit.prix
    })

    const recettesAvecPrix = recettesDb.map(recette => {
      let prixTotalRecette = 0
      if (recette.ingredients && Array.isArray(recette.ingredients)) {
        recette.ingredients.forEach(ingredient => {
           const prixUnitaire = mapPrixProduits[ingredient.url_produit] || 0
           // ON MULTIPLIE PAR LE NOMBRE DE PORTIONS
           prixTotalRecette += (prixUnitaire * ingredient.quantite * portions) 
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

// Ajout du paramètre "portions" ici aussi
export async function getAlternativeMeal(currentMenu, indexToReplace, targetBudget, portions = 1) {
  try {
    const { data: recettesDb } = await supabase.from('recettes').select('*')
    const { data: produitsDb } = await supabase.from('produits_magasin').select('*')

    const mapPrixProduits = {}
    produitsDb.forEach(p => mapPrixProduits[p.url_produit] = p.prix)

    const recettesAvecPrix = recettesDb.map(recette => {
      let prixTotal = 0
      if (recette.ingredients) {
        recette.ingredients.forEach(ing => {
           // ON MULTIPLIE PAR LE NOMBRE DE PORTIONS
           prixTotal += (mapPrixProduits[ing.url_produit] || 0) * ing.quantite * portions
        })
      }
      return { ...recette, prixCalcule: prixTotal }
    })

    const menuSansAncien = currentMenu.filter((_, idx) => idx !== indexToReplace)
    const coutRestant = menuSansAncien.reduce((sum, repas) => sum + repas.prixCalcule, 0)
    const budgetDispo = targetBudget - coutRestant
    const currentIds = currentMenu.map(r => r.id)

    const recettesPossibles = recettesAvecPrix.filter(r => !currentIds.includes(r.id) && r.prixCalcule <= budgetDispo)

    if (recettesPossibles.length > 0) {
      const nouvelleRecette = recettesPossibles[Math.floor(Math.random() * recettesPossibles.length)]
      return { succes: true, recette: nouvelleRecette }
    } else {
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