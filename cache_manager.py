"""
DataMediator Pro - Cache Intelligent et Performance
Système de cache avec Redis pour optimiser les performances
"""

import json
import hashlib
import time
import logging
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import asyncio
from functools import wraps

# Simuler Redis (utiliser dict en mémoire pour la démo)
# En production, installer redis-py: pip install redis
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logging.warning("Redis non disponible, utilisation du cache en mémoire")

logger = logging.getLogger(__name__)

@dataclass
class CacheEntry:
    """Entrée de cache"""
    key: str
    value: Any
    ttl: int  # Time to live en secondes
    created_at: float
    access_count: int = 0
    last_accessed: float = 0

class CacheManager:
    """Gestionnaire de cache intelligent"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_client = None
        self.memory_cache: Dict[str, CacheEntry] = {}
        self.stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "evictions": 0
        }
        self.max_memory_entries = 1000
        self.default_ttl = 3600  # 1 heure
        
        # Connexion Redis si disponible
        if REDIS_AVAILABLE:
            try:
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                self.redis_client.ping()
                logger.info("Connecté à Redis")
            except Exception as e:
                logger.warning(f"Impossible de se connecter à Redis: {e}")
                self.redis_client = None
    
    def _generate_key(self, prefix: str, **kwargs) -> str:
        """Génère une clé de cache unique"""
        key_data = f"{prefix}:{json.dumps(kwargs, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Récupère une valeur du cache"""
        start_time = time.time()
        
        if self.redis_client:
            try:
                value = self.redis_client.get(key)
                if value:
                    self.stats["hits"] += 1
                    logger.debug(f"Cache hit (Redis): {key}")
                    return json.loads(value)
            except Exception as e:
                logger.error(f"Erreur Redis get: {e}")
        
        # Fallback vers cache mémoire
        entry = self.memory_cache.get(key)
        if entry:
            # Vérifier TTL
            if time.time() - entry.created_at < entry.ttl:
                entry.access_count += 1
                entry.last_accessed = time.time()
                self.stats["hits"] += 1
                logger.debug(f"Cache hit (Memory): {key}")
                return entry.value
            else:
                # Expiré, supprimer
                del self.memory_cache[key]
                self.stats["evictions"] += 1
        
        self.stats["misses"] += 1
        logger.debug(f"Cache miss: {key}")
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Définit une valeur dans le cache"""
        ttl = ttl or self.default_ttl
        
        if self.redis_client:
            try:
                serialized_value = json.dumps(value, default=str)
                self.redis_client.setex(key, ttl, serialized_value)
                self.stats["sets"] += 1
                logger.debug(f"Cache set (Redis): {key}")
                return True
            except Exception as e:
                logger.error(f"Erreur Redis set: {e}")
        
        # Fallback vers cache mémoire
        entry = CacheEntry(
            key=key,
            value=value,
            ttl=ttl,
            created_at=time.time(),
            last_accessed=time.time()
        )
        
        self.memory_cache[key] = entry
        self.stats["sets"] += 1
        
        # Éviction si trop d'entrées
        if len(self.memory_cache) > self.max_memory_entries:
            self._evict_lru()
        
        logger.debug(f"Cache set (Memory): {key}")
        return True
    
    def delete(self, key: str) -> bool:
        """Supprime une clé du cache"""
        success = False
        
        if self.redis_client:
            try:
                self.redis_client.delete(key)
                success = True
            except Exception as e:
                logger.error(f"Erreur Redis delete: {e}")
        
        if key in self.memory_cache:
            del self.memory_cache[key]
            success = True
        
        return success
    
    def clear(self) -> bool:
        """Vide tout le cache"""
        success = False
        
        if self.redis_client:
            try:
                self.redis_client.flushdb()
                success = True
            except Exception as e:
                logger.error(f"Erreur Redis flush: {e}")
        
        self.memory_cache.clear()
        return success
    
    def _evict_lru(self):
        """Évince les entrées les moins récemment utilisées"""
        if not self.memory_cache:
            return
        
        # Trouver l'entrée LRU
        lru_key = min(self.memory_cache.keys(), 
                      key=lambda k: self.memory_cache[k].last_accessed)
        
        del self.memory_cache[lru_key]
        self.stats["evictions"] += 1
        logger.debug(f"LRU eviction: {lru_key}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques du cache"""
        total_requests = self.stats["hits"] + self.stats["misses"]
        hit_rate = (self.stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            **self.stats,
            "hit_rate": round(hit_rate, 2),
            "memory_entries": len(self.memory_cache),
            "redis_connected": self.redis_client is not None
        }
    
    def invalidate_pattern(self, pattern: str) -> int:
        """Invalide les clés correspondant à un pattern"""
        invalidated = 0
        
        if self.redis_client:
            try:
                keys = self.redis_client.keys(pattern)
                if keys:
                    invalidated = self.redis_client.delete(*keys)
            except Exception as e:
                logger.error(f"Erreur Redis pattern delete: {e}")
        
        # Pattern matching simple pour cache mémoire
        import fnmatch
        keys_to_delete = []
        for key in self.memory_cache.keys():
            if fnmatch.fnmatch(key, pattern):
                keys_to_delete.append(key)
        
        for key in keys_to_delete:
            del self.memory_cache[key]
            invalidated += 1
        
        logger.info(f"Invalidated {invalidated} keys matching pattern: {pattern}")
        return invalidated

