"""
DataMediator Pro — Module de réconciliation d'entités (Entity Resolution).

Implémente :
  1. Un blocking par préfixe d'email et soundex du nom pour réduire O(n²) → O(n·k).
  2. Un scoring Fellegi-Sunter probabiliste pour chaque paire candidate.
  3. La fermeture transitive des liens (clusters via union-find).
  4. La fusion priorisée par source_confidence avec détection des conflits.

Référence : Fellegi I., Sunter A. (1969), "A Theory for Record Linkage", JASA.
"""
from __future__ import annotations

import math
import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Any


# ────────────────────────────────────────────────────────────────────
# 1. Normalisation des valeurs (pré-traitement)
# ────────────────────────────────────────────────────────────────────

def _strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def normalize_text(s: str | None) -> str:
    if not s:
        return ""
    s = _strip_accents(s).lower().strip()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def normalize_email(s: str | None) -> str:
    return (s or "").strip().lower()


def soundex(name: str) -> str:
    """Soundex simplifié — code phonétique 4 caractères."""
    if not name:
        return "0000"
    name = _strip_accents(name).upper()
    name = re.sub(r"[^A-Z]", "", name)
    if not name:
        return "0000"
    first = name[0]
    mapping = {
        **dict.fromkeys("BFPV", "1"),
        **dict.fromkeys("CGJKQSXZ", "2"),
        **dict.fromkeys("DT", "3"),
        "L": "4",
        **dict.fromkeys("MN", "5"),
        "R": "6",
    }
    digits = []
    prev = mapping.get(first, "")
    for ch in name[1:]:
        code = mapping.get(ch, "")
        if code and code != prev:
            digits.append(code)
        prev = code
    code = (first + "".join(digits))[:4]
    return code.ljust(4, "0")


# ────────────────────────────────────────────────────────────────────
# 2. Blocking — réduction des comparaisons O(n²) → O(n·k)
# ────────────────────────────────────────────────────────────────────

def blocking_keys(record: dict[str, Any]) -> list[str]:
    """Calcule les clés de bloc d'un enregistrement.
    Deux records ne sont comparés que s'ils partagent au moins une clé.
    """
    keys: list[str] = []

    # 1. Préfixe d'email (5 premiers caractères avant le @)
    email = normalize_email(record.get("email"))
    if "@" in email:
        local = email.split("@", 1)[0]
        if local:
            keys.append(f"E:{local[:5]}")

    # 2. Soundex du dernier mot du nom complet
    name = normalize_text(record.get("full_name"))
    if name:
        last_token = name.split()[-1]
        keys.append(f"N:{soundex(last_token)}")

    # 3. Matricule exact (toujours discriminant)
    mat = (record.get("matricule") or "").strip()
    if mat:
        keys.append(f"M:{mat}")

    return keys or ["__NOKEY__"]


def build_blocks(records: list[dict[str, Any]]) -> dict[str, list[int]]:
    """Regroupe les indices d'enregistrements par clé de bloc."""
    blocks: dict[str, list[int]] = defaultdict(list)
    for idx, r in enumerate(records):
        for k in blocking_keys(r):
            blocks[k].append(idx)
    return blocks


# ────────────────────────────────────────────────────────────────────
# 3. Scoring Fellegi-Sunter (probabiliste)
# ────────────────────────────────────────────────────────────────────
#
# Pour chaque champ comparé f, on définit :
#   m_f = P(f match | les deux records désignent la même entité)
#   u_f = P(f match | les records désignent des entités différentes)
#
# Le poids d'un match observé est :   w⁺_f = log2(m_f / u_f)
# Le poids d'un non-match est :       w⁻_f = log2((1-m_f) / (1-u_f))
#
# Le score total est la somme des poids des champs. Seuils d'acceptation :
#   score > T_match  → fusion automatique
#   T_low < score < T_match → fusion possible (à valider humainement)
#   score < T_low    → enregistrements distincts

