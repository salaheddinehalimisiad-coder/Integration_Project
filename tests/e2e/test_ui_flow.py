import pytest
import subprocess
import time
import os
from playwright.sync_api import sync_playwright

# Note: Ce test nécessite que le backend et le frontend soient lancés.
# Pour une automatisation complète, on pourrait utiliser des fixtures pour lancer les serveurs.

@pytest.mark.e2e
def test_login_and_dashboard_flow():
    with sync_playwright() as p:
        # Lancer le navigateur
        browser = p.chromium.launch(headless=True) # Mettre à False pour voir l'action
        page = browser.new_page()
        
        try:
            # Aller sur la page de login
            page.goto("http://localhost:3000")
            
            # Remplir le formulaire
            page.fill("input[placeholder*='utilisateur']", "admin")
            page.fill("input[type='password']", "admin123")
            
            # Cliquer sur Connexion
            page.click("button[type='submit']")
            
            # Attendre la redirection vers le dashboard
            page.wait_for_url("**/enterprise")
            
            # Vérifier que le titre du dashboard est présent
            assert page.is_visible("h1:has-text('DataMediator Dashboard')")
            
            # Tester l'exécution d'une requête SQL
            page.fill("textarea", "SELECT * FROM GlobalEmployee LIMIT 5")
            page.click("button:has-text('Exécuter')")
            
            # Vérifier que le tableau de résultats s'affiche
            page.wait_for_selector("table")
            assert page.is_visible("table")
            
            print("E2E Test: SUCCESS")
            
        finally:
            browser.close()

if __name__ == "__main__":
    test_login_and_dashboard_flow()
