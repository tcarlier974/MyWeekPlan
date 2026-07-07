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
        setErrorMsg("Impossible de tenir le budget. Voici le menu le plus proche trouvé.")
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
      <header className="header">
        <h1>MyWeekPlan</h1>
        <p>Gère ton budget, mange bien.</p>
      </header>

      {/* ZONE DE RÉGLAGES */}
      <section className="card">
        <div className="settings-row">
          <div className="input-group">
            <label>Budget (€)</label>
            <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
          </div>
          <div className="input-group">
            <label>Repas</label>
            <input type="number" value={mealsCount} onChange={(e) => setMealsCount(Number(e.target.value))} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleGenerateMenuClick} disabled={isLoading}>
          {isLoading ? 'Calcul en cours...' : 'Générer la semaine !'}
        </button>
      </section>

      {errorMsg && <div className="error-msg">{errorMsg}</div>}

      {/* ZONE DU MENU */}
      {menu.length > 0 && (
        <section className="card">
          <h2>Ton Menu <span style={{ float: 'right', color: 'var(--success)' }}>{totalCost.toFixed(2)} €</span></h2>
          
          <div>
            {menu.map((repas, index) => (
              <div key={index} className="menu-item">
                <div>
                  <h3>{repas.nom}</h3>
                  <small style={{ color: 'var(--text-muted)' }}>⏱ {repas.temps_prep} min</small>
                </div>
                <div className="menu-item-price">{repas.prixCalcule.toFixed(2)} €</div>
              </div>
            ))}
          </div>

          {!shoppingList && (
            <button className="btn btn-success" style={{ marginTop: '16px' }} onClick={handleGenerateListClick} disabled={isListLoading}>
              {isListLoading ? 'Création...' : '🛒 Créer la liste de courses'}
            </button>
          )}
        </section>
      )}

      {/* ZONE DE LA LISTE DE COURSES */}
      {shoppingList && (
        <section className="card">
          <h2>Ma Liste de Courses</h2>
          
          {Object.keys(shoppingList).map(rayon => (
            <div key={rayon}>
              <h3 className="rayon-title">📍 {rayon}</h3>
              <ul className="shopping-list">
                {shoppingList[rayon].map((item, index) => {
                  const isChecked = checkedItems[item.id]
                  return (
                    <li 
                      key={index} 
                      className={`shopping-item ${isChecked ? 'checked' : ''}`}
                      onClick={() => toggleCheck(item.id)}
                    >
                      <input type="checkbox" checked={isChecked || false} readOnly />
                      <span><strong>{item.quantite}x</strong> {item.nom}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

export default App