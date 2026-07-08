from pypdf import PdfReader

print("Ouverture du PDF...")
reader = PdfReader('catalogue_geant.pdf')

# On va lire la page 50 pour être sûr d'avoir passé le sommaire ou les intros
texte = reader.pages[20].extract_text()

print("\n--- VOICI CE QUE LE ROBOT VOIT SUR LA PAGE 50 ---")
print(texte[:1000]) # On affiche juste les 1000 premiers caractères
print("-------------------------------------------------")