import { useState } from 'react'
import { generateWeeklyMenu } from './utils/solver'
import { generateShoppingList } from './utils/shoppingList'
import './App.css'

function App() {
  const [budget, setBudget] = useState(50)
  const [mealsCount, setMealsCount] = useState(7)
  const [menu, setMenu] = useState([])
  const [totalCost, setTotalCost] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [shoppingList, setShoppingList] = useState(null)
  const [isListLoading, setIsListLoading] = useState(false)
  const [checkedItems, setCheckedItems] = useState({})

  const handleGenerateMenuClick = async () => {
    setIsLoading(true)
    setErrorMsg('')
    setMenu([])
    setShoppingList(null)

    const resultat = await generateWeeklyMenu(budget, mealsCount)

    if (resultat.erreur) {
      setErrorMsg(resultat.erreur)
    } else {
      setMenu(resultat.menu)
      setTotalCost(resultat.coutTotal)
      if (!resultat.succes) {
        setErrorMsg("Le budget est trop serré. Voici l'option la plus proche.")
      }
    }
    setIsLoading(false)
  }

  const handleGenerateListClick = async () => {
    setIsListLoading(true)
    const list = await generateShoppingList(menu)
    setShoppingList(list)
    setIsListLoading(false)
  }

  const toggleCheck = (itemId) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  return (
    <div className="app-container">
      <div className="logo">MyWeekPlan.</div>

      <div className="settings-box">
        <h2>Ton plan de la semaine</h2>
        <div className="input-row">
          <div className="input-group">
            <label>Budget total</label>
            <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
          </div>
          <div className="input-group">
            <label>Repas</label>
            <input type="number" value={mealsCount} onChange={(e) => setMealsCount(Number(e.target.value))} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleGenerateMenuClick} disabled={isLoading}>
          {isLoading ? 'Préparation...' : 'Générer ma semaine →'}
        </button>
      </div>

      {errorMsg && <div style={{ color: 'red', fontSize: '0.9rem', marginBottom: '16px', textAlign: 'center' }}>{errorMsg}</div>}

      {menu.length > 0 && (
        <div className="menu-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>Des repas simples et variés</h2>
            <span style={{ fontWeight: 600 }}>{totalCost.toFixed(2)} € total</span>
          </div>
          
          <div className="menu-list">
            {menu.map((repas, index) => {
              // Si tu n'as pas encore de tags dans Supabase, on met "rapide" par défaut pour l'esthétique
              const tag = repas.tags && repas.tags.length > 0 ? repas.tags[0] : "rapide"
              
              return (
                <div key={index} className="meal-card">
                  <div className="meal-info">
                    <h3 className="meal-title">{repas.nom}</h3>
                    <div className="meal-meta">
                      <span>{repas.temps_prep} min</span>
                      <span className="tag">{tag}</span>
                    </div>
                  </div>
                  <div className="meal-price-box">
                    {repas.prixCalcule.toFixed(2)} € <span className="chevron">›</span>
                  </div>
                </div>
              )
            })}
          </div>

          {!shoppingList && (
            <button className="btn btn-secondary" onClick={handleGenerateListClick} disabled={isListLoading}>
              {isListLoading ? 'Création...' : 'Voir la liste de courses'}
            </button>
          )}
        </div>
      )}

      {shoppingList && (
        <div className="shopping-container">
          <h2 style={{ borderBottom: '1px solid #E5E5E5', paddingBottom: '16px', margin: '0 0 16px 0' }}>Ta liste est prête</h2>
          
          {Object.keys(shoppingList).map(rayon => (
            <div key={rayon}>
              <div className="rayon-title">{rayon}</div>
              <ul className="shopping-list">
                {shoppingList[rayon].map((item, index) => {
                  const isChecked = checkedItems[item.id]
                  return (
                    <li 
                      key={index} 
                      className={`shopping-item ${isChecked ? 'checked' : ''}`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked || false} 
                        onChange={() => toggleCheck(item.id)}
                      />
                      <span><span className="item-qty">{item.quantite}x</span> {item.nom}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App