# 🥑 MyWeekPlan

**MyWeekPlan** est une application web mobile-first (Progressive Web App) qui automatise la planification des repas de la semaine et optimise la liste de courses en fonction d'un budget cible et du nombre de convives.

L'application intègre un moteur d'optimisation mathématique intelligent couplé à un système de scraping de données pour lier directement les recettes de cuisine aux stocks et aux prix réels des supermarchés.

---

## 🚀 Fonctionnalités Clés

* **Moteur de Résolution Budgétaire (Solveur) :** Génère un menu de $N$ repas qui s'ajuste dynamiquement pour respecter strictement le budget maximum alloué par l'utilisateur.
* **Optimisation Intelligente des Achats (Combinatoire) :** L'application calcule le besoin global en grammes de tous les ingrédients cumulés pour la semaine. Elle sélectionne ensuite automatiquement la combinaison de formats de paquets la moins chère en rayon (par exemple, elle privilégiera automatiquement un paquet d'un kilo et un de 500g plutôt que trois paquets de 500g si le prix au kilo est plus avantageux).
* **Changement de Plat Unique (Reroll) :** Si un plat suggéré ne convient pas, l'utilisateur peut le remplacer individuellement en un clic. Le solveur recalcule instantanément une alternative parmi les recettes restantes qui préserve l'enveloppe budgétaire globale de la semaine.
* **Navigation Fluide par Étapes :** Une interface épurée pensée comme une application native, découpée en un entonnoir de conversion en 3 écrans :
1. **Configuration :** Saisie du budget, du nombre de repas et du nombre de portions.
2. **Menu Suggéré :** Visualisation des fiches repas avec miniatures, temps de préparation et coût exact calculé.
3. **Liste de Courses :** Regroupement optimisé des paquets à acheter, triés par rayon du magasin avec cases à cocher interactives.


* **Scraper Automatisé (Mise à jour des prix) :** Un script en arrière-plan se charge d'extraire régulièrement les tarifs des produits en magasin pour alimenter la base de données sans intervention humaine.
* **Format Progressive Web App (PWA) :** Installable directement sur l'écran d'accueil d'un smartphone (iOS et Android) pour une utilisation fluide et plein écran directement dans les rayons du supermarché.

---

## 🛠️ Stack Technique

* **Front-end :** React (Vite.js), CSS3 (Variables de thèmes modernes, animations fluides de transition d'écrans, interface responsive).
* **Back-end & Base de données :** Supabase (PostgreSQL) pour le stockage temps réel des recettes et du catalogue des produits du magasin.
* **Automatisation & Scraping :** Python 3 (BeautifulSoup, Requests) orchestré par GitHub Actions pour la synchronisation automatique des prix.

---

## 📁 Architecture du Code Source

```text
MyWeekPlan/
├── public/
│   ├── manifest.json      # Carte d'identité et configuration PWA
│   └── icon-192.png       # Icône de l'application sur l'écran d'accueil
├── src/
│   ├── utils/
│   │   ├── solver.js      # Algorithme d'optimisation (génération et reroll)
│   │   └── shoppingList.js# Agrégateur global et sélecteur de formats de paquets
│   ├── App.jsx            # Gestionnaire des écrans et des états de l'application
│   ├── App.css            # Charte graphique (Design épuré, modes et animations)
│   ├── main.jsx
│   └── supabase.js        # Module de connexion au BaaS Supabase
├── index.html
└── package.json

```