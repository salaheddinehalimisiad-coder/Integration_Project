# Guide d'Interrogation Virtuelle (SQL & GraphQL) 🔍

Ce guide présente des exemples concrets pour interroger le schéma virtuel global de **DataMediator Pro** via la **Console SQL** ou l'**API GraphQL**.

---

## 1. Interrogation via la Console SQL (GAV / LAV)

La console SQL intelligente traduit vos requêtes sur le schéma global virtuel en sous-requêtes adaptées aux différentes sources hétérogènes (PostgreSQL, MySQL, MongoDB, fichiers CSV, XML et JSON).

### 📝 Schéma Global de Référence
Vous pouvez interroger les relations virtuelles suivantes :
*   `GlobalEmployee` (Données RH, performances, compétences, et salaire converti)
*   `GlobalDepartment` (Liste unifiée des départements)
*   `GlobalProject` (Projets clients de l'entreprise)
*   `GlobalAssignment` (Affectations des consultants sur les projets)
*   `GlobalPayroll` (Données financières sensibles protégées par RBAC)

---

### 💡 Exemples de Requêtes SQL Fédérées

#### A. Liste des employés actifs avec département et pays (Multi-sources RH)
*Cette requête va fusionner les informations issues de PostgreSQL (RH courante) et du CSV Legacy (historique) de façon transparente.*
```sql
SELECT full_name, email, department_name, country 
FROM GlobalEmployee 
WHERE status = 'ACTIVE';
```

#### B. Jointure complète Employés × Affectations × Projets (RH & Gestion de Projets)
*Cette requête réalise une jointure virtuelle complexe entre PostgreSQL (RH) et MySQL (Projets et Affectations).*
```sql
SELECT e.full_name, p.project_name, a.role, a.allocation_rate
FROM GlobalEmployee e
JOIN GlobalAssignment a ON e.employee_id = a.employee_id
JOIN GlobalProject p ON a.project_id = p.project_id
WHERE p.status = 'ACTIVE';
```

#### C. Réconciliation des compétences et évaluations (JSON/Graphe & XML)
*Cette requête extrait des informations semi-structurées XML (evaluations) et Graphe (skills) associées de manière unifiée.*
```sql
SELECT full_name, performance_score, skills 
FROM GlobalEmployee 
WHERE status = 'ACTIVE';
```

#### D. Agrégation de masse (Analytics)
*Calcule le nombre d'employés par département.*
```sql
SELECT department_name, COUNT(*) AS employee_count 
FROM GlobalEmployee 
WHERE status = 'ACTIVE' 
GROUP BY department_name;
```

---

## 2. Interrogation via l'API GraphQL (strawberry)

Le serveur GraphQL fonctionne en parallèle du serveur FastAPI principal sur le port **5002** (url : `http://localhost:5002/graphql`). Il offre une alternative moderne et optimisée pour l'interface utilisateur.

### 🔐 Authentification GraphQL
Pour exécuter des requêtes GraphQL sécurisées, vous devez inclure l'en-tête d'autorisation avec le jeton JWT obtenu lors de la connexion :
```http
Authorization: Bearer <votre_token_jwt>
```

---

### 🧬 Exemples de Requêtes GraphQL (Queries)

#### A. Récupérer la liste des employés (avec sélection de champs)
```graphql
query GetEmployees {
  employees(limit: 5) {
    employeeId
    fullName
    email
    departmentName
    country
    sourceConfidence
  }
}
```

#### B. Filtrer les employés par pays et salaire minimum
```graphql
query FilterEmployees {
  employees(filter: { country: "DZ", minSalary: 3000.0 }) {
    fullName
    email
    salaryUsd
    status
  }
}
```

#### C. Récupérer un employé spécifique avec ses affectations
```graphql
query GetEmployeeDetails {
  employee(employeeId: "EMP:0001") {
    fullName
    email
    status
  }
  assignments(employeeId: "EMP:0001") {
    projectId
    role
    allocationPercentage
  }
}
```

#### D. Obtenir les indicateurs clés et l'état des conflits résolus
```graphql
query GetPlatformMetrics {
  metrics {
    totalEmployees
    activeProjects
    avgSalary
    conflictsResolved
  }
}
```

---

### ⚡ Exemple de Mutation GraphQL (Mutations)

#### Résolution d'un conflit de données sur un employé doublon
```graphql
mutation ResolveConflict {
  resolveConflict(
    conflictId: "EMP:0001",
    resolution: "highest_confidence",
    chosenSource: "S1"
  )
}
```
*(Renvoie `true` si la règle d'arbitrage a été correctement enregistrée par le médiateur).*
