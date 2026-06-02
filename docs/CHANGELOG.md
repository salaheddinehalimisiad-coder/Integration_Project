# Changelog — DataMediator Pro

## [3.2.0] — 2026-05

### Backend

**Nouveau**
- **Parseur SQL robuste** basé sur `sqlglot` (`sql_parser.py`). Le `QueryEngine` l'utilise en priorité (fallback regex si indisponible). Support OR, LIKE, IN, BETWEEN, IS NULL, sous-requêtes, agrégations multiples, ORDER BY multi-colonnes.
- **Algorithme MiniCon** (Pottinger & Halevy 2001) dans `mini_con.py` avec construction de MCDs et combinaison par partitions.
- Endpoint **`POST /api/query/minicon`** : retourne le plan MiniCon (MCDs + rewritings + comparaison vs Bucket).
- Module **audit trail** (`audit_log.py`) — journal append-only SQLite, thread-safe, lazy-init.
- Endpoints **`GET /api/audit/log`** et **`GET /api/audit/stats`** (réservés ADMIN/HR_MANAGER).
- Endpoint **`GET /api/version`** avec les capabilities détectées (sqlglot, bcrypt, JWT, rate-limit, audit).
- Module **`security.py`** unifié : `RateLimiter` sliding-window + `JWTValidator` + `get_client_ip`.
- **Authentification durcie** : bcrypt sur les hash de mots de passe, JWT signé HS256 avec expiration 8 h, rate limit 5 tentatives / 60 s sur `/api/auth/login`.
- Module **réconciliation** dédié (`entity_resolution.py`) : blocking par préfixe d'email + soundex, scoring Fellegi-Sunter, union-find, fusion priorisée + détection de conflits.
- Script **`bench.py`** pour mesurer GAV vs LAV (mean / min / max / stdev / CSV export).
- Tests de propriété **`tests/test_properties.py`** (GAV ≡ LAV, RBAC, auth JWT, réconciliation, MiniCon).
- Documentation académique : `docs/formalisme.md` (Datalog GAV/LAV/GLAV + Spaccapietra-Parent + bibliographie), `docs/architecture.md` (4 diagrammes Mermaid), `docs/scenarios.md` (10 scénarios de soutenance).

**Corrigé**
- `time` et `datetime` manquants à l'import dans `main.py`.
- `pydantic-settings` ajouté à `requirements.txt`.
- Logs `result.get('data', [])` → `result.get('rows', [])`.
- Trois fichiers Python tronqués restaurés.
- Login `auth_login` reçoit `Request` pour récupérer l'IP cliente.
- `audit_log` callé sur SUCCESS / FAILURE / DENIED / RATE_LIMITED de `QUERY_EXECUTE`.

### Frontend

**Nouveau**
- **Architecture multi-pages** avec React Router et `AppLayout` partagé.
- **Design system enterprise** (`styles/design-system.css`, ~24 Ko) avec tokens, primitives, thème sombre/clair.
- **Layer premium** (`styles/premium.css`, ~14 Ko) : 8 gradients, glassmorphism, mesh background animé, orbs flottants, hero header, KPI premium avec sparklines, status pulse, gradient text/cards.
- **Composants UI premium** : `HeroHeader`, `AnimatedCounter`, `Sparkline`, `GlowCard`, `Skeleton`, `EmptyState`, `ErrorBoundary`.
- **Système de toasts** (`ToastProvider`) avec auto-dismiss + 4 types.
- **Command palette `⌘K`** avec 15 commandes groupées (Navigation, Réécriture, Apparence, Admin, Session).
- **Gestion 401 centralisée** : intercepteur axios + `onSessionExpired` callbacks → toast warning + redirection login.
- **Pages dédiées** : `Dashboard`, `Console`, `Sources`, `Schema`, `Reconciliation`, `Conflicts`, `Analytics`, `RBAC`, `Audit`.
- **Visualisations interactives SVG** : graphe ER schéma global, clusters de réconciliation hub-and-spoke, heatmap des conflits par type × source.
- **Page Audit** (`/audit`) avec KPIs animés, table filtrable, leaderboards top utilisateurs / actions.
- **Sidebar premium** avec gradient brand, search trigger, badge utilisateur, navigation avec marqueur actif gradient.
- **Login premium** : split-screen avec mesh gradient violet-rose-cyan, orbs flottants animés, 4 stats animés, 3 highlights, carte glass.

**Corrigé**
- `HelmetProvider` ajouté à `App.jsx` (sans ça, `SEO` crashait).
- 9 variables non déclarées dans l'ancien `Enterprise.jsx`.
- `ThemeProvider` simplifié — ne pose plus que `data-theme`.
- Login utilise désormais `lib/api.js` (gestion 401 centralisée + rate-limit distingué).
- Tous les fichiers JSX parsent (43/43).

### Outils

**Nouveau**
- Script **`start.ps1`** revu : vérifie pré-requis, installe deps, libère ports, régénère sources, lance backend + frontend.
- `sources/setup_enterprise_sources.py` avec mode `--verify` qui imprime un rapport de cohérence.

---

## [3.1.0] et antérieures

Version initiale du projet. Cf. `STRUCTURE_FINALE.md`.
