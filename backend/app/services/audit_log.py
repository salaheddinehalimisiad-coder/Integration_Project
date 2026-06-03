"""
DataMediator Pro — Audit Trail.

Journal append-only des actions sensibles (auth, requêtes, admin).
Implémentation pédagogique :
  - stockage en SQLite local (data/audit.db)
  - thread-safe via verrou
  - exposé via /api/audit/log dans main.py
"""
from __future__ import annotations

import json
import sqlite3
import threading
import time
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

BASE_DIR = Path(__file__).resolve().parent
AUDIT_DB = BASE_DIR / "data" / "audit.db"
_LOCK = threading.Lock()
_INITIALIZED = False


def _ensure_initialized():
    """Lazily init the DB on first call (idempotent, thread-safe)."""
    global _INITIALIZED
    if _INITIALIZED:
        return
    try:
        init_audit_db()
        _INITIALIZED = True
    except Exception:
        pass  # disk full / permissions / sandbox — keep going


@dataclass
class AuditEvent:
    timestamp: str
    actor: str          # username
    role: str
    action: str         # eg. 'AUTH_LOGIN', 'QUERY_EXECUTE', 'ADMIN_RESET'
    outcome: str        # 'SUCCESS', 'FAILURE', 'DENIED'
    ip: Optional[str] = None
    target: Optional[str] = None   # table, endpoint, etc.
    details: dict[str, Any] = field(default_factory=dict)


# ────────────────────────────────────────────────────────────────────
# Init
# ────────────────────────────────────────────────────────────────────

def init_audit_db() -> None:
    """Crée la table si nécessaire."""
    AUDIT_DB.parent.mkdir(parents=True, exist_ok=True)
    with _LOCK:
        con = sqlite3.connect(AUDIT_DB)
        try:
            con.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id        INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT    NOT NULL,
                    actor     TEXT    NOT NULL,
                    role      TEXT    NOT NULL,
                    action    TEXT    NOT NULL,
                    outcome   TEXT    NOT NULL,
                    ip        TEXT,
                    target    TEXT,
                    details   TEXT
                )
            """)
            con.execute("CREATE INDEX IF NOT EXISTS idx_audit_ts     ON audit_log(timestamp DESC)")
            con.execute("CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_log(actor)")
            con.execute("CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action)")
            con.commit()
        finally:
            con.close()


# ────────────────────────────────────────────────────────────────────
# Write
# ────────────────────────────────────────────────────────────────────

def log(
    actor: str,
    role: str,
    action: str,
    outcome: str = "SUCCESS",
    ip: str | None = None,
    target: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    """Écrit un événement d'audit. Best-effort — ne lève jamais."""
    _ensure_initialized()
    try:
        evt = AuditEvent(
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor=actor or "?",
            role=role or "?",
            action=action,
            outcome=outcome,
            ip=ip,
            target=target,
            details=details or {},
        )
        with _LOCK:
            con = sqlite3.connect(AUDIT_DB)
            try:
                con.execute(
                    "INSERT INTO audit_log (timestamp, actor, role, action, outcome, ip, target, details) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (evt.timestamp, evt.actor, evt.role, evt.action, evt.outcome, evt.ip, evt.target,
                     json.dumps(evt.details, default=str)),
                )
                con.commit()
            finally:
                con.close()
    except Exception:
        # Audit must never break the main flow
        pass


# ────────────────────────────────────────────────────────────────────
# Read / filter
# ────────────────────────────────────────────────────────────────────

def query(  # noqa: A001 — domain term
    actor: str | None = None,
    action: str | None = None,
    outcome: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Récupère les événements (les plus récents en premier)."""
    where_parts = []
    params: list[Any] = []
    if actor:
        where_parts.append("actor = ?")
        params.append(actor)
    if action:
        where_parts.append("action = ?")
        params.append(action)
    if outcome:
        where_parts.append("outcome = ?")
        params.append(outcome)
    _ensure_initialized()
    where_sql = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    sql = f"""
        SELECT id, timestamp, actor, role, action, outcome, ip, target, details
        FROM audit_log
        {where_sql}
        ORDER BY id DESC
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    with _LOCK:
        con = sqlite3.connect(AUDIT_DB)
        con.row_factory = sqlite3.Row
        try:
            rows = con.execute(sql, params).fetchall()
            out = []
            for r in rows:
                d = dict(r)
                if d.get("details"):
                    try: d["details"] = json.loads(d["details"])
                    except Exception: pass
                out.append(d)
            return out
        finally:
            con.close()


def stats() -> dict[str, Any]:
    """Statistiques globales de l'audit."""
    _ensure_initialized()
    with _LOCK:
        con = sqlite3.connect(AUDIT_DB)
        try:
            total = con.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0]
            by_outcome = dict(con.execute("SELECT outcome, COUNT(*) FROM audit_log GROUP BY outcome").fetchall())
            by_action  = dict(con.execute("SELECT action, COUNT(*)  FROM audit_log GROUP BY action  ORDER BY 2 DESC LIMIT 10").fetchall())
            by_actor   = dict(con.execute("SELECT actor, COUNT(*)   FROM audit_log GROUP BY actor   ORDER BY 2 DESC LIMIT 10").fetchall())
            return {
                "total": total,
                "by_outcome": by_outcome,
                "top_actions": by_action,
                "top_actors": by_actor,
            }
        finally:
            con.close()