@dataclass(frozen=True)
class FieldConfig:
    name: str
    m_prob: float
    u_prob: float
    comparator: str  # "exact" | "similarity" | "domain"
    threshold: float = 0.85   # pour similarity uniquement

    @property
    def w_match(self) -> float:
        return math.log2(self.m_prob / self.u_prob)

    @property
    def w_nonmatch(self) -> float:
        return math.log2((1 - self.m_prob) / (1 - self.u_prob))


DEFAULT_FIELDS: list[FieldConfig] = [
    FieldConfig("email",           m_prob=0.95, u_prob=0.01, comparator="exact"),
    FieldConfig("matricule",       m_prob=0.90, u_prob=0.02, comparator="exact"),
    FieldConfig("full_name",       m_prob=0.85, u_prob=0.10, comparator="similarity", threshold=0.85),
    FieldConfig("national_id",     m_prob=0.99, u_prob=0.01, comparator="exact"),
    FieldConfig("department_name", m_prob=0.60, u_prob=0.20, comparator="exact"),
    FieldConfig("country",         m_prob=0.70, u_prob=0.33, comparator="domain"),
]


def _similar(a: str | None, b: str | None) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, normalize_text(a), normalize_text(b)).ratio()


def fs_pair_score(a: dict[str, Any], b: dict[str, Any],
                  fields: list[FieldConfig] | None = None) -> tuple[float, dict[str, str]]:
    """Calcule le score Fellegi-Sunter d'une paire et explique les contributions."""
    fields = fields or DEFAULT_FIELDS
    total = 0.0
    explain: dict[str, str] = {}
    for f in fields:
        va, vb = a.get(f.name), b.get(f.name)
        if va is None or vb is None or va == "" or vb == "":
            continue   # information manquante → on n'incrémente pas
        if f.comparator == "exact":
            matched = normalize_email(va) == normalize_email(vb) if f.name == "email" \
                      else str(va).strip().lower() == str(vb).strip().lower()
        elif f.comparator == "similarity":
            matched = _similar(va, vb) >= f.threshold
        elif f.comparator == "domain":
            matched = str(va).upper() == str(vb).upper()
        else:
            matched = False
        w = f.w_match if matched else f.w_nonmatch
        total += w
        explain[f.name] = f"{'match' if matched else 'nonmatch'} (w={w:+.2f})"
    return total, explain


# ────────────────────────────────────────────────────────────────────
# 4. Union-Find pour la fermeture transitive
# ────────────────────────────────────────────────────────────────────

class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, x: int, y: int) -> None:
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1

    def clusters(self) -> dict[int, list[int]]:
        groups: dict[int, list[int]] = defaultdict(list)
        for i in range(len(self.parent)):
            groups[self.find(i)].append(i)
        return groups


# ────────────────────────────────────────────────────────────────────
# 5. Fusion priorisée (conflict resolution)
# ────────────────────────────────────────────────────────────────────

@dataclass
class ReconciliationConfig:
    threshold_match: float = 4.0       # > T_match : auto-merge
    threshold_review: float = 1.5      # T_low < s ≤ T_match : possible (loggé)
    fields: list[FieldConfig] = field(default_factory=lambda: DEFAULT_FIELDS)


@dataclass
class ReconciliationEvent:
    canonical_id: str
    merged_from: list[str]
    score: float
    chosen_source: str
    reason: str
    conflicts: list[dict[str, Any]] = field(default_factory=list)
    explain: dict[str, str] = field(default_factory=dict)


