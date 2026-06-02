# Formalisme de la médiation virtuelle — DataMediator

> Document académique. Formalise en Datalog les approches **GAV**, **LAV** et **GLAV**
> mises en œuvre dans le projet, et explicite les contraintes, les unités, et les
> conflits de schéma.

---

## 1. Schéma global virtuel

Le schéma global est l'ensemble des prédicats que l'utilisateur peut interroger.
Il est défini de manière indépendante des sources locales.

```
GlobalEmployee(employee_id, national_id, matricule, full_name, email,
               birth_date, department_id, department_name, country,
               salary_usd, status, performance_score, skills,
               source_confidence)

GlobalDepartment(department_id, department_code, department_name, country)

GlobalProject(project_id, project_name, client_name, status,
              start_date, end_date)

GlobalAssignment(employee_id, project_id, role, allocation_rate)

GlobalPayroll(employee_id, salary_usd, bonus_usd, risk_level)
```

Domaines et contraintes d'intégrité :

```
country ∈ {DZ, FR, TN}
status (employee) ∈ {ACTIVE, INACTIVE}
status (project)  ∈ {ACTIVE, PAUSED, CLOSED}
risk_level        ∈ {LOW, MEDIUM, HIGH}
allocation_rate   ∈ [0, 1]
```

---

## 2. Sources locales (prédicats de base)

| ID | Modèle | Prédicats EDB (Extensional Database) |
|----|--------|--------------------------------------|
| S1 | Relationnel (PostgreSQL) | `S1_employees(emp_id, matricule, first_name, last_name, email, birth_date, salary_eur, dept_id, status)` `S1_departments(dept_id, dept_code, dept_name, country)` |
| S2 | Relationnel (MySQL)      | `S2_consultants(consultant_code, complete_name, mail, business_unit, active)` `S2_projects(project_code, label, client_name, state, start_dt, end_dt)` `S2_assignments(consultant_code, project_code, job_title, allocation_percent)` |
| S3 | Document (MongoDB)       | `S3_payroll(docId, employeeMatricule, nationalId, monthlySalaryDzd, bonusDzd, currency, riskLevel, visibleToRoles)` |
| S4 | Fichier plat (CSV)       | `S4_legacy(legacy_id, nom_prenom, email, dept, pays, grade)` |
| S5 | Semi-structuré (XML)     | `S5_eval(employeeMail, score, feedback)` |
| S6 | Graphe (JSON)            | `S6_node(id, label)`, `S6_edge(src, tgt, type, weight)` |

---

## 3. Approche GAV (Global As View)

> Chaque relation globale est définie comme une vue (UNION) sur les sources.
> Réécriture par **dépliement** (`view unfolding`).

### 3.1 GlobalEmployee — règles GAV

```datalog
% Branche S1 — RH PostgreSQL
GlobalEmployee(eid, _, mat, fn_ln, mail, bd, did, dept, country, sal_usd, stat, _, _, 0.95) :-
    S1_employees(empId, mat, fn, ln, mail, bd, sal_eur, did_raw, raw_status),
    S1_departments(did_raw, _, dept_raw, country),
    fn_ln    = concat(fn, ' ', ln),
    eid      = concat('S1:', empId),
    did      = concat('S1:', did_raw),
    dept     = normalize_dept(dept_raw),
    sal_usd  = sal_eur * 1.08,
    stat     = if(raw_status = 'active', 'ACTIVE', 'INACTIVE').

% Branche S2 — Projets MySQL (consultants vus comme employés partiels)
GlobalEmployee(eid, _, code, name, mail, _, _, dept, _, _, stat, _, _, 0.80) :-
    S2_consultants(code, name, mail, bu, active),
    eid    = concat('S2:', code),
    dept   = normalize_dept(bu),
    stat   = if(active = 1, 'ACTIVE', 'INACTIVE').

% Branche S4 — Legacy CSV
GlobalEmployee(eid, _, _, name, mail, _, _, dept, country, _, 'ACTIVE', _, _, 0.60) :-
    S4_legacy(lid, raw_name, mail, dept_raw, country, _),
    eid    = concat('S4:', lid),
    name   = parse_legacy_name(raw_name),
    dept   = normalize_dept(dept_raw).

% Branche S5 — XML évaluations (enrichissement par score de performance)
GlobalEmployee(eid, _, _, _, mail, _, _, _, _, _, _, score, _, 0.90) :-
    S5_eval(mail, score, _),
    eid = concat('S5:', mail).

% Branche S6 — Graphe compétences (enrichissement par skills)
GlobalEmployee(eid, _, code, _, _, _, _, _, _, _, _, _, skills, 0.85) :-
    S6_node(code, 'Employee'),
    skills = collect{ skill : S6_edge(code, skill, 'KNOWS', _) },
    eid    = concat('S6:', code).
```

### 3.2 GlobalDepartment

