"""
DataMediator — Implémentation pédagogique de MiniCon.

Référence : Pottinger R., Halevy A. (2001). "MiniCon: A Scalable Algorithm for
Answering Queries Using Views". VLDB Journal 10(2-3).

Idée centrale
-------------
Bucket génère naïvement toutes les combinaisons "une vue par sous-but" puis
filtre. MiniCon génère des **MCD** (MiniCon Descriptions) qui couvrent **un
ensemble maximum** de sous-buts en une seule "frappe" en vérifiant déjà les
contraintes de jointure. La phase 2 cherche une **partition** des sous-buts par
les MCDs : beaucoup moins d'options à énumérer.

Vocabulaire
-----------
Une requête Q est représentée comme :
    Q(head_vars) :- g_1, g_2, ..., g_n
où chaque g_i est un sous-but :
    Subgoal(predicate, args)   # args est un tuple de variables/constantes

Une vue V est représentée comme :
    V(head_vars) :- v_1, ..., v_m
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# ────────────────────────────────────────────────────────────────────
# Structures
# ────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Subgoal:
    predicate: str
    args: tuple[str, ...]

    def __str__(self) -> str:
        return f"{self.predicate}({', '.join(self.args)})"


@dataclass(frozen=True)
class Query:
    name: str
    head_vars: tuple[str, ...]
    body: tuple[Subgoal, ...]

    def __str__(self) -> str:
        return f"{self.name}({', '.join(self.head_vars)}) :- " + ", ".join(str(b) for b in self.body)


@dataclass(frozen=True)
class View:
    name: str
    head_vars: tuple[str, ...]
    body: tuple[Subgoal, ...]
    # Contraintes : couples (variable_globale, valeur_constante) que la vue impose
    constraints: tuple[tuple[str, str], ...] = field(default_factory=tuple)

    def __str__(self) -> str:
        return f"{self.name}({', '.join(self.head_vars)}) :- " + ", ".join(str(b) for b in self.body)


@dataclass
class MCD:
    """MiniCon Description.

    - h: homomorphisme partiel `var(Q) -> var(V)`
    - view: la vue utilisée
    - covered_subgoals: les indices (dans Q.body) couverts par cet MCD
    """
    h: dict[str, str]
    view: View
    covered_subgoals: frozenset[int]

    def __str__(self) -> str:
        idx = sorted(self.covered_subgoals)
        return f"MCD(view={self.view.name}, covers={idx}, h={self.h})"


# ────────────────────────────────────────────────────────────────────
# Utilitaires
# ────────────────────────────────────────────────────────────────────

def is_variable(token: str) -> bool:
    """Heuristique : variables commencent par une minuscule ; constantes par
    chiffre, guillemet, ou majuscule + chiffres (codes)."""
    if not token:
        return False
    if token.startswith("'") and token.endswith("'"):
        return False
    if token[0].isdigit():
        return False
    return token[0].islower()


def unify_args(q_args: tuple[str, ...], v_args: tuple[str, ...]) -> dict[str, str] | None:
    """Tente d'unifier deux listes d'arguments en construisant un homomorphisme
    de variables Q → V. Retourne None si conflit."""
    if len(q_args) != len(v_args):
        return None
    h: dict[str, str] = {}
    for qa, va in zip(q_args, v_args):
        if not is_variable(qa):
            # constante côté requête : doit matcher la même constante côté vue,
            # ou être unifiable avec une variable côté vue (la constante reste)
            if not is_variable(va) and qa != va:
                return None
        else:
            if qa in h and h[qa] != va:
                return None
            h[qa] = va
    return h


# ────────────────────────────────────────────────────────────────────
# Phase 1 — construction des MCDs
# ────────────────────────────────────────────────────────────────────

def build_mcds(query: Query, views: list[View]) -> list[MCD]:
    """Construit l'ensemble des MCDs valides pour la requête.

    Pour chaque sous-but de Q et chaque sous-but de chaque vue partageant le
    même prédicat, on tente une unification. Si elle réussit, on **étend** le
    MCD aux autres sous-buts de Q que la même vue peut couvrir, sous la
    contrainte que :
      - les variables distinguées de Q dans le MCD ont une image distinguée dans V,
      - les variables existentielles de Q n'apparaissent pas hors du MCD.
    """
    mcds: list[MCD] = []
    q_distinguished = set(query.head_vars)

    for view in views:
        v_distinguished = set(view.head_vars)
        # Pour chaque sous-but de Q, on cherche un sous-but de V de même prédicat
        for qi, q_sg in enumerate(query.body):
            for v_sg in view.body:
                if q_sg.predicate != v_sg.predicate:
                    continue
                h = unify_args(q_sg.args, v_sg.args)
                if h is None:
                    continue

                # Vérification 1 : distinguées de Q → distinguées dans V
                ok = True
                for qv, vv in h.items():
                    if qv in q_distinguished and vv not in v_distinguished:
                        ok = False
                        break
                if not ok:
                    continue

                # Étape d'extension : on essaie d'agréger d'autres sous-buts couverts
                covered = {qi}
                for qj, q_sg2 in enumerate(query.body):
                    if qj == qi:
                        continue
                    for v_sg2 in view.body:
                        if q_sg2.predicate != v_sg2.predicate:
                            continue
                        h2 = unify_args(q_sg2.args, v_sg2.args)
                        if h2 is None:
                            continue
                        # h2 doit être compatible avec h
                        compat = True
                        merged = dict(h)
                        for k, v in h2.items():
                            if k in merged and merged[k] != v:
                                compat = False
                                break
                            merged[k] = v
                        if not compat:
                            continue
                        # vérifier les variables existentielles de Q
                        ok2 = True
                        for qv, vv in h2.items():
                            if qv in q_distinguished and vv not in v_distinguished:
                                ok2 = False
                                break
                        if not ok2:
                            continue
                        covered.add(qj)
                        h = merged

                # Vérification 2 (Property 1 de Pottinger-Halevy) :
                # toute variable existentielle de Q qui apparaît à la fois dans
                # un sous-but couvert ET dans un sous-but non couvert doit être
                # mappée vers une variable DISTINGUEE de V (sinon la jointure
                # ne peut pas être faite par le médiateur).
                covered_vars: set[str] = set()
                for qi_c in covered:
                    for a in query.body[qi_c].args:
                        if is_variable(a):
                            covered_vars.add(a)
                non_covered_vars: set[str] = set()
                for qj_n in range(len(query.body)):
                    if qj_n in covered:
                        continue
                    for a in query.body[qj_n].args:
                        if is_variable(a):
                            non_covered_vars.add(a)
                shared = (covered_vars & non_covered_vars) - q_distinguished
                property1_ok = True
                for var in shared:
                    if h.get(var) not in v_distinguished:
                        property1_ok = False
                        break
                if not property1_ok:
                    continue

                mcd = MCD(h=h, view=view, covered_subgoals=frozenset(covered))
                # éviter les doublons (MCD identiques)
                if not any(m.view.name == mcd.view.name and m.covered_subgoals == mcd.covered_subgoals
                           and m.h == mcd.h for m in mcds):
                    mcds.append(mcd)

    return mcds


# ────────────────────────────────────────────────────────────────────
# Phase 2 — combinaison des MCDs en partitions
# ────────────────────────────────────────────────────────────────────

@dataclass
class Rewriting:
    mcds: list[MCD]

    def __str__(self) -> str:
        return " ⋈ ".join(f"{m.view.name}[covers {sorted(m.covered_subgoals)}]" for m in self.mcds)


def combine_mcds(query: Query, mcds: list[MCD]) -> list[Rewriting]:
    """Cherche les partitions de {0..n-1} en MCDs.
    Énumération en profondeur : pour chaque combinaison, l'union des
    covered_subgoals doit couvrir tous les sous-buts de Q, sans recouvrement."""
    n = len(query.body)
    target = frozenset(range(n))
    results: list[Rewriting] = []

    def recurse(remaining: frozenset[int], chosen: list[MCD], start: int):
        if not remaining:
            results.append(Rewriting(mcds=list(chosen)))
            return
        for i in range(start, len(mcds)):
            m = mcds[i]
            if m.covered_subgoals.issubset(remaining):
                recurse(remaining - m.covered_subgoals, chosen + [m], i + 1)

    recurse(target, [], 0)
    return results


# ────────────────────────────────────────────────────────────────────
# Pipeline public
# ────────────────────────────────────────────────────────────────────

def minicon_rewrite(query: Query, views: list[View]) -> dict[str, Any]:
    """Pipeline MiniCon complet : MCDs puis rewritings.
    Retourne un dictionnaire structuré (utilisable par main.py / frontend)."""
    mcds = build_mcds(query, views)
    rewritings = combine_mcds(query, mcds)

    return {
        "strategy": "LAV_MINICON",
        "mcds": [
            {
                "view": m.view.name,
                "covers_subgoals": sorted(m.covered_subgoals),
                "homomorphism": m.h,
            }
            for m in mcds
        ],
        "rewritings": [
            {
                "views": [m.view.name for m in rw.mcds],
                "covers": [sorted(m.covered_subgoals) for m in rw.mcds],
            }
            for rw in rewritings
        ],
        "trace": [
            f"Phase 1: {len(mcds)} MCDs construits (Property 1 vérifiée).",
            f"Phase 2: {len(rewritings)} rewriting(s) complets trouvés.",
        ],
    }


# ────────────────────────────────────────────────────────────────────
# Exemple pédagogique (utilisable depuis tests/CLI)
# ────────────────────────────────────────────────────────────────────

def demo() -> dict[str, Any]:
    """Petit exemple : trouver les employés ACTIVE avec leur projet."""
    Q = Query(
        name="Q",
        head_vars=("eid", "name", "pname"),
        body=(
            Subgoal("GlobalEmployee", ("eid", "name", "ACTIVE")),
            Subgoal("GlobalAssignment", ("eid", "pid")),
            Subgoal("GlobalProject", ("pid", "pname", "ACTIVE")),
        ),
    )

    V_emp = View(
        name="V_emp",
        head_vars=("eid", "name", "status"),
        body=(Subgoal("GlobalEmployee", ("eid", "name", "status")),),
    )
    V_proj = View(
        name="V_proj",
        head_vars=("pid", "pname", "state"),
        body=(Subgoal("GlobalProject", ("pid", "pname", "state")),),
    )
    V_asg = View(
        name="V_asg",
        head_vars=("eid", "pid"),
        body=(Subgoal("GlobalAssignment", ("eid", "pid")),),
    )

    return minicon_rewrite(Q, [V_emp, V_proj, V_asg])


if __name__ == "__main__":
    import json
    print(json.dumps(demo(), indent=2))