def merge_group(group: list[dict[str, Any]], canonical_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Fusionne un cluster en priorisant les valeurs des sources les plus fiables.
    Détecte les conflits (deux valeurs non-nulles différentes pour le même champ).
    """
    group_sorted = sorted(group, key=lambda r: r.get("source_confidence") or 0, reverse=True)
    base = dict(group_sorted[0])
    base["employee_id"] = canonical_id
    base["_merged_from"] = [g["employee_id"] for g in group]
    base["_sources"] = sorted({g.get("_source", "?") for g in group})

    conflicts: list[dict[str, Any]] = []
    for g in group_sorted[1:]:
        for key, value in g.items():
            if key.startswith("_") or key == "employee_id":
                continue
            if value in (None, ""):
                continue
            existing = base.get(key)
            if existing in (None, ""):
                base[key] = value
            elif normalize_text(str(existing)) != normalize_text(str(value)):
                # conflit : valeurs non-nulles différentes
                conflicts.append({
                    "field": key,
                    "kept": existing,
                    "kept_source": group_sorted[0].get("_source"),
                    "other": value,
                    "other_source": g.get("_source"),
                })
    return base, conflicts


# ────────────────────────────────────────────────────────────────────
# 6. Pipeline complet
# ────────────────────────────────────────────────────────────────────

def reconcile(records: list[dict[str, Any]],
              config: ReconciliationConfig | None = None
              ) -> tuple[list[dict[str, Any]], list[ReconciliationEvent]]:
    """Pipeline complet : blocking → scoring FS → union-find → fusion.
    Retourne (records_fusionnés, événements_de_réconciliation).
    """
    config = config or ReconciliationConfig()
    n = len(records)
    if n == 0:
        return [], []

    # Étape 1 — blocking
    blocks = build_blocks(records)

    # Étape 2 — scoring + union-find
    uf = UnionFind(n)
    edges: list[tuple[int, int, float, dict[str, str]]] = []
    seen_pairs: set[tuple[int, int]] = set()

    for indices in blocks.values():
        for i in range(len(indices)):
            for j in range(i + 1, len(indices)):
                a, b = indices[i], indices[j]
                if (a, b) in seen_pairs:
                    continue
                seen_pairs.add((a, b))
                score, explain = fs_pair_score(records[a], records[b], config.fields)
                if score >= config.threshold_match:
                    uf.union(a, b)
                    edges.append((a, b, score, explain))

    # Étape 3 — extraction des clusters et fusion
    clusters = uf.clusters()
    merged: list[dict[str, Any]] = []
    events: list[ReconciliationEvent] = []

    for k, (_, idxs) in enumerate(sorted(clusters.items()), start=1):
        group = [records[i] for i in idxs]
        canonical = f"EMP:{k:04d}"
        fused, conflicts = merge_group(group, canonical)
        merged.append(fused)
        if len(group) > 1:
            # Trouver le meilleur score parmi les arêtes internes
            best_score = 0.0
            best_explain: dict[str, str] = {}
            for (a, b, s, e) in edges:
                if a in idxs and b in idxs and s > best_score:
                    best_score = s
                    best_explain = e
            events.append(ReconciliationEvent(
                canonical_id=canonical,
                merged_from=[r["employee_id"] for r in group],
                score=round(best_score, 2),
                chosen_source=sorted(group, key=lambda r: r.get("source_confidence") or 0, reverse=True)[0].get("_source", "?"),
                reason="Fellegi-Sunter score ≥ seuil de match (blocking + FS + union-find)",
                conflicts=conflicts,
                explain=best_explain,
            ))
    return merged, events


# ────────────────────────────────────────────────────────────────────
# 7. Métriques de qualité (precision/recall si gold standard fourni)
# ────────────────────────────────────────────────────────────────────

def evaluate(predicted_clusters: list[list[str]],
             gold_clusters: list[list[str]]) -> dict[str, float]:
    """Calcule precision/recall/F1 par paires (Pairwise F-measure)."""
    def pairs(clusters: list[list[str]]) -> set[tuple[str, str]]:
        result: set[tuple[str, str]] = set()
        for c in clusters:
            for i in range(len(c)):
                for j in range(i + 1, len(c)):
                    a, b = sorted((c[i], c[j]))
                    result.add((a, b))
        return result

    p_pairs = pairs(predicted_clusters)
    g_pairs = pairs(gold_clusters)
    tp = len(p_pairs & g_pairs)
    fp = len(p_pairs - g_pairs)
    fn = len(g_pairs - p_pairs)
    precision = tp / (tp + fp) if (tp + fp) else 1.0
    recall    = tp / (tp + fn) if (tp + fn) else 1.0
    f1        = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    return {"precision": precision, "recall": recall, "f1": f1, "tp": tp, "fp": fp, "fn": fn}
