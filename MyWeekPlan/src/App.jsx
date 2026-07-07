import { useState } from 'react'
import { generateWeeklyMenu } from './utils/solver'
import { generateShoppingList } from './utils/shoppingList'
import './App.css'

function App() {
  // GESTION DES ÉTAPES (1: Config, 2: Menu, 3: Liste)
  const [currentStep, setCurrentStep] = useState(1)

  const [budget, setBudget] = useState(50)
  const [mealsCount, setMealsCount] = useState(7)
  
  const [menu, setMenu] = useState([])
  const [totalCost, setTotalCost] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [shoppingList, setShoppingList] = useState(null)
  const [checkedItems, setCheckedItems] = useState({})

  // --- ACTIONS ---
  const handleGenerateMenuClick = async () => {
    setIsLoading(true)
    setErrorMsg('')
    
    const resultat = await generateWeeklyMenu(budget, mealsCount)

    if (resultat.erreur) {
      setErrorMsg(resultat.erreur)
    } else {
      setMenu(resultat.menu)
      setTotalCost(resultat.coutTotal)
      if (!resultat.succes) {
        // Optionnel : avertir que le budget est dépassé
        console.warn("Budget dépassé")
      }
      setCurrentStep(2) // On passe à l'écran 2
    }
    setIsLoading(false)
  }

  const handleGenerateListClick = async () => {
    setIsLoading(true)
    const list = await generateShoppingList(menu)
    setShoppingList(list)
    setCurrentStep(3) // On passe à l'écran 3
    setIsLoading(false)
  }

  const toggleCheck = (itemId) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  // --- RENDU DES ÉCRANS ---

  return (
    <div className="app-container">
      
      {/* ÉTAPE 1 : PARAMÉTRAGE */}
      {currentStep === 1 && (
        <div className="screen">
          <div className="header">
            <h1>MyWeekPlan</h1>
            <p>Ton budget, tes repas.</p>
          </div>

          <div className="card">
            <div className="input-group">
              <label>Quel est ton budget de la semaine ?</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  value={budget} 
                  onChange={(e) => setBudget(Number(e.target.value))} 
                />
                <span style={{ position: 'absolute', right: '15px', top: '15px', fontWeight: 'bold', color: '#6b7280' }}>€</span>
              </div>
            </div>

            <div className="input-group">
              <label>Combien de repas veux-tu prévoir ?</label>
              <input 
                type="number" 
                value={mealsCount} 
                onChange={(e) => setMealsCount(Number(e.target.value))} 
              />
            </div>
          </div>

          {errorMsg && <p style={{ color: '#ef4444', textAlign: 'center', fontWeight: 'bold' }}>{errorMsg}</p>}

          <button className="btn-action" onClick={handleGenerateMenuClick} disabled={isLoading}>
            {isLoading ? 'Calcul en cours...' : 'Générer mon menu'}
          </button>
        </div>
      )}

      {/* ÉTAPE 2 : LE MENU GÉNÉRÉ */}
      {currentStep === 2 && (
        <div className="screen">
          <button className="btn-back" onClick={() => setCurrentStep(1)}>
            Modifier le budget
          </button>

          <div className="budget-summary">
            Coût total estimé : {totalCost.toFixed(2)} €
          </div>

          <div className="meal-list">
            {menu.map((repas, index) => (
              <div key={index} className="meal-item">
                <div className="meal-item-left">
                  <h3>{repas.nom}</h3>
                  <p>⏱ {repas.temps_prep} min</p>
                </div>
                <div className="meal-price">
                  {repas.prixCalcule.toFixed(2)} €
                </div>
              </div>
            ))}
          </div>

          <button className="btn-action" onClick={handleGenerateListClick} disabled={isLoading}>
            {isLoading ? 'Création...' : 'Valider & faire les courses'}
          </button>
        </div>
      )}

      {/* ÉTAPE 3 : LA LISTE DE COURSES */}
      {currentStep === 3 && (
        <div className="screen">
          <button className="btn-back" onClick={() => setCurrentStep(2)}>
            Retour au menu
          </button>

          {shoppingList && Object.keys(shoppingList).map(rayon => (
            <div key={rayon} className="rayon-section">
              <h3 className="rayon-title">📍 {rayon}</h3>
              <div>
                {shoppingList[rayon].map((item, index) => {
                  const isChecked = checkedItems[item.id]
                  return (
                    <div 
                      key={index} 
                      className={`course-item ${isChecked ? 'checked' : ''}`}
                      onClick={() => toggleCheck(item.id)}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked || false} 
                        readOnly
                      />
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