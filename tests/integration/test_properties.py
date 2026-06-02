"""
Tests de propriété pour DataMediator Pro.

Vérifie expérimentalement :
  1. GAV ≡ LAV sur des requêtes conjonctives standard (équivalence des résultats).
  2. RBAC : les colonnes sensibles sont bloquées pour les rôles non autorisés.
  3. Réconciliation : les doublons cross-source sont fusionnés correctement.
  4. Entity resolution standalone : blocking, scoring, transitive closure.

Lancer :   python -m pytest tests/test_properties.py -v
ou        python -m unittest tests.test_properties
"""
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from enterprise_mediator import (
    QueryEngine,
    USERS,
    ROLE_POLICIES,
    ensure_sources,
    login,
    resolve_user,
    reconcile_employees,
)


def _user(role: str) -> dict:
    """Construit un user dict factice avec le rôle demandé."""
    return {"username": role.lower(), "role": role, "name": role}


# Requêtes pour lesquelles GAV et LAV doivent retourner les mêmes lignes
GAV_LAV_QUERIES = [
    "SELECT full_name, email, department_name FROM GlobalEmployee WHERE status = 'ACTIVE';",
    "SELECT full_name, country FROM GlobalEmployee;",
    "SELECT department_name, country FROM GlobalDepartment;",
    "SELECT project_name, status FROM GlobalProject;",
    "SELECT employee_id, project_id, role FROM GlobalAssignment;",
]


def _normalize_rows(rows: list[dict]) -> list[tuple]:
    """Convertit en set comparable, en ignorant les clés internes (_source, etc.)."""
    out = []
    for r in rows:
        clean = tuple(sorted(
            (k, str(v)) for k, v in r.items() if not k.startswith("_")
        ))
        out.append(clean)
    return sorted(out)


class TestGAVLAVEquivalence(unittest.TestCase):
    """Sur des requêtes conjonctives sans agrégation, GAV(Q) ≡ LAV(Q)."""

    @classmethod
    def setUpClass(cls):
        ensure_sources()
        cls.engine = QueryEngine()
        cls.user = _user("ADMIN")

    def test_gav_lav_equivalence(self):
        for sql in GAV_LAV_QUERIES:
            with self.subTest(sql=sql):
                gav = self.engine.execute(sql, "GAV", self.user)
                lav = self.engine.execute(sql, "LAV", self.user)
                # On compare le contenu des lignes (set), pas l'ordre
                self.assertEqual(
                    _normalize_rows(gav["rows"]),
                    _normalize_rows(lav["rows"]),
                    f"Divergence GAV/LAV sur:\n{sql}\n"
                    f"GAV.row_count={gav['row_count']}, LAV.row_count={lav['row_count']}",
                )


class TestRBAC(unittest.TestCase):
    """Le RBAC doit bloquer les colonnes sensibles."""

    @classmethod
    def setUpClass(cls):
        ensure_sources()
        cls.engine = QueryEngine()

    def test_project_manager_cannot_see_salary(self):
        sql = "SELECT full_name, salary_usd FROM GlobalEmployee;"
        with self.assertRaises(PermissionError):
            self.engine.execute(sql, "GAV", _user("PROJECT_MANAGER"))

    def test_viewer_cannot_see_payroll_table(self):
        sql = "SELECT employee_id, salary_usd FROM GlobalPayroll;"
        with self.assertRaises(PermissionError):
            self.engine.execute(sql, "GAV", _user("EMPLOYEE_VIEWER"))

    def test_admin_can_see_everything(self):
        sql = "SELECT full_name, salary_usd FROM GlobalEmployee;"
        result = self.engine.execute(sql, "GAV", _user("ADMIN"))
        self.assertGreater(result["row_count"], 0)


class TestAuthentication(unittest.TestCase):
    """JWT + bcrypt + rétrocompatibilité legacy."""

    def test_valid_login_returns_jwt(self):
        r = login("admin", "admin123")
        self.assertIsNotNone(r)
        self.assertIn("token", r)
        self.assertEqual(r["role"], "ADMIN")
        # JWT a 3 segments séparés par des points
        self.assertEqual(r["token"].count("."), 2)

    def test_invalid_login_returns_none(self):
        self.assertIsNone(login("admin", "wrong"))
        self.assertIsNone(login("nonexistent", "anything"))

    def test_resolve_user_from_jwt(self):
        token = login("hr", "hr123")["token"]
        u = resolve_user(token)
        self.assertEqual(u["username"], "hr")
        self.assertEqual(u["role"], "HR_MANAGER")


