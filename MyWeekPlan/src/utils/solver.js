import { supabase } from '../supabase'

// --- LE MOTEUR D'OPTIMISATION ---
// Cette fonction cherche le paquet le moins cher pour couvrir un besoin en grammes
// ÉTAPE 2 : Version corrigée pour le modèle au kilo (Règle de trois)
export function getBestProduct(tag, besoinTotalGrammes, produitsDb) {
  // On cherche le produit au kilo/litre correspondant à cet ingrédient
  const produitKilo = produitsDb.find(p => p.tag_ingredient === tag);
  
  if (!produitKilo) {
    return { cout: 0, produitTrouve: false, details: [] };
  }

  // Règle de trois pure : (grammes demandés / poids de référence) * prix au kilo
  const poidsReference = produitKilo.poids_grammes || 1000; 
  const coutCalcule = (besoinTotalGrammes / poidsReference) * produitKilo.prix;

  return { 
    // On garde une grande précision décimale pour l'addition globale
    cout: Number(coutCalcule.toFixed(4)), 
    produitTrouve: true, 
    details: [{ 
      id: produitKilo.url_produit, 
      nom: produitKilo.nom_produit, 
      quantite: besoinTotalGrammes 
    }] 
  };
}

export async function generateWeeklyMenu(targetBudget, mealsCount = 7, portions = 1) {
  try {
    const { data: recettesDb, error: errRecettes } = await supabase.from('recettes').select('*')
    const { data: produitsDb, error: errProduits } = await supabase.from('produits_magasin').select('*')

    if (errRecettes || errProduits) throw new Error("Erreur de connexion à la base de données")
    if (!recettesDb || recettesDb.length === 0) throw new Error("Aucune recette disponible.")

    // 1. On pré-calcule le coût exact au centime près de chaque recette isolée
    const recettesAvecPrix = recettesDb.map(recette => {
      let prixTotalRecette = 0
      
      if (recette.ingredients && Array.isArray(recette.ingredients)) {
        recette.ingredients.forEach(ingredient => {
           const besoinTotal = (ingredient.besoin_grammes || 0) * portions
           const achat = getBestProduct(ingredient.tag, besoinTotal, produitsDb)
           prixTotalRecette += achat.cout
        })
      }
      return { ...recette, prixCalcule: Number(prixTotalRecette.toFixed(2)) }
    })

    let meilleurMenu = []
    let prixMeilleurMenu = Infinity
    
    // 2. On augmente à 1000 tentatives pour laisser à l'algorithme le temps de chercher
    const TENTATIVES_MAX = 1000;
    
    for (let i = 0; i < TENTATIVES_MAX; i++) {
        // Mélange aléatoire
        const recettesMelangees = [...recettesAvecPrix].sort(() => 0.5 - Math.random())
        const menuTest = recettesMelangees.slice(0, mealsCount)
        
        // Somme des coûts de la combinaison
        const coutTest = menuTest.reduce((somme, repas) => somme + repas.prixCalcule, 0)
        
        // VICTOIRE IMMÉDIATE : Si la combinaison respecte le budget, on s'arrête et on la renvoie !
        if (coutTest <= targetBudget) {
            return { menu: menuTest, coutTotal: Number(coutTest.toFixed(2)), succes: true }
        }
        
        // PLAN B : On garde précieusement la combinaison la moins chère trouvée au cas où aucune ne passe
        if (coutTest < prixMeilleurMenu) {
            meilleurMenu = menuTest
            prixMeilleurMenu = coutTest
        }
    }
    
    // Si on arrive ici, c'est que le budget demandé était mathématiquement trop bas.
    // On renvoie quand même le menu le plus proche du budget possible.
    return { menu: meilleurMenu, coutTotal: Number(prixMeilleurMenu.toFixed(2)), succes: false }
    
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