"""
DataMediator Pro - Tests de Charge
Tests de charge et de performance avec k6
"""

import pytest
import asyncio
import aiohttp
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any

class TestLoad:
    """Suite de tests de charge pour DataMediator Pro"""
    
    BASE_URL = "http://localhost:5001"
    
    async def get_token(self, session: aiohttp.ClientSession, username: str, password: str) -> str:
        """Obtient un token d'authentification"""
        async with session.post(f"{self.BASE_URL}/api/auth/login", 
                               json={"username": username, "password": password}) as response:
            if response.status == 200:
                data = await response.json()
                return data["token"]
            else:
                raise Exception(f"Login failed: {response.status}")
    
    async def make_request(self, session: aiohttp.ClientSession, method: str, endpoint: str, 
                          token: str, json_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Effectue une requête HTTP"""
        headers = {"Authorization": f"Bearer {token}"}
        url = f"{self.BASE_URL}{endpoint}"
        
        start_time = time.time()
        
        async with session.request(method, url, headers=headers, json=json_data) as response:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # ms
            
            try:
                response_data = await response.json()
            except:
                response_data = await response.text()
            
            return {
                "status_code": response.status,
                "response_time": response_time,
                "response_size": len(str(response_data)),
                "success": response.status < 400
            }
    
    async def test_concurrent_login(self, concurrent_users: int = 50):
        """Test de charge concurrente - Login"""
        print(f"\n🚀 Test de charge concurrente - Login ({concurrent_users} utilisateurs)")
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            
            for i in range(concurrent_users):
                username = f"user_{i}"
                task = self.make_request(
                    session, "POST", "/api/auth/login", "",
                    json_data={"username": "admin", "password": "admin123"}
                )
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Analyser les résultats
            successful = sum(1 for r in results if isinstance(r, dict) and r["success"])
            failed = len(results) - successful
            
            response_times = [r["response_time"] for r in results if isinstance(r, dict)]
            avg_response_time = statistics.mean(response_times) if response_times else 0
            max_response_time = max(response_times) if response_times else 0
            min_response_time = min(response_times) if response_times else 0
            
            print(f"✅ Succès: {successful}/{concurrent_users}")
            print(f"❌ Échecs: {failed}/{concurrent_users}")
            print(f"⏱️ Temps moyen: {avg_response_time:.2f}ms")
            print(f"⏱️ Temps max: {max_response_time:.2f}ms")
            print(f"⏱️ Temps min: {min_response_time:.2f}ms")
            
            # Assertions
            assert successful >= concurrent_users * 0.95, f"Trop d'échecs: {failed}/{concurrent_users}"
            assert avg_response_time < 1000, f"Temps moyen trop élevé: {avg_response_time:.2f}ms"
            
            return {
                "successful": successful,
                "failed": failed,
                "avg_response_time": avg_response_time,
                "max_response_time": max_response_time,
                "min_response_time": min_response_time
            }
    
    async def test_concurrent_queries(self, concurrent_queries: int = 30, duration: int = 10):
        """Test de charge concurrente - Requêtes"""
        print(f"\n🔍 Test de charge concurrente - Requêtes ({concurrent_queries} concurrentes, {duration}s)")
        
        async with aiohttp.ClientSession() as session:
            # Obtenir un token
            token = await self.get_token(session, "admin", "admin123")
            
            results = []
            start_time = time.time()
            
            while time.time() - start_time < duration:
                tasks = []
                
                for _ in range(concurrent_queries):
                    task = self.make_request(
                        session, "POST", "/api/query/execute", token,
                        json_data={
                            "sql": "SELECT employee_id, full_name FROM GlobalEmployee LIMIT 5",
                            "mode": "GAV"
                        }
                    )
                    tasks.append(task)
                
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                results.extend([r for r in batch_results if isinstance(r, dict)])
                
                # Petite pause entre les batches
                await asyncio.sleep(0.1)
            
            # Analyser les résultats
            successful = sum(1 for r in results if r["success"])
            failed = len(results) - successful
            
            response_times = [r["response_time"] for r in results]
            avg_response_time = statistics.mean(response_times) if response_times else 0
            max_response_time = max(response_times) if response_times else 0
            min_response_time = min(response_times) if response_times else 0
            p95_response_time = statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max_response_time
            
            throughput = len(results) / duration
            
            print(f"✅ Succès: {successful}/{len(results)}")
            print(f"❌ Échecs: {failed}/{len(results)}")
            print(f"⚡ Débit: {throughput:.2f} req/s")
            print(f"⏱️ Temps moyen: {avg_response_time:.2f}ms")
            print(f"⏱️ Temps P95: {p95_response_time:.2f}ms")
            print(f"⏱️ Temps max: {max_response_time:.2f}ms")
            
            # Assertions
            assert successful >= len(results) * 0.95, f"Trop d'échecs: {failed}/{len(results)}"
            assert avg_response_time < 2000, f"Temps moyen trop élevé: {avg_response_time:.2f}ms"
            assert p95_response_time < 5000, f"Temps P95 trop élevé: {p95_response_time:.2f}ms"
            
            return {
                "total_requests": len(results),
                "successful": successful,
                "failed": failed,
                "throughput": throughput,
                "avg_response_time": avg_response_time,
                "p95_response_time": p95_response_time,
                "max_response_time": max_response_time
            }
    
    async def test_mixed_workload(self, duration: int = 30):
        """Test de charge mixte - Workload varié"""
        print(f"\n🎯 Test de charge mixte ({duration}s)")
        
        async with aiohttp.ClientSession() as session:
            token = await self.get_token(session, "admin", "admin123")
            
            results = []
            start_time = time.time()
            
            while time.time() - start_time < duration:
                tasks = []
                
                # Mix de différents types de requêtes
                workloads = [
                    # Requêtes simples (40%)
                    {
                        "endpoint": "/api/query/execute",
                        "method": "POST",
                        "data": {"sql": "SELECT employee_id, full_name FROM GlobalEmployee LIMIT 3", "mode": "GAV"},
                        "weight": 0.4
                    },
                    # Dashboard metrics (30%)
                    {
                        "endpoint": "/api/dashboard/metrics",
                        "method": "POST",
                        "data": {"timeRange": "7d"},
                        "weight": 0.3
                    },
                    # Schema (20%)
                    {
                        "endpoint": "/api/schema/global",
                        "method": "GET",
                        "data": None,
                        "weight": 0.2
                    },
                    # Conflits (10%)
                    {
                        "endpoint": "/api/conflicts/list",
                        "method": "POST",
                        "data": {},
                        "weight": 0.1
                    }
                ]
                
                # Créer 20 requêtes mixtes
                for _ in range(20):
                    import random
                    workload = random.choices(workloads, weights=[w["weight"] for w in workloads])[0]
                    
                    task = self.make_request(
                        session, workload["method"], workload["endpoint"], token,
                        json_data=workload["data"]
                    )
                    tasks.append(task)
                
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                results.extend([r for r in batch_results if isinstance(r, dict)])
                
                await asyncio.sleep(0.2)
            
            # Analyser par type de requête
            successful = sum(1 for r in results if r["success"])
            failed = len(results) - successful
            
            response_times = [r["response_time"] for r in results]
            avg_response_time = statistics.mean(response_times) if response_times else 0
            
            throughput = len(results) / duration
            
            print(f"✅ Succès: {successful}/{len(results)}")
            print(f"❌ Échecs: {failed}/{len(results)}")
            print(f"⚡ Débit total: {throughput:.2f} req/s")
            print(f"⏱️ Temps moyen: {avg_response_time:.2f}ms")
            
            # Assertions
            assert successful >= len(results) * 0.95, f"Trop d'échecs: {failed}/{len(results)}"
            assert avg_response_time < 3000, f"Temps moyen trop élevé: {avg_response_time:.2f}ms"
            
            return {
                "total_requests": len(results),
                "successful": successful,
                "failed": failed,
                "throughput": throughput,
                "avg_response_time": avg_response_time
            }
    
    async def test_sustained_load(self, duration: int = 60, concurrent_users: int = 20):
        """Test de charge soutenu"""
        print(f"\n⏱️ Test de charge soutenu ({duration}s, {concurrent_users} utilisateurs)")
        
        async with aiohttp.ClientSession() as session:
            token = await self.get_token(session, "admin", "admin123")
            
            results = []
            start_time = time.time()
            
            # Créer des workers continus
            async def worker():
                worker_results = []
                while time.time() - start_time < duration:
                    task = self.make_request(
                        session, "POST", "/api/query/execute", token,
                        json_data={
                            "sql": "SELECT COUNT(*) as total FROM GlobalEmployee",
                            "mode": "GAV"
                        }
                    )
                    result = await task
                    worker_results.append(result)
                    await asyncio.sleep(0.5)  # 2 req/s par worker
                return worker_results
            
            # Lancer les workers
            tasks = [worker() for _ in range(concurrent_users)]
            worker_results = await asyncio.gather(*tasks)
            
            # Aplatener les résultats
            for worker_result in worker_results:
                results.extend(worker_result)
            
            # Analyser les résultats
            successful = sum(1 for r in results if r["success"])
            failed = len(results) - successful
            
            response_times = [r["response_time"] for r in results]
            avg_response_time = statistics.mean(response_times) if response_times else 0
            max_response_time = max(response_times) if response_times else 0
            
            throughput = len(results) / duration
            
            print(f"✅ Succès: {successful}/{len(results)}")
            print(f"❌ Échecs: {failed}/{len(results)}")
            print(f"⚡ Débit: {throughput:.2f} req/s")
            print(f"⏱️ Temps moyen: {avg_response_time:.2f}ms")
            print(f"⏱️ Temps max: {max_response_time:.2f}ms")
            
            # Assertions
            assert successful >= len(results) * 0.95, f"Trop d'échecs: {failed}/{len(results)}"
            assert avg_response_time < 2000, f"Temps moyen trop élevé: {avg_response_time:.2f}ms"
            assert throughput >= concurrent_users * 1.5, f"Débit trop faible: {throughput:.2f} req/s"
            
            return {
                "total_requests": len(results),
                "successful": successful,
                "failed": failed,
                "throughput": throughput,
                "avg_response_time": avg_response_time,
                "max_response_time": max_response_time
            }
    
    def test_stress_burst(self):
        """Test de stress - Burst traffic"""
        print(f"\n💥 Test de stress - Burst traffic")
        
        def burst_worker():
            """Worker pour test de stress"""
            import requests
            import time
            import random
            
            # Login
            login_response = requests.post(f"{self.BASE_URL}/api/auth/login", 
                                         json={"username": "admin", "password": "admin123"})
            token = login_response.json()["token"]
            
            headers = {"Authorization": f"Bearer {token}"}
            results = []
            
            # Burst de requêtes
            for _ in range(50):
                start_time = time.time()
                
                response = requests.post(f"{self.BASE_URL}/api/query/execute", 
                                       headers=headers,
                                       json={
                                           "sql": "SELECT employee_id, full_name FROM GlobalEmployee LIMIT 2",
                                           "mode": "GAV"
                                       })
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                results.append({
                    "status_code": response.status_code,
                    "response_time": response_time,
                    "success": response.status_code < 400
                })
            
            return results
        
        # Lancer 10 workers en parallèle
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(burst_worker) for _ in range(10)]
            worker_results = [future.result() for future in as_completed(futures)]
        
        # Aplatener les résultats
        all_results = []
        for worker_result in worker_results:
            all_results.extend(worker_result)
        
        # Analyser
        successful = sum(1 for r in all_results if r["success"])
        failed = len(all_results) - successful
        
        response_times = [r["response_time"] for r in all_results]
        avg_response_time = statistics.mean(response_times) if response_times else 0
        max_response_time = max(response_times) if response_times else 0
        
        print(f"✅ Succès: {successful}/{len(all_results)}")
        print(f"❌ Échecs: {failed}/{len(all_results)}")
        print(f"⏱️ Temps moyen: {avg_response_time:.2f}ms")
        print(f"⏱️ Temps max: {max_response_time:.2f}ms")
        
        # Assertions
        assert successful >= len(all_results) * 0.90, f"Trop d'échecs en burst: {failed}/{len(all_results)}"
        assert avg_response_time < 5000, f"Temps moyen trop élevé en burst: {avg_response_time:.2f}ms"
        
        return {
            "total_requests": len(all_results),
            "successful": successful,
            "failed": failed,
            "avg_response_time": avg_response_time,
            "max_response_time": max_response_time
        }

# Tests principaux
@pytest.mark.asyncio
async def test_load_concurrent_login():
    """Test charge concurrente - Login"""
    test = TestLoad()
    await test.test_concurrent_login(50)

@pytest.mark.asyncio
async def test_load_concurrent_queries():
    """Test charge concurrente - Requêtes"""
    test = TestLoad()
    await test.test_concurrent_queries(30, 10)

@pytest.mark.asyncio
async def test_load_mixed_workload():
    """Test charge mixte"""
    test = TestLoad()
    await test.test_mixed_workload(20)

@pytest.mark.asyncio
async def test_load_sustained():
    """Test charge soutenu"""
    test = TestLoad()
    await test.test_sustained_load(30, 15)

def test_stress_burst():
    """Test de stress"""
    test = TestLoad()
    test.test_stress_burst()

# Test de performance complet
@pytest.mark.asyncio
async def test_performance_suite():
    """Suite complète de tests de performance"""
    test = TestLoad()
    
    print("\n🎯 Suite complète de tests de performance")
    
    # Test 1: Login concurrent
    login_results = await test.test_concurrent_login(30)
    
    # Test 2: Requêtes concurrentes
    query_results = await test.test_concurrent_queries(20, 15)
    
    # Test 3: Workload mixte
    mixed_results = await test.test_mixed_workload(25)
    
    # Test 4: Charge soutenu
    sustained_results = await test.test_sustained_load(20, 10)
    
    # Rapport final
    print(f"\n📊 Rapport de performance")
    print(f"Login: {login_results['successful']}/{login_results['successful'] + login_results['failed']} ({login_results['avg_response_time']:.2f}ms)")
    print(f"Requêtes: {query_results['successful']}/{query_results['total_requests']} ({query_results['throughput']:.2f} req/s)")
    print(f"Mixte: {mixed_results['successful']}/{mixed_results['total_requests']} ({mixed_results['throughput']:.2f} req/s)")
    print(f"Soutenu: {sustained_results['successful']}/{sustained_results['total_requests']} ({sustained_results['throughput']:.2f} req/s)")
    
    # Assertions globales
    overall_success_rate = (login_results['successful'] + query_results['successful'] + 
                           mixed_results['successful'] + sustained_results['successful']) / (
        login_results['successful'] + login_results['failed'] + query_results['total_requests'] + 
        mixed_results['total_requests'] + sustained_results['total_requests'])
    
    assert overall_success_rate >= 0.95, f"Taux de succès global trop faible: {overall_success_rate:.2%}"

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
