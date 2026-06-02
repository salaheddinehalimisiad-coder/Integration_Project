"""
Tests pour la configuration de DataMediator Pro
"""
import os
import unittest
from pathlib import Path

from config import Settings, get_database_url, ensure_log_directory


class TestConfig(unittest.TestCase):
    """Tests de la configuration"""

    def test_settings_default_values(self):
        """Test des valeurs par défaut"""
        settings = Settings()
        
        self.assertEqual(settings.app_name, "DataMediator Pro")
        self.assertEqual(settings.api_port, 5001)
        self.assertFalse(settings.use_docker)
        self.assertEqual(settings.eur_to_usd, 1.08)
        self.assertEqual(settings.dzd_to_usd, 0.0074)

    def test_settings_from_env(self):
        """Test de la configuration depuis les variables d'environnement"""
        os.environ["API_PORT"] = "8080"
        os.environ["USE_DOCKER"] = "true"
        
        try:
            settings = Settings()
            self.assertEqual(settings.api_port, 8080)
            self.assertTrue(settings.use_docker)
        finally:
            os.environ.pop("API_PORT", None)
            os.environ.pop("USE_DOCKER", None)

    def test_get_database_url(self):
        """Test de la génération des URLs de base de données"""
        from config import settings
        urls = get_database_url()
        
        self.assertIn("postgresql", urls)
        self.assertIn("mysql", urls)
        self.assertIn("mongodb", urls)
        
        self.assertIn(settings.postgres_db, urls["postgresql"])
        self.assertIn(settings.mysql_db, urls["mysql"])
        self.assertIn(settings.mongo_db, urls["mongodb"])

    def test_ensure_log_directory(self):
        """Test de la création du répertoire de logs"""
        # Test sans nettoyage pour éviter les problèmes de permissions
        ensure_log_directory()
        self.assertTrue(Path("logs").exists())
        self.assertTrue(Path("logs").is_dir())


if __name__ == "__main__":
    unittest.main()
