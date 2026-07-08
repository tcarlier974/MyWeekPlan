import re
import json
import time
from pypdf import PdfReader

# --- 1. DICTIONNAIRES ---
# ... (Garde tes dictionnaires MOTS_CLES_TAGS, MOTS_INTERDITS, et TAGS_LIQUIDES exactement comme avant) ...
MOTS_CLES_TAGS = {
    "poulet": ["POULET", "VOLAILLE", "ESCALOPE DE POULET"],
    "pates": ["PÂTES", "COQUILLETTES", "SPAGHETTI", "PENNE"],
    "boeuf_hache": ["BŒUF HACHÉ", "BOEUF HACHE", "STEAK HACHÉ"],
    "creme": ["CRÈME FRAÎCHE", "CREME FRAICHE", "CREME LIQUIDE"],
    "saumon": ["SAUMON", "PAVÉ DE SAUMON"],
    "tomates_conserve": ["PULPE DE TOMATES", "TOMATES PELÉES", "TOMATES CONCASSÉES"],
    "riz": ["RIZ", "RIZ BASMATI", "RIZ LONG GRAIN"],
    "lait": ["LAIT", "LAIT ENTIER", "LAIT DEMI-ÉCRÉMÉ"],
    "fromage": ["FROMAGE", "EMMENTAL", "COMTÉ", "MOZZARELLA"],
    "oeufs": ["ŒUFS", "OEUFS", "OEUF"],
    "boeuf_bourguignon": ["BOEUF BOURGUIGNON"],
    "steak_hache": ["STEAK HACHÉ", "STEAK HACHE"],
    "escalope_porc": ["ESCALOPE DE PORC"],
    "escalope_dinde": ["ESCALOPE DE DINDE"],
    "saucisses": ["SAUCISSES BARQUETTE"],
    "lardons": ["LARDONS"],
    "jambon": ["JAMBON"],
    "pave_saumon": ["PAVÉ DE SAUMON", "PAVE DE SAUMON"],
    "saumon_fume": ["SAUMON FUMÉ", "SAUMON FUME"],
    "cabillaud": ["CABILLAUD"],
    "dos_cabillaud": ["DOS DE CABILLAUD"],
    "colin": ["COLIN"],
    "crevettes": ["CREVETTES"],
    "oignons": ["OIGNONS"],
    "carottes": ["CAROTTES"],
    "pommes_de_terre": ["POMMES DE TERRE"],
    "patate_douce": ["PATATE DOUCE"],
    "courgettes": ["COURGETTES"],
    "aubergines": ["AUBERGINES"],
    "poivrons": ["POIVRONS"],
    "poireaux": ["POIREAUX"],
    "potimarron": ["POTIMARRON"],
    "champignons": ["CHAMPIGNONS"],
    "tomates_fraiches": ["TOMATES FRAÎCHES", "TOMATES FRAICHES"],
    "salade": ["SALADE"],
    "epinards": ["ÉPINARDS", "EPINARDS"],
    "haricots_verts": ["HARICOTS VERTS"],
    "avocat": ["AVOCAT"],
    "beurre": ["BEURRE"],
    "fromage_rape": ["FROMAGE RÂPÉ", "FROMAGE RAPE"],
    "mozzarella": ["MOZZARELLA"],
    "reblochon": ["REBLOCHON"],
    "fromage_burger": ["FROMAGE BURGER"],
    "pate_brisee": ["PÂTE BRISÉE", "PATE BRISEE"],
    "galette_sarrasin": ["GALETTE DE SARRASIN"],
    "plaques_lasagne": ["PLAQUES LASAGNE"],
    "gnocchis": ["GNOCCHIS"],
    "riz_arborio": ["RIZ ARBORIO"],
    "semoule": ["SEMOULE"],
    "nouilles": ["NOUILLES"],
    "lentilles": ["LENTILLES"],
    "lentilles_corail": ["LENTILLES CORAIL"],
    "pois_chiches": ["POIS CHICHES"],
    "haricots_rouges": ["HARICOTS ROUGES"],
    "thon_conserve": ["THON CONSERVE"],
    "maïs": ["MAÏS", "MAIS"],
    "lait_de_coco": ["LAIT DE COCO"],
    "huile_olive": ["HUILE D'OLIVE", "HUILE OLIVE"],
    "sauce_teriyaki": ["SAUCE TERIYAKI"],
    "mayonnaise": ["MAYONNAISE"],
    "tortillas": ["TORTILLAS"],
    "pain": ["PAIN"],
    "pain_de_mie": ["PAIN DE MIE"],
    "pain_burger": ["PAIN BURGER"],
    "chapelure": ["CHAPELURE"],
    "sucre": ["SUCRE"],
    
    # Ajoute tes autres tags ici...
}

MOTS_INTERDITS = ["POUDRE", "CONCENTRÉ", "CONCENTRE", "BÉBÉ", "BEBE", "CROISSANCE", "MATERNISÉ", "CORPS", "TOILETTE", "SOIN"]
TAGS_LIQUIDES = ["lait", "creme", "lait_de_coco", "huile_olive", "sauce_teriyaki"]

