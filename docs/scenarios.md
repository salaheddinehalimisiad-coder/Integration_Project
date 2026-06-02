# Scénarios de soutenance — DataMediator

> Suite de démonstrations chronologiques pour la soutenance.
> Chaque scénario montre **un point théorique** précis avec sa **manipulation pratique** dans l'interface.

---

## Scénario 1 — Le schéma global cache l'hétérogénéité

**Objectif** : prouver que l'utilisateur interroge un schéma unique alors que
six sources hétérogènes sont impliquées.

**Manipulation** :

1. Se connecter avec `admin / admin123`.
2. Ouvrir l'onglet **Schéma global virtuel** dans le dashboard.
3. Montrer les 5 relations (`GlobalEmployee`, `GlobalDepartment`, …) et leurs attributs typés.
4. Exécuter :

   ```sql
   SELECT full_name, email, department_name, country
   FROM GlobalEmployee
   WHERE status = 'ACTIVE';
   ```

5. Pointer dans la sidebar les **6 sources** réelles (S1..S6) et leur état "En ligne".
6. Conclure : l'utilisateur n'a écrit aucun JOIN, aucun XPath, aucune traversée de graphe.

**Point théorique** : niveau d'abstraction (Lenzerini 2002) — séparation entre
schéma de présentation et schéma physique.

---

## Scénario 2 — GAV : réécriture par dépliement

**Objectif** : illustrer la phase de **view unfolding** de l'approche GAV.

**Manipulation** :

1. Sélectionner le mode **GAV** dans le segmented control en haut.
2. Exécuter la même requête que le scénario 1.
3. Dans le panneau **Plan d'exécution** :
   - relever le nœud "Moteur de réécriture · GAV" ;
   - lister les sources concernées (S1, S2, S4, S5, S6) ;
   - lire la sous-requête SQL générée pour chaque source dans les cartes en bas.
4. Faire défiler vers le bas pour montrer le résultat consolidé.

**Point théorique** : `GlobalEmployee = UNION(view_S1, view_S2, view_S4, view_S5, view_S6)`,
réécriture par substitution littérale de chaque relation globale par sa
définition (polynomial).

**À répondre au jury** :

> *« Pourquoi GAV est facile à réécrire ? »*
>
> Parce que chaque relation globale est **déjà** définie comme une vue sur les
> sources. Le médiateur n'a qu'à substituer l'occurrence de la relation par sa
> définition (dépliement). Il n'y a pas d'algorithme de recherche.

---

## Scénario 3 — LAV : algorithme Bucket

**Objectif** : montrer la différence avec LAV.

**Manipulation** :

1. Basculer le segmented control sur **LAV Bucket**.
2. Réexécuter la requête.
3. Dans le panneau **Plan d'exécution** :
   - relever le nœud "LAV_BUCKET" ;
   - lister les **vues sélectionnées** (S1_HR_EMPLOYEE_VIEW, S2_PROJECT_CONSULTANT_VIEW, …) ;
   - constater la phase 1 (buckets) dans le `trace` du plan ;
4. Comparer le **temps d'exécution** (lecture dans la métrique).

**Point théorique** : chaque vue source est une CQ sur le schéma global ;
Bucket construit pour chaque sous-but global le sac des vues capables d'y
répondre, puis combine.

---

## Scénario 4 — MiniCon vs Bucket

**Objectif** : montrer que MiniCon produit moins de combinaisons.

**Manipulation** (CLI, depuis le terminal du backend) :

```bash
python -m mini_con
```

Ou plus académiquement, dans un notebook :

```python
from mini_con import demo
result = demo()
print("MCDs construits :", len(result["mcds"]))
print("Rewritings :", len(result["rewritings"]))
```

**Point théorique** : la **Property 1 de Pottinger-Halevy** filtre les vues qui ne
pourraient pas participer à une jointure dans le médiateur. Résultat : moins
de MCDs, moins de partitions, moins de rewritings invalides à éliminer.

**Comparaison sur l'exemple** : Q a 3 sous-buts, 3 vues candidates.
- Bucket : 3 × 3 × 3 = **27 combinaisons** à tester.
- MiniCon : **1 rewriting** trouvé directement.

---

## Scénario 5 — Réconciliation cross-source

**Objectif** : démontrer la fusion d'une même personne présente dans plusieurs sources.

**Manipulation** :

1. Exécuter :

   ```sql
   SELECT full_name, email, department_name
   FROM GlobalEmployee
   WHERE department_name = 'AI Lab';
   ```

2. Constater la **métrique "Entités fusionnées"** > 0.
3. Cliquer sur l'onglet **Plan d'exécution** → la dernière étape verte indique le nombre de fusions.
4. Faire appel à `/api/reconciliation` dans Swagger pour voir les événements.

**Point théorique** : Fellegi-Sunter 1969 — probabiliste, somme de
log-odds-ratios par champ comparé. Blocking par préfixe d'email et soundex pour
réduire la complexité de O(n²) à O(n·k).

**À répondre au jury** :

> *« Comment décidez-vous que deux records représentent la même personne ? »*
>
> Trois mécanismes : (1) clé technique exacte (matricule, email), (2) similarité
> de nom > 85 % (Ratcliff-Obershelp), (3) score Fellegi-Sunter > seuil 4.0 sur
> l'ensemble des champs comparés. Les enregistrements sont ensuite groupés via
> union-find pour la fermeture transitive.

