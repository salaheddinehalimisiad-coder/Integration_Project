"""
DataMediator Pro — Parseur SQL robuste basé sur sqlglot.

Remplace l'ancien parser regex de QueryEngine par un AST sqlglot, ce qui ouvre
la voie au support de :
  - sous-requêtes (WHERE x IN (SELECT ...))
  - OR / AND complexes
  - LIKE, IN, BETWEEN, IS NULL
  - agrégations multiples (SUM, AVG, MIN, MAX, COUNT)
  - alias et qualifications
  - ORDER BY multi-colonnes

L'API publique reproduit ParsedQuery pour rester compatible avec QueryEngine.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

try:
    import sqlglot
    from sqlglot import exp
    _HAS_SQLGLOT = True
except ImportError:  # pragma: no cover
    _HAS_SQLGLOT = False


@dataclass
class SelectItem:
    expr: str                  # texte SQL de l'item
    alias: str | None = None   # alias éventuel
    is_count: bool = False     # COUNT(*) ?
    is_aggregate: bool = False # SUM/AVG/MIN/MAX/COUNT ?
    agg_func: str | None = None
    table_alias: str | None = None  # ex. 'e' dans 'e.full_name'
    column: str | None = None       # ex. 'full_name'

    @property
    def display_name(self) -> str:
        if self.alias:
            return self.alias
        if self.column:
            return self.column
        return self.expr


@dataclass
class WhereClause:
    raw: str
    conditions: list[dict[str, Any]] = field(default_factory=list)
    has_or: bool = False


@dataclass
class RobustParsedQuery:
    sql: str
    select_items: list[SelectItem]
    tables: list[str]
    aliases: dict[str, str]       # alias -> table
    joins: list[tuple[str, str, str, str]]  # (table, alias, left_ref, right_ref)
    where: WhereClause | None
    group_by: list[str]
    order_by: list[tuple[str, str]]  # [(col, ASC/DESC)]
    limit: int | None
    has_subquery: bool = False
    warnings: list[str] = field(default_factory=list)


# ────────────────────────────────────────────────────────────────────
# Pipeline
# ────────────────────────────────────────────────────────────────────

def parse_sql(sql: str) -> RobustParsedQuery:
    """Parse une requête SQL et retourne une RobustParsedQuery.
    Lève ValueError si le SQL est invalide ou non supporté.
    """
    if not _HAS_SQLGLOT:
        raise RuntimeError("sqlglot n'est pas installé — `pip install sqlglot`")

    clean = sql.strip().rstrip(";")
    if not clean:
        raise ValueError("Requête SQL vide.")

    try:
        tree = sqlglot.parse_one(clean, read="postgres")
    except sqlglot.errors.ParseError as e:
        raise ValueError(f"Erreur de syntaxe SQL : {e}")

    if not isinstance(tree, exp.Select):
        raise ValueError("Seules les requêtes SELECT sont autorisées.")

    warnings: list[str] = []
    has_subquery = bool(tree.find(exp.Subquery))

    # --- SELECT items ----------------------------------------------------
    select_items: list[SelectItem] = []
    for projection in tree.expressions:
        item = _build_select_item(projection)
        select_items.append(item)

    # --- FROM + JOINs ----------------------------------------------------
    tables: list[str] = []
    aliases: dict[str, str] = {}
    joins: list[tuple[str, str, str, str]] = []

    # In sqlglot the FROM clause is stored under either "from" or "from_"
    from_clause = tree.args.get("from") or tree.args.get("from_")
    if from_clause is not None:
        first_table = getattr(from_clause, "this", None) or (
            from_clause.expressions[0] if getattr(from_clause, "expressions", None) else None
        )
        if first_table is not None:
            tname, talias = _table_alias(first_table)
            tables.append(tname)
            aliases[talias] = tname

    for j in tree.args.get("joins", []) or []:
        tname, talias = _table_alias(j.this)
        tables.append(tname)
        aliases[talias] = tname
        on = j.args.get("on")
        if isinstance(on, exp.EQ):
            left = _ref_to_str(on.this)
            right = _ref_to_str(on.expression)
            joins.append((tname, talias, left, right))
        else:
            warnings.append(f"Condition JOIN non-equi ignorée : {on}")

    # --- WHERE ----------------------------------------------------------
    where_node = tree.args.get("where")
    where: WhereClause | None = None
    if where_node is not None:
        where = _build_where(where_node.this)

    # --- GROUP BY -------------------------------------------------------
    group_by: list[str] = []
    grp = tree.args.get("group")
    if grp:
        for col in grp.expressions:
            group_by.append(_ref_to_str(col))

    # --- ORDER BY -------------------------------------------------------
    order_by: list[tuple[str, str]] = []
    order = tree.args.get("order")
    if order:
        for ord_expr in order.expressions:
            col = _ref_to_str(ord_expr.this)
            direction = "DESC" if ord_expr.args.get("desc") else "ASC"
            order_by.append((col, direction))

    # --- LIMIT ----------------------------------------------------------
    limit: int | None = None
    lim = tree.args.get("limit")
    if lim:
        try:
            limit = int(lim.expression.this)
        except Exception:
            warnings.append("LIMIT non numérique ignoré.")

    return RobustParsedQuery(
        sql=clean,
        select_items=select_items,
        tables=tables,
        aliases=aliases,
        joins=joins,
        where=where,
        group_by=group_by,
        order_by=order_by,
        limit=limit,
        has_subquery=has_subquery,
        warnings=warnings,
    )


# ────────────────────────────────────────────────────────────────────
# Évaluation du WHERE sur un row (Python)
# ────────────────────────────────────────────────────────────────────

def evaluate_where(row: dict[str, Any], where: WhereClause | None) -> bool:
    """Évalue une clause WHERE (AND / OR + opérateurs courants) sur une ligne."""
    if where is None or not where.conditions:
        return True
    return _eval_node(row, where.conditions[0])


def _eval_node(row: dict[str, Any], node: dict[str, Any]) -> bool:
    kind = node.get("kind")
    if kind == "and":
        return all(_eval_node(row, c) for c in node["children"])
    if kind == "or":
        return any(_eval_node(row, c) for c in node["children"])
    if kind == "not":
        return not _eval_node(row, node["child"])
    if kind == "binop":
        col, op, value = node["col"], node["op"], node["value"]
        actual = row.get(col, row.get(col.split(".")[-1]))
        try:
            actual_n = float(actual)
            value_n = float(value)
            actual, value = actual_n, value_n
        except (TypeError, ValueError):
            actual = "" if actual is None else str(actual)
            value = "" if value is None else str(value)
        if op == "=":  return actual == value
        if op == "!=": return actual != value
        if op == ">":  return actual > value
        if op == "<":  return actual < value
        if op == ">=": return actual >= value
        if op == "<=": return actual <= value
        if op == "like":
            pattern = str(value).lower().replace("%", ".*").replace("_", ".")
            import re as _re
            return bool(_re.fullmatch(pattern, str(actual).lower()))
        return False
    if kind == "in":
        actual = row.get(node["col"], row.get(node["col"].split(".")[-1]))
        return str(actual) in [str(v) for v in node["values"]]
    if kind == "between":
        actual = row.get(node["col"], row.get(node["col"].split(".")[-1]))
        try:
            return float(node["low"]) <= float(actual) <= float(node["high"])
        except (TypeError, ValueError):
            return False
    if kind == "isnull":
        actual = row.get(node["col"], row.get(node["col"].split(".")[-1]))
        return (actual is None) == node["expected"]
    return True


# ────────────────────────────────────────────────────────────────────
# Helpers privés
# ────────────────────────────────────────────────────────────────────

def _table_alias(node) -> tuple[str, str]:
    """Extrait (nom_de_table, alias) d'un nœud exp.Table."""
    if isinstance(node, exp.Table):
        name = node.name
        alias = node.alias or name
        return name, alias
    # Fallback : essayer .this
    return str(node), str(node)


