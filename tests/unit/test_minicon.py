import unittest
from mini_con import Query, View, Subgoal, build_mcds, combine_mcds

class TestMiniConLogic(unittest.TestCase):
    def setUp(self):
        # Configuration d'une requête simple : Trouver les noms des employés
        self.q = Query(
            name="Q",
            head_vars=("name",),
            body=(Subgoal("GlobalEmployee", ("eid", "name", "status")),)
        )
        
        # Vue qui fournit exactement ce qu'il faut
        self.v1 = View(
            name="V1",
            head_vars=("eid", "name", "status"),
            body=(Subgoal("GlobalEmployee", ("eid", "name", "status")),)
        )

    def test_mcd_generation(self):
        """Teste si MiniCon génère bien un MCD pour une vue compatible."""
        mcds = build_mcds(self.q, [self.v1])
        self.assertEqual(len(mcds), 1)
        self.assertEqual(mcds[0].view.name, "V1")
        self.assertIn(0, mcds[0].covered_subgoals)

    def test_rewriting_combination(self):
        """Teste si les MCDs sont combinés en un rewriting complet."""
        mcds = build_mcds(self.q, [self.v1])
        rewritings = combine_mcds(self.q, mcds)
        self.assertEqual(len(rewritings), 1)
        self.assertEqual(rewritings[0].mcds[0].view.name, "V1")

    def test_incompatible_view(self):
        """Teste qu'une vue sur un autre prédicat ne génère pas de MCD."""
        v_bad = View(
            name="V_Bad",
            head_vars=("pid", "pname"),
            body=(Subgoal("GlobalProject", ("pid", "pname", "state")),)
        )
        mcds = build_mcds(self.q, [v_bad])
        self.assertEqual(len(mcds), 0)

if __name__ == "__main__":
    unittest.main()
