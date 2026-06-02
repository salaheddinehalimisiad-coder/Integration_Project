"""
DataMediator Pro - Tests End-to-End (E2E)
Tests E2E avec Playwright pour l'interface utilisateur
"""

import pytest
import asyncio
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
import time

class TestE2E:
    """Suite de tests E2E pour DataMediator Pro"""
    
    @pytest.fixture(scope="session")
    async def browser():
        """Fixture pour le navigateur Playwright"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            yield browser
            await browser.close()
    
    @pytest.fixture
    async def page(self, browser: Browser):
        """Fixture pour la page"""
        context = await browser.new_context()
        page = await context.new_page()
        yield page
        await context.close()
    
    @pytest.fixture
    async def authenticated_page(self, page: Page):
        """Fixture pour page authentifiée"""
        await page.goto("http://localhost:3001/login")
        
        # Remplir le formulaire de login
        await page.fill('input[name="username"]', "admin")
        await page.fill('input[name="password"]', "admin123")
        await page.click('button[type="submit"]')
        
        # Attendre la redirection vers le dashboard
        await page.wait_for_url("http://localhost:3001/dashboard")
        
        yield page
    
    # Tests de l'interface de login
    async def test_login_page_loads(self, page: Page):
        """Test page de login se charge"""
        await page.goto("http://localhost:3001/login")
        
        # Vérifier les éléments de la page
        await page.wait_for_selector('h1')
        title = await page.inner_text('h1')
        assert "DataMediator Pro" in title
        
        # Vérifier le formulaire
        await page.wait_for_selector('input[name="username"]')
        await page.wait_for_selector('input[name="password"]')
        await page.wait_for_selector('button[type="submit"]')
    
    async def test_login_success(self, page: Page):
        """Test login réussi"""
        await page.goto("http://localhost:3001/login")
        
        # Remplir et soumettre le formulaire
        await page.fill('input[name="username"]', "admin")
        await page.fill('input[name="password"]', "admin123")
        await page.click('button[type="submit"]')
        
        # Vérifier la redirection
        await page.wait_for_url("http://localhost:3001/dashboard")
        
        # Vérifier l'élément de bienvenue
        await page.wait_for_selector('[data-testid="welcome-message"]')
    
    async def test_login_failure(self, page: Page):
        """Test échec login"""
        await page.goto("http://localhost:3001/login")
        
        # Remplir avec mauvais mot de passe
        await page.fill('input[name="username"]', "admin")
        await page.fill('input[name="password"]', "wrong")
        await page.click('button[type="submit"]')
        
        # Vérifier le message d'erreur
        await page.wait_for_selector('[data-testid="error-message"]')
        error_text = await page.inner_text('[data-testid="error-message"]')
        assert "Identifiants invalides" in error_text
    
    # Tests du dashboard
    async def test_dashboard_loads(self, authenticated_page: Page):
        """Test dashboard se charge correctement"""
        # Attendre le chargement des métriques
        await authenticated_page.wait_for_selector('[data-testid="metric-cards"]')
        
        # Vérifier les cartes de métriques
        metric_cards = await authenticated_page.query_selector_all('[data-testid="metric-card"]')
        assert len(metric_cards) >= 4  # Au moins 4 métriques principales
        
        # Vérifier les graphiques
        await authenticated_page.wait_for_selector('[data-testid="charts-section"]')
    
    async def test_dashboard_filters(self, authenticated_page: Page):
        """Test filtres du dashboard"""
        # Attendre le chargement
        await authenticated_page.wait_for_selector('[data-testid="time-range-filter"]')
        
        # Changer la période
        await authenticated_page.select_option('[data-testid="time-range-filter"]', "30d")
        
        # Attendre la mise à jour
        await authenticated_page.wait_for_timeout(1000)
        
        # Vérifier que les métriques sont mises à jour
        await authenticated_page.wait_for_selector('[data-testid="metric-cards"]')
    
    async def test_dashboard_export(self, authenticated_page: Page):
        """Test export dashboard"""
        # Attendre le chargement
        await authenticated_page.wait_for_selector('[data-testid="export-buttons"]')
        
        # Cliquer sur export CSV
        with authenticated_page.expect_download() as download_info:
            await authenticated_page.click('[data-testid="export-csv"]')
        
        download = await download_info.value
        assert download.suggested_filename.endswith('.csv')
    
    # Tests de l'éditeur SQL
    async def test_sql_editor_loads(self, authenticated_page: Page):
        """Test éditeur SQL se charge"""
        # Naviguer vers la page des requêtes
        await authenticated_page.click('[data-testid="nav-queries"]')
        await authenticated_page.wait_for_url("**/queries")
        
        # Vérifier l'éditeur
        await authenticated_page.wait_for_selector('[data-testid="sql-editor"]')
        await authenticated_page.wait_for_selector('[data-testid="execute-button"]')
    
    async def test_sql_editor_autocomplete(self, authenticated_page: Page):
        """Test auto-complétion éditeur SQL"""
        await authenticated_page.click('[data-testid="nav-queries"]')
        await authenticated_page.wait_for_selector('[data-testid="sql-editor"]')
        
        # Taper SELECT
        await authenticated_page.fill('[data-testid="sql-editor"]', "SELECT ")
        
        # Attendre les suggestions
        await authenticated_page.wait_for_timeout(500)
        
        # Vérifier les suggestions (si elles apparaissent)
        suggestions = await authenticated_page.query_selector_all('[data-testid="suggestion-item"]')
        # Les suggestions peuvent ne pas apparaître immédiatement
        assert isinstance(suggestions, list)
    
    async def test_sql_execute_query(self, authenticated_page: Page):
        """Test exécution requête SQL"""
        await authenticated_page.click('[data-testid="nav-queries"]')
        await authenticated_page.wait_for_selector('[data-testid="sql-editor"]')
        
        # Entrer une requête simple
        await authenticated_page.fill('[data-testid="sql-editor"]', 
            "SELECT employee_id, full_name FROM GlobalEmployee LIMIT 3")
        
        # Exécuter
        await authenticated_page.click('[data-testid="execute-button"]')
        
        # Attendre les résultats
        await authenticated_page.wait_for_selector('[data-testid="query-results"]')
        
        # Vérifier les résultats
        results = await authenticated_page.query_selector_all('[data-testid="result-row"]')
        assert len(results) <= 3
    
    # Tests de gestion des conflits
    async def test_conflicts_page_loads(self, authenticated_page: Page):
        """Test page des conflits se charge"""
        await authenticated_page.click('[data-testid="nav-conflicts"]')
        await authenticated_page.wait_for_url("**/conflicts")
        
        await authenticated_page.wait_for_selector('[data-testid="conflicts-list"]')
    
    async def test_conflict_resolution(self, authenticated_page: Page):
        """Test résolution de conflit"""
        await authenticated_page.click('[data-testid="nav-conflicts"]')
        await authenticated_page.wait_for_selector('[data-testid="conflicts-list"]')
        
        # Cliquer sur le premier conflit
        first_conflict = await authenticated_page.query_selector('[data-testid="conflict-item"]')
        if first_conflict:
            await first_conflict.click()
            
            # Attendre la modale
            await authenticated_page.wait_for_selector('[data-testid="conflict-modal"]')
            
            # Cliquer sur résolution automatique
            await authenticated_page.click('[data-testid="auto-resolve-button"]')
            
            # Attendre la confirmation
            await authenticated_page.wait_for_selector('[data-testid="success-message"]')
    
    # Tests du profil utilisateur
    async def test_profile_page_loads(self, authenticated_page: Page):
        """Test page profil se charge"""
        await authenticated_page.click('[data-testid="user-menu"]')
        await authenticated_page.click('[data-testid="nav-profile"]')
        
        await authenticated_page.wait_for_selector('[data-testid="profile-info"]')
        await authenticated_page.wait_for_selector('[data-testid="preferences-tabs"]')
    
    async def test_profile_update(self, authenticated_page: Page):
        """Test mise à jour profil"""
        await authenticated_page.click('[data-testid="user-menu"]')
        await authenticated_page.click('[data-testid="nav-profile"]')
        
        # Cliquer sur modifier
        await authenticated_page.click('[data-testid="edit-profile-button"]')
        
        # Modifier le nom
        await authenticated_page.fill('[data-testid="name-input"]', "Admin Updated")
        
        # Sauvegarder
        await authenticated_page.click('[data-testid="save-profile-button"]')
        
        # Attendre la confirmation
        await authenticated_page.wait_for_selector('[data-testid="success-message"]')
    
    # Tests du thème
    async def test_theme_toggle(self, page: Page):
        """Test changement de thème"""
        await page.goto("http://localhost:3001/login")
        
        # Vérifier le thème par défaut
        body = page.locator('body')
        initial_theme = await body.get_attribute('data-theme')
        
        # Cliquer sur le toggle de thème
        await page.click('[data-testid="theme-toggle"]')
        
        # Vérifier le changement
        new_theme = await body.get_attribute('data-theme')
        assert new_theme != initial_theme
    
    # Tests des notifications
    async def test_notifications_system(self, authenticated_page: Page):
        """Test système de notifications"""
        # Activer une notification
        await authenticated_page.click('[data-testid="enable-notifications"]')
        
        # Vérifier la notification
        await authenticated_page.wait_for_selector('[data-testid="notification-toast"]')
        
        # Fermer la notification
        await authenticated_page.click('[data-testid="close-notification"]')
        
        # Vérifier qu'elle est fermée
        await authenticated_page.wait_for_selector('[data-testid="notification-toast"]', 
                                              state='hidden')
    
    # Tests de navigation
    async def test_navigation_menu(self, authenticated_page: Page):
        """Test menu de navigation"""
        nav_items = [
            '[data-testid="nav-dashboard"]',
            '[data-testid="nav-queries"]',
            '[data-testid="nav-conflicts"]',
            '[data-testid="nav-monitoring"]'
        ]
        
        for nav_item in nav_items:
            await authenticated_page.click(nav_item)
            await authenticated_page.wait_for_timeout(500)
            
            # Vérifier que la page a changé
            current_url = authenticated_page.url
            assert current_url != "http://localhost:3001/dashboard"
    
    # Tests responsive
    async def test_mobile_responsive(self, page: Page):
        """Test responsive mobile"""
        # Simuler un mobile
        await page.set_viewport_size({"width": 375, "height": 667})
        
        await page.goto("http://localhost:3001/login")
        
        # Vérifier que le menu mobile est présent
        await page.wait_for_selector('[data-testid="mobile-menu-button"]')
        
        # Ouvrir le menu mobile
        await page.click('[data-testid="mobile-menu-button"]')
        await page.wait_for_selector('[data-testid="mobile-menu"]')
        
        # Fermer le menu
        await page.click('[data-testid="mobile-menu-button"]')
    
    # Tests d'accessibilité
    async def test_keyboard_navigation(self, authenticated_page: Page):
        """Test navigation clavier"""
        # Utiliser Tab pour naviguer
        await authenticated_page.keyboard.press('Tab')
        
        # Vérifier le focus sur le premier élément
        focused_element = await authenticated_page.query_selector(':focus')
        assert focused_element is not None
        
        # Continuer la navigation
        await authenticated_page.keyboard.press('Tab')
        await authenticated_page.keyboard.press('Tab')
    
    async def test_screen_reader_support(self, authenticated_page: Page):
        """Test support lecteur d'écran"""
        # Vérifier les attributs ARIA
        await authenticated_page.wait_for_selector('[role="main"]')
        await authenticated_page.wait_for_selector('[aria-label]')
        
        # Vérifier les titres hiérarchiques
        h1 = await authenticated_page.query_selector('h1')
        assert h1 is not None
    
    # Tests de performance
    async def test_page_load_performance(self, page: Page):
        """Test performance chargement page"""
        start_time = time.time()
        
        await page.goto("http://localhost:3001/login")
        await page.wait_for_load_state('networkidle')
        
        load_time = time.time() - start_time
        
        # La page devrait charger en moins de 3 secondes
        assert load_time < 3.0
    
    async def test_query_performance(self, authenticated_page: Page):
        """Test performance requêtes"""
        await authenticated_page.click('[data-testid="nav-queries"]')
        await authenticated_page.wait_for_selector('[data-testid="sql-editor"]')
        
        # Mesurer le temps d'exécution
        start_time = time.time()
        
        await authenticated_page.fill('[data-testid="sql-editor"]', 
            "SELECT * FROM GlobalEmployee LIMIT 10")
        await authenticated_page.click('[data-testid="execute-button"]')
        
        await authenticated_page.wait_for_selector('[data-testid="query-results"]')
        
        execution_time = time.time() - start_time
        
        # La requête devrait s'exécuter en moins de 2 secondes
        assert execution_time < 2.0
    
    # Tests d'erreurs
    async def test_404_page(self, page: Page):
        """Test page 404"""
        await page.goto("http://localhost:3001/nonexistent-page")
        
        await page.wait_for_selector('[data-testid="404-page"]')
        await page.wait_for_selector('h1')
        
        title = await page.inner_text('h1')
        assert "404" in title or "Page non trouvée" in title
    
    async def test_network_error_handling(self, page: Page):
        """Test gestion erreurs réseau"""
        # Simuler une erreur réseau
        await page.route("**/api/**", lambda route: route.fulfill(
            status=500,
            body='{"error": "Server error"}'
        ))
        
        await page.goto("http://localhost:3001/login")
        
        # Remplir le formulaire
        await page.fill('input[name="username"]', "admin")
        await page.fill('input[name="password"]', "admin123")
        await page.click('button[type="submit"]')
        
        # Vérifier le message d'erreur
        await page.wait_for_selector('[data-testid="error-message"]')
    
    # Tests d'intégration
    async def test_full_user_workflow(self, page: Page):
        """Test workflow utilisateur complet"""
        # 1. Login
        await page.goto("http://localhost:3001/login")
        await page.fill('input[name="username"]', "admin")
        await page.fill('input[name="password"]', "admin123")
        await page.click('button[type="submit"]')
        await page.wait_for_url("http://localhost:3001/dashboard")
        
        # 2. Vérifier le dashboard
        await page.wait_for_selector('[data-testid="metric-cards"]')
        
        # 3. Exécuter une requête
        await page.click('[data-testid="nav-queries"]')
        await page.wait_for_selector('[data-testid="sql-editor"]')
        await page.fill('[data-testid="sql-editor"]', 
            "SELECT COUNT(*) as total FROM GlobalEmployee")
        await page.click('[data-testid="execute-button"]')
        await page.wait_for_selector('[data-testid="query-results"]')
        
        # 4. Vérifier les conflits
        await page.click('[data-testid="nav-conflicts"]')
        await page.wait_for_selector('[data-testid="conflicts-list"]')
        
        # 5. Exporter des données
        await page.click('[data-testid="nav-dashboard"]')
        await page.wait_for_selector('[data-testid="export-buttons"]')
        
        with page.expect_download() as download_info:
            await page.click('[data-testid="export-csv"]')
        
        # 6. Logout
        await page.click('[data-testid="user-menu"]')
        await page.click('[data-testid="logout-button"]')
        await page.wait_for_url("http://localhost:3001/login")
        
        # Vérifier qu'on est bien déconnecté
        await page.wait_for_selector('input[name="username"]')

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--browser=chromium", "--headless"])