def _ref_to_str(node) -> str:
    """Sérialise une référence de colonne ('e.full_name' ou 'full_name')."""
    if node is None:
        return ""
    if isinstance(node, exp.Column):
        if node.table:
            return f"{node.table}.{node.name}"
        return node.name
    return node.sql()


def _build_select_item(projection) -> SelectItem:
    alias = None
    expr = projection
    if isinstance(projection, exp.Alias):
        alias = projection.alias
        expr = projection.this

    if isinstance(expr, exp.Count):
        return SelectItem(expr="COUNT(*)" if expr.this == exp.Star() or str(expr.this) == "*" else expr.sql(),
                          alias=alias, is_count=True, is_aggregate=True, agg_func="COUNT")
    if isinstance(expr, (exp.Sum, exp.Avg, exp.Min, exp.Max)):
        fname = expr.__class__.__name__.upper()
        return SelectItem(expr=expr.sql(), alias=alias, is_aggregate=True, agg_func=fname)
    if isinstance(expr, exp.Column):
        return SelectItem(
            expr=expr.sql(), alias=alias,
            table_alias=expr.table or None,
            column=expr.name,
        )
    if isinstance(expr, exp.Star):
        return SelectItem(expr="*", alias=alias)
    return SelectItem(expr=expr.sql(), alias=alias)


