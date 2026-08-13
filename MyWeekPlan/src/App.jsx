import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings2, ChefHat, ShoppingBag, Plus, RefreshCw, Lock, Unlock, X, Check } from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { generateWeeklyMenu, getAlternativeMeal } from './utils/solver'
import { generateShoppingList } from './utils/shoppingList'
import { supabase } from './supabase'
import instructionsData from '../instructions_completes_a_ajouter.json'
import './App.css'

// --- UTILITAIRES & HAPTIQUES ---
const vibrate = () => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(50); // Vibration subtile
  }
};

const getEmojiForTag = (tag) => {
  const map = {
    'poulet': '🍗', 'boeuf_hache': '🥩', 'boeuf_bourguignon': '🥩', 'saucisses': '🌭', 'lardons': '🥓', 'jambon': '🥓',
    'saumon': '🐟', 'pave_saumon': '🐟', 'saumon_fume': '🐟', 'cabillaud': '🐟', 'crevettes': '🦐',
    'oignons': '🧅', 'ail': '🧄', 'poivrons': '🫑', 'carottes': '🥕', 'pommes_de_terre': '🥔', 'courgettes': '🥒', 'aubergines': '🍆', 'salade': '🥬', 'champignons': '🍄', 'tomates_fraiches': '🍅',
    'creme': '🥛', 'lait': '🥛', 'fromage_rape': '🧀', 'oeufs': '🥚', 'beurre': '🧈',
    'pates': '🍝', 'riz': '🍚', 'pain': '🥖'
  };
  return map[tag] || '✨';
};

const formatQuantity = (tag, quantite) => {
  const liquides = ['lait', 'creme', 'lait_de_coco', 'huile_olive', 'sauce_teriyaki'];
  if (quantite >= 1000) return `${(quantite / 1000).toString().replace('.', ',')} ${liquides.includes(tag) ? 'L' : 'kg'}`;
  return `${quantite} ${liquides.includes(tag) ? 'ml' : 'g'}`;
};

// --- COMPOSANTS UI ---
const HaloImage = ({ url, tag, nom }) => (
  <div className="halo-visual w-24 h-24 sm:w-32 sm:h-32 shrink-0">
    {url ? (
      <img src={url} alt={nom} className="w-full h-full object-cover grayscale opacity-90 hover:grayscale-0 transition-all duration-500" />
    ) : (
      <span className="relative z-10 drop-shadow-md">{getEmojiForTag(tag)}</span>
    )}
  </div>
);

