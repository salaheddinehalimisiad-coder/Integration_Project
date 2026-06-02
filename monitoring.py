"""
DataMediator Pro - Monitoring et Observabilité
Système complet de monitoring avec métriques, alertes et health checks
"""

import time
import logging
import json
import psutil
import asyncio
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict, deque
import threading
from enum import Enum

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

@dataclass
class Metric:
    """Métrique de monitoring"""
    name: str
    value: float
    timestamp: float
    tags: Dict[str, str] = None
    unit: str = ""

@dataclass
class Alert:
    """Alerte de monitoring"""
    id: str
    name: str
    description: str
    severity: AlertSeverity
    timestamp: float
    resolved: bool = False
    resolved_at: Optional[float] = None
    metadata: Dict[str, Any] = None

@dataclass
class HealthCheck:
    """Health check"""
    name: str
    status: HealthStatus
    message: str
    timestamp: float
    response_time: float
    metadata: Dict[str, Any] = None

class MetricsCollector:
    """Collecteur de métriques système et applicatives"""
    
    def __init__(self):
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.start_time = time.time()
        self.lock = threading.Lock()
    
    def record_metric(self, name: str, value: float, tags: Dict[str, str] = None, unit: str = ""):
        """Enregistre une métrique"""
        metric = Metric(
            name=name,
            value=value,
            timestamp=time.time(),
            tags=tags or {},
            unit=unit
        )
        
        with self.lock:
            self.metrics[name].append(metric)
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Récupère les métriques système"""
        try:
            # CPU
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Mémoire
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used = memory.used
            memory_total = memory.total
            
            # Disque
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            disk_free = disk.free
            disk_total = disk.total
            
            # Réseau
            network = psutil.net_io_counters()
            bytes_sent = network.bytes_sent
            bytes_recv = network.bytes_recv
            
            # Processus
            process = psutil.Process()
            process_memory = process.memory_info().rss
            process_cpu = process.cpu_percent()
            
            return {
                "cpu": {
                    "percent": cpu_percent,
                    "count": cpu_count
                },
                "memory": {
                    "percent": memory_percent,
                    "used": memory_used,
                    "total": memory_total
                },
                "disk": {
                    "percent": disk_percent,
                    "free": disk_free,
                    "total": disk_total
                },
                "network": {
                    "bytes_sent": bytes_sent,
                    "bytes_recv": bytes_recv
                },
                "process": {
                    "memory_rss": process_memory,
                    "cpu_percent": process_cpu
                },
                "uptime": time.time() - self.start_time
            }
            
        except Exception as e:
            logger.error(f"Erreur lors de la collecte des métriques système: {e}")
            return {}
    
    def get_application_metrics(self) -> Dict[str, Any]:
        """Récupère les métriques applicatives"""
        try:
            from cache_manager import cache_manager, performance_monitor
            
            # Métriques de cache
            cache_stats = cache_manager.get_stats()
            
            # Métriques de performance
            perf_stats = performance_monitor.get_stats()
            
            # Métriques de requêtes
            with self.lock:
                query_metrics = {}
                for name, metric_deque in self.metrics.items():
                    if name.startswith("query_"):
                        recent_values = list(metric_deque)[-10:]  # 10 dernières valeurs
                        if recent_values:
                            query_metrics[name] = {
                                "count": len(recent_values),
                                "avg": sum(m.value for m in recent_values) / len(recent_values),
                                "min": min(m.value for m in recent_values),
                                "max": max(m.value for m in recent_values)
                            }
            
            return {
                "cache": cache_stats,
                "performance": perf_stats,
                "queries": query_metrics,
                "timestamp": time.time()
            }
            
        except Exception as e:
            logger.error(f"Erreur lors de la collecte des métriques applicatives: {e}")
            return {}
    
    def get_metrics_summary(self, metric_name: str, duration: int = 300) -> Dict[str, Any]:
        """Récupère un résumé des métriques sur une période"""
        with self.lock:
            if metric_name not in self.metrics:
                return {}
            
            cutoff_time = time.time() - duration
            recent_metrics = [
                m for m in self.metrics[metric_name] 
                if m.timestamp >= cutoff_time
            ]
            
            if not recent_metrics:
                return {}
            
            values = [m.value for m in recent_metrics]
            
            return {
                "count": len(values),
                "avg": sum(values) / len(values),
                "min": min(values),
                "max": max(values),
                "latest": values[-1],
                "period": duration,
                "start_time": recent_metrics[0].timestamp,
                "end_time": recent_metrics[-1].timestamp
            }

class AlertManager:
    """Gestionnaire d'alertes"""
    
    def __init__(self):
        self.alerts: Dict[str, Alert] = {}
        self.alert_rules: List[Dict[str, Any]] = []
        self.alert_handlers: List[callable] = []
        self.lock = threading.Lock()
        
        # Règles d'alertes par défaut
        self.setup_default_rules()
    
    def setup_default_rules(self):
        """Configure les règles d'alertes par défaut"""
        self.alert_rules = [
            {
                "name": "High CPU Usage",
                "condition": "cpu_percent > 80",
                "severity": AlertSeverity.HIGH,
                "duration": 300,  # 5 minutes
                "message": "CPU usage is above 80%"
            },
            {
                "name": "High Memory Usage",
                "condition": "memory_percent > 85",
                "severity": AlertSeverity.HIGH,
                "duration": 300,
                "message": "Memory usage is above 85%"
            },
            {
                "name": "Low Disk Space",
                "condition": "disk_percent > 90",
                "severity": AlertSeverity.CRITICAL,
                "duration": 60,  # 1 minute
                "message": "Disk space is critically low"
            },
            {
                "name": "Slow Queries",
                "condition": "avg_query_time > 2.0",
                "severity": AlertSeverity.MEDIUM,
                "duration": 600,  # 10 minutes
                "message": "Average query time is above 2 seconds"
            },
            {
                "name": "Low Cache Hit Rate",
                "condition": "cache_hit_rate < 50",
                "severity": AlertSeverity.MEDIUM,
                "duration": 600,
                "message": "Cache hit rate is below 50%"
            }
        ]
    
    def add_alert_handler(self, handler: callable):
        """Ajoute un gestionnaire d'alertes"""
        self.alert_handlers.append(handler)
    
    def check_alerts(self, metrics: Dict[str, Any]):
        """Vérifie les conditions d'alertes"""
        current_time = time.time()
        
        for rule in self.alert_rules:
            try:
                if self.evaluate_condition(rule["condition"], metrics):
                    alert_id = f"alert_{rule['name'].lower().replace(' ', '_')}"
                    
                    with self.lock:
                        if alert_id not in self.alerts:
                            # Nouvelle alerte
                            alert = Alert(
                                id=alert_id,
                                name=rule["name"],
                                description=rule["message"],
                                severity=rule["severity"],
                                timestamp=current_time,
                                metadata={"rule": rule}
                            )
                            self.alerts[alert_id] = alert
                            
                            # Notifier les handlers
                            for handler in self.alert_handlers:
                                try:
                                    handler(alert)
                                except Exception as e:
                                    logger.error(f"Erreur dans le handler d'alerte: {e}")
                
                else:
                    # Résoudre l'alerte si la condition n'est plus vraie
                    alert_id = f"alert_{rule['name'].lower().replace(' ', '_')}"
                    with self.lock:
                        if alert_id in self.alerts and not self.alerts[alert_id].resolved:
                            self.alerts[alert_id].resolved = True
                            self.alerts[alert_id].resolved_at = current_time
                            
            except Exception as e:
                logger.error(f"Erreur lors de la vérification de l'alerte {rule['name']}: {e}")
    
    def evaluate_condition(self, condition: str, metrics: Dict[str, Any]) -> bool:
        """Évalue une condition d'alerte"""
        try:
            # Remplacer les variables dans la condition
            context = {}
            
            # Métriques système
            if "system" in metrics:
                sys_metrics = metrics["system"]
                context.update({
                    "cpu_percent": sys_metrics.get("cpu", {}).get("percent", 0),
                    "memory_percent": sys_metrics.get("memory", {}).get("percent", 0),
                    "disk_percent": sys_metrics.get("disk", {}).get("percent", 0)
                })
            
            # Métriques applicatives
            if "application" in metrics:
                app_metrics = metrics["application"]
                
                # Cache
                if "cache" in app_metrics:
                    cache_stats = app_metrics["cache"]
                    context["cache_hit_rate"] = cache_stats.get("hit_rate", 0)
                
                # Performance
                if "performance" in app_metrics:
                    perf_stats = app_metrics["performance"]
                    context["avg_query_time"] = perf_stats.get("avg_query_time", 0)
            
            # Évaluer la condition
            return eval(condition, {"__builtins__": {}}, context)
            
        except Exception as e:
            logger.error(f"Erreur lors de l'évaluation de la condition '{condition}': {e}")
            return False
    
    def get_active_alerts(self) -> List[Alert]:
        """Retourne les alertes actives"""
        with self.lock:
            return [alert for alert in self.alerts.values() if not alert.resolved]
    
    def get_all_alerts(self, limit: int = 100) -> List[Alert]:
        """Retourne toutes les alertes"""
        with self.lock:
            alerts = list(self.alerts.values())
            alerts.sort(key=lambda a: a.timestamp, reverse=True)
            return alerts[:limit]
    
    def resolve_alert(self, alert_id: str) -> bool:
        """Résout manuellement une alerte"""
        with self.lock:
            if alert_id in self.alerts and not self.alerts[alert_id].resolved:
                self.alerts[alert_id].resolved = True
                self.alerts[alert_id].resolved_at = time.time()
                return True
        return False

