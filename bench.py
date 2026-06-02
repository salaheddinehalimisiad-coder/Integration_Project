"""
DataMediator Pro — Benchmark GAV vs LAV.

Exécute N fois chaque requête de référence sous les deux stratégies de
réécriture et calcule moyenne / min / max / écart-type des temps d'exécution.
Affiche un tableau dans le terminal et écrit data/benchmark_results.csv.

Usage :
    python bench.py                 # 10 itérations
    python bench.py --runs 50       # 50 itérations
    python bench.py --csv out.csv   # chemin de sortie personnalisé
"""
from __future__ import annotations

import argparse
import csv
import statistics
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from enterprise_mediator import QueryEngine, ensure_sources, USERS


REFERENCE_QUERIES = [
    ("Employés actifs",
     "SELECT full_name, email, department_name FROM GlobalEmployee WHERE status = 'ACTIVE';"),
    ("Tous les départements",
     "SELECT department_id, department_name, country FROM GlobalDepartment;"),
    ("Tous les projets",
     "SELECT project_id, project_name, status FROM GlobalProject;"),
    ("Affectations",
     "SELECT employee_id, project_id, role FROM GlobalAssignment;"),
    ("Jointure employés × projets",
     ("SELECT e.full_name, p.project_name FROM GlobalEmployee e "
      "JOIN GlobalAssignment a ON e.employee_id = a.employee_id "
      "JOIN GlobalProject p ON a.project_id = p.project_id "
      "WHERE p.status = 'ACTIVE';")),
    ("Agrégation par département",
     ("SELECT department_name, COUNT(*) AS n FROM GlobalEmployee "
      "WHERE status = 'ACTIVE' GROUP BY department_name;")),
]


def _bench_one(engine: QueryEngine, sql: str, mode: str, user: dict, runs: int) -> dict[str, Any]:
    times: list[float] = []
    rows_out = 0
    errors = 0
    for _ in range(runs):
        try:
            t0 = time.perf_counter()
            res = engine.execute(sql, mode, user)
            t1 = time.perf_counter()
            times.append((t1 - t0) * 1000.0)
            rows_out = res.get("row_count", 0)
        except Exception:
            errors += 1
    if not times:
        return {"mean_ms": None, "min_ms": None, "max_ms": None, "stdev_ms": None,
                "rows": 0, "errors": errors}
    return {
        "mean_ms":  round(statistics.mean(times), 2),
        "min_ms":   round(min(times), 2),
        "max_ms":   round(max(times), 2),
        "stdev_ms": round(statistics.stdev(times), 2) if len(times) > 1 else 0.0,
        "rows":     rows_out,
        "errors":   errors,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Bench GAV vs LAV pour DataMediator")
    ap.add_argument("--runs", type=int, default=10, help="Nombre d'exécutions par requête (default: 10)")
    ap.add_argument("--csv",  default=str(ROOT / "data" / "benchmark_results.csv"))
    args = ap.parse_args()

    ensure_sources()
    user = {"username": "admin", **USERS["admin"]}
    engine = QueryEngine()

    print(f"\n=== Benchmark DataMediator Pro · {args.runs} runs par requête ===\n")
    print(f"{'Requête':<35}{'Mode':<6}{'Mean':>9}{'Min':>9}{'Max':>9}{'σ':>9}{'Lignes':>9}")
    print("-" * 90)

    rows_csv: list[dict[str, Any]] = []
    for name, sql in REFERENCE_QUERIES:
        for mode in ("GAV", "LAV"):
            metrics = _bench_one(engine, sql, mode, user, args.runs)
            mean = metrics["mean_ms"]
            if mean is None:
                print(f"{name[:34]:<35}{mode:<6}{'ERR':>9}{'—':>9}{'—':>9}{'—':>9}{'—':>9}")
                continue
            print(f"{name[:34]:<35}{mode:<6}{mean:>8.2f}ms{metrics['min_ms']:>8.2f}ms"
                  f"{metrics['max_ms']:>8.2f}ms{metrics['stdev_ms']:>8.2f}ms{metrics['rows']:>9}")
            rows_csv.append({"query": name, "mode": mode, **metrics})

    # Comparison summary
    print("\n=== Synthèse ===")
    by_query: dict[str, dict[str, dict[str, Any]]] = {}
    for r in rows_csv:
        by_query.setdefault(r["query"], {})[r["mode"]] = r
    for q, modes in by_query.items():
        if "GAV" in modes and "LAV" in modes:
            g, l = modes["GAV"]["mean_ms"], modes["LAV"]["mean_ms"]
            diff = l - g
            winner = "GAV" if g < l else "LAV"
            print(f"  {q:<35} {winner:<4} gagne  · Δ {abs(diff):.2f} ms")

    # CSV export
    csv_path = Path(args.csv)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        fieldnames = ["query", "mode", "mean_ms", "min_ms", "max_ms", "stdev_ms", "rows", "errors"]
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows_csv)
    print(f"\n→ Résultats détaillés exportés vers {csv_path}\n")


if __name__ == "__main__":
    main()