class TestReconciliation(unittest.TestCase):
    """La réconciliation doit fusionner les doublons cross-source."""

    def test_same_employee_across_sources_merges(self):
        rows = [
            {"employee_id": "S1:1", "matricule": "EMP-001",
             "full_name": "Amine Bensaid", "email": "amine.bensaid@corp.dz",
             "source_confidence": 0.95, "_source": "S1"},
            {"employee_id": "S2:EMP-001", "matricule": "EMP-001",
             "full_name": "Amine Bensaid", "email": "amine.bensaid@corp.dz",
             "source_confidence": 0.80, "_source": "S2"},
            {"employee_id": "S4:L-001", "matricule": None,
             "full_name": "Amine Bensaid", "email": "amine.bensaid@corp.dz",
             "source_confidence": 0.60, "_source": "S4"},
            {"employee_id": "S1:2", "matricule": "EMP-002",
             "full_name": "Claire Martin", "email": "claire.martin@corp.fr",
             "source_confidence": 0.95, "_source": "S1"},
        ]
        merged, events = reconcile_employees(rows)
        # Amine doit être fusionné en 1 entité, Claire reste séparée
        self.assertEqual(len(merged), 2)
        # Il y a au moins 1 événement de fusion pour Amine
        self.assertGreaterEqual(len(events), 1)


class TestEntityResolutionModule(unittest.TestCase):
    """Tests du module standalone entity_resolution."""

    def test_soundex(self):
        from entity_resolution import soundex
        self.assertEqual(soundex("Bensaid"), "B523")
        self.assertEqual(soundex("Bensaïd"), "B523")  # accent insensitivity
        self.assertEqual(soundex("Martin"), "M635")
        self.assertEqual(soundex(""), "0000")

    def test_blocking_keys(self):
        from entity_resolution import blocking_keys
        r = {"email": "amine.bensaid@corp.dz", "full_name": "Amine Bensaid",
             "matricule": "EMP-001"}
        keys = blocking_keys(r)
        self.assertIn("E:amine", keys)
        self.assertIn("M:EMP-001", keys)
        self.assertTrue(any(k.startswith("N:") for k in keys))

    def test_fellegi_sunter_score(self):
        from entity_resolution import fs_pair_score
        a = {"email": "x@y.z", "matricule": "ID-1", "full_name": "John Doe"}
        b = {"email": "x@y.z", "matricule": "ID-1", "full_name": "John Doe"}
        c = {"email": "other@y.z", "matricule": "ID-9", "full_name": "Jane Smith"}
        s_match, _ = fs_pair_score(a, b)
        s_diff,  _ = fs_pair_score(a, c)
        self.assertGreater(s_match, 0)
        self.assertLess(s_diff, 0)

    def test_full_pipeline_reconcile(self):
        from entity_resolution import reconcile
        records = [
            {"employee_id": "A", "email": "x@y.z", "matricule": "EMP-1",
             "full_name": "John Doe", "_source": "S1", "source_confidence": 0.9},
            {"employee_id": "B", "email": "x@y.z", "matricule": "EMP-1",
             "full_name": "John Doe", "_source": "S2", "source_confidence": 0.7},
            {"employee_id": "C", "email": "z@y.z", "matricule": "EMP-2",
             "full_name": "Jane Roe", "_source": "S1", "source_confidence": 0.9},
        ]
        merged, events = reconcile(records)
        self.assertEqual(len(merged), 2)  # 2 entités après fusion
        self.assertEqual(len(events), 1)  # 1 fusion (A+B)


class TestMiniCon(unittest.TestCase):
    """Tests du module standalone mini_con."""

    def test_simple_rewrite_three_views_three_subgoals(self):
        from mini_con import minicon_rewrite, Query, View, Subgoal
        Q = Query(
            name="Q",
            head_vars=("eid", "name", "pname"),
            body=(
                Subgoal("GlobalEmployee", ("eid", "name", "ACTIVE")),
                Subgoal("GlobalAssignment", ("eid", "pid")),
                Subgoal("GlobalProject", ("pid", "pname", "ACTIVE")),
            ),
        )
        V_emp = View("V_emp", ("eid", "name", "status"),
                     (Subgoal("GlobalEmployee", ("eid", "name", "status")),))
        V_proj = View("V_proj", ("pid", "pname", "state"),
                      (Subgoal("GlobalProject", ("pid", "pname", "state")),))
        V_asg = View("V_asg", ("eid", "pid"),
                     (Subgoal("GlobalAssignment", ("eid", "pid")),))

        plan = minicon_rewrite(Q, [V_emp, V_proj, V_asg])
        self.assertEqual(len(plan["mcds"]), 3)
        self.assertEqual(len(plan["rewritings"]), 1)
        used_views = set(plan["rewritings"][0]["views"])
        self.assertEqual(used_views, {"V_emp", "V_proj", "V_asg"})


if __name__ == "__main__":
    unittest.main(verbosity=2)