// --- APPLICATION ---
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
  const [shoppingList, setShoppingList] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [lockedMeals, setLockedMeals] = useState({});
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const instructionsMap = instructionsData.reduce((acc, item) => {
    acc[item.nom] = item.instructions;
    return acc;
  }, {});

  // Supabase (Lecture seule pour l'exemple, garde ta logique)
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

  const handleGenerateMenuClick = async () => {
    vibrate();
    setIsLoading(true);
    try {
      const resultat = await generateWeeklyMenu(budget, mealsCount, portions, planningMode);
      if (resultat?.success || resultat?.succes) {
        setMenu(resultat.menu.map(r => ({ ...r, instructions: instructionsMap[r.nom] || "Instructions indisponibles." })));
        setTotalCost(resultat.totalCost || resultat.coutTotal || 0);
        setCurrentStep(2);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
    exit: { opacity: 0, y: -20 }
  };

  const itemVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 }
  };

  return (
    <div className="container mx-auto px-4 max-w-6xl py-12 lg:py-20 flex flex-col min-h-screen">
      
      {/* HEADER ÉDITORIAL */}
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <p className="font-display font-bold uppercase tracking-[0.3em] text-primary mb-4 text-sm">Édition / Hebdomadaire</p>
          <h1 className="text-6xl md:text-8xl font-black uppercase leading-none tracking-tighter">
            Le<br />Menu.
          </h1>
        </motion.div>

        {/* Navigation Desktop */}
        <div className="hidden md:flex gap-4">
          {[1, 2, 3].map(step => (
            <button key={step} 
              onClick={() => { vibrate(); setCurrentStep(step); }}
              className={`w-14 h-14 brutal-border flex items-center justify-center font-display font-bold text-xl transition-colors ${currentStep === step ? 'bg-primary shadow-[4px_4px_0px_0px_#121212]' : 'bg-transparent hover:bg-white'}`}>
              {step}
            </button>
          ))}
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <AnimatePresence mode="wait">
        
        {/* --- ÉTAPE 1 : CONFIGURATION --- */}
        {currentStep === 1 && (
          <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
              
              {/* Grand Bloc Budget (Asymétrique) */}
              <motion.div variants={itemVariants} className="brutal-card md:col-span-8 bg-white">
                <h2 className="font-display uppercase tracking-widest text-sm text-muted-foreground mb-8">Définition des ressources</h2>
                <div className="flex flex-col md:flex-row md:items-end gap-4 mt-auto">
                  <div className="flex-1">
                    <span className="text-8xl md:text-[10rem] font-black leading-none">{budget}</span>
                    <span className="text-4xl font-bold ml-2">€</span>
                  </div>
                  <input type="range" min="10" max="200" step="5" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full md:w-64 accent-primary h-2 bg-muted brutal-border appearance-none" />
                </div>
              </motion.div>

              {/* Bloc Paramètres */}
              <motion.div variants={itemVariants} className="brutal-card md:col-span-4 bg-primary text-primary-foreground">
                <h2 className="font-display uppercase tracking-widest text-sm mb-6 border-b-[3px] border-foreground pb-4">Variables</h2>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="font-bold uppercase">Repas</span>
                    <div className="flex items-center brutal-border bg-white">
                      <button onClick={() => { vibrate(); setMealsCount(Math.max(1, mealsCount - 1)); }} className="px-3 py-1 hover:bg-muted font-bold">-</button>
                      <span className="px-4 font-bold border-x-[3px] border-foreground">{mealsCount}</span>
                      <button onClick={() => { vibrate(); setMealsCount(Math.min(14, mealsCount + 1)); }} className="px-3 py-1 hover:bg-muted font-bold">+</button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-bold uppercase">Portions</span>
                    <div className="flex items-center brutal-border bg-white">
                      <button onClick={() => { vibrate(); setPortions(Math.max(1, portions - 1)); }} className="px-3 py-1 hover:bg-muted font-bold">-</button>
                      <span className="px-4 font-bold border-x-[3px] border-foreground">{portions}</span>
                      <button onClick={() => { vibrate(); setPortions(Math.min(12, portions + 1)); }} className="px-3 py-1 hover:bg-muted font-bold">+</button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Action */}
              <motion.div variants={itemVariants} className="md:col-span-12">
                <button className="brutal-btn w-full text-2xl py-6 brutal-shadow-hover" onClick={handleGenerateMenuClick} disabled={isLoading}>
                  {isLoading ? 'Conception en cours...' : 'Générer l\'Édition'}
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* --- ÉTAPE 2 : MENU --- */}
        {currentStep === 2 && (
          <motion.div key="step2" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b-[3px] border-foreground pb-6">
              <div>
                <h2 className="text-4xl font-black uppercase">Sélection</h2>
                <p className="font-bold text-muted-foreground mt-2">Estimation : {totalCost.toFixed(2)} €</p>
              </div>
              <button className="brutal-btn mt-6 md:mt-0" onClick={() => { vibrate(); setCurrentStep(3); }}>
                Liste de Courses
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {menu.map((repas, index) => (
                <motion.div key={index} variants={itemVariants} whileHover={{ y: -5 }} className="brutal-card bg-white cursor-pointer group" onClick={() => { vibrate(); setSelectedRecipe(repas); }}>
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button className="w-10 h-10 bg-white brutal-border flex items-center justify-center hover:bg-primary transition-colors"
                      onClick={(e) => { e.stopPropagation(); vibrate(); setLockedMeals(prev => ({ ...prev, [index]: !prev[index] })); }}>
                      {lockedMeals[index] ? <Lock size={18} strokeWidth={3} /> : <Unlock size={18} strokeWidth={3} />}
                    </button>
                  </div>
                  
                  <HaloImage url={repas.image_url} tag={repas.ingredients?.[0]?.tag} nom={repas.nom} />
                  
                  <h3 className="text-2xl font-black mt-6 mb-2 leading-tight group-hover:text-primary transition-colors">{repas.nom}</h3>
                  <div className="mt-auto pt-6 flex justify-between font-bold text-sm uppercase tracking-widest text-muted-foreground">
                    <span>{repas.temps_prep} min</span>
                    <span>{repas.prixCalcule.toFixed(2)} €</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- NAVIGATION MOBILE FIXE --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t-[3px] border-foreground p-4 flex justify-between">
        <button onClick={() => { vibrate(); setCurrentStep(1); }} className={`flex-1 flex flex-col items-center gap-1 font-bold ${currentStep === 1 ? 'text-primary' : 'text-foreground'}`}><Settings2 size={24} />Config</button>
        <button onClick={() => { vibrate(); setCurrentStep(2); }} className={`flex-1 flex flex-col items-center gap-1 font-bold border-l-[3px] border-foreground ${currentStep === 2 ? 'text-primary' : 'text-foreground'}`}><ChefHat size={24} />Menu</button>
        <button onClick={() => { vibrate(); setCurrentStep(3); }} className={`flex-1 flex flex-col items-center gap-1 font-bold border-l-[3px] border-foreground ${currentStep === 3 ? 'text-primary' : 'text-foreground'}`}><ShoppingBag size={24} />Courses</button>
      </div>

      <Analytics />
      <SpeedInsights />
    </div>
  );
}