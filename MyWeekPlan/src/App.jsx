import { useState } from 'react'
import { generateWeeklyMenu, getAlternativeMeal } from './utils/solver'
import { generateShoppingList } from './utils/shoppingList'
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

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  
  const [budget, setBudget] = useState(50)
  const [mealsCount, setMealsCount] = useState(7)
  // NOUVEAU : On définit 2 portions par défaut
  const [portions, setPortions] = useState(2) 
  
  const [menu, setMenu] = useState([])
  const [totalCost, setTotalCost] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [shoppingList, setShoppingList] = useState(null)
  const [checkedItems, setCheckedItems] = useState({})
  const [rerollingIndex, setRerollingIndex] = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null)

  const handleGenerateMenuClick = async () => {
    setIsLoading(true)
    setErrorMsg('')
    
    // On passe la variable portions au solveur
    const resultat = await generateWeeklyMenu(budget, mealsCount, portions)

    if (resultat.erreur) {
      setErrorMsg(resultat.erreur)
    } else {
      setMenu(resultat.menu)
      setTotalCost(resultat.coutTotal)
      setCurrentStep(2)
    }
    setIsLoading(false)
  }

  const handleRerollMeal = async (index) => {
    setRerollingIndex(index) 
    
    // On passe la variable portions
    const resultat = await getAlternativeMeal(menu, index, budget, portions)
    
    if (resultat.succes) {
      const nouveauMenu = [...menu]
      nouveauMenu[index] = resultat.recette 
      setMenu(nouveauMenu)
      
      const nouveauPrix = nouveauMenu.reduce((sum, repas) => sum + repas.prixCalcule, 0)
      setTotalCost(nouveauPrix)
    } else {
      alert("Impossible de changer ce plat (As-tu assez de recettes dans ta base ?)")
    }
    
    setRerollingIndex(null)
  }

  const handleGenerateListClick = async () => {
    setIsLoading(true)
    // On passe la variable portions
    const list = await generateShoppingList(menu, portions)
    setShoppingList(list)
    setCurrentStep(3)
    setIsLoading(false)
  }

  const toggleCheck = (itemId) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  return (
    <div className="app-container">
      
      {currentStep === 1 && (
        <div className="screen">
          <div className="header">
            <h1>MyWeekPlan</h1>
            <p>Ton budget, tes repas.</p>
          </div>
          
          <div className="card">
            {/* Ligne Budget */}
            <div className="input-group">
              <label>Quel est ton budget de la semaine ?</label>
              <div style={{ position: 'relative' }}>
                <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} min="1" />
                <span style={{ position: 'absolute', right: '15px', top: '15px', fontWeight: 'bold', color: '#6b7280' }}>€</span>
              </div>
            </div>
            
            {/* Nouvelle disposition pour Repas et Personnes côte à côte */}
            <div style={{ display: 'flex', gap: '15px' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Nbr de repas</label>
                <input type="number" value={mealsCount} onChange={(e) => setMealsCount(Number(e.target.value))} min="1" />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Personnes</label>
                <input type="number" value={portions} onChange={(e) => setPortions(Number(e.target.value))} min="1" />
              </div>
            </div>
          </div>
          
          {errorMsg && <p style={{ color: '#ef4444', textAlign: 'center', fontWeight: 'bold' }}>{errorMsg}</p>}
          <button className="btn-action" onClick={handleGenerateMenuClick} disabled={isLoading}>
            {isLoading ? 'Calcul en cours...' : 'Générer mon menu'}
          </button>
        </div>
      )}

      {/* Le reste de l'interface (Étape 2 et 3) ne change pas ! */}
      {/* ... Copie-colle la suite de ton return () précédent à partir du {currentStep === 2 && ...} ... */}

      {currentStep === 2 && (
        <div className="screen">
          <button className="btn-back" onClick={() => setCurrentStep(1)}>
            Modifier le budget
          </button>
          
          {/* La couleur change si on dépasse le budget */}
          <div className="budget-summary" style={{ backgroundColor: totalCost > budget ? '#ef4444' : 'var(--primary)' }}>
            Coût total estimé : {totalCost.toFixed(2)} €
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
                    className={`btn-reroll ${rerollingIndex === index ? 'spinning' : ''}`}
                    onClick={(e) => { 
                      e.stopPropagation(); // EMPÊCHE D'OUVRIR LA RECETTE QUAND ON CLIQUE SUR REROLL
                      handleRerollMeal(index) 
                    }}
                    disabled={rerollingIndex !== null}
                  >
                    🔄
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-action" onClick={handleGenerateListClick} disabled={isLoading}>
            {isLoading ? 'Création...' : 'Valider & faire les courses'}
          </button>
        </div>
      )}

      {/* --- ÉTAPE 3 : LISTE DE COURSES --- */}
      {currentStep === 3 && shoppingList && (
        <div className="shopping-container">
          <h2 className="step-title" style={{ marginBottom: '32px' }}>Liste de courses</h2>
          
          {Object.entries(shoppingList).map(([rayon, items]) => (
            <div key={rayon} className="shopping-category">
              <h3 className="category-title">{rayon}</h3>
              
              <div className="shopping-card">
                {items.map((item) => {
                  const isChecked = checkedItems.includes(item.id);
                  return (
                    <div 
                      key={item.id} 
                      className={`shopping-item-row ${isChecked ? 'checked' : ''}`}
                      onClick={() => toggleCheckItem(item.id)}
                    >
                      {/* L'icône dynamique */}
                      <div className={`item-icon-wrapper ${getBackgroundClass(item.tag)}`}>
                        {getEmojiForTag(item.tag)}
                      </div>
                      
                      {/* Le texte */}
                      <div className="item-details">
                        <div className="item-name">{item.nom}</div>
                        {/* On affiche juste les grammes exacts calculés */}
                        <div className="item-qty">{item.quantite} g</div>
                      </div>
                      
                      {/* La case à cocher ronde */}
                      <div className="item-checkbox">
                        {isChecked && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <button className="btn-primary" onClick={() => setCurrentStep(1)} style={{ marginTop: '24px' }}>
            Refaire un menu
          </button>
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
    </div>
  )
}

export default App