```datalog
GlobalDepartment(did, code, dept, country) :-
    S1_departments(did_raw, code, dept_raw, country),
    did  = concat('S1:', did_raw),
    dept = normalize_dept(dept_raw).

GlobalDepartment(did, bu, dept, _) :-
    S2_consultants(_, _, _, bu, _),
    did  = concat('S2:', bu),
    dept = normalize_dept(bu),
    NOT EXISTS S1_departments(_, _, raw, _) WHERE normalize_dept(raw) = dept.
```

### 3.3 GlobalProject, GlobalAssignment, GlobalPayroll

```datalog
GlobalProject(pid, label, client, state, sd, ed) :-
    S2_projects(code, label, client, state, sd, ed),
    pid = concat('S2:', code).

GlobalAssignment(eid, pid, job, rate) :-
    S2_assignments(ccode, pcode, job, percent),
    eid  = canonical_employee_id(ccode),
    pid  = concat('S2:', pcode),
    rate = percent / 100.

GlobalPayroll(eid, sal_usd, bon_usd, risk) :-
    S3_payroll(_, mat, _, monthly_dzd, bonus_dzd, _, risk, roles),
    eid     = canonical_employee_id(mat),
    sal_usd = monthly_dzd * 0.0074,
    bon_usd = bonus_dzd   * 0.0074,
    user_role() ∈ roles.   % filtrage RBAC
```

### 3.4 Réécriture GAV (dépliement)

Pour une requête utilisateur :

```sql
SELECT full_name, department_name
FROM GlobalEmployee
WHERE status = 'ACTIVE';
```

Le médiateur **déplie** chaque occurrence de `GlobalEmployee` par toutes ses
branches GAV (5 sources). Chaque branche est exécutée localement, puis le
médiateur effectue UNION + projection + filtre.

**Complexité** : O(|sources × branches|), polynomiale.

---

## 4. Approche LAV (Local As View)

> Chaque vue source est une **conjunctive query (CQ)** sur le schéma global.
> Réécriture algorithmique (Bucket, MiniCon, Inverse Rules).

### 4.1 Vues LAV — exemples

```datalog
% V1: vue RH PostgreSQL — couvre attributs RH stricts
V1_HR_EMPLOYEE(eid, mat, name, mail, bd, did, dept, country, sal, stat) :-
    GlobalEmployee(eid, _, mat, name, mail, bd, did, dept, country, sal, stat, _, _, _),
    country ∈ {DZ, FR, TN},
    stat   ∈ {ACTIVE, INACTIVE}.

% V2: vue Projets MySQL — couvre identité de base + statut
V2_PROJECT_CONSULTANT(eid, mat, name, mail, dept, stat) :-
    GlobalEmployee(eid, _, mat, name, mail, _, _, dept, _, _, stat, _, _, _),
    stat ∈ {ACTIVE, INACTIVE}.

% V3: vue Finance Mongo — couvre attributs financiers (RBAC)
V3_FINANCE_PAYROLL(eid, sal, bon, risk) :-
    GlobalPayroll(eid, sal, bon, risk),
    user_role() ∈ {ADMIN, HR_MANAGER, FINANCE_OFFICER}.

% V4: vue Legacy CSV
V4_LEGACY(eid, name, mail, dept, country) :-
    GlobalEmployee(eid, _, _, name, mail, _, _, dept, country, _, _, _, _, _).

% V5: vue XML — couvre uniquement la performance
V5_EVAL(eid, mail, score) :-
    GlobalEmployee(eid, _, _, _, mail, _, _, _, _, _, _, score, _, _).

% V6: vue Graphe — couvre uniquement les compétences
V6_SKILLS(eid, mat, skills) :-
    GlobalEmployee(eid, _, mat, _, _, _, _, _, _, _, _, _, skills, _).
```

### 4.2 Algorithme Bucket (Levy-Rajaraman-Ordille 1996)

Pour une requête `Q(x̄) ← G₁(...), G₂(...), ..., Gₙ(...)` :

**Phase 1 — Construction des buckets.** Pour chaque sous-but `Gᵢ`, le bucket
`B(Gᵢ)` contient toutes les vues `Vⱼ` qui peuvent répondre à `Gᵢ` (i.e.
`Gᵢ` figure dans le corps de la définition de `Vⱼ`, et la projection de `Vⱼ`
couvre les variables nécessaires).

**Phase 2 — Combinaison.** On forme tous les rewritings possibles en prenant
un élément dans chaque bucket. Pour chaque combinaison, on vérifie :

1. les **constantes** de la requête (constraints) sont respectées par les vues ;
2. les **variables jointes** sont compatibles ;
3. le **rewriting est minimal** (pas de vue redondante).

**Complexité** : O(∏ |B(Gᵢ)|), exponentielle en théorie.

### 4.3 Algorithme MiniCon (Pottinger & Halevy 2001)

MiniCon est **strictement plus efficace** que Bucket : il forme moins de
rewritings car il vérifie dès la phase 1 que les jointures globales seront
respectables.

**MCD (MiniCon Description)** : pour une vue `V` et un homomorphisme partiel
`h: vars(Q) → vars(V)`, un MCD est un triplet :

```
MCD = (h, V, G)
```

