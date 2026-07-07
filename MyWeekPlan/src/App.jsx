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
  
  // NOUVEAUX ÉTATS POUR LA LISTE DE COURSES
  const [shoppingList, setShoppingList] = useState(null)
  const [isListLoading, setIsListLoading] = useState(false)
  const [checkedItems, setCheckedItems] = useState({}) // Pour griser les cases cochées

  const handleGenerateMenuClick = async () => {
    setIsLoading(true)
    setErrorMsg('')
    setMenu([])
    setShoppingList(null) // On cache l'ancienne liste si on regénère un menu

    const resultat = await generateWeeklyMenu(budget, mealsCount)

    if (resultat.erreur) {
      setErrorMsg(resultat.erreur)
    } else {
      setMenu(resultat.menu)
      setTotalCost(resultat.coutTotal)
      if (!resultat.succes) {
        setErrorMsg("Attention : Impossible de tenir le budget. Voici le menu le plus proche trouvé.")
      }
    }
    setIsLoading(false)
  }

  // --- NOUVELLE FONCTION : GÉNÉRER LA LISTE ---
  const handleGenerateListClick = async () => {
    setIsListLoading(true)
    const list = await generateShoppingList(menu)
    setShoppingList(list)
    setIsListLoading(false)
  }

  // --- FONCTION POUR COCHER UN ARTICLE ---
  const toggleCheck = (itemId) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  return (
    <div className="container" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>MyWeekPlan</h1>
        <p style={{ color: '#666' }}>Planification automatique des repas et du budget</p>
      </header>

      <section style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <label>Budget (€) : <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: '60px' }}/></label>
          <label>Repas : <input type="number" value={mealsCount} onChange={(e) => setMealsCount(Number(e.target.value))} style={{ width: '50px' }}/></label>
        </div>
        
        <button onClick={handleGenerateMenuClick} disabled={isLoading} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>
          {isLoading ? 'Calcul en cours...' : 'Générer la semaine !'}
        </button>
      </section>

      {errorMsg && <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</p>}

      {menu.length > 0 && (
        <section style={{ marginBottom: '30px' }}>
          <h2>Ton Menu ({totalCost.toFixed(2)} €)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {menu.map((repas, index) => (
              <div key={index} style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <strong>{repas.nom}</strong>
                <span style={{ color: '#28a745' }}>{repas.prixCalcule.toFixed(2)} €</span>
              </div>
            ))}
          </div>

          {/* BOUTON POUR LA LISTE DE COURSES */}
          {!shoppingList && (
            <button onClick={handleGenerateListClick} disabled={isListLoading} style={{ width: '100%', padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
              {isListLoading ? 'Création de la liste...' : '🛒 Faire ma liste de courses'}
            </button>
          )}
        </section>
      )}

      {/* AFFICHAGE DE LA LISTE DE COURSES (Triée par rayon) */}
      {shoppingList && (
        <section style={{ backgroundColor: '#fff', border: '2px solid #333', padding: '15px', borderRadius: '8px' }}>
          <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Ma Liste de Courses</h2>
          
          {Object.keys(shoppingList).map(rayon => (
            <div key={rayon} style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#007bff', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>📍 {rayon}</h3>
              
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {shoppingList[rayon].map((item, index) => {
                  const isChecked = checkedItems[item.id]
                  return (
                    <li 
                      key={index} 
                      onClick={() => toggleCheck(item.id)}
                      style={{ 
                        padding: '10px 0', 
                        borderBottom: '1px dashed #eee',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        color: isChecked ? '#aaa' : '#000',
                        textDecoration: isChecked ? 'line-through' : 'none'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked || false} 
                        readOnly
                        style={{ marginRight: '15px', transform: 'scale(1.5)' }} 
                      />
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