def _build_where(node) -> WhereClause:
    raw = node.sql()
    conditions = [_walk_where(node)]
    has_or = isinstance(node, exp.Or) or bool(node.find(exp.Or))
    return WhereClause(raw=raw, conditions=conditions, has_or=has_or)


def _walk_where(node) -> dict[str, Any]:
    if isinstance(node, exp.And):
        return {"kind": "and", "children": [_walk_where(node.this), _walk_where(node.expression)]}
    if isinstance(node, exp.Or):
        return {"kind": "or",  "children": [_walk_where(node.this), _walk_where(node.expression)]}
    if isinstance(node, exp.Not):
        return {"kind": "not", "child": _walk_where(node.this)}
    if isinstance(node, exp.In):
        col = _ref_to_str(node.this)
        values = [_literal(v) for v in node.expressions]
        return {"kind": "in", "col": col, "values": values}
    if isinstance(node, exp.Between):
        col = _ref_to_str(node.this)
        return {"kind": "between", "col": col,
                "low": _literal(node.args["low"]),
                "high": _literal(node.args["high"])}
    if isinstance(node, exp.Is):
        col = _ref_to_str(node.this)
        expected = isinstance(node.expression, exp.Null)
        return {"kind": "isnull", "col": col, "expected": expected}
    if isinstance(node, exp.Like):
        col = _ref_to_str(node.this)
        return {"kind": "binop", "col": col, "op": "like", "value": _literal(node.expression)}
    # Binop standard
    op_map = {
        exp.EQ: "=", exp.NEQ: "!=",
        exp.GT: ">", exp.LT: "<",
        exp.GTE: ">=", exp.LTE: "<=",
    }
    for klass, sym in op_map.items():
        if isinstance(node, klass):
            return {"kind": "binop", "col": _ref_to_str(node.this), "op": sym,
                    "value": _literal(node.expression)}
    # Fallback : juste un nœud booléen brut
    return {"kind": "binop", "col": _ref_to_str(node), "op": "=", "value": True}


def _literal(node) -> Any:
    if node is None:
        return None
    if isinstance(node, exp.Literal):
        if node.is_string:
            return str(node.this)
        try:
            return float(node.this)
        except ValueError:
            return node.this
    if isinstance(node, exp.Null):
        return None
    if isinstance(node, exp.Boolean):
        return bool(node.this)
    if isinstance(node, exp.Column):
        return node.name
    return node.sql().strip("'\"")
