import { useState, useEffect} from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { generateWeeklyMenu, getAlternativeMeal } from './utils/solver'
import { generateShoppingList } from './utils/shoppingList'
import { supabase } from './supabase'
import { getRequiredQuantities, subtractInventory } from './utils/menuCalculations'
import './App.css'

// Attribue un émoji selon le tag
const getEmojiForTag = (tag) => {
  const map = {
    'poulet': '🍗', 'boeuf_hache': '🥩', 'boeuf_bourguignon': '🥩', 'saucisses': '🌭', 'lardons': '🥓', 'jambon': '🥓',
    'saumon': '🐟', 'pave_saumon': '🐟', 'saumon_fume': '🐟', 'cabillaud': '🐟', 'crevettes': '🦐',
    'oignons': '🧅', 'ail': '🧄', 'poivrons': '🫑', 'carottes': '🥕', 'pommes_de_terre': '🥔', 'courgettes': '🥒', 'aubergines': '🍆', 'salade': '🥬', 'champignons': '🍄', 'tomates_fraiches': '🍅',
    'creme': '🥛', 'lait': '🥛', 'fromage_rape': '🧀', 'oeufs': '🥚', 'beurre': '🧈',
    'pates': '🍝', 'riz': '🍚', 'pain': '🥖'
  };
  return map[tag] || '🛒';
};

// Attribue une couleur de fond selon le tag
const getBackgroundClass = (tag) => {
  if (['poulet', 'boeuf_hache', 'boeuf_bourguignon', 'saucisses', 'lardons', 'jambon'].includes(tag)) return 'bg-meat';
  if (['saumon', 'pave_saumon', 'saumon_fume', 'cabillaud', 'crevettes'].includes(tag)) return 'bg-fish';
  if (['oignons', 'ail', 'poivrons', 'carottes', 'pommes_de_terre', 'courgettes', 'aubergines', 'salade', 'champignons', 'tomates_fraiches'].includes(tag)) return 'bg-veg';
  if (['creme', 'lait', 'fromage_rape', 'oeufs', 'beurre'].includes(tag)) return 'bg-dairy';
  return 'bg-default';
};

// Formate l'affichage (g/kg ou ml/L) selon le tag de l'ingrédient
const formatQuantity = (tag, quantite) => {
  const liquides = ['lait', 'creme', 'lait_de_coco', 'huile_olive', 'sauce_teriyaki'];
  const isLiquid = liquides.includes(tag);

  // Si on a 1000 ou plus, on passe en Kilos ou en Litres pour faire plus propre !
  if (quantite >= 1000) {
    const formatted = (quantite / 1000).toString().replace('.', ',');
    return `${formatted} ${isLiquid ? 'L' : 'kg'}`;
  }
  
  // Sinon on reste en grammes ou millilitres
  return `${quantite} ${isLiquid ? 'ml' : 'g'}`;
};

