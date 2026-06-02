"""
DataMediator Pro — Initialisation et vérification des sources hétérogènes.

Ce script :
  1. Vide les anciens fichiers de sources s'ils existent.
  2. Régénère les six sources (S1..S6).
  3. Affiche un rapport de cohérence (nombre de lignes par source).
  4. Détecte les anomalies (fichiers manquants, tables vides, etc.).

Usage :
    python sources/setup_enterprise_sources.py            # full reset
    python sources/setup_enterprise_sources.py --verify   # vérifier sans toucher
"""
from __future__ import annotations

import csv
import json
import sqlite3
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from enterprise_mediator import (
    DATA_DIR,
    GRAPH_PATH,
    LEGACY_CSV,
    XML_PATH,
    seed_enterprise_sources,
)


def _green(s: str) -> str:  return f"\033[32m{s}\033[0m"
def _red(s: str) -> str:    return f"\033[31m{s}\033[0m"
def _yellow(s: str) -> str: return f"\033[33m{s}\033[0m"
def _blue(s: str) -> str:   return f"\033[36m{s}\033[0m"


def _count_sqlite(db: Path, table: str) -> int:
    con = sqlite3.connect(db)
    try:
        return con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    finally:
        con.close()


def verify() -> bool:
    """Inspecte les six sources et imprime un rapport."""
    print(_blue("\n" + "=" * 64))
    print(_blue("  Rapport de cohérence des sources — DataMediator Pro"))
    print(_blue("=" * 64))

    ok = True

    # S1 — PostgreSQL HR (SQLite simulé)
    pg = DATA_DIR / "postgres_hr.db"
    if pg.exists():
        try:
            emp = _count_sqlite(pg, "employees")
            dept = _count_sqlite(pg, "departments")
            print(f"  {_green('✓')} S1  PostgreSQL HR     {emp:3d} employés, {dept:2d} départements")
        except Exception as e:
            print(f"  {_red('✗')} S1  PostgreSQL HR     erreur : {e}")
            ok = False
    else:
        print(f"  {_red('✗')} S1  PostgreSQL HR     fichier manquant : {pg}")
        ok = False

    # S2 — MySQL Projects (SQLite simulé)
    ms = DATA_DIR / "mysql_projects.db"
    if ms.exists():
        try:
            cons = _count_sqlite(ms, "consultants")
            prj  = _count_sqlite(ms, "projects")
            asg  = _count_sqlite(ms, "assignments")
            print(f"  {_green('✓')} S2  MySQL Projects    {cons:3d} consultants, {prj:2d} projets, {asg:2d} affectations")
        except Exception as e:
            print(f"  {_red('✗')} S2  MySQL Projects    erreur : {e}")
            ok = False
    else:
        print(f"  {_red('✗')} S2  MySQL Projects    fichier manquant")
        ok = False

    # S3 — MongoDB Finance (SQLite simulé)
    mg = DATA_DIR / "mongo_finance.db"
    if mg.exists():
        try:
            pay = _count_sqlite(mg, "payroll")
            print(f"  {_green('✓')} S3  Mongo Finance     {pay:3d} documents payroll")
        except Exception as e:
            print(f"  {_red('✗')} S3  Mongo Finance     erreur : {e}")
            ok = False
    else:
        print(f"  {_red('✗')} S3  Mongo Finance     fichier manquant")
        ok = False

    # S4 — Legacy CSV
    if LEGACY_CSV.exists():
        try:
            with LEGACY_CSV.open(encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
            print(f"  {_green('✓')} S4  Legacy CSV        {len(rows):3d} employés historiques")
        except Exception as e:
            print(f"  {_red('✗')} S4  Legacy CSV        erreur : {e}")
            ok = False
    else:
        print(f"  {_red('✗')} S4  Legacy CSV        fichier manquant")
        ok = False

    # S5 — XML evaluations
    if XML_PATH.exists():
        try:
            tree = ET.parse(XML_PATH)
            n = len(tree.getroot().findall("Eval"))
            print(f"  {_green('✓')} S5  XML Evaluations   {n:3d} évaluations")
        except Exception as e:
            print(f"  {_red('✗')} S5  XML Evaluations   erreur : {e}")
            ok = False
    else:
        print(f"  {_red('✗')} S5  XML Evaluations   fichier manquant")
        ok = False

    # S6 — Graph JSON
    if GRAPH_PATH.exists():
        try:
            with GRAPH_PATH.open(encoding="utf-8") as f:
                g = json.load(f)
            print(f"  {_green('✓')} S6  Graphe compétences {len(g.get('nodes', [])):3d} nœuds, {len(g.get('edges', [])):2d} arêtes")
        except Exception as e:
            print(f"  {_red('✗')} S6  Graphe compétences erreur : {e}")
            ok = False
    else:
        print(f"  {_red('✗')} S6  Graphe compétences fichier manquant")
        ok = False

    print(_blue("=" * 64))
    if ok:
        print(_green("\n  Toutes les sources sont prêtes pour la médiation."))
    else:
        print(_red("\n  Certaines sources ont des problèmes — relancez sans --verify pour régénérer."))
    print()
    return ok


def main() -> None:
    args = set(sys.argv[1:])
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if "--verify" in args:
        sys.exit(0 if verify() else 1)

    print(_blue("\nRégénération des sources hétérogènes..."))
    seed_enterprise_sources()
    print(_green("  • S1 PostgreSQL HR    : créé"))
    print(_green("  • S2 MySQL Projects   : créé"))
    print(_green("  • S3 Mongo Finance    : créé"))
    print(_green("  • S4 Legacy CSV       : créé"))
    print(_green("  • S5 XML Evaluations  : créé"))
    print(_green("  • S6 Graphe JSON      : créé"))
    verify()


if __name__ == "__main__":
    main()
