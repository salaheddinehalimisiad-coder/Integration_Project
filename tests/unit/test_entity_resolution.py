import unittest
from entity_resolution import normalize_text, soundex, blocking_keys, fs_pair_score, reconcile

class TestEntityResolution(unittest.TestCase):
    def test_normalization(self):
        self.assertEqual(normalize_text("  Sâlah  Hâlimi! "), "salah halimi")
        self.assertEqual(normalize_text(None), "")

    def test_soundex(self):
        self.assertEqual(soundex("Bensaid"), "B523")
        self.assertEqual(soundex("Mekki"), "M200")

    def test_blocking_keys(self):
        record = {"email": "salah@corp.dz", "full_name": "Salah Halimi", "matricule": "EMP-001"}
        keys = blocking_keys(record)
        self.assertIn("E:salah", keys)
        self.assertIn("M:EMP-001", keys)

    def test_reconcile_duplicates(self):
        """Teste si deux records presque identiques sont fusionnés."""
        records = [
            {"employee_id": "S1:1", "full_name": "Amine Bensaid", "email": "amine@corp.dz", "matricule": "MAT-001", "source_confidence": 0.9, "_source": "S1"},
            {"employee_id": "S2:A", "full_name": "Bensaid Amine", "email": "amine@corp.dz", "matricule": "MAT-001", "source_confidence": 0.8, "_source": "S2"},
        ]
        merged, events = reconcile(records)
        self.assertEqual(len(merged), 1)
        self.assertEqual(len(events), 1)
        self.assertIn("S1:1", merged[0]["_merged_from"])
        self.assertIn("S2:A", merged[0]["_merged_from"])

if __name__ == "__main__":
    unittest.main()