# Instance globale du cache
cache_manager = CacheManager()

# Décorateurs de cache
def cache_query(ttl: int = 3600, key_prefix: str = "query"):
    """Décorateur pour mettre en cache les résultats de requêtes"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            import os
            if os.environ.get("DISABLE_CACHE") == "True":
                return func(*args, **kwargs)

            # Générer la clé de cache
            cache_key = cache_manager._generate_key(
                key_prefix,
                func_name=func.__name__,
                args=args,
                kwargs=kwargs
            )
            
            # Essayer de récupérer du cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Exécuter la fonction
            result = func(*args, **kwargs)
            
            # Mettre en cache
            cache_manager.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator

def cache_table(ttl: int = 1800, table_name: str = ""):
    """Décorateur pour mettre en cache les tables globales"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            import os
            if os.environ.get("DISABLE_CACHE") == "True":
                return func(*args, **kwargs)

            # Générer la clé de cache basée sur la table et l'utilisateur
            user = args[0] if args else kwargs.get("user", {})
            user_id = user.get("username", "anonymous")
            
            cache_key = cache_manager._generate_key(
                "table",
                table_name=table_name or func.__name__,
                user_id=user_id
            )
            
            # Essayer de récupérer du cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Exécuter la fonction
            result = func(*args, **kwargs)
            
            # Mettre en cache
            cache_manager.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator

# Cache pour les métriques du dashboard
@cache_query(ttl=300, key_prefix="dashboard")  # 5 minutes
def get_dashboard_metrics_cached(user: dict, time_range: str = "7d", department: str = "all"):
    """Version cachée des métriques du dashboard"""
    from enterprise_mediator import fetch_global_table
    
    # Calculer les métriques
    employees_data, reconciliation_events = fetch_global_table("GlobalEmployee", user)
    departments_data, _ = fetch_global_table("GlobalDepartment", user)
    projects_data, _ = fetch_global_table("GlobalProject", user)
    
    total_employees = len(employees_data)
    active_projects = len([p for p in projects_data if p.get("status") == "ACTIVE"])
    
    salaries = [emp.get("salary_usd", 0) for emp in employees_data if emp.get("salary_usd")]
    avg_salary = sum(salaries) / len(salaries) if salaries else 0
    
    conflicts_resolved = len([e for e in reconciliation_events if len(e.get("merged_from", [])) > 1])
    
    return {
        "totalEmployees": total_employees,
        "activeProjects": active_projects,
        "avgSalary": round(avg_salary, 2),
        "conflictsResolved": conflicts_resolved,
        "dataFreshness": 2
    }