def trouver_tag(nom_produit):
    nom_maj = str(nom_produit).upper()
    for mot_interdit in MOTS_INTERDITS:
        if mot_interdit in nom_maj:
            return None
    for tag, mots in MOTS_CLES_TAGS.items():
        for mot in mots:
            if mot in nom_maj:
                return tag
    return None

def extraire_poids_grammes(nom_produit):
    nom = str(nom_produit).upper()
    match = re.search(r'(\d+(?:[.,]\d+)?)\s*(G|KG|ML|L|CL)\b', nom)
    if match:
        valeur = float(match.group(1).replace(',', '.'))
        unite = match.group(2)
        if unite in ['KG', 'L']:
            return valeur * 1000
        if unite == 'CL':
            return valeur * 10
        return valeur
    return None

def format_temps(secondes):
    """Convertit des secondes en format HH:MM:SS lisible"""
    heures = int(secondes // 3600)
    minutes = int((secondes % 3600) // 60)
    sec = int(secondes % 60)
    if heures > 0:
        return f"{heures}h {minutes:02d}m {sec:02d}s"
    return f"{minutes:02d}m {sec:02d}s"

# --- 2. LECTURE DIRECTE DU PDF ---
nom_fichier_pdf = 'catalogue_geant.pdf'
print(f"📄 Ouverture du PDF {nom_fichier_pdf}...")
reader = PdfReader(nom_fichier_pdf)
total_pages = len(reader.pages)
print(f"📊 {total_pages} pages trouvées. Lancement du scanneur textuel...\n")

donnees_extraites = []
regex_ligne_prix = re.compile(r'(MN|MDD)\s?([A-Z]+)(\d{8,14})(.+?)(E\.LECLERC|AUCHAN|CARREFOUR MARKET|CARREFOUR|Hyper U|Super U|INTERMARCHE|LIDL)\s?(\d+,\d+)')

# Démarrage du chronomètre
temps_debut = time.time()

for num_page, page in enumerate(reader.pages):
    
    # --- AFFICHAGE DYNAMIQUE TOUTES LES 10 PAGES ---
    if num_page > 0 and num_page % 10 == 0:
        temps_ecoule = time.time() - temps_debut
        pages_traitees = num_page + 1
        vitesse = pages_traitees / temps_ecoule # Pages par seconde
        pages_restantes = total_pages - pages_traitees
        temps_restant_estime = pages_restantes / vitesse if vitesse > 0 else 0
        
        # Le \r permet d'écraser la ligne précédente au lieu d'en créer une nouvelle
        print(f"\r⏳ Progression : {pages_traitees}/{total_pages} pages | "
              f"Écoulé : {format_temps(temps_ecoule)} | "
              f"Reste : ~{format_temps(temps_restant_estime)} | "
              f"Vitesse : {vitesse:.0f} p/s", end="", flush=True)
        
    # --- EXTRACTION ---
    texte_page = page.extract_text()
    if not texte_page:
        continue
        
    for match in regex_ligne_prix.finditer(texte_page.replace('\n', '')):
        nom_produit = match.group(4).strip()
        enseigne = match.group(5)
        prix_str = match.group(6).replace(',', '.')
        
        if enseigne == "E.LECLERC":
            tag = trouver_tag(nom_produit)
            if tag:
                poids = extraire_poids_grammes(nom_produit)
                if poids and poids >= 50:
                    donnees_extraites.append({
                        "tag": tag,
                        "prix": float(prix_str),
                        "poids": poids
                    })

# Saut de ligne final pour ne pas écraser le compteur à la fin
print(f"\n\n✅ Terminé ! {len(donnees_extraites)} prix utiles trouvés en {format_temps(time.time() - temps_debut)}.")

# --- 3. CALCUL & EXPORT JSON ---
if len(donnees_extraites) > 0:
    groupes_tags = {}
    for item in donnees_extraites:
        tag = item["tag"]
        prix_au_kilo = (item["prix"] / item["poids"]) * 1000
        
        if prix_au_kilo < 50: 
            if tag not in groupes_tags:
                groupes_tags[tag] = []
            groupes_tags[tag].append(prix_au_kilo)
            
    produits_json = []
    
    for tag, prix_liste in groupes_tags.items():
        moyenne = sum(prix_liste) / len(prix_liste)
        unite_nom = "Prix au Litre" if tag in TAGS_LIQUIDES else "Prix au Kilo"
        
        produits_json.append({
            "url_produit": f"produit_fantome_{tag}",
            "nom_produit": f"{tag.replace('_', ' ').capitalize()} ({unite_nom})",
            "prix": round(moyenne, 2),
            "poids_grammes": 1000,
            "tag_ingredient": tag,
            "rayon": "À classer",
            "_info_verification": f"Moyenne sur {len(prix_liste)} articles"
        })

    with open('prix_moyens_extraits.json', 'w', encoding='utf-8') as f:
        json.dump(produits_json, f, indent=2, ensure_ascii=False)

    print("🎉 Fichier 'prix_moyens_extraits.json' généré avec succès !")
else:
    print("❌ Aucun produit utile trouvé. Vérifie tes mots-clés.")