où `G ⊆ subgoals(Q)` est l'ensemble maximum de sous-buts de Q couverts par V
sous l'homomorphisme h, tel que :
- pour toute variable `x` distinguée de Q dans `G`, `h(x)` est distinguée dans V ;
- pour toute variable jointe `y` de Q apparaissant dans `G`, `h(y)` est ou bien
  distinguée dans V, ou bien `y` n'apparaît qu'à l'intérieur de `G`.

**Phase 2 (combinaison)** : on cherche des **partitions** de `subgoals(Q)` en
MCDs, ce qui réduit drastiquement l'espace de combinaisons.

Voir `mini_con.py` pour l'implémentation pédagogique.

### 4.4 Comparaison Bucket vs MiniCon — taille du rewriting

Soit Q une requête à 3 sous-buts globaux, avec 4 vues candidates par sous-but.

| Métrique          | Bucket          | MiniCon         |
|------------------|-----------------|-----------------|
| Combinaisons générées | 4³ = 64    | ≤ 8 (typique)   |
| Rewritings valides    | varies     | ≤ 4 (typique)   |
| Coût d'élimination    | a posteriori | a priori (par MCD) |

---

## 5. Approche GLAV (Global-and-Local As View)

GLAV généralise GAV et LAV : on autorise des règles **vue source → schéma
global** où la tête est une **conjonction**. C'est le formalisme retenu en
pratique (Information Manifold, BizQuery).

Exemple : une source qui publie en même temps un employé **et** son affectation.

```datalog
% Une seule règle GLAV produit deux relations globales
GlobalEmployee(eid, _, mat, name, mail, _, _, dept, _, _, 'ACTIVE', _, _, 0.80),
GlobalAssignment(eid, pid, role, rate)
   :-
   S2_consultants(code, name, mail, bu, 1),
   S2_assignments(code, pcode, role, percent),
   eid  = concat('S2:', code),
   pid  = concat('S2:', pcode),
   mat  = code,
   dept = normalize_dept(bu),
   rate = percent / 100.
```

La réécriture devient un mix de dépliement (GAV) et de recherche LAV.

---

## 6. Conflits de schéma (Spaccapietra-Parent 1991) et leur résolution

| Type        | Local                              | Global               | Résolution                                  |
|-------------|------------------------------------|----------------------|---------------------------------------------|
| Nommage     | `employees` / `consultants`        | `GlobalEmployee`     | Synonymes métier unifiés                    |
| Attribut    | `first_name + last_name` / `complete_name` / `nom_prenom` | `full_name` | Concaténation ou parsing                    |
| Unité       | `salary_eur` (EUR) / `monthlySalaryDzd` (DZD) | `salary_usd` (USD) | Conversion par taux (×1.08 ou ×0.0074)      |
| Structure   | Table `departments` / Texte `business_unit` | `department_name` | Normalisation par dictionnaire              |
| Identifiant | `emp_id` / `consultant_code` / `nationalId` / `legacy_id` | `employee_id` | Réconciliation (email, matricule, similarité) |
| Type        | `allocation_percent INT`           | `allocation_rate FLOAT` | Division par 100                            |
| Modèle      | Graphe / XML                       | Relationnel plat     | Aplatissement (parsing DOM, traversée arcs) |
| Sécurité    | `visibleToRoles[]`                 | RBAC                 | Filtrage avant réécriture                   |

---

## 7. Garanties théoriques

**Soundness** (correction) : tout tuple retourné par la réécriture est dans la
réponse certaine `cert(Q, D)`.

**Completeness** (complétude) : tous les tuples certains sont retournés.

- **GAV** : soundness et completeness garanties (dépliement direct).
- **LAV** : soundness garantie ; completeness dépend de l'algorithme. Bucket et
  MiniCon retournent le rewriting **maximum sound** (toutes les CQ rewritings),
  donc completeness assurée pour les CQ sans contraintes d'inégalité.

**Équivalence pratique** : sur des requêtes conjonctives sans agrégation,
GAV(Q) et LAV(Q) doivent retourner les **mêmes lignes** sur la même instance
des sources. Le test `tests/test_properties.py` vérifie expérimentalement
cette propriété.

---

## 8. Bibliographie

- Halevy A. (2001). *Answering queries using views: a survey*. VLDB Journal 10(4).
- Lenzerini M. (2002). *Data Integration: A Theoretical Perspective*. PODS.
- Levy A., Rajaraman A., Ordille J. (1996). *Querying Heterogeneous Information
  Sources Using Source Descriptions*. VLDB. — Bucket algorithm.
- Pottinger R., Halevy A. (2001). *MiniCon: A Scalable Algorithm for Answering
  Queries Using Views*. VLDB Journal 10(2-3).
- Duschka O., Genesereth M. (1997). *Answering Recursive Queries Using Views*. PODS.
- Friedman M., Levy A., Millstein T. (1999). *Navigational Plans for Data
  Integration*. AAAI.
- Spaccapietra S., Parent C., Dupont Y. (1991). *Model Independent Assertions
  for Integration of Heterogeneous Schemas*. VLDB.
- Fellegi I., Sunter A. (1969). *A Theory for Record Linkage*. JASA 64(328).
