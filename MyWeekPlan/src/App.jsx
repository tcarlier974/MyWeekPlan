import { useState, useEffect} from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { generateWeeklyMenu, getAlternativeMeal } from './utils/solver'
import { generateShoppingList } from './utils/shoppingList'
import { supabase } from './supabase'
import { getRequiredQuantities, subtractInventory } from './utils/menuCalculations'
import instructionsData from './instructions_completes_a_ajouter.json'
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

// Composant pour l'effet de "skeleton" pendant le chargement
const Skeleton = ({ width, height, className = '' }) => (
  <div className={`skeleton ${className}`} style={{ width, height, borderRadius: 'var(--rounded-md)' }}></div>
);

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

const MealItemSkeleton = () => (
  <div className="meal-item" style={{ pointerEvents: 'none' }}>
    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Skeleton width={60} height={60} className="meal-image" />
      <div className="meal-item-left">
        <Skeleton width="70%" height={20} />
        <Skeleton width="40%" height={16} style={{ marginTop: '8px' }} />
      </div>
    </div>
    <div className="meal-price-container">
      <Skeleton width={50} height={24} />
    </div>
  </div>
);

const ShoppingListSkeleton = () => (
  <div className="shopping-category">
    <Skeleton width="30%" height={24} style={{ marginBottom: '16px' }} />
    <div className="shopping-card">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} width="100%" height={60} style={{ marginBottom: '8px' }} />
      ))}
    </div>
  </div>
);