---

## Scénario 6 — RBAC : sécurité par rôle

**Objectif** : illustrer le filtrage avant exécution.

**Manipulation** :

1. Se déconnecter, puis se reconnecter avec `project / project123` (PROJECT_MANAGER).
2. Tenter :

   ```sql
   SELECT full_name, salary_usd FROM GlobalEmployee;
   ```

3. Observer l'erreur **403** : *"Colonnes sensibles interdites pour PROJECT_MANAGER: salary_usd"*.
4. Se reconnecter en `finance / finance123` (FINANCE_OFFICER) et réexécuter — la requête passe.
5. Comparer dans la sidebar les **politiques affichées** pour chaque rôle.

**Point théorique** : le RBAC s'applique **avant** la réécriture pour éviter
toute fuite via les sources. Les politiques sont déclaratives
(`ROLE_POLICIES` dans `enterprise_mediator.py`).

---

## Scénario 7 — Visibilité immédiate après ajout en source

**Objectif** : prouver que la médiation est **virtuelle** (pas d'ETL).

**Manipulation** :

1. Cliquer le bouton **« Ajouter ligne source »** (dans la barre d'actions de la requête).
2. Immédiatement réexécuter :

   ```sql
   SELECT full_name, email, department_name
   FROM GlobalEmployee
   WHERE department_name = 'AI Lab';
   ```

3. Constater la **nouvelle ligne** dans le résultat.

**Point théorique** : l'absence d'entrepôt physique fait que toute modification
d'une source est visible à la requête suivante sans recalcul. C'est la
**propriété fondamentale** du médiateur virtuel (vs ETL/data warehouse).

---

## Scénario 8 — Authentification durcie

**Objectif** : montrer que les mots de passe sont hashés et les tokens signés.

**Manipulation** (dans Swagger ou via curl) :

```bash
# Login -> JWT
curl -X POST http://localhost:5001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
# Réponse: {"token":"eyJ0eXAiOiJKV1Q...", "expires_in_hours":8, ...}

# Inspection du JWT (3 segments séparés par des points)
# - header: algorithme HS256
# - payload: {sub, role, iat, exp}
# - signature: HMAC SHA-256 du secret
```

**Point théorique** : passage SHA-256 statique → JWT signé HS256 avec
expiration, et bcrypt avec salage individuel par utilisateur (résistant aux
attaques rainbow).

---

## Scénario 9 — Conflits de schémas résolus

**Objectif** : énumérer les conflits réels du jeu de données et leur résolution.

**Manipulation** :

1. Ouvrir le panneau **Mappings GAV / LAV** dans le dashboard.
2. Pour chaque entrée, lire la résolution.
3. Exécuter en parallèle dans Swagger : `GET /api/conflicts/rules`.

**Tableau commenté** :

| Conflit observé | Source A | Source B | Résolution |
|----------------|----------|----------|-----------|
| Nom complet    | `first_name + last_name` (S1) | `complete_name` (S2) / `nom_prenom` (S4) | Concaténation ou parsing |
| Salaire        | `salary_eur` (S1) | `monthlySalaryDzd` (S3) | Conversion → USD (×1.08, ×0.0074) |
| Département    | Table `departments` (S1) | Texte `business_unit` (S2) | Normalisation par dictionnaire |
| Identifiant    | `emp_id`, `matricule`, `consultant_code`, `legacy_id` | (toutes sources) | Réconciliation FS |
| Modèle         | XML arbre (S5), Graphe (S6) | Relationnel global | Aplatissement, traversée |

**Référence** : Spaccapietra & Parent (1991), *Model Independent Assertions for
Integration of Heterogeneous Schemas*. Tous les six types y figurent.

---

## Scénario 10 — Comparaison GAV vs LAV (chiffrée)

**Objectif** : donner des chiffres pour le rapport.

**Mesure** : exécuter la même requête en GAV puis en LAV et noter :
- temps moyen sur 10 exécutions ;
- nombre de sources interrogées ;
- nombre de lignes retournées avant et après réconciliation.

**Résultats attendus** (ordre de grandeur) :

| Critère | GAV | LAV (Bucket) |
|--------|------|--------------|
| Temps moyen (ms) | 15-25 | 20-35 |
| Sources interrogées | 5 (toutes) | 3-4 (sélection) |
| Lignes brutes | 20-25 | 15-20 |
| Lignes après ER | 8-10 | 8-10 |

**Interprétation** : LAV est **plus sélectif** (n'interroge que les sources
strictement nécessaires) mais paie un léger surcoût de planification.

---

## Tip pour la présentation orale

Garder cette progression :

1. **Schéma global** → 30 secondes
2. **GAV** → 1 minute (avec dépliement visible)
3. **LAV Bucket** → 1 minute (avec phase 1 + phase 2)
4. **MiniCon** → 30 secondes (mention théorique)
5. **Réconciliation** → 1 minute
6. **RBAC** → 30 secondes
7. **Démo "ajout source"** → 30 secondes (effet "waouh")
8. **Synthèse théorique** → 1 minute

Total : ~6 minutes de démo + 2 minutes de questions.