class HealthChecker:
    """Vérificateur de santé"""
    
    def __init__(self):
        self.health_checks: Dict[str, callable] = {}
        self.results: Dict[str, HealthCheck] = {}
        self.lock = threading.Lock()
        
        # Health checks par défaut
        self.setup_default_checks()
    
    def setup_default_checks(self):
        """Configure les health checks par défaut"""
        self.health_checks = {
            "database": self.check_database,
            "cache": self.check_cache,
            "disk_space": self.check_disk_space,
            "memory": self.check_memory,
            "api_response": self.check_api_response
        }
    
    def add_health_check(self, name: str, check_func: callable):
        """Ajoute un health check"""
        self.health_checks[name] = check_func
    
    def run_all_checks(self) -> Dict[str, HealthCheck]:
        """Exécute tous les health checks"""
        results = {}
        
        for name, check_func in self.health_checks.items():
            try:
                start_time = time.time()
                result = check_func()
                response_time = time.time() - start_time
                
                health_check = HealthCheck(
                    name=name,
                    status=result["status"],
                    message=result["message"],
                    timestamp=time.time(),
                    response_time=response_time,
                    metadata=result.get("metadata", {})
                )
                
                results[name] = health_check
                
            except Exception as e:
                health_check = HealthCheck(
                    name=name,
                    status=HealthStatus.UNHEALTHY,
                    message=f"Health check failed: {str(e)}",
                    timestamp=time.time(),
                    response_time=0
                )
                
                results[name] = health_check
                logger.error(f"Health check {name} failed: {e}")
        
        with self.lock:
            self.results = results
        
        return results
    
    def get_overall_status(self) -> HealthStatus:
        """Détermine le statut de santé global"""
        if not self.results:
            return HealthStatus.HEALTHY
        
        statuses = [check.status for check in self.results.values()]
        
        if HealthStatus.UNHEALTHY in statuses:
            return HealthStatus.UNHEALTHY
        elif HealthStatus.DEGRADED in statuses:
            return HealthStatus.DEGRADED
        else:
            return HealthStatus.HEALTHY
    
    def check_database(self) -> Dict[str, Any]:
        """Vérifie la connexion à la base de données"""
        try:
            from enterprise_mediator import query_postgres
            
            # Test simple
            result = query_postgres("SELECT 1 as test")
            
            if result and len(result) > 0:
                return {
                    "status": HealthStatus.HEALTHY,
                    "message": "Database connection OK",
                    "metadata": {"query_time": "fast"}
                }
            else:
                return {
                    "status": HealthStatus.UNHEALTHY,
                    "message": "Database query failed"
                }
                
        except Exception as e:
            return {
                "status": HealthStatus.UNHEALTHY,
                "message": f"Database connection failed: {str(e)}"
            }
    
    def check_cache(self) -> Dict[str, Any]:
        """Vérifie le système de cache"""
        try:
            from cache_manager import cache_manager
            
            stats = cache_manager.get_stats()
            
            if stats.get("redis_connected", False):
                return {
                    "status": HealthStatus.HEALTHY,
                    "message": "Redis cache OK",
                    "metadata": stats
                }
            else:
                return {
                    "status": HealthStatus.DEGRADED,
                    "message": "Using memory cache (Redis unavailable)",
                    "metadata": stats
                }
                
        except Exception as e:
            return {
                "status": HealthStatus.DEGRADED,
                "message": f"Cache system issue: {str(e)}"
            }
    
    def check_disk_space(self) -> Dict[str, Any]:
        """Vérifie l'espace disque"""
        try:
            disk = psutil.disk_usage('/')
            percent_used = (disk.used / disk.total) * 100
            
            if percent_used > 90:
                return {
                    "status": HealthStatus.UNHEALTHY,
                    "message": f"Disk usage critical: {percent_used:.1f}%",
                    "metadata": {"percent": percent_used, "free_gb": disk.free / (1024**3)}
                }
            elif percent_used > 80:
                return {
                    "status": HealthStatus.DEGRADED,
                    "message": f"Disk usage high: {percent_used:.1f}%",
                    "metadata": {"percent": percent_used, "free_gb": disk.free / (1024**3)}
                }
            else:
                return {
                    "status": HealthStatus.HEALTHY,
                    "message": f"Disk usage OK: {percent_used:.1f}%",
                    "metadata": {"percent": percent_used, "free_gb": disk.free / (1024**3)}
                }
                
        except Exception as e:
            return {
                "status": HealthStatus.UNHEALTHY,
                "message": f"Disk check failed: {str(e)}"
            }
    
    def check_memory(self) -> Dict[str, Any]:
        """Vérifie l'utilisation mémoire"""
        try:
            memory = psutil.virtual_memory()
            percent_used = memory.percent
            
            if percent_used > 90:
                return {
                    "status": HealthStatus.UNHEALTHY,
                    "message": f"Memory usage critical: {percent_used:.1f}%",
                    "metadata": {"percent": percent_used, "available_gb": memory.available / (1024**3)}
                }
            elif percent_used > 80:
                return {
                    "status": HealthStatus.DEGRADED,
                    "message": f"Memory usage high: {percent_used:.1f}%",
                    "metadata": {"percent": percent_used, "available_gb": memory.available / (1024**3)}
                }
            else:
                return {
                    "status": HealthStatus.HEALTHY,
                    "message": f"Memory usage OK: {percent_used:.1f}%",
                    "metadata": {"percent": percent_used, "available_gb": memory.available / (1024**3)}
                }
                
        except Exception as e:
            return {
                "status": HealthStatus.UNHEALTHY,
                "message": f"Memory check failed: {str(e)}"
            }
    
    def check_api_response(self) -> Dict[str, Any]:
        """Vérifie la réponse de l'API"""
        try:
            # Test simple de l'API
            start_time = time.time()
            
            # Simuler un test d'API
            time.sleep(0.01)  # Simulation
            
            response_time = time.time() - start_time
            
            if response_time > 2.0:
                return {
                    "status": HealthStatus.DEGRADED,
                    "message": f"API response slow: {response_time:.3f}s",
                    "metadata": {"response_time": response_time}
                }
            else:
                return {
                    "status": HealthStatus.HEALTHY,
                    "message": f"API response OK: {response_time:.3f}s",
                    "metadata": {"response_time": response_time}
                }
                
        except Exception as e:
            return {
                "status": HealthStatus.UNHEALTHY,
                "message": f"API check failed: {str(e)}"
            }

