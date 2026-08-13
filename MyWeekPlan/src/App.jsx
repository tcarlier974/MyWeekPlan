import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { generateWeeklyMenu, getAlternativeMeal } from './utils/solver'
import { generateShoppingList } from './utils/shoppingList'
import { supabase } from './supabase'
import { getRequiredQuantities, subtractInventory } from './utils/menuCalculations'
import instructionsData from '../instructions_completes_a_ajouter.json'
import './App.css'

// --- UTILITAIRES VISUELS ---
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

const getMeshClass = (tag) => {
  if (['poulet', 'boeuf_hache', 'boeuf_bourguignon', 'saucisses', 'lardons', 'jambon'].includes(tag)) return 'mesh-meat';
  if (['saumon', 'pave_saumon', 'saumon_fume', 'cabillaud', 'crevettes'].includes(tag)) return 'mesh-fish';
  if (['oignons', 'ail', 'poivrons', 'carottes', 'pommes_de_terre', 'courgettes', 'aubergines', 'salade', 'champignons', 'tomates_fraiches'].includes(tag)) return 'mesh-veg';
  if (['creme', 'lait', 'fromage_rape', 'oeufs', 'beurre'].includes(tag)) return 'mesh-dairy';
  return 'mesh-default';
};

const formatQuantity = (tag, quantite) => {
  const liquides = ['lait', 'creme', 'lait_de_coco', 'huile_olive', 'sauce_teriyaki'];
  const isLiquid = liquides.includes(tag);
  if (quantite >= 1000) {
    return `${(quantite / 1000).toString().replace('.', ',')} ${isLiquid ? 'L' : 'kg'}`;
  }
  return `${quantite} ${isLiquid ? 'ml' : 'g'}`;
};

// Composant Image (Affiche l'image réelle ou le dégradé Apple Music)
const MealVisual = ({ url, nom, tag, className = "w-16 h-16 rounded-2xl" }) => {
  if (url) return <img src={url} alt={nom} className={`${className} object-cover`} />;
  return (
    <div className={`${className} mesh-gradient ${getMeshClass(tag)}`}>
      {getEmojiForTag(tag)}
    </div>
  );
};