# Cache pour les tables globales
@cache_table(ttl=1800, table_name="GlobalEmployee")
def fetch_employees_cached(user: dict):
    """Version cachée de fetch_employees"""
    from enterprise_mediator import fetch_global_table
    return fetch_global_table("GlobalEmployee", user)

@cache_table(ttl=1800, table_name="GlobalDepartment")
def fetch_departments_cached(user: dict):
    """Version cachée de fetch_departments"""
    from enterprise_mediator import fetch_global_table
    return fetch_global_table("GlobalDepartment", user)

@cache_table(ttl=1800, table_name="GlobalProject")
def fetch_projects_cached(user: dict):
    """Version cachée de fetch_projects"""
    from enterprise_mediator import fetch_global_table
    return fetch_global_table("GlobalProject", user)

class PerformanceMonitor:
    """Moniteur de performance pour les requêtes"""
    
    def __init__(self):
        self.query_stats: Dict[str, List[float]] = {}
        self.slow_queries: List[Dict[str, Any]] = []
        self.slow_query_threshold = 1.0  # secondes
    
    def record_query(self, query: str, execution_time: float, user: str = "anonymous"):
        """Enregistre les statistiques d'une requête"""
        query_hash = hashlib.md5(query.encode()).hexdigest()
        
        if query_hash not in self.query_stats:
            self.query_stats[query_hash] = []
        
        self.query_stats[query_hash].append(execution_time)
        
        # Détecter les requêtes lentes
        if execution_time > self.slow_query_threshold:
            self.slow_queries.append({
                "query": query,
                "execution_time": execution_time,
                "user": user,
                "timestamp": datetime.now().isoformat()
            })
            
            # Garder seulement les 100 dernières requêtes lentes
            if len(self.slow_queries) > 100:
                self.slow_queries = self.slow_queries[-100:]
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques de performance"""
        stats = {}
        
        for query_hash, times in self.query_stats.items():
            stats[query_hash] = {
                "count": len(times),
                "avg_time": sum(times) / len(times),
                "min_time": min(times),
                "max_time": max(times),
                "total_time": sum(times)
            }
        
        return {
            "query_stats": stats,
            "slow_queries": self.slow_queries[-10:],  # 10 dernières
            "total_queries": sum(len(times) for times in self.query_stats.values()),
            "avg_query_time": sum(sum(times) for times in self.query_stats.values()) / sum(len(times) for times in self.query_stats.values()) if self.query_stats else 0
        }

# Instance globale du moniteur de performance
performance_monitor = PerformanceMonitor()

def monitor_performance(func):
    """Décorateur pour monitorer la performance des fonctions"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # Enregistrer les stats
            user = args[0] if args and isinstance(args[0], dict) else "anonymous"
            query = kwargs.get("sql", func.__name__)
            
            performance_monitor.record_query(query, execution_time, user.get("username", "anonymous"))
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            performance_monitor.record_query(f"ERROR: {func.__name__}", execution_time)
            raise
    
    return wrapper

# Fonctions d'invalidation automatique
def invalidate_user_cache(username: str):
    """Invalide tout le cache d'un utilisateur"""
    patterns = [
        f"*{username}*",
        f"table:*user_id:{username}*"
    ]
    
    total_invalidated = 0
    for pattern in patterns:
        total_invalidated += cache_manager.invalidate_pattern(pattern)
    
    logger.info(f"Invalidated {total_invalidated} cache entries for user {username}")
    return total_invalidated

def invalidate_table_cache(table_name: str):
    """Invalide le cache d'une table spécifique"""
    pattern = f"table:*table_name:{table_name}*"
    return cache_manager.invalidate_pattern(pattern)

# Endpoint pour les statistiques de cache
def get_cache_stats():
    """Retourne les statistiques du cache et de la performance"""
    return {
        "cache": cache_manager.get_stats(),
        "performance": performance_monitor.get_stats()
    }
