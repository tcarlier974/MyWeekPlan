import { useState } from 'react'
import { generateWeeklyMenu, getAlternativeMeal } from './utils/solver'
import { generateShoppingList } from './utils/shoppingList'
import './App.css'

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
              <div key={index} className="meal-item">
                
                {/* AJOUT DE L'IMAGE ICI */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <img 
                    src={repas.image_url || 'https://via.placeholder.com/60?text=Miam'} 
                    alt={repas.nom} 
                    className="meal-image" 
                  />
                  
                  <div className="meal-item-left">
                    <h3>{repas.nom}</h3>
                    <p>⏱ {repas.temps_prep} min</p>
                  </div>
                </div>
                
                <div className="meal-price-container">
                  <span className="meal-price">{repas.prixCalcule.toFixed(2)} €</span>
                  <button 
                    className={`btn-reroll ${rerollingIndex === index ? 'spinning' : ''}`}
                    onClick={() => handleRerollMeal(index)}
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

      {currentStep === 3 && (
        <div className="screen">
          <button className="btn-back" onClick={() => setCurrentStep(2)}>Retour au menu</button>
          {shoppingList && Object.keys(shoppingList).map(rayon => (
            <div key={rayon} className="rayon-section">
              <h3 className="rayon-title">📍 {rayon}</h3>
              <div>
                {shoppingList[rayon].map((item, index) => {
                  const isChecked = checkedItems[item.id]
                  return (
                    <div key={index} className={`course-item ${isChecked ? 'checked' : ''}`} onClick={() => toggleCheck(item.id)}>
                      <input type="checkbox" checked={isChecked || false} readOnly />
                      <span><strong>{item.quantite}x</strong> {item.nom}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App