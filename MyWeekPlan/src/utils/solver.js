import { supabase } from '../supabase'

// --- LE MOTEUR D'OPTIMISATION ---
// Cette fonction cherche le paquet le moins cher pour couvrir un besoin en grammes
export function getBestProduct(tag, besoinTotalGrammes, produitsDb) {
  const produitsDispos = produitsDb
    .filter(p => p.tag_ingredient === tag)
    .sort((a, b) => b.poids_grammes - a.poids_grammes);
  
  if (produitsDispos.length === 0) return { cout: 0, produitTrouve: false };

  let resteABesoin = besoinTotalGrammes;
  let coutTotal = 0;
  let detailsAchat = [];

  produitsDispos.forEach(p => {
    if (resteABesoin <= 0) return;
    const poids = p.poids_grammes;
    const nbPaquets = Math.floor(resteABesoin / poids);

    if (nbPaquets > 0) {
      coutTotal += nbPaquets * p.prix;
      resteABesoin -= (nbPaquets * poids);
      // ON AJOUTE L'URL DU PRODUIT ICI
      detailsAchat.push({ id: p.url_produit, nom: p.nom_produit, quantite: nbPaquets });
    }
  });

  if (resteABesoin > 0) {
    const plusPetitPaquet = produitsDispos[produitsDispos.length - 1];
    coutTotal += plusPetitPaquet.prix;
    detailsAchat.push({ id: plusPetitPaquet.url_produit, nom: plusPetitPaquet.nom_produit, quantite: 1 });
  }

  return { cout: coutTotal, produitTrouve: true, details: detailsAchat };
}

export async function generateWeeklyMenu(targetBudget, mealsCount = 7, portions = 1) {
  try {
    const { data: recettesDb, error: errRecettes } = await supabase.from('recettes').select('*')
    const { data: produitsDb, error: errProduits } = await supabase.from('produits_magasin').select('*')

    if (errRecettes || errProduits) throw new Error("Erreur base de données")
    if (!recettesDb || recettesDb.length === 0) throw new Error("Aucune recette.")

    // On calcule le prix de chaque recette dynamiquement
    const recettesAvecPrix = recettesDb.map(recette => {
      let prixTotalRecette = 0
      
      if (recette.ingredients && Array.isArray(recette.ingredients)) {
        recette.ingredients.forEach(ingredient => {
           // On calcule le besoin total en grammes (ex: 125g * 4 personnes = 500g)
           const besoinTotal = (ingredient.besoin_grammes || 0) * portions
           // On demande à l'optimiseur combien ça va nous coûter
           const achat = getBestProduct(ingredient.tag, besoinTotal, produitsDb)
           prixTotalRecette += achat.cout
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

export async function getAlternativeMeal(currentMenu, indexToReplace, targetBudget, portions = 1) {
  try {
    const { data: recettesDb } = await supabase.from('recettes').select('*')
    const { data: produitsDb } = await supabase.from('produits_magasin').select('*')

    const recettesAvecPrix = recettesDb.map(recette => {
      let prixTotal = 0
      if (recette.ingredients) {
        recette.ingredients.forEach(ing => {
           const besoinTotal = (ing.besoin_grammes || 0) * portions
           const achat = getBestProduct(ing.tag, besoinTotal, produitsDb)
           prixTotal += achat.cout
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
      return { succes: true, recette: recettesPossibles[Math.floor(Math.random() * recettesPossibles.length)] }
    } else {
      const autresRecettes = recettesAvecPrix.filter(r => !currentIds.includes(r.id))
      if (autresRecettes.length > 0) {
         return { succes: true, recette: autresRecettes[Math.floor(Math.random() * autresRecettes.length)], depassement: true }
      }
      return { succes: false, erreur: "Pas d'autre recette dispo." }
    }
  } catch (error) {
    return { succes: false, erreur: "Erreur serveur" }
  }
}