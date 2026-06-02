# Architecture de DataMediator

> Vue d'ensemble en couches du médiateur virtuel, des wrappers et du frontend.

---

## 1. Architecture en couches (Wiederhold 1992)

```mermaid
flowchart TB
    subgraph CLIENT[Couche cliente]
        UI[React + Vite + CodeMirror]
        SEO[SEO Helmet]
    end

    subgraph MEDIATOR[Couche médiateur]
        AUTH[Authentification<br/>JWT + bcrypt + RBAC]
        PARSER[Parseur SQL]
        ENGINE[Query Engine<br/>GAV / LAV / MiniCon]
        ER[Entity Resolution<br/>Blocking + Fellegi-Sunter]
        CACHE[Cache layer<br/>memory + Redis]
        MON[Monitoring &<br/>Reporting]
    end

    subgraph WRAPPERS[Couche wrappers]
        W1[Wrapper S1<br/>PostgreSQL]
        W2[Wrapper S2<br/>MySQL]
        W3[Wrapper S3<br/>MongoDB]
        W4[Wrapper S4<br/>CSV]
        W5[Wrapper S5<br/>XML/XPath]
        W6[Wrapper S6<br/>Graph]
    end

    subgraph SOURCES[Couche sources]
        S1[(PostgreSQL HR)]
        S2[(MySQL Projets)]
        S3[(MongoDB Finance)]
        S4[/employees_legacy.csv/]
        S5[/evaluations.xml/]
        S6[/skills_graph.json/]
    end

    UI -- HTTP/JSON --> AUTH
    AUTH --> PARSER --> ENGINE
    ENGINE --> CACHE
    ENGINE --> W1 & W2 & W3 & W4 & W5 & W6
    ENGINE --> ER
    ENGINE --> MON
    W1 --> S1
    W2 --> S2
    W3 --> S3
    W4 --> S4
    W5 --> S5
    W6 --> S6
```

**Trois couches du médiateur classique** :

- **Couche cliente** : pose des requêtes en SQL global, ignore tout des sources.
- **Couche médiateur** : authentifie, autorise, parse, réécrit (GAV ou LAV), exécute le plan, réconcilie, met en cache.
- **Couche wrappers** : convertit les requêtes locales en SQL/XPath/traversée de graphe, harmonise les types et les noms.
- **Couche sources** : six SGBD/fichiers hétérogènes simulés ou réels (Docker).

---

## 2. Pipeline d'exécution d'une requête

```mermaid
sequenceDiagram
    autonumber
    participant U as Utilisateur
    participant A as Auth/RBAC
    participant P as Parser
    participant R as Réécriture<br/>(GAV / LAV)
    participant W as Wrappers
    participant E as Entity Resolution
    participant C as Combinateur
    participant U2 as Réponse

    U->>A: SELECT ... FROM GlobalEmployee
    A->>A: Vérifie le JWT, applique la politique RBAC
    A->>P: requête autorisée
    P->>R: AST (ParsedQuery)
    R->>R: GAV: dépliement<br/>LAV: Bucket / MiniCon
    R->>W: sous-requêtes locales
    W->>W: SQL / XPath / parsing JSON
    W-->>C: tuples locaux
    C->>E: jointure naturelle
    E->>E: blocking + Fellegi-Sunter
    E->>E: union-find + fusion priorisée
    E-->>C: tuples consolidés
    C->>C: projection, filtres, agrégation
    C-->>U2: lignes finales + plan + événements
```

---

## 3. Modèle conceptuel des données (schéma global)

```mermaid
erDiagram
    GLOBAL_EMPLOYEE ||--o{ GLOBAL_ASSIGNMENT : "1—n"
    GLOBAL_PROJECT  ||--o{ GLOBAL_ASSIGNMENT : "1—n"
    GLOBAL_DEPARTMENT ||--o{ GLOBAL_EMPLOYEE : "1—n"
    GLOBAL_EMPLOYEE ||--o| GLOBAL_PAYROLL : "1—1"

    GLOBAL_EMPLOYEE {
        string  employee_id PK
        string  matricule
        string  full_name
        string  email
        date    birth_date
        string  department_id FK
        number  salary_usd
        string  status
        number  performance_score
        string  skills
        number  source_confidence
    }
    GLOBAL_DEPARTMENT {
        string  department_id PK
        string  department_name
        string  country
    }
    GLOBAL_PROJECT {
        string  project_id PK
        string  project_name
        string  status
    }
    GLOBAL_ASSIGNMENT {
        string  employee_id PK,FK
        string  project_id PK,FK
        string  role
        number  allocation_rate
    }
    GLOBAL_PAYROLL {
        string  employee_id PK,FK
        number  salary_usd
        number  bonus_usd
        string  risk_level
    }
```

---

## 4. Cartographie sources → schéma global

| Source | Modèle natif | Couvre |
|--------|-------------|--------|
| **S1** PostgreSQL HR  | Relationnel | `GlobalEmployee` (identité, salaire EUR), `GlobalDepartment` |
| **S2** MySQL Projets  | Relationnel | `GlobalEmployee` (consultants), `GlobalProject`, `GlobalAssignment` |
| **S3** Mongo Finance  | Document JSON | `GlobalPayroll` (salaires DZD) |
| **S4** CSV legacy     | Fichier plat | `GlobalEmployee` (employés historiques) |
| **S5** XML évaluations| Semi-structuré | `GlobalEmployee.performance_score` |
| **S6** Graphe JSON    | Graphe `(:Employee)-[:KNOWS]->(:Skill)` | `GlobalEmployee.skills` |

---

## 5. Diagramme de classes (Python — backend)

```mermaid
classDiagram
    class QueryEngine {
        +execute(sql, mode, user) dict
        -parse(sql) ParsedQuery
        -_authorize(parsed, user) void
        -_gav_plan(parsed, user) dict
        -_lav_plan(parsed, user) dict
        -_combine(parsed, datasets) list
    }

    class ParsedQuery {
        +sql: str
        +select_items: list
        +tables: list
        +joins: list
        +where: str
        +group_by: list
        +order_by: str
        +limit: int
    }

    class EntityResolution {
        +reconcile(records, config) tuple
        +blocking_keys(record) list
        +fs_pair_score(a, b, fields) tuple
        +merge_group(group, canonical_id) tuple
    }

    class MiniCon {
        +minicon_rewrite(query, views) dict
        -build_mcds(query, views) list
        -combine_mcds(query, mcds) list
    }

    class Auth {
        +login(username, password) dict
        +resolve_user(token) dict
        -_issue_jwt(username, role) str
        -_verify_password(plain, stored) bool
    }

    QueryEngine ..> ParsedQuery
    QueryEngine ..> EntityResolution
    QueryEngine ..> MiniCon
    QueryEngine ..> Auth
```

---

## 6. Choix d'architecture et trade-offs

| Choix | Justification |
|-------|---------------|
| **FastAPI** plutôt que Flask | Typage Pydantic, ASGI, Swagger auto, async natif. |
| **SQLite local** par défaut | Démo reproductible, zéro dépendance. Docker en option. |
| **Wrappers en fonctions** plutôt que classes | Simplicité pédagogique, moins de boilerplate. |
| **Cache memory** + fallback | Pas de dépendance dure à Redis. |
| **JWT + bcrypt** | Sécurité standard, expiration des tokens. |
| **MiniCon + Bucket** | Bucket pour la pédagogie, MiniCon pour la performance. |
| **React + Vite** | Hot reload, ESM natif, build rapide. |
| **CSS custom + tokens** | Pas de framework lourd (Tailwind utilisé minimalement). |