// --- COMPOSANT FRIGO (Intégré en Bento) ---
const SectionFrigoBento = ({ inventaireFrigo, tagsDisponibles, onUpdateQuantite, onAjouterItem }) => {
  const [tagSelectionne, setTagSelectionne] = useState("");

  const gererAjout = () => {
    onAjouterItem(tagSelectionne);
    setTagSelectionne("");
  };

  return (
    <div className="bento-item bento-item-large">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-xl">🥶</div>
        <div>
          <h3 className="text-lg font-bold">Inventaire du Frigo</h3>
          <p className="text-sm text-muted-foreground">Déduit automatiquement de tes courses.</p>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <select 
          value={tagSelectionne} 
          onChange={(e) => setTagSelectionne(e.target.value)}
          className="glass-input flex-1 bg-black/60 font-normal text-sm h-12"
        >
          <option value="">+ Ajouter un ingrédient...</option>
          {tagsDisponibles.map(tag => (
            <option key={tag} value={tag}>{tag.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button 
          onClick={gererAjout}
          disabled={!tagSelectionne}
          className="btn-apple-secondary h-12 px-5 text-sm"
        >
          Ajouter
        </button>
      </div>

      {inventaireFrigo.length === 0 ? (
        <div className="text-center p-6 text-muted-foreground text-sm glass-panel bg-white/5 rounded-2xl border-dashed">
          Ton frigo est vide pour le moment.
        </div>
      ) : (
        <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-2">
          {inventaireFrigo.map(item => (
            <div key={item.tag_ingredient} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="font-semibold capitalize text-sm">
                {item.tag_ingredient.replace(/_/g, ' ')}
              </span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={item.quantite_accumulee} 
                  onChange={(e) => onUpdateQuantite(item.tag_ingredient, Number(e.target.value))}
                  className="h-8 w-16 rounded-lg bg-black/50 border border-white/10 px-2 text-center text-sm font-bold outline-none focus:border-primary"
                />
                <span className="text-muted-foreground text-xs font-medium w-6">g/ml</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- APPLICATION PRINCIPALE ---
export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [budget, setBudget] = useState(50);
  const [mealsCount, setMealsCount] = useState(7);
  const [portions, setPortions] = useState(2); 
  const [planningMode, setPlanningMode] = useState('balanced');
  const [inventaireFrigo, setInventaireFrigo] = useState([]);
  const [tagsDisponibles, setTagsDisponibles] = useState([]);
  const [menu, setMenu] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingShoppingList, setIsGeneratingShoppingList] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shoppingList, setShoppingList] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [rerollingIndex, setRerollingIndex] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [lockedMeals, setLockedMeals] = useState({});

  const instructionsMap = instructionsData.reduce((acc, item) => {
    acc[item.nom] = item.instructions;
    return acc;
  }, {});

  const isBusy = isLoading || isGeneratingShoppingList || rerollingIndex !== null;

  const handleGenerateMenuClick = async () => {
    setIsLoading(true); setErrorMsg(''); setShoppingList(null); setLockedMeals({});
    try {
      const resultat = await generateWeeklyMenu(budget, mealsCount, portions, planningMode);
      const success = resultat?.success ?? resultat?.succes ?? false;
      if (!success) {
        setMenu([]); setTotalCost(0);
        setErrorMsg(resultat?.error ?? 'Impossible de générer un menu valide.');
        return;
      }
      const menuEnrichi = (resultat.menu || []).map(repas => ({
        ...repas,
        instructions: instructionsMap[repas.nom] || "Instructions non disponibles."
      }));
      setMenu(menuEnrichi);
      setTotalCost(Number.isFinite(resultat.totalCost) ? resultat.totalCost : (resultat.coutTotal || 0));
      setCurrentStep(2);
    } catch (error) {
      setMenu([]); setTotalCost(0);
      setErrorMsg('Erreur inattendue pendant la génération.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRerollMeal = async (index) => {
    if (lockedMeals[index]) return;
    setRerollingIndex(index);
    const resultat = await getAlternativeMeal(menu, index, budget, portions, planningMode);
    if (resultat.succes) {
      const nouveauMenu = [...menu];
      nouveauMenu[index] = {
        ...resultat.recette,
        instructions: instructionsMap[resultat.recette.nom] || "Instructions non disponibles."
      };
      setMenu(nouveauMenu);
      setTotalCost(nouveauMenu.reduce((sum, repas) => sum + repas.prixCalcule, 0));
    }
    setRerollingIndex(null);
  };

  const handleGenerateListClick = async () => {
    if (!menu.length) return;
    setIsGeneratingShoppingList(true);
    try {
      const list = await generateShoppingList(menu, portions);
      setShoppingList(list || {});
      setCurrentStep(3);
    } catch (error) {
      setErrorMsg('Impossible de générer la liste.');
    } finally {
      setIsGeneratingShoppingList(false);
    }
  };

  const toggleCheck = (itemId) => setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  const toggleMealLock = (index) => setLockedMeals(prev => ({ ...prev, [index]: !prev[index] }));

  const handleUpdateFrigo = async (tag, quantite) => {
    const safeQ = Math.max(0, quantite);
    setInventaireFrigo(prev => prev.map(item => item.tag_ingredient === tag ? { ...item, quantite_accumulee: safeQ } : item));
    if (supabase) await supabase.from('inventaire_frigo').upsert({ tag_ingredient: tag, quantite_accumulee: safeQ }, { onConflict: 'tag_ingredient' });
  };

  const handleAjouterFrigo = async (tag) => {
    if (!tag || inventaireFrigo.some(item => item.tag_ingredient === tag)) return;
    const nouvelItem = { tag_ingredient: tag, quantite_accumulee: 0 };
    setInventaireFrigo(prev => [...prev, nouvelItem]);
    if (supabase) await supabase.from('inventaire_frigo').insert([nouvelItem]);
  };

  useEffect(() => {
    async function chargerDonnees() {
      if (!supabase) return;
      try {
        const { data: frigoData } = await supabase.from('inventaire_frigo').select('*');
        if (frigoData) setInventaireFrigo(frigoData);
        const { data: produitsData } = await supabase.from('produits_magasin').select('tag_ingredient');
        if (produitsData) setTagsDisponibles([...new Set(produitsData.map(p => p.tag_ingredient))].sort());
      } catch (err) {}
    }
    chargerDonnees();
  }, []);

  return (
    <div className="app-container container mx-auto px-4 max-w-4xl py-8">
      
      {/* HEADER BENTO STYLE */}
      <header className="mb-10 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="text-primary font-bold tracking-widest text-xs uppercase mb-2">MyWeekPlan AI</div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Planificateur.</h1>
        </div>
        
        {/* Desktop Navigation */}
        <div className="desktop-stepper flex gap-2 glass-panel p-2 rounded-full">
          {[1, 2, 3].map(step => (
            <button key={step} onClick={() => step <= currentStep || (step === 2 && menu.length) || (step === 3 && shoppingList) ? setCurrentStep(step) : null}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${currentStep === step ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'}`}>
              {step === 1 ? 'Config' : step === 2 ? 'Menu' : 'Courses'}
            </button>
          ))}
        </div>
      </header>

      {/* --- ÉTAPE 1 : CONFIGURATION (BENTO GRID) --- */}
      {currentStep === 1 && (
        <div className="screen">
          <div className="bento-grid">
            
            {/* CARTE BUDGET */}
            <div className="bento-item justify-center bg-gradient-to-br from-card/80 to-card/40">
              <label className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Budget Global</label>
              <div className="flex items-baseline gap-2">
                <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} 
                  className="bg-transparent text-6xl font-extrabold w-32 outline-none text-white" />
                <span className="text-3xl text-muted-foreground font-bold">€</span>
              </div>
            </div>

            {/* CARTE PARAMÈTRES */}
            <div className="bento-item gap-4 bg-gradient-to-br from-card/80 to-card/40">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Repas</label>
                  <div className="glass-input flex items-center justify-between p-1 bg-white/5 border-none h-12">
                    <button onClick={() => setMealsCount(Math.max(1, mealsCount - 1))} className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center font-bold text-xl">-</button>
                    <span className="font-bold text-lg">{mealsCount}</span>
                    <button onClick={() => setMealsCount(Math.min(14, mealsCount + 1))} className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center font-bold text-xl">+</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Portions</label>
                  <div className="glass-input flex items-center justify-between p-1 bg-white/5 border-none h-12">
                    <button onClick={() => setPortions(Math.max(1, portions - 1))} className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center font-bold text-xl">-</button>
                    <span className="font-bold text-lg">{portions}</span>
                    <button onClick={() => setPortions(Math.min(12, portions + 1))} className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center font-bold text-xl">+</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block mt-2">Algorithme</label>
                <select value={planningMode} onChange={(e) => setPlanningMode(e.target.value)} className="glass-input bg-white/5 border-none h-12 text-sm">
                  <option value="balanced">Équilibré (Standard)</option>
                  <option value="economic">Économique (Moins cher)</option>
                  <option value="anti-gaspi">Anti-gaspi (Regroupe les ingrédients)</option>
                </select>
              </div>
            </div>

            {/* CARTE FRIGO */}
            <SectionFrigoBento inventaireFrigo={inventaireFrigo} tagsDisponibles={tagsDisponibles} onUpdateQuantite={handleUpdateFrigo} onAjouterItem={handleAjouterFrigo} />
          </div>

          {errorMsg && <p className="text-destructive font-bold text-center bg-destructive/10 py-3 rounded-xl">{errorMsg}</p>}
          
          <button className="btn-apple mt-4 text-lg" onClick={handleGenerateMenuClick} disabled={isBusy}>
            {isLoading ? 'Analyse par IA en cours...' : 'Générer le Menu'}
          </button>
        </div>
      )}

      {/* --- ÉTAPE 2 : MENU --- */}
      {currentStep === 2 && (
        <div className="screen">
          <div className="glass-panel p-6 rounded-3xl mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">Aperçu de la semaine</h2>
              <p className="text-muted-foreground text-sm">Estimation : <span className={`font-bold ${totalCost > budget ? 'text-destructive' : 'text-primary'}`}>{totalCost.toFixed(2)} €</span> / {budget} €</p>
            </div>
            <button className="btn-apple w-full md:w-auto px-8" onClick={handleGenerateListClick} disabled={isBusy}>
              Valider les courses
            </button>
          </div>

          <div className="grid gap-4">
            {menu.map((repas, index) => (
              <div key={index} className="glass-panel p-4 rounded-3xl flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setSelectedRecipe(repas)}>
                
                <MealVisual url={repas.image_url} nom={repas.nom} tag={repas.ingredients?.[0]?.tag || 'default'} />
                
                <div className="flex-1">
                  <h3 className="font-bold text-lg leading-tight mb-1">{repas.nom}</h3>
                  <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                    <span>{repas.prixCalcule.toFixed(2)} €</span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span>{repas.temps_prep} min</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${lockedMeals[index] ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                    onClick={(e) => { e.stopPropagation(); toggleMealLock(index); }}>
                    {lockedMeals[index] ? '🔒' : '🔓'}
                  </button>
                  <button className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-white/5 hover:bg-white/10 transition-transform ${rerollingIndex === index ? 'animate-spin' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleRerollMeal(index); }} disabled={isBusy || lockedMeals[index]}>
                    🔄
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ÉTAPE 3 : COURSES (RAPPELS iOS) --- */}
      {currentStep === 3 && shoppingList && (
        <div className="screen">
          {Object.entries(shoppingList).map(([rayon, items]) => (
            <div key={rayon} className="reminders-list">
              <div className="reminders-category">{rayon}</div>
              {items.map((item) => {
                const isChecked = checkedItems[item.id] || false;
                return (
                  <div key={item.id} className={`reminders-item ${isChecked ? 'checked' : ''}`} onClick={() => toggleCheck(item.id)}>
                    <div className="reminders-checkbox">
                      {isChecked && <div className="w-3 h-3 rounded-full bg-background"></div>}
                    </div>
                    <div className="flex-1">
                      <div className="item-name font-semibold text-sm">{item.nom}</div>
                      <div className="item-qty text-xs font-medium text-muted-foreground mt-0.5">{formatQuantity(item.tag, item.quantite)}</div>
                    </div>
                    <div className="text-2xl opacity-80">{getEmojiForTag(item.tag)}</div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* --- BOTTOM TAB BAR (MOBILE) --- */}
      <nav className="bottom-tab-bar">
        <button className={`tab-item ${currentStep === 1 ? 'active' : ''}`} onClick={() => setCurrentStep(1)}>
          <span className="text-2xl mb-1">⚙️</span>
          Config
        </button>
        <button className={`tab-item ${currentStep === 2 ? 'active' : ''}`} onClick={() => setCurrentStep(2)} disabled={!menu.length}>
          <span className="text-2xl mb-1">📋</span>
          Menu
        </button>
        <button className={`tab-item ${currentStep === 3 ? 'active' : ''}`} onClick={() => setCurrentStep(3)} disabled={!shoppingList}>
          <span className="text-2xl mb-1">🛒</span>
          Courses
        </button>
      </nav>

      {/* --- MODALE DE RECETTE --- */}
      {selectedRecipe && (
        <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="btn-close" onClick={() => setSelectedRecipe(null)}>✕</button>
            <div className="h-48 w-full relative">
              <MealVisual url={selectedRecipe.image_url} nom={selectedRecipe.nom} tag={selectedRecipe.ingredients?.[0]?.tag || 'default'} className="w-full h-full rounded-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent"></div>
            </div>
            
            <div className="p-6 pt-0 overflow-y-auto">
              <h2 className="text-2xl font-bold mb-1">{selectedRecipe.nom}</h2>
              <div className="text-sm font-semibold text-primary mb-6">Pour {portions} personne(s) • {selectedRecipe.temps_prep} min</div>

              <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">Ingrédients</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedRecipe.ingredients?.map((ing, i) => (
                  <span key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-medium">
                    <span className="text-white font-bold mr-1">{(ing.besoin_grammes * portions).toString().replace('.', ',')}g</span> 
                    {ing.tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">Préparation</h3>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium pb-8">
                {selectedRecipe.instructions}
              </p>
            </div>
          </div>
        </div>
      )}

      <Analytics />
      <SpeedInsights />
    </div>
  );
}