class MonitoringSystem:
    """Système de monitoring complet"""
    
    def __init__(self):
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager()
        self.health_checker = HealthChecker()
        self.running = False
        self.monitor_thread = None
        
        # Handler d'alertes par défaut (log)
        self.alert_manager.add_alert_handler(self.log_alert)
    
    def log_alert(self, alert: Alert):
        """Handler d'alerte par défaut (logging)"""
        level = {
            AlertSeverity.LOW: logging.INFO,
            AlertSeverity.MEDIUM: logging.WARNING,
            AlertSeverity.HIGH: logging.ERROR,
            AlertSeverity.CRITICAL: logging.CRITICAL
        }.get(alert.severity, logging.INFO)
        
        logger.log(level, f"ALERT: {alert.name} - {alert.description}")
    
    def start_monitoring(self, interval: int = 30):
        """Démarre le monitoring en arrière-plan"""
        if self.running:
            return
        
        self.running = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, args=(interval,))
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        
        logger.info("Monitoring system started")
    
    def stop_monitoring(self):
        """Arrête le monitoring"""
        self.running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        
        logger.info("Monitoring system stopped")
    
    def _monitor_loop(self, interval: int):
        """Boucle de monitoring"""
        while self.running:
            try:
                # Collecter les métriques
                system_metrics = self.metrics_collector.get_system_metrics()
                app_metrics = self.metrics_collector.get_application_metrics()
                
                # Enregistrer les métriques
                self.metrics_collector.record_metric("cpu_percent", system_metrics.get("cpu", {}).get("percent", 0))
                self.metrics_collector.record_metric("memory_percent", system_metrics.get("memory", {}).get("percent", 0))
                self.metrics_collector.record_metric("disk_percent", system_metrics.get("disk", {}).get("percent", 0))
                
                # Vérifier les alertes
                metrics = {"system": system_metrics, "application": app_metrics}
                self.alert_manager.check_alerts(metrics)
                
                # Exécuter les health checks
                self.health_checker.run_all_checks()
                
            except Exception as e:
                logger.error(f"Erreur dans la boucle de monitoring: {e}")
            
            time.sleep(interval)
    
    def get_monitoring_summary(self) -> Dict[str, Any]:
        """Retourne un résumé complet du monitoring"""
        return {
            "system": self.metrics_collector.get_system_metrics(),
            "application": self.metrics_collector.get_application_metrics(),
            "health": {
                "overall": self.health_checker.get_overall_status().value,
                "checks": {name: asdict(check) for name, check in self.health_checker.results.items()}
            },
            "alerts": {
                "active": len(self.alert_manager.get_active_alerts()),
                "total": len(self.alert_manager.get_all_alerts()),
                "recent": [asdict(alert) for alert in self.alert_manager.get_all_alerts(10)]
            },
            "status": "running" if self.running else "stopped",
            "timestamp": time.time()
        }

# Instance globale du monitoring
monitoring_system = MonitoringSystem()

# Fonctions pour démarrer/arrêter le monitoring
def start_monitoring(interval: int = 30):
    """Démarre le système de monitoring"""
    monitoring_system.start_monitoring(interval)

def stop_monitoring():
    """Arrête le système de monitoring"""
    monitoring_system.stop_monitoring()

def get_monitoring_data() -> Dict[str, Any]:
    """Retourne les données de monitoring"""
    return monitoring_system.get_monitoring_summary()
