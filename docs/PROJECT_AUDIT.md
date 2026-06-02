# DataMediator — Audit Académique et Plan de Révision

> **Niveau visé** : projet de fin d'études Master / Ingénieur en Bases de Données et Intégration de Données.
> **Date** : mai 2026
> **Périmètre** : architecture, formalisme GAV/LAV, médiateur, sources hétérogènes, RBAC, frontend.

---

## 1. Synthèse exécutive

Le projet **DataMediator Pro** est un médiateur virtuel de données hétérogènes RH / Projets / Finance. Il met en œuvre les approches **GAV** (Global As View) et **LAV** (Local As View) sur six sources hétérogènes (PostgreSQL, MySQL, MongoDB, CSV, XML, graphe JSON), avec réconciliation d'entités et contrôle d'accès par rôles.

| Dimension | Note | Commentaire |
|---|---|---|
| Périmètre fonctionnel | 8/10 | Toutes les briques d'un médiateur sont présentes. |
| Formalisme GAV/LAV | 5/10 | Implémenté mais pas formalisé académiquement (Datalog, contraintes d'inclusion). |
| Algorithmie LAV | 5/10 | Bucket Algorithm partiel, MiniCon absent. |
| Hétérogénéité des sources | 8/10 | 6 modèles couverts. MongoDB et Neo4j simulés (à expliciter). |
| Réconciliation | 6/10 | Greedy + similarité ; pas de blocking ni Fellegi-Sunter. |
| Sécurité / RBAC | 6/10 | Politiques bien définies ; auth fragile (SHA-256, pas de JWT, mots de passe en clair). |
| Frontend | 4/10 | Design incohérent, bugs critiques dans `Enterprise.jsx`, design system absent. |
| Tests & documentation | 6/10 | Tests présents mais incomplets ; documentation très orientée démo. |

**Verdict** : le projet est techniquement riche, mais ne fait pas suffisamment ressortir le **fondement théorique** attendu d'un Master. La refonte UI et le présent rapport visent à transformer la démo en livrable académique solide.

---

## 2. Points forts du projet

1. **Couverture des six modèles de données** : relationnel (PostgreSQL, MySQL), document (MongoDB simulé), fichier plat (CSV), semi-structuré (XML), graphe (JSON).
2. **Deux stratégies de réécriture** implémentées (GAV par dépliement, LAV par buckets) avec mode commutable.
3. **Réconciliation d'entités multi-clés** (email, matricule, similarité de nom) avec traçabilité (`_merged_from`, événements).
4. **RBAC déclaratif** avec cinq rôles, colonnes sensibles bloquées et tables filtrées avant exécution.
5. **Schéma global virtuel** clairement défini (cinq relations : `GlobalEmployee`, `GlobalDepartment`, `GlobalProject`, `GlobalAssignment`, `GlobalPayroll`).
6. **Architecture FastAPI moderne** : lifespan, CORS, logging structuré, monitoring (`monitoring.py`), cache (`cache_manager.py`), reporting (`reporting_engine.py`), GraphQL (`graphql_server.py`).
7. **Conformité Docker** prête (PostgreSQL, MySQL, MongoDB réels en mode `USE_DOCKER`).
8. **Démonstration immédiate** : ajout en source visible sans rechargement, prouvant la médiation virtuelle.

---

## 3. Manques académiques et critiques

### 3.1 Formalisme GAV/LAV insuffisant

Le code définit les règles GAV par chaînes SQL et les vues LAV par dictionnaires Python. **Ce n'est pas suffisant pour un Master** : un jury attend la formalisation logique.

**Manque** : règles écrites en Datalog ou en logique du premier ordre.

**Recommandation** — ajouter dans `docs/formalisme.md` :

```
% GAV — la relation globale est une vue (Datalog) sur les sources
GlobalEmployee(eid, name, email, dept, country, salary, status) :-
   S1_employees(eid, fn, ln, email, bd, sal_eur, did, status),
   S1_departments(did, code, dept, country),
   name = concat(fn, ln),
   salary = sal_eur * 1.08.

GlobalEmployee(eid, name, email, dept, _, _, status) :-
   S2_consultants(eid, name, email, bu, active),
   dept = normalize(bu),
   status = if(active=1, 'ACTIVE', 'INACTIVE').

% LAV — chaque source est une vue (CQ) sur le schéma global
S1_HR_EMPLOYEE_VIEW(eid, mat, name, email, bd, did, dept, country, salary, status) :-
   GlobalEmployee(eid, mat, name, email, bd, did, dept, country, salary, status),
   country IN {DZ, FR, TN},
   status IN {ACTIVE, INACTIVE}.
```

Cette formalisation est ce qui distingue un travail d'ingénieur (« je code une démo ») d'un travail de Master (« je modélise théoriquement le médiateur »).

### 3.2 Algorithme LAV-Bucket partiel

`_lav_plan()` construit bien les buckets (phase 1), mais **la phase 2 est purement déclarative** : le code retourne tous les buckets sans :

- vérifier la **conjonction** des contraintes inter-buckets ;
- éliminer les **rewritings redondants** ;
- considérer les **dépendances d'inclusion** entre vues ;
- traiter la **subsomption** des sous-buts.

**Recommandation** :

1. **Implémenter MiniCon** (Pottinger & Halevy, 2001) ou au minimum simuler la combinaison des MCDs (MiniCon Descriptions) sur deux exemples. MiniCon réduit drastiquement l'espace de recherche par rapport à Bucket.
2. **Ajouter un test** qui démontre qu'une vue est **rejetée parce qu'aucune autre vue ne couvre les attributs manquants**, pas juste parce qu'elle est insuffisante seule.
3. **Ajouter un cas GLAV** (Friedman, Levy, Millstein 1999) — vues qui sont à la fois LAV et GAV. C'est l'approche utilisée en pratique (BizQuery, Information Manifold).

### 3.3 SQL Parser primitif

Le parser dans `QueryEngine.parse()` est basé sur des **regex**. Il casse sur :

- les sous-requêtes (`WHERE x IN (SELECT ...)`),
- les agrégations multiples (`SUM`, `AVG`, `MAX`, `MIN`),
- les expressions dans `SELECT` (`CASE WHEN`, `COALESCE`),
- les `OR` (seuls les `AND` sont gérés),
- les opérateurs `LIKE`, `IN`, `BETWEEN`, `IS NULL`.

**Recommandation** : utiliser `sqlglot` (déjà courant en production) pour un AST robuste. Trois lignes suffisent à remplacer 100 lignes de regex :

```python
import sqlglot
tree = sqlglot.parse_one(sql, read="postgres")
# parcours AST -> ParsedQuery
```

Au minimum, **documenter explicitement** la grammaire supportée dans `docs/limites_sql_et_demo.md` (déjà partiel) et **ajouter des tests de robustesse** sur les cas rejetés.

### 3.4 Réconciliation d'entités simpliste

`reconcile_employees()` parcourt les enregistrements et les fusionne avec un score seuil de 0.75. C'est un **greedy O(n²)** sans :

- **blocking** (réduction du nombre de comparaisons via une clé de bloc) ;
- **modèle probabiliste Fellegi-Sunter** ;
- **traitement des conflits** (deux valeurs non-nulles différentes pour le même attribut) ;
- **transitive closure** (si A~B et B~C, alors A~C).

**Recommandation** :

1. Ajouter un module `entity_resolution.py` séparé.
2. Implémenter le blocking par préfixe d'email + soundex du nom.
3. Documenter le seuil 0.75 (étude de précision/rappel).
4. Détecter et logger les **conflits** de valeurs (deux salaires différents pour le même `EMP:0001`).

### 3.5 Sources hétérogènes — précisions à apporter

Le projet annonce six sources, mais :

- **MongoDB** est en réalité une table SQLite contenant du JSON sérialisé. Cela reste **acceptable pédagogiquement** si l'on documente que le mode Docker utilise un vrai MongoDB.
- **Neo4j** est un fichier `skills_graph.json`. Idem : à documenter.
- **XML** ne contient que **3 enregistrements** : c'est peu pour démontrer le passage à l'échelle.

**Recommandation** :

1. Dans le README, ajouter une note : « En mode local (par défaut), MongoDB et Neo4j sont émulés pour faciliter la reproduction ; en mode `USE_DOCKER=true`, les vrais SGBD sont utilisés ».
2. Enrichir le XML à ~15 entrées et le graphe à ~20 compétences/employés.
3. Ajouter un **diagramme par source** (modèle relationnel, document JSON-schema, DTD XML, schema graphe).

### 3.6 Sécurité

Constats :

- **Tokens** : `sha256("datamediator:" + username)` — déterministes, jamais expirés, falsifiables connaissant le préfixe. À remplacer par **JWT signé** (HS256 minimum) avec `exp` et `iat`.
- **Mots de passe en clair** dans `USERS` (`enterprise_mediator.py` lignes 99-105). Au minimum **stocker des hashs bcrypt**.
- Pas de **rate limiting** sur `/api/auth/login` — attaques par force brute possibles.
- **CORS** à vérifier (`main.py`) — autoriser uniquement `http://localhost:3000` en dev.

**Recommandation** :

```python
from passlib.hash import bcrypt
import jwt, datetime

USERS = {
    "admin": {"hash": bcrypt.hash("admin123"), "role": "ADMIN", ...}
}

def login(username, password):
    user = USERS.get(username)
    if not user or not bcrypt.verify(password, user["hash"]):
        return None
    payload = {"sub": username, "role": user["role"],
               "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)}
    return {"token": jwt.encode(payload, settings.jwt_secret, algorithm="HS256"), ...}
```

### 3.7 Tests insuffisants

Le `tests/` est annoncé pour couvrir « requête simple, jointure, plan LAV, RBAC, réconciliation, visibilité immédiate ». Pour un projet académique, il manque :

1. **Tests de régression sur le parser** (cas malformés, requêtes refusées).
2. **Tests de propriété** : « pour toute requête `q`, `GAV(q)` et `LAV(q)` doivent retourner les **mêmes lignes**  » (hors restrictions RBAC).
3. **Tests de performance** : mesurer le temps moyen sur 1000 exécutions, comparer GAV vs LAV.
4. **Tests d'intégrité** : la conversion EUR→USD est-elle réversible ? Les `_merged_from` couvrent-ils tous les fragments ?

### 3.8 Bugs critiques détectés dans le frontend

Dans `frontend/src/pages/Enterprise.jsx`, **plusieurs variables sont utilisées sans être déclarées** — la page ne peut pas démarrer :

| Variable | Lignes utilisées | Statut |
|---|---|---|
| `setAppLoading` | 90 | non défini |
| `appLoading` | 211 | non défini |
| `sqlText` | 129, 132, 353 | devrait être `sql` |
| `setResult` | 130, 139 | non défini |
| `result` | 191-194, 197, 211, 344, 371-374, 377, 380-381, 384, 391, 408, ... | non défini |
| `setSourcesHealth` | 99 | non défini |
| `sourcesHealth` | 297 | non défini |
| `setUser` | 109, 119 | non défini (prop `user` passé en arg) |

**Cause probable** : refactorisation incomplète (fusion d'un ancien `Login.jsx` + `Dashboard.jsx`). Corrigé dans la refonte fournie.

### 3.9 Design system inexistant

- Mélange de **trois conventions de styling** : classes Tailwind (`bg-emerald-600 hover:bg-emerald-700 ...`), CSS modules (`Login.css`, `NotFound.css`), styles inline (`style={{...}}`).
- **Pas de tokens** centralisés (palettes, espacements, ombres, rayons).
- **Pas de mode sombre cohérent** : `ThemeProvider` existe mais la plupart des composants codent les couleurs en dur.
- **Composants UI** (`Button`, `Card`, `Input`) coexistent avec du JSX brut un peu partout.

---

## 4. Plan de révision proposé

### 4.1 Backend (priorité moyenne pour l'examen)

| Item | Effort | Bénéfice académique |
|---|---|---|
| Ajouter `docs/formalisme.md` (Datalog GAV/LAV) | 2 h | ★★★★★ |
| Documenter limites SQL et grammaire supportée | 1 h | ★★★★ |
| Remplacer SHA-256 par JWT + bcrypt | 2 h | ★★★ |
| Tests de propriété GAV ≡ LAV | 3 h | ★★★★ |
| Module `entity_resolution.py` séparé | 4 h | ★★★ |
| Implémenter MiniCon en remplacement de Bucket | 6 h | ★★★★★ |

### 4.2 Frontend (priorité haute pour la soutenance)

| Item | Effort | Bénéfice |
|---|---|---|
| Design system unifié (tokens CSS) | livré | ★★★★★ |
| Refonte page Login (enterprise) | livré | ★★★★ |
| Refonte Dashboard (corriger bugs + UI) | livré | ★★★★★ |
| Refonte Loading | livré | ★★★ |
| Refonte 404 | livré | ★★ |

### 4.3 Documentation (priorité haute pour le rapport)

| Item | Effort | Bénéfice |
|---|---|---|
| Diagramme d'architecture en couches | 1 h | ★★★★★ |
| Diagramme de classes / E-R global | 1 h | ★★★★ |
| Tableaux des conflits + résolutions | 1 h | ★★★★ |
| Étude comparative GAV vs LAV (perf, expressivité) | 2 h | ★★★★★ |
| Scénarios de démonstration scriptés | 1 h | ★★★ |

---

## 5. Repères théoriques pour la soutenance

À maîtriser absolument pour répondre au jury :

**1. Définitions formelles**

- **GAV** : `forall G in GlobalSchema, G = q_G(S_1, ..., S_n)`. Le schéma global est défini comme vue (UNION ALL) sur les sources. Réécriture = **dépliement** (`view unfolding`).
- **LAV** : `forall V in SourceViews, V = q_V(GlobalSchema)`. Chaque vue source est une CQ sur le schéma global. Réécriture = **algorithmes Bucket, Inverse Rules, MiniCon**.
- **GLAV** : généralisation où une vue locale peut décrire **plusieurs prédicats globaux à la fois** ; on autorise les têtes conjonctives.

**2. Différences pratiques**

| Critère | GAV | LAV |
|---|---|---|
| Ajout d'une source | coûteux (réécriture du global) | simple (juste une vue) |
| Ajout d'un concept global | simple (nouvelle règle) | coûteux (chaque source à revisiter) |
| Réécriture | dépliement direct | algorithmique (NP-difficile en général) |
| Complétude | garantie | dépend de l'algorithme |

**3. Algorithmes à citer**

- **Bucket Algorithm** (Levy, Rajaraman, Ordille 1996) — implémenté ici partiellement.
- **MiniCon** (Pottinger, Halevy 2001) — plus efficace.
- **Inverse Rules** (Duschka, Genesereth 1997).
- **Fellegi-Sunter** (1969) pour le record linkage probabiliste.

**4. Conflits classiques de schémas (Spaccapietra, Parent 1991)**

- Naming, scaling/unit, structural, semantic, data type, data model.
- Le tableau `CONFLICT_RULES` du projet couvre tous ces axes — bon point à valoriser.

---

## 6. Conclusion

Le projet est sur de **bonnes fondations techniques** mais doit être **mieux théorisé** pour atteindre le standard académique attendu. Avec :

- l'ajout d'un document de **formalisme Datalog** (2 h de travail),
- la **correction des bugs frontend** et la **refonte design** (livrée),
- une **étude comparative GAV/LAV** chiffrée sur le jeu de données (2 h),
- l'amélioration du **module de réconciliation** (4 h),

le projet passe de « démo soignée » à « livrable de Master défendable ».

---

> *Document généré dans le cadre de la révision du projet DataMediator Pro.*
> *Voir aussi : `frontend/src/styles/design-system.css` pour la refonte UI, et les pages refondues `Login.jsx`, `Enterprise.jsx`, `Loading.jsx`, `NotFound.jsx`.*
