"""
Configuration centralisée de DataMediator Pro
"""
import os
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuration de l'application"""
    
    # Application
    app_name: str = "DataMediator Pro"
    app_version: str = "3.1.0"
    debug: bool = False
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 5001
    api_reload: bool = True
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Base de données
    use_docker: bool = False
    
    # PostgreSQL
    postgres_host: str = "localhost"
    postgres_port: int = 5433          # Port mapé dans docker-compose
    postgres_user: str = "mediator_hr"
    postgres_password: str = "mediator_hr_pwd"
    postgres_db: str = "hr_db"

    # MySQL
    mysql_host: str = "localhost"
    mysql_port: int = 3307             # Port mapé dans docker-compose
    mysql_user: str = "mediator_projects"
    mysql_password: str = "mediator_projects_pwd"
    mysql_db: str = "project_db"

    # MongoDB
    mongo_host: str = "localhost"
    mongo_port: int = 27018            # Port mapé dans docker-compose
    mongo_user: str = ""
    mongo_password: str = ""
    mongo_db: str = "finance_db"
    
    # JWT
    jwt_secret_key: str = "default-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480  # 8 hours
    jwt_expire_hours: int = 8
    
    # Rate Limiting
    rate_limit_login_attempts: int = 5
    rate_limit_login_window_seconds: int = 60
    rate_limit_api_attempts: int = 200          # Tentatives API par minute
    rate_limit_api_window_seconds: int = 60
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "logs/datamediator.log"
    
    # Taux de conversion
    eur_to_usd: float = 1.08
    dzd_to_usd: float = 0.0074
    
    # Paths
    base_dir: Path = Path(__file__).resolve().parent
    data_dir: Path = base_dir / "data"
    sources_dir: Path = base_dir / "sources"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Instance globale de configuration
settings = Settings()


def get_database_url() -> dict[str, str]:
    """Retourne les URLs de connexion aux bases de données"""
    return {
        "postgresql": (
            f"postgresql://{settings.postgres_user}:{settings.postgres_password}"
            f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
        ),
        "mysql": (
            f"mysql+pymysql://{settings.mysql_user}:{settings.mysql_password}"
            f"@{settings.mysql_host}:{settings.mysql_port}/{settings.mysql_db}"
        ),
        "mongodb": (
            f"mongodb://{settings.mongo_user}:{settings.mongo_password}"
            f"@{settings.mongo_host}:{settings.mongo_port}/{settings.mongo_db}"
        ),
    }


def ensure_log_directory() -> None:
    """Crée le répertoire de logs si nécessaire"""
    log_path = Path(settings.log_file)
    log_path.parent.mkdir(parents=True, exist_ok=True)
