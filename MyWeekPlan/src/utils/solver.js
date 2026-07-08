import { supabase } from '../supabase'

// Calcule le prix exact au gramme/millilitre (Modèle prix au Kilo)
export function getBestProduct(tag, besoinTotalGrammes, produitsDb) {
  const produitKilo = produitsDb.find(p => p.tag_ingredient === tag);
  if (!produitKilo || besoinTotalGrammes <= 0) {
    return { cout: 0, produitTrouve: !!produitKilo };
  }

  const poidsReference = produitKilo.poids_grammes || 1000; 
  const coutCalcule = (besoinTotalGrammes / poidsReference) * produitKilo.prix;

  return { 
    cout: Number(coutCalcule.toFixed(4)), 
    produitTrouve: true,
    nom: produitKilo.nom_produit
  };
}

// MOTEUR D'OPTIMISATION : BUDGET + FRIGO + ANTI-GASPILLAGE
export async function generateWeeklyMenu(targetBudget, mealsCount = 7, portions = 1) {
  try {
    // On récupère les recettes, les prix au kilo ET l'inventaire du frigo
    const { data: recettesDb } = await supabase.from('recettes').select('*')
    const { data: produitsDb } = await supabase.from('produits_magasin').select('*')
    const { data: frigoDb } = await supabase.from('inventaire_frigo').select('*')

    if (!recettesDb || !produitsDb) throw new Error("Erreur de chargement DB")

    // On transforme le frigo en dictionnaire de lecture rapide { poulet: 250, creme: 200 }
    const frigo = {};
    if (frigoDb) {
      frigoDb.forEach(item => {
        frigo[item.tag_ingredient] = item.quantite_accumulee;
      });
    }

    let meilleurMenu = [];
    let scoreMeilleurMenu = Infinity; // Plus le score est bas, moins il y a de gaspillage/coût
    let coutMeilleurMenu = Infinity;
    
    // Le Solveur teste 1000 combinaisons de semaines différentes
    for (let i = 0; i < 1000; i++) {
      const recettesMelangees = [...recettesDb].sort(() => 0.5 - Math.random());
      const menuTest = recettesMelangees.slice(0, mealsCount);

      // 1. On cumule tous les besoins en ingrédients de cette combinaison de la semaine
      const besoinsSemaine = {};
      menuTest.forEach(recette => {
        if (recette.ingredients) {
          recette.ingredients.forEach(ing => {
            besoinsSemaine[ing.tag] = (besoinsSemaine[ing.tag] || 0) + (ing.besoin_grammes * portions);
          });
        }
      });

      // 2. On applique le filtre du Frigo et on calcule le coût réel en magasin
      let coutCombinaison = 0;
      let nombreIngredientsAAcheter = 0;

      Object.keys(besoinsSemaine).forEach(tag => {
        const besoinTotal = besoinsSemaine[tag];
        const auFrigo = frigo[tag] || 0;
        
        // Ce qu'il faut réellement acheter en magasin
        const aAcheter = Math.max(0, besoinTotal - auFrigo);

        if (aAcheter > 0) {
          const calculAchat = getBestProduct(tag, aAcheter, produitsDb);
          coutCombinaison += calculAchat.cout;
          nombreIngredientsAAcheter++; // Compteur pour l'anti-gaspillage
        }
      });

      // 3. ÉVALUATION DU MEILLEUR MENU (Score basé sur le Budget + Anti-gaspillage)
      if (coutCombinaison <= targetBudget) {
        // ANTI-GASPI : Si on est sous le budget, on cherche à minimiser la variété d'ingrédients à acheter
        // Cela force l'algo à choisir des repas qui partagent les mêmes ingrédients !
        const scoreAntiGaspi = nombreIngredientsAAcheter; 

        if (scoreAntiGaspi < scoreMeilleurMenu) {
          scoreMeilleurMenu = scoreAntiGaspi;
          meilleurMenu = menuTest;
          coutMeilleurMenu = coutCombinaison;
        }
      } else {
        // Si on n'a pas encore de menu sous le budget, on garde le moins cher absolu en secours
        if (scoreMeilleurMenu === Infinity && coutCombinaison < coutMeilleurMenu) {
          coutMeilleurMenu = coutCombinaison;
          meilleurMenu = menuTest;
        }
      }
    }

    const succes = coutMeilleurMenu <= targetBudget;
    return { 
      menu: meilleurMenu, 
      coutTotal: Number(coutMeilleurMenu.toFixed(2)), 
      succes 
    };

  } catch (error) {
    console.error(error);
    return { menu: [], coutTotal: 0, succes: false };
  }
}

// GÉNÉRATEUR DE LISTE DE COURSES (Prend désormais le frigo en compte pour l'affichage final)
export async function generateShoppingList(menu, portions = 1) {
  try {
    const { data: produitsDb } = await supabase.from('produits_magasin').select('*')
    const { data: frigoDb } = await supabase.from('inventaire_frigo').select('*')
    
    const frigo = {};
    if (frigoDb) {
      frigoDb.forEach(item => { frigo[item.tag_ingredient] = item.quantite_accumulee; });
    }

    const besoinsParTag = {}
    menu.forEach(recette => {
      if (recette.ingredients) {
        recette.ingredients.forEach(ing => {
          besoinsParTag[ing.tag] = (besoinsParTag[ing.tag] || 0) + (ing.besoin_grammes * portions);
        });
      }
    })

    const groupedList = {}
    Object.keys(besoinsParTag).forEach(tag => {
      const besoinTotal = besoinsParTag[tag];
      const auFrigo = frigo[tag] || 0;
      
      // On calcule le reste à acheter pour l'affichage de l'Étape 3
      const quantiteExacte = Math.max(0, besoinTotal - auFrigo);

      // Si on a déjà tout dans le frigo, pas besoin de l'afficher dans la liste de courses !
      if (quantiteExacte > 0) {
        const produitRef = produitsDb.find(p => p.tag_ingredient === tag)
        const rayon = produitRef?.rayon || "Autre"
        const nomNettoye = produitRef ? produitRef.nom_produit.replace(' (Prix au Kilo)', '').replace(' (Prix au Litre)', '') : tag

        if (!groupedList[rayon]) groupedList[rayon] = []
        groupedList[rayon].push({
          id: tag,
          nom: nomNettoye,
          quantite: quantiteExacte,
          tag: tag
        })
      }
    })

    return groupedList
  } catch (error) {
    console.error(error)
    return null
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