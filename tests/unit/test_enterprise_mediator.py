import unittest

from enterprise_mediator import QueryEngine, add_demo_employee, login, resolve_user, seed_enterprise_sources


class EnterpriseMediatorTests(unittest.TestCase):
    def setUp(self):
        seed_enterprise_sources()
        self.engine = QueryEngine()
        self.admin = resolve_user(None)

    def test_simple_global_query(self):
        result = self.engine.execute(
            "SELECT full_name, email, department_name, country FROM GlobalEmployee WHERE status = 'ACTIVE';",
            "GAV",
            self.admin,
        )
        self.assertGreaterEqual(result["row_count"], 5)
        self.assertEqual(result["plan"]["strategy"], "GAV")
        self.assertIn("full_name", result["columns"])

    def test_complex_join_query(self):
        result = self.engine.execute(
            "SELECT e.full_name, p.project_name, a.role, a.allocation_rate "
            "FROM GlobalEmployee e "
            "JOIN GlobalAssignment a ON e.employee_id = a.employee_id "
            "JOIN GlobalProject p ON a.project_id = p.project_id "
            "WHERE p.status = 'ACTIVE';",
            "GAV",
            self.admin,
        )
        self.assertEqual(result["row_count"], 4)
        self.assertIn("project_name", result["columns"])

    def test_lav_bucket_plan(self):
        result = self.engine.execute(
            "SELECT e.full_name, p.project_name, a.role "
            "FROM GlobalEmployee e "
            "JOIN GlobalAssignment a ON e.employee_id = a.employee_id "
            "JOIN GlobalProject p ON a.project_id = p.project_id "
            "WHERE p.status = 'ACTIVE';",
            "LAV",
            self.admin,
        )
        self.assertIn(result["plan"]["strategy"], ["LAV_BUCKET", "LAV_MINICON"])
        self.assertTrue(result["plan"]["chosen_views"])
        self.assertIn("Phase 1", result["plan"]["trace"][0])

    def test_rbac_blocks_project_manager_from_payroll(self):
        token = login("project", "project123")["token"]
        project_user = resolve_user(token)
        with self.assertRaises(PermissionError):
            self.engine.execute(
                "SELECT e.full_name, pay.salary_usd "
                "FROM GlobalEmployee e "
                "JOIN GlobalPayroll pay ON e.employee_id = pay.employee_id;",
                "GAV",
                project_user,
            )

    def test_reconciliation_merges_sources(self):
        result = self.engine.execute(
            "SELECT full_name, email, department_name FROM GlobalEmployee WHERE status = 'ACTIVE';",
            "GAV",
            self.admin,
        )
        self.assertTrue(result["reconciliation"])
        merged = [event for event in result["reconciliation"] if "S1:1" in event["merged_from"]]
        self.assertTrue(merged)

    def test_source_insert_is_visible_in_global_query(self):
        res = add_demo_employee()
        name = "Test Integration"
        result = self.engine.execute(
            f"SELECT full_name, email, department_name FROM GlobalEmployee WHERE department_name = 'AI Lab';",
            "GAV",
            self.admin,
        )
        found = any(row.get("full_name") == name for row in result["rows"])
        if not found:
            print(f"\nDEBUG: Added {res}")
            print(f"DEBUG: Result rows: {result['rows']}")
        self.assertTrue(found, f"Employee '{name}' not found in results for AI Lab")


if __name__ == "__main__":
    unittest.main()
