"""
DataMediator Pro — Sécurité, rate limiting et validation JWT.

- RateLimiter : limite N tentatives par fenêtre temporelle, par IP.
- JWTValidator : encode/décode des tokens JWT signés (HS256 par défaut).
- get_client_ip : extrait l'IP cliente en tenant compte des proxies.
"""
from __future__ import annotations

import datetime
import time
from collections import defaultdict
from typing import Any

from fastapi import HTTPException, Request
import jwt as _jwt

from config import settings


# ────────────────────────────────────────────────────────────────────
# Rate Limiter (en mémoire, par IP)
# ────────────────────────────────────────────────────────────────────

class RateLimiter:
    """Rate limiter simple basé sur les adresses IP et timestamps.

    Sliding window : on garde les timestamps des tentatives dans la fenêtre
    courante. Si on dépasse `max_attempts`, on rejette.
    """

    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts: defaultdict[str, list[float]] = defaultdict(list)

    def is_allowed(self, client_ip: str) -> bool:
        """Retourne True si la requête est autorisée, False sinon.
        Enregistre la tentative en cas d'autorisation.
        En mode test (PYTEST_CURRENT_TEST défini), toujours autorisé.
        """
        import os
        if os.environ.get("PYTEST_CURRENT_TEST"):
            return True
        now = time.time()
        cutoff = now - self.window_seconds
        self.attempts[client_ip] = [t for t in self.attempts[client_ip] if t > cutoff]
        if len(self.attempts[client_ip]) >= self.max_attempts:
            return False
        self.attempts[client_ip].append(now)
        return True

    def get_retry_after(self, client_ip: str) -> int:
        """Délai à attendre avant la prochaine tentative."""
        if not self.attempts.get(client_ip):
            return 0
        oldest = self.attempts[client_ip][0]
        retry = int(self.window_seconds - (time.time() - oldest)) + 1
        return max(retry, 1)


# ────────────────────────────────────────────────────────────────────
# JWT validator
# ────────────────────────────────────────────────────────────────────

class JWTValidator:
    """Encode et décode des JWT signés HS256, avec gestion d'expiration."""

    @staticmethod
    def _secret() -> str:
        return getattr(settings, "jwt_secret_key", "datamediator-soutenance-secret-CHANGE-ME")

    @staticmethod
    def _algo() -> str:
        return getattr(settings, "jwt_algorithm", "HS256")

    @staticmethod
    def _default_hours() -> int:
        minutes = getattr(settings, "jwt_expire_minutes", None)
        if minutes is not None:
            return max(1, minutes // 60)
        return getattr(settings, "jwt_expire_hours", 8)

    @classmethod
    def decode_token(cls, token: str) -> dict[str, Any] | None:
        """Décode et valide un JWT. Retourne le payload ou None.
        Lève HTTPException 401 si le token est expiré / invalide.
        """
        if not token:
            return None
        if token.startswith("Bearer "):
            token = token.split(" ", 1)[1]
        try:
            return _jwt.decode(token, cls._secret(), algorithms=[cls._algo()])
        except _jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expiré")
        except _jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Token invalide")
        except Exception:
            return None

    @classmethod
    def create_token(cls, username: str, role: str, hours: int | None = None) -> str:
        """Émet un JWT signé pour cet utilisateur."""
        h = hours if hours is not None else cls._default_hours()
        now = datetime.datetime.utcnow()
        payload = {
            "sub": username,
            "role": role,
            "iat": int(now.timestamp()),
            "exp": int((now + datetime.timedelta(hours=h)).timestamp()),
        }
        return _jwt.encode(payload, cls._secret(), algorithm=cls._algo())


# ────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────

def get_client_ip(request: Request) -> str:
    """Extrait l'IP cliente, en tenant compte du proxy X-Forwarded-For."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


login_limiter = RateLimiter(
    max_attempts=getattr(settings, "rate_limit_login_attempts", 5),
    window_seconds=getattr(settings, "rate_limit_login_window_seconds", 60),
)

api_limiter = RateLimiter(
    max_attempts=getattr(settings, "rate_limit_api_attempts", 120),
    window_seconds=getattr(settings, "rate_limit_api_window_seconds", 60),
)

jwt_validator = JWTValidator()