const SectionFrigo = ({ inventaireFrigo, tagsDisponibles, onUpdateQuantite, onAjouterItem }) => {
  // Petit state local juste pour gérer le menu déroulant
  const [tagSelectionne, setTagSelectionne] = useState("");

  const gererAjout = () => {
    onAjouterItem(tagSelectionne);
    setTagSelectionne(""); // On remet le select à zéro après ajout
  };

  return (
    <div className="frigo-container" style={{ marginTop: '32px', background: '#F9FAFB', padding: '20px', borderRadius: '16px' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>🥶 Dans mon frigo</h3>
      <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '16px' }}>
        Ajoute tes restes. L'algorithme les déduira de tes courses et adaptera tes repas !
      </p>
      
      {/* --- BARRE D'AJOUT --- */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <select 
          value={tagSelectionne} 
          onChange={(e) => setTagSelectionne(e.target.value)}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
        >
          <option value="">+ Ajouter un ingrédient...</option>
          {tagsDisponibles.map(tag => (
            <option key={tag} value={tag}>{tag.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button 
          onClick={gererAjout}
          disabled={!tagSelectionne}
          style={{ padding: '10px 16px', background: tagSelectionne ? '#3B82F6' : '#D1D5DB', color: 'white', border: 'none', borderRadius: '8px', cursor: tagSelectionne ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
        >
          Ajouter
        </button>
      </div>

      {/* --- LISTE DES INGRÉDIENTS --- */}
      {inventaireFrigo.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '10px', color: '#9CA3AF', fontStyle: 'italic' }}>
          Ton frigo est vide pour le moment.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {inventaireFrigo.map(item => (
            <div key={item.tag_ingredient} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                {item.tag_ingredient.replace(/_/g, ' ')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="number" 
                  value={item.quantite_accumulee} 
                  onChange={(e) => onUpdateQuantite(item.tag_ingredient, Number(e.target.value))}
                  style={{ width: '80px', padding: '6px', border: '1px solid #E5E7EB', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}
                />
                <span style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>g / ml</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  
  const [budget, setBudget] = useState(50)
  const [mealsCount, setMealsCount] = useState(7)
  // NOUVEAU : On définit 2 portions par défaut
  const [portions, setPortions] = useState(2) 
  const [planningMode, setPlanningMode] = useState('balanced')
  const [inventaireFrigo, setInventaireFrigo] = useState([]);
  const [tagsDisponibles, setTagsDisponibles] = useState([])
  const [menu, setMenu] = useState([])
  const [totalCost, setTotalCost] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingShoppingList, setIsGeneratingShoppingList] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [shoppingList, setShoppingList] = useState(null)
  const [checkedItems, setCheckedItems] = useState({})
  const [rerollingIndex, setRerollingIndex] = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [lockedMeals, setLockedMeals] = useState({})

  const stepLabels = [
    { id: 1, label: 'Budget & frigo' },
    { id: 2, label: 'Menu' },
    { id: 3, label: 'Courses' },
  ]

  const planningModeLabels = {
    economic: 'Économique',
    balanced: 'Équilibré',
    quick: 'Rapide',
    'anti-gaspi': 'Anti-gaspi',
  }

  const isBusy = isLoading || isGeneratingShoppingList || rerollingIndex !== null
  const clampQuantity = (value) => {
    if (!Number.isFinite(value)) return 0
    return Math.max(0, Math.min(50000, value))
  }

  const requiredQuantities = getRequiredQuantities(menu, portions)
  const remainingQuantities = subtractInventory(requiredQuantities, inventaireFrigo)
  const totalRequiredQuantity = Object.values(requiredQuantities).reduce((sum, quantity) => sum + quantity, 0)
  const totalRemainingQuantity = Object.values(remainingQuantities).reduce((sum, quantity) => sum + quantity, 0)
  const totalCoveredQuantity = Math.max(0, totalRequiredQuantity - totalRemainingQuantity)
  const coveragePercent = totalRequiredQuantity > 0 ? (totalCoveredQuantity / totalRequiredQuantity) * 100 : 0
  const costPerDay = menu.length > 0 ? totalCost / menu.length : 0
  const costPerPortion = menu.length > 0 && portions > 0 ? totalCost / (menu.length * portions) : 0
  
  const handleGenerateMenuClick = async () => {
    setIsLoading(true)
    setErrorMsg('')
    setShoppingList(null)
    setLockedMeals({})
    
    try {
      // On passe la variable portions au solveur
      const resultat = await generateWeeklyMenu(budget, mealsCount, portions, planningMode)
      const success = resultat?.success ?? resultat?.succes ?? false
      const errorMessage = resultat?.error ?? resultat?.erreur ?? null

      if (!success) {
        setMenu([])
        setTotalCost(0)
        setErrorMsg(errorMessage || 'Impossible de générer un menu valide.')
        return
      }

      setMenu(Array.isArray(resultat.menu) ? resultat.menu : [])
      setTotalCost(Number.isFinite(resultat.totalCost) ? resultat.totalCost : (resultat.coutTotal || 0))
      setCurrentStep(2)
    } catch (error) {
      console.error('Erreur lors de la génération du menu :', error)
      setMenu([])
      setTotalCost(0)
      setErrorMsg('Une erreur inattendue est survenue pendant la génération du menu.')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMealLock = (index) => {
    setLockedMeals(prev => ({
      ...prev,
      [index]: !prev[index],
    }))
  }
  
  const handleRerollMeal = async (index) => {
    if (lockedMeals[index]) {
      setErrorMsg('Ce plat est verrouillé. Déverrouille-le avant de le reroll.')
      return
    }

    setRerollingIndex(index) 
    
    const resultat = await getAlternativeMeal(menu, index, budget, portions, planningMode)
    
    if (resultat.succes) {
      const nouveauMenu = [...menu]
      nouveauMenu[index] = resultat.recette 
      setMenu(nouveauMenu)
      
      const nouveauPrix = nouveauMenu.reduce((sum, repas) => sum + repas.prixCalcule, 0)
      setTotalCost(nouveauPrix)
    } else {
      setErrorMsg("Impossible de changer ce plat (As-tu assez de recettes dans ta base ?)")
    }
    
    setRerollingIndex(null)
  }
  
  const handleGenerateListClick = async () => {
    if (!menu.length) {
      setErrorMsg('Génère d’abord un menu avant de créer la liste de courses.')
      return
    }

    setIsGeneratingShoppingList(true)
    setErrorMsg('')

    try {
      // On passe la variable portions
      const list = await generateShoppingList(menu, portions)
      setShoppingList(list || {})
      setCurrentStep(3)
    } catch (error) {
      console.error('Erreur lors de la génération de la liste de courses :', error)
      setShoppingList({})
      setErrorMsg('Impossible de générer la liste de courses pour le moment.')
    } finally {
      setIsGeneratingShoppingList(false)
    }
  }
  
  const toggleCheck = (itemId) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }
  
  const handleUpdateFrigo = async (tag, nouvelleQuantite) => {
      // 1. Mise à jour visuelle instantanée pour ne pas bloquer l'utilisateur
      setInventaireFrigo(prev => prev.map(item => 
        item.tag_ingredient === tag 
          ? { ...item, quantite_accumulee: clampQuantity(nouvelleQuantite) } 
          : item
      ));

      if (!supabase) {
        setErrorMsg("La configuration Supabase est manquante, les changements du frigo ne peuvent pas être sauvegardés.")
        return
      }

      // 2. Sauvegarde silencieuse dans Supabase en arrière-plan (Upsert)
      const { error } = await supabase
        .from('inventaire_frigo')
        .upsert({ tag_ingredient: tag, quantite_accumulee: clampQuantity(nouvelleQuantite) }, { onConflict: 'tag_ingredient' });

      if (error) console.error("🚨 Erreur de sauvegarde frigo :", error.message);
    };

    // --- AJOUT D'UN NOUVEL INGRÉDIENT AU FRIGO ---
    const handleAjouterFrigo = async (nouveauTag) => {
      if (!nouveauTag) return;
      
      // Si l'ingrédient est déjà dans la liste, on ne fait rien
      if (inventaireFrigo.some(item => item.tag_ingredient === nouveauTag)) return;

      const nouvelItem = { tag_ingredient: nouveauTag, quantite_accumulee: 0 };
      
      // 1. Ajout visuel
      setInventaireFrigo(prev => [...prev, nouvelItem]);

      if (!supabase) {
        setErrorMsg("La configuration Supabase est manquante, le frigo reste en mode local.")
        return
      }

      // 2. Ajout dans Supabase
      const { error } = await supabase.from('inventaire_frigo').insert([nouvelItem]);
      if (error) console.error("🚨 Erreur d'ajout frigo :", error.message);
    };

  useEffect(() => {
    async function chargerDonnees() {
      if (!supabase) {
        setErrorMsg("Supabase n'est pas configuré. Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pour charger le frigo.")
        return
      }

      try {
        // 1. On charge le frigo
        const { data: frigoData, error: frigoError } = await supabase.from('inventaire_frigo').select('*');
        if (frigoError) throw frigoError;
        if (frigoData) setInventaireFrigo(frigoData);
        
        // 2. On charge les produits pour extraire la liste des tags possibles
        const { data: produitsData, error: produitsError } = await supabase.from('produits_magasin').select('tag_ingredient');
        if (produitsError) throw produitsError;
        
        if (produitsData) {
          // On supprime les doublons pour avoir une liste propre de tags
            const tagsUniques = [...new Set(produitsData.map(p => p.tag_ingredient))];
            setTagsDisponibles(tagsUniques.sort());
          }
        } catch (err) {
          console.error("❌ Erreur de chargement :", err.message);
        }
      }
      chargerDonnees();
    }, []);

  return (
    <div className="app-container">
      <header className="hero-panel">
        <div className="hero-copy">
          <span className="hero-eyebrow">Planificateur hebdo</span>
          <h1>MyWeekPlan</h1>
          <p>Un menu plus malin, moins cher, et branché sur ton frigo.</p>
        </div>

        <div className="hero-metrics" aria-label="Résumé rapide">
          <div className="metric-card">
            <span>Budget</span>
            <strong>{budget} €</strong>
          </div>
          <div className="metric-card">
            <span>Repas</span>
            <strong>{mealsCount}</strong>
          </div>
          <div className="metric-card">
            <span>Portions</span>
            <strong>{portions}</strong>
          </div>
          <div className="metric-card metric-card-accent">
            <span>Frigo</span>
            <strong>{inventaireFrigo.length}</strong>
          </div>
        </div>
      </header>

      <nav className="step-tracker" aria-label="Progression du parcours">
        {stepLabels.map(step => (
          <div key={step.id} className={`step-pill ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'done' : ''}`}>
            <span className="step-pill-index">{step.id}</span>
            <span>{step.label}</span>
          </div>
        ))}
      </nav>
      
      {currentStep === 1 && (
        <div className="screen" aria-busy={isLoading}>
          <div className="card card-hero">
            <div className="card-header">
              <div>
                <h2>Prépare ton menu</h2>
                <p>Entre ton budget, le nombre de repas et ce que tu as déjà.</p>
              </div>
              {errorMsg ? <span className="status-pill status-pill-error">Erreur</span> : <span className="status-pill status-pill-success">Prêt</span>}
            </div>

            {isLoading && (
              <div className="loading-banner">
                <span className="loading-dot" />
                Génération du menu en cours, ne ferme pas la page.
              </div>
            )}

            {/* Ligne Budget */}
            <div className="input-group">
              <label>Quel est ton budget de la semaine ?</label>
              <div style={{ position: 'relative' }}>
                <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} min="1" max="500" step="1" />
                <span style={{ position: 'absolute', right: '15px', top: '15px', fontWeight: 'bold', color: '#6b7280' }}>€</span>
              </div>
              <span className="input-help">Budget conseillé: entre 1 € et 500 €.</span>
            </div>
            
            {/* Nouvelle disposition pour Repas et Personnes côte à côte */}
            <div style={{ display: 'flex', gap: '15px' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Nbr de repas</label>
                <input type="number" value={mealsCount} onChange={(e) => setMealsCount(Number(e.target.value))} min="1" max="14" step="1" />
                <span className="input-help">Entre 1 et 14 repas pour garder un menu réaliste.</span>
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Personnes</label>
                <input type="number" value={portions} onChange={(e) => setPortions(Number(e.target.value))} min="1" max="12" step="1" />
                <span className="input-help">Le calcul est optimisé pour 1 à 12 personnes.</span>
              </div>
            </div>

            <div className="input-group">
              <label>Mode de planification</label>
              <select value={planningMode} onChange={(e) => setPlanningMode(e.target.value)}>
                <option value="economic">Économique</option>
                <option value="balanced">Équilibré</option>
                <option value="quick">Rapide</option>
                <option value="anti-gaspi">Anti-gaspi</option>
              </select>
              <span className="input-help">Choisis l’angle de sélection du menu avant de lancer la génération.</span>
            </div>
          </div>
          <SectionFrigo 
            inventaireFrigo={inventaireFrigo} 
            tagsDisponibles={tagsDisponibles}
            onUpdateQuantite={handleUpdateFrigo} 
            onAjouterItem={handleAjouterFrigo}
          />
          {errorMsg && <p style={{ color: '#ef4444', textAlign: 'center', fontWeight: 'bold' }}>{errorMsg}</p>}
          <button className="btn-action" onClick={handleGenerateMenuClick} disabled={isBusy}>
            {isLoading ? 'Calcul en cours...' : 'Générer mon menu'}
          </button>
        </div>
      )}

      {/* Le reste de l'interface (Étape 2 et 3) ne change pas ! */}
      {/* ... Copie-colle la suite de ton return () précédent à partir du {currentStep === 2 && ...} ... */}

      {currentStep === 2 && (
        <div className="screen" aria-busy={isGeneratingShoppingList || rerollingIndex !== null}>
          <div className="screen-toolbar">
            <button className="btn-back" onClick={() => setCurrentStep(1)}>
              Modifier le budget
            </button>
            <span className="status-pill status-pill-success">{planningModeLabels[planningMode] || 'Équilibré'}</span>
          </div>

          {isGeneratingShoppingList && (
            <div className="loading-banner">
              <span className="loading-dot" />
              Création de la liste de courses en cours.
            </div>
          )}
          {rerollingIndex !== null && (
            <div className="loading-banner">
              <span className="loading-dot" />
              Reroll du plat {rerollingIndex + 1} en cours.
            </div>
          )}
          
          {/* La couleur change si on dépasse le budget */}
          <div className={`budget-summary ${totalCost > budget ? 'budget-summary-over' : 'budget-summary-ok'}`}>
            Coût total estimé : {totalCost.toFixed(2)} €
          </div>

          <div className="menu-summary-panel">
            <div className="menu-summary-item summary-accent">
              <span>Budget restant</span>
              <strong>{Math.max(0, budget - totalCost).toFixed(2)} €</strong>
            </div>
            <div className="menu-summary-item">
              <span>Plats verrouillés</span>
              <strong>{Object.values(lockedMeals).filter(Boolean).length}/{menu.length}</strong>
            </div>
            <div className="menu-summary-item summary-success">
              <span>Stock couvert</span>
              <strong>{Math.round(coveragePercent)}%</strong>
            </div>
            <div className="menu-summary-item">
              <span>Coût par jour</span>
              <strong>{costPerDay.toFixed(2)} €</strong>
            </div>
            <div className="menu-summary-item">
              <span>Coût par portion</span>
              <strong>{costPerPortion.toFixed(2)} €</strong>
            </div>
            <div className="menu-summary-item summary-neutral">
              <span>Grammes à acheter</span>
              <strong>{totalRemainingQuantity.toFixed(0)} g</strong>
            </div>
          </div>

          <div className="meal-list">
            {menu.map((repas, index) => (
              <div key={index} 
                className="meal-item" 
                onClick={() => setSelectedRecipe(repas)} 
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <img src={repas.image_url || 'https://via.placeholder.com/60?text=Miam'} alt={repas.nom} className="meal-image" />
                  <div className="meal-item-left">
                    <h3>{repas.nom}</h3>
                    <p>⏱ {repas.temps_prep} min</p>
                  </div>
                </div>

                <div className="meal-price-container">
                  <span className="meal-price">{repas.prixCalcule.toFixed(2)} €</span>
                  <button
                    type="button"
                    className={`btn-lock ${lockedMeals[index] ? 'locked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMealLock(index)
                    }}
                    disabled={isBusy}
                    aria-pressed={Boolean(lockedMeals[index])}
                    title={lockedMeals[index] ? 'Déverrouiller ce plat' : 'Verrouiller ce plat'}
                  >
                    {lockedMeals[index] ? '🔒' : '🔓'}
                  </button>
                  <button 
                    className={`btn-reroll ${rerollingIndex === index ? 'spinning' : ''}`}
                    onClick={(e) => { 
                      e.stopPropagation(); // EMPÊCHE D'OUVRIR LA RECETTE QUAND ON CLIQUE SUR REROLL
                      handleRerollMeal(index) 
                    }}
                    disabled={isBusy}
                  >
                    🔄
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-action" onClick={handleGenerateListClick} disabled={isBusy}>
            {isGeneratingShoppingList ? 'Création...' : 'Valider & faire les courses'}
          </button>
        </div>
      )}

      {/* --- ÉTAPE 3 : LISTE DE COURSES --- */}
      {currentStep === 3 && shoppingList && (
        <div className="screen">
          <div className="screen-toolbar">
            <button className="btn-back" onClick={() => setCurrentStep(2)}>Retour au menu</button>
            <span className="status-pill status-pill-success">Courses prêtes</span>
          </div>
          
          <div className="shopping-container" style={{ marginTop: '24px' }}>
            {Object.entries(shoppingList).map(([rayon, items]) => (
              <div key={rayon} className="shopping-category">
                <h3 className="category-title">{rayon}</h3>
                
                <div className="shopping-card">
                  {items.map((item) => {
                    // On vérifie si l'ID de l'item est dans l'objet/tableau checkedItems
                    const isChecked = checkedItems[item.id] || false;
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`shopping-item-row ${isChecked ? 'checked' : ''}`}
                        onClick={() => toggleCheck(item.id)} // Garde ta fonction toggleCheck d'origine
                      >
                        {/* L'icône dynamique */}
                        <div className={`item-icon-wrapper ${getBackgroundClass(item.tag)}`}>
                          {getEmojiForTag(item.tag)}
                        </div>
                        
                        {/* Le texte */}
                        <div className="item-details">
                          <div className="item-name">{item.nom}</div>
                          {/* Affichage intelligent (g/kg ou ml/L) */}
                          <div className="item-qty">{formatQuantity(item.tag, item.quantite)}</div>
                        </div>
                        
                        {/* La case à cocher ronde */}
                        <div className="item-checkbox">
                          {isChecked && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* --- LA MODALE DE DÉTAIL RECETTE --- */}
      {selectedRecipe && (
        <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>

          {/* stopPropagation empêche la modale de se fermer si on clique sur la carte blanche */}
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="btn-close" onClick={() => setSelectedRecipe(null)}>✕</button>

            <img 
              src={selectedRecipe.image_url || 'https://via.placeholder.com/400?text=Miam'} 
              alt={selectedRecipe.nom} 
              className="modal-img" 
            />

            <div className="modal-body">
              <h2 style={{color: 'var(--primary)'}}>
                {selectedRecipe.nom}</h2>
              <div className="modal-meta">
                ⏱ {selectedRecipe.temps_prep} min • 👤 Pour {portions} personne(s)
              </div>

              <h3 style={{ marginTop: '24px', marginBottom: '12px' }}>Ingrédients</h3>
              <div>
                {selectedRecipe.ingredients && selectedRecipe.ingredients.map((ing, i) => (
                  <span key={i} className="ingredient-pill">
                    {/* On multiplie par le nombre de portions ! */}
                    <span className="ingredient-qty">{(ing.besoin_grammes * portions).toString().replace('.', ',')}g</span> 
                    {ing.tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              <h3 style={{ marginTop: '24px', marginBottom: '12px' }}>Préparation</h3>
              <p style={{ color: 'var(--text-light)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {selectedRecipe.instructions || "Les instructions de préparation n'ont pas encore été ajoutées pour cette recette."}
              </p>
            </div>
          </div>
        </div>
      )}
      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default App