const SectionFrigo = ({ inventaireFrigo, tagsDisponibles, onUpdateQuantite, onAjouterItem }) => {
  // Petit state local juste pour gérer le menu déroulant
  const [tagSelectionne, setTagSelectionne] = useState("");

  const gererAjout = () => {
    onAjouterItem(tagSelectionne);
    setTagSelectionne(""); // On remet le select à zéro après ajout
  };

  return (
    <div className="mt-8 rounded-xl border bg-card text-card-foreground p-6">
      <h3 className="text-lg font-semibold leading-none tracking-tight mb-2">🥶 Dans mon frigo</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Ajoute tes restes. L'algorithme les déduira de tes courses et adaptera tes repas !
      </p>
      
      {/* --- BARRE D'AJOUT --- */}
      <div className="flex gap-2 mb-5">
        <select 
          value={tagSelectionne} 
          onChange={(e) => setTagSelectionne(e.target.value)}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">+ Ajouter un ingrédient...</option>
          {tagsDisponibles.map(tag => (
            <option key={tag} value={tag}>{tag.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button 
          onClick={gererAjout}
          disabled={!tagSelectionne}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Ajouter
        </button>
      </div>

      {/* --- LISTE DES INGRÉDIENTS --- */}
      {inventaireFrigo.length === 0 ? (
        <div className="text-center p-4 text-muted-foreground italic text-sm">
          Ton frigo est vide pour le moment.
        </div>
      ) : (
        <div className="grid gap-3">
          {inventaireFrigo.map(item => (
            <div key={item.tag_ingredient} className="flex items-center justify-between bg-background p-3 rounded-lg border">
              <span className="font-semibold capitalize text-sm">
                {item.tag_ingredient.replace(/_/g, ' ')}
              </span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={item.quantite_accumulee} 
                  onChange={(e) => onUpdateQuantite(item.tag_ingredient, Number(e.target.value))}
                  className="h-9 w-20 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-center font-bold"
                />
                <span className="text-muted-foreground text-sm">g / ml</span>
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
  
  // Créons un dictionnaire pour un accès rapide aux instructions par nom de recette
  const instructionsMap = instructionsData.reduce((acc, item) => {
    acc[item.nom] = item.instructions;
    return acc;
  }, {});

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

      // On enrichit le menu avec les instructions
      const menuEnrichi = (resultat.menu || []).map(repas => ({
        ...repas,
        instructions: instructionsMap[repas.nom] || "Les instructions de préparation ne sont pas encore disponibles pour cette recette."
      }));

      setMenu(Array.isArray(menuEnrichi) ? menuEnrichi : [])
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
      // On enrichit aussi la nouvelle recette avec ses instructions
      nouveauMenu[index] = {
        ...resultat.recette,
        instructions: instructionsMap[resultat.recette.nom] || "Les instructions de préparation ne sont pas encore disponibles pour cette recette."
      };
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
      <header className="py-12">
        <div className="container mx-auto px-4 text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Planificateur hebdo</span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mt-2">MyWeekPlan</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Un menu plus malin, moins cher, et branché sur ton frigo.</p>
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
          <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="flex flex-col space-y-1.5 p-6">
              <div>
                <h2 className="font-semibold leading-none tracking-tight text-2xl">Prépare ton menu</h2>
                <p className="text-sm text-muted-foreground">Entre ton budget, le nombre de repas et ce que tu as déjà.</p>
              </div>
              {errorMsg ? <span className="status-pill status-pill-error">Erreur</span> : <span className="status-pill status-pill-success">Prêt</span>}
            </div>

            {isLoading && (
              <div className="p-6 pt-0 loading-banner">
                <span className="loading-dot" />
                Génération du menu en cours, ne ferme pas la page.
              </div>
            )}
            <div className="p-6 pt-0 grid gap-4">
              {/* Ligne Budget */}
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Quel est ton budget de la semaine ?</label>
                <div className="relative">
                  <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} min="1" max="500" step="1" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"/>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">€</span>
                </div>
                <p className="text-sm text-muted-foreground">Budget conseillé: entre 1 € et 500 €.</p>
              </div>
              
              {/* Nouvelle disposition pour Repas et Personnes côte à côte */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Nbr de repas</label>
                  <input type="number" value={mealsCount} onChange={(e) => setMealsCount(Number(e.target.value))} min="1" max="14" step="1" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"/>
                  <p className="text-sm text-muted-foreground">Entre 1 et 14 repas.</p>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Personnes</label>
                  <input type="number" value={portions} onChange={(e) => setPortions(Number(e.target.value))} min="1" max="12" step="1" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"/>
                  <p className="text-sm text-muted-foreground">Pour 1 à 12 personnes.</p>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Mode de planification</label>
                <select value={planningMode} onChange={(e) => setPlanningMode(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="economic">Économique</option>
                  <option value="balanced">Équilibré</option>
                  <option value="quick">Rapide</option>
                  <option value="anti-gaspi">Anti-gaspi</option>
                </select>
                <p className="text-sm text-muted-foreground">Choisis l’angle de sélection du menu.</p>
              </div>
            </div>
          </div>
          <SectionFrigo 
            inventaireFrigo={inventaireFrigo} 
            tagsDisponibles={tagsDisponibles}
            onUpdateQuantite={handleUpdateFrigo} 
            onAjouterItem={handleAjouterFrigo}
          />
          {errorMsg && <p className="text-destructive text-center font-bold">{errorMsg}</p>}
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full text-base" onClick={handleGenerateMenuClick} disabled={isBusy}>
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
            {isLoading ? (
              [...Array(mealsCount)].map((_, i) => <MealItemSkeleton key={i} />)
            ) : (
              menu.map((repas, index) => (
                <div key={index} 
                  className="meal-item flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm" 
                  onClick={() => setSelectedRecipe(repas)} 
                  style={{ cursor: 'pointer' }} // Gardé pour l'indication visuelle
                >
                  <div className="flex items-center gap-4">
                    <img src={repas.image_url || 'https://via.placeholder.com/60?text=Miam'} alt={repas.nom} className="meal-image" />
                    <div className="meal-item-left">
                      <h3>{repas.nom}</h3>
                      <p>⏱ {repas.temps_prep} min</p>
                    </div>
                  </div>

                  <div className="meal-price-container flex items-center gap-2">
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
              ))
            )}
          </div>
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full text-base" onClick={handleGenerateListClick} disabled={isBusy}>
            {isGeneratingShoppingList ? 'Création en cours...' : 'Valider & faire les courses'}
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
          
          <div className="shopping-container mt-6 space-y-6">
            {isGeneratingShoppingList ? (
              <ShoppingListSkeleton />
            ) : (
              Object.entries(shoppingList).map(([rayon, items]) => (
                <div key={rayon} className="shopping-category">
                  <h3 className="category-title text-lg font-semibold mb-3">{rayon}</h3>
                  
                  <div className="shopping-card rounded-lg border bg-card text-card-foreground shadow-sm p-2 space-y-1">
                    {items.map((item) => {
                      // On vérifie si l'ID de l'item est dans l'objet/tableau checkedItems
                      const isChecked = checkedItems[item.id] || false;
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`shopping-item-row flex items-center gap-4 p-3 rounded-md cursor-pointer transition-colors hover:bg-accent ${isChecked ? 'bg-secondary' : ''}`}
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
                          <div className={`item-checkbox ml-auto h-5 w-5 rounded-full border-2 flex items-center justify-center ${isChecked ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                            {isChecked && <span className="text-primary-foreground text-xs font-bold">✓</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* --- LA MODALE DE DÉTAIL RECETTE --- */}
      {selectedRecipe && (
        <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>

          <div className="modal-content rounded-xl border bg-card text-card-foreground shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button className="btn-close" onClick={() => setSelectedRecipe(null)}>✕</button>

            <img 
              src={selectedRecipe.image_url || 'https://via.placeholder.com/400?text=Miam'} 
              alt={selectedRecipe.nom} 
              className="modal-img rounded-t-xl" 
            />

            <div className="modal-body p-6">
              <h2 className="text-2xl font-bold text-primary">
                {selectedRecipe.nom}</h2>
              <div className="modal-meta text-sm text-muted-foreground mt-2">
                ⏱ {selectedRecipe.temps_prep} min • 👤 Pour {portions} personne(s)
              </div>

              <h3 className="mt-6 mb-3 text-lg font-semibold">Ingrédients</h3>
              <div className="flex flex-wrap gap-2">
                {selectedRecipe.ingredients && selectedRecipe.ingredients.map((ing, i) => (
                  <span key={i} className="ingredient-pill inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    {/* On multiplie par le nombre de portions ! */}
                    <span className="ingredient-qty font-bold mr-1.5">{(ing.besoin_grammes * portions).toString().replace('.', ',')}g</span> 
                    {ing.tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              <h3 className="mt-6 mb-3 text-lg font-semibold">Préparation</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
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
