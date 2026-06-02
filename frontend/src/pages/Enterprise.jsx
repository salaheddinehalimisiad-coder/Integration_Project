import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import CodeMirror from '@uiw/react-codemirror';
import { sql as sqlLang } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  Activity,
  ArrowRight,
  BarChart as BarChartIcon,
  Braces,
  CheckCircle2,
  Database,
  Download,
  GitBranch,
  History,
  Layers3,
  LogOut,
  Network,
  Play,
  RefreshCw,
  Shield,
  Sun,
  Moon,
  Table2,
  Timer,
  UserRound,
  Sparkles,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useTheme } from '../components/Theme/ThemeProvider';
import AnimatedIcon from '../components/UI/AnimatedIcon';
import './Enterprise.css';

const API = 'http://localhost:5001';

const DEMO_QUERIES = [
  {
    label: 'Employés actifs',
    sql: "SELECT full_name, email, department_name, country FROM GlobalEmployee WHERE status = 'ACTIVE';",
  },
  {
    label: 'Jointure employés × projets',
    sql: `SELECT e.full_name, p.project_name, a.role, a.allocation_rate
FROM GlobalEmployee e
JOIN GlobalAssignment a ON e.employee_id = a.employee_id
JOIN GlobalProject p ON a.project_id = p.project_id
WHERE p.status = 'ACTIVE';`,
  },
  {
    label: 'Finance sécurisée (RBAC)',
    sql: `SELECT e.full_name, e.department_name, pay.salary_usd, pay.bonus_usd, pay.risk_level
FROM GlobalEmployee e
JOIN GlobalPayroll pay ON e.employee_id = pay.employee_id
WHERE pay.salary_usd > 2000;`,
  },
  {
    label: 'Agrégation par département',
    sql: "SELECT department_name, COUNT(*) AS employee_count FROM GlobalEmployee WHERE status = 'ACTIVE' GROUP BY department_name;",
  },
  {
    label: 'Vérification d\'ajout source',
    sql: "SELECT full_name, email, department_name FROM GlobalEmployee WHERE department_name = 'AI Lab';",
  },
  {
    label: 'XML + Graphe',
    sql: "SELECT full_name, performance_score, skills FROM GlobalEmployee WHERE status = 'ACTIVE';",
  },
];

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];

export default function Enterprise({ user, onLogout }) {
  const { theme, toggleTheme } = useTheme();

  // ── Auth & headers
  const [token] = useState(localStorage.getItem('dm_token') || '');
  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  // ── Metadata & sources
  const [schema, setSchema] = useState({});
  const [sources, setSources] = useState([]);
  const [mappings, setMappings] = useState({ gav: {}, lav: [], conflicts: [] });
  const [dbMode, setDbMode] = useState('SQLITE');
  const [sourcesHealth, setSourcesHealth] = useState({});

  // ── Query state
  const [mode, setMode] = useState('GAV');
  const [sqlText, setSqlText] = useState(DEMO_QUERIES[0].sql);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [appLoading, setAppLoading] = useState(true);

  // ── History
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dm_history') || '[]'); } catch { return []; }
  });

  // ── Initial fetch
  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/schema/global`).then(r => setSchema(r.data.schema || {})).catch(() => {}),
      axios.get(`${API}/api/schema/sources`).then(r => setSources(r.data.sources || [])).catch(() => {}),
      axios.get(`${API}/api/mappings`).then(r => setMappings(r.data || {})).catch(() => {}),
      axios.get(`${API}/api/health/db_mode`).then(r => setDbMode(r.data?.mode || 'SQLITE')).catch(() => {}),
    ]).finally(() => setTimeout(() => setAppLoading(false), 400));
  }, []);

  // ── Health ping
  useEffect(() => {
    const ping = () => {
      axios.get(`${API}/api/health`).then(r => {
        const map = {};
        (r.data?.sources || []).forEach(s => { map[s.id] = s.online; });
        setSourcesHealth(map);
      }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 15000);
    return () => clearInterval(id);
  }, []);

  // ── Execute query
  const execute = useCallback(async () => {
    if (!sqlText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(
        `${API}/api/query/execute`,
        { sql: sqlText, mode },
        { headers },
      );
      setResult(data);
      setHistory(prev => {
        const trimmed = sqlText.trim().replace(/\s+/g, ' ').slice(0, 90);
        const next = [{ sql: trimmed, mode, ts: Date.now() }, ...prev.filter(h => h.sql !== trimmed)].slice(0, 10);
        localStorage.setItem('dm_history', JSON.stringify(next));
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur d\'exécution.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [sqlText, mode, headers]);

  // ── Shortcuts
  const onEditorKey = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      execute();
    }
  }, [execute]);

  const addDemo = async () => {
    setBusy(true); setError('');
    try {
      await axios.post(`${API}/api/admin/add-demo-employee`, {}, { headers });
      await execute();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ajout impossible.');
    } finally { setBusy(false); }
  };

  const resetSources = async () => {
    setBusy(true); setError('');
    try {
      await axios.post(`${API}/api/admin/reset-sources`, {}, { headers });
      await execute();
    } catch (err) {
      setError(err.response?.data?.detail || 'Réinitialisation impossible.');
    } finally { setBusy(false); }
  };

  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text('Rapport de Médiation — DataMediator', 14, 18);
    doc.setFontSize(10);
    doc.text(`Date : ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Stratégie : ${result.plan?.strategy || mode}`, 14, 34);
    doc.text(`Temps : ${result.execution_ms} ms · Lignes : ${result.row_count}`, 14, 40);
    doc.text(`Réconciliations : ${result.reconciliation?.length || 0}`, 14, 46);
    const head = [result.columns];
    const body = result.rows.map(r => result.columns.map(c => String(r[c] ?? '')));
    doc.autoTable({ startY: 54, head, body, theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, styles: { fontSize: 8 } });
    doc.save(`DataMediator_${Date.now()}.pdf`);
  };

  // ── App-level loader (initial)
  if (appLoading) {
    return (
      <div className="ent-bootstrap">
        <motion.div
          className="ent-bootstrap__mark"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img src="/logo.png" alt="DataMediator" style={{ width: 48, height: 48 }} />
        </motion.div>
        <h2 className="h3">DataMediator</h2>
        <p className="muted">Chargement du schéma global et des sources…</p>
        <motion.div
          className="ent-bootstrap__bar"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.0, ease: 'easeInOut' }}
        />
      </div>
    );
  }

  return (
    <div className="ds-shell">
      {/* ============ SIDEBAR ============ */}
      <aside className="ds-shell__sidebar">
        <div className="ds-brand">
          <div className="ds-brand__mark"><img src="/logo.png" alt="Logo" style={{ width: 22, height: 22 }} /></div>
          <div>
            <div className="ds-brand__name">DataMediator</div>
            <div className="ds-brand__tag">GAV · LAV · Réconciliation</div>
          </div>
        </div>

        <div className={`ds-badge ${dbMode === 'DOCKER' ? 'ds-badge--success' : 'ds-badge--warning'}`}>
          <span className={`ds-dot ${dbMode === 'DOCKER' ? 'ds-dot--online' : 'ds-dot--idle'}`} />
          {dbMode === 'DOCKER' ? 'Mode Docker (SGBD réels)' : 'Mode SQLite (local)'}
        </div>

        {/* User card */}
        <div className="ent-user">
          <AnimatedIcon icon={UserRound} color="brand" size={18} className="ent-user__avatar-ani" />
          <div className="ent-user__body">
            <div className="ent-user__name">{user?.name || user?.username}</div>
            <div className="ds-badge ds-badge--brand"><Shield size={11} /> {user?.role}</div>
          </div>
          <button
            type="button"
            className="ds-btn ds-btn--ghost ds-btn--icon"
            title="Déconnexion"
            onClick={onLogout}
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Sources */}
        <div className="ds-side-section">
          <div className="ds-side-section__title">
            <Database /> Sources connectées
          </div>
          <div className="col gap-2">
            {sources.length === 0 && <div className="ds-skeleton" style={{ height: 48 }} />}
            {sources.map(s => (
              <div className="ds-source-row" key={s.id}>
                <span className="ds-source-row__id">{s.id}</span>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <span className="ds-source-row__name">{s.name}</span>
                  <span className="ds-source-row__kind">{s.kind}</span>
                </div>
                <span
                  className={`ds-dot ${sourcesHealth[s.id] === false ? 'ds-dot--offline' : 'ds-dot--online'}`}
                  title={sourcesHealth[s.id] === false ? 'Hors ligne' : 'En ligne'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="ds-side-section">
            <div className="ds-side-section__title row between" style={{ width: '100%' }}>
              <span className="row gap-2"><History size={14} /> Historique</span>
              <button
                className="ds-btn ds-btn--ghost ds-btn--sm"
                onClick={() => { setHistory([]); localStorage.removeItem('dm_history'); }}
              >
                Effacer
              </button>
            </div>
            <div className="col gap-1">
              {history.map((h, i) => (
                <button
                  key={i}
                  className="ent-history"
                  onClick={() => { setSqlText(h.sql + (h.sql.endsWith(';') ? '' : ';')); setMode(h.mode); }}
                  title={h.sql}
                >
                  <span className="ent-history__mode">{h.mode}</span>
                  <span className="ent-history__sql">{h.sql}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ============ MAIN ============ */}
      <div className="ds-shell__main">
        <header className="ds-shell__topbar">
          <div className="col gap-1">
            <h1 className="h3" style={{ margin: 0 }}>Console de médiation virtuelle</h1>
            <p className="muted text-sm" style={{ margin: 0 }}>
              Schéma global RH · Projets · Finance · Évaluations · Compétences
            </p>
          </div>
          <div className="row gap-3">
            <div className="ds-segmented" role="tablist" aria-label="Stratégie de réécriture">
              <button
                className={`ds-segmented__btn ${mode === 'GAV' ? 'ds-segmented__btn--active' : ''}`}
                onClick={() => setMode('GAV')}
              >
                GAV
              </button>
              <button
                className={`ds-segmented__btn ${mode === 'LAV' ? 'ds-segmented__btn--active' : ''}`}
                onClick={() => setMode('LAV')}
              >
                LAV Bucket
              </button>
            </div>
            <button
              type="button"
              className="ds-btn ds-btn--ghost ds-btn--icon"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <div className="ds-shell__content">
          {/* ===== Query editor ===== */}
          <section className="ds-card ds-card--elevated">
            <div className="ds-card__header">
              <div className="ds-card__title">
                <Braces size={16} /> Requête SQL globale
              </div>
              <div className="row gap-2 wrap">
                <button className="ds-btn ds-btn--secondary ds-btn--sm" onClick={addDemo} disabled={busy || loading}>
                  <Sparkles size={14} /> Ajouter ligne source
                </button>
                <button className="ds-btn ds-btn--secondary ds-btn--sm" onClick={resetSources} disabled={busy || loading}>
                  <RefreshCw size={14} className={busy ? 'ds-spin' : ''} /> Réinitialiser
                </button>
                {result && (
                  <button className="ds-btn ds-btn--success ds-btn--sm" onClick={exportPDF}>
                    <Download size={14} /> PDF
                  </button>
                )}
                <button className="ds-btn ds-btn--primary ds-btn--sm" onClick={execute} disabled={loading}>
                  {loading ? <RefreshCw size={14} className="ds-spin" /> : <Play size={14} />}
                  Exécuter
                </button>
              </div>
            </div>

            <div className="ds-editor" onKeyDown={onEditorKey} tabIndex={-1}>
              <CodeMirror
                value={sqlText}
                height="160px"
                extensions={[sqlLang()]}
                theme={oneDark}
                onChange={(val) => setSqlText(val)}
                basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
              />
            </div>

            <div className="row wrap gap-2 mt-4">
              {DEMO_QUERIES.map(q => (
                <button key={q.label} className="ds-chip" onClick={() => setSqlText(q.sql)}>
                  {q.label}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="ds-alert ds-alert--danger mt-4"
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                >
                  <Shield size={16} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="muted text-xs mt-4">
              Astuce : <kbd className="mono">Ctrl</kbd> + <kbd className="mono">Entrée</kbd> pour exécuter.
            </p>
          </section>

          {/* ===== Metrics ===== */}
          <section className="ds-metric-grid">
            <Metric icon={<Table2 size={18} />} label="Lignes retournées" value={result?.row_count ?? '—'} />
            <Metric icon={<Timer size={18} />} label="Temps d'exécution" value={result ? `${result.execution_ms} ms` : '—'} />
            <Metric icon={<GitBranch size={18} />} label="Stratégie" value={result?.plan?.strategy || mode} />
            <Metric icon={<Layers3 size={18} />} label="Entités fusionnées" value={result?.reconciliation?.length ?? 0} />
          </section>

          {/* ===== Pedagogical proof panel ===== */}
          <ProofPanel result={result} mode={mode} />

          {/* ===== Results + Plan ===== */}
          <section className="ent-grid-2">
            <ResultPanel result={result} loading={loading} />
            <PlanPanel result={result} mode={mode} />
          </section>

          {/* ===== Charts ===== */}
          <ChartsPanel result={result} />

          {/* ===== Schema + Mappings ===== */}
          <section className="ent-grid-2">
            <SchemaPanel schema={schema} />
            <MappingPanel mappings={mappings} />
          </section>
        </div>
      </div>
    </div>
  );
}

/* ===================== sub-components ===================== */

function Metric({ icon, label, value }) {
  const colorMap = {
    "Lignes retournées": "info",
    "Temps d'exécution": "warning",
    "Stratégie": "brand",
    "Entités fusionnées": "success"
  };
  return (
    <div className="ds-metric">
      <div className="ds-metric__header">
        <span className="ds-metric__label">{label}</span>
        <AnimatedIcon icon={icon.type} color={colorMap[label] || "brand"} size={16} className="ds-metric__ani" />
      </div>
      <div className="ds-metric__value">{value}</div>
    </div>
  );
}

function ProofPanel({ result, mode }) {
  const localQueries = result?.plan?.local_queries || [];
  const lavViews = result?.plan?.chosen_views || [];
  const sources = result?.plan?.strategy === 'GAV'
    ? [...new Set(localQueries.map(q => q.source))]
    : [...new Set(lavViews.map(v => v.source))];

  const steps = [
    {
      n: 1, title: 'Requête globale',
      text: 'L\'utilisateur interroge uniquement le schéma global, sans connaître les sources.',
    },
    {
      n: 2, title: `Réécriture ${result?.plan?.strategy || mode}`,
      text: result
        ? `${sources.length} source(s) locale(s) sélectionnée(s).`
        : 'Exécutez une requête pour visualiser la réécriture.',
    },
    {
      n: 3, title: 'Propagation locale',
      text: result ? (sources.join(', ') || 'Sources calculées par le médiateur') : 'Les sous-requêtes apparaîtront dans le plan d\'exécution.',
    },
    {
      n: 4, title: 'Résultat consolidé',
      text: result
        ? `${result.row_count} ligne(s) après jointure, droits et réconciliation.`
        : 'Le résultat global est renvoyé sous forme tabulaire.',
    },
  ];

  return (
    <section className="ds-card">
      <div className="ds-card__header">
        <div className="ds-card__title">
          <CheckCircle2 size={16} /> Preuve pédagogique
        </div>
      </div>
      <div className="ent-proof">
        {steps.map((s) => (
          <div className="ent-proof__step" key={s.n}>
            <div className="ent-proof__num">{s.n}</div>
            <div>
              <strong>{s.title}</strong>
              <span>{s.text}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultPanel({ result, loading }) {
  return (
    <div className="ds-card">
      <div className="ds-card__header">
        <div className="ds-card__title"><Table2 size={16} /> Résultats consolidés</div>
        {result && <span className="ds-badge ds-badge--brand">{result.row_count} ligne(s)</span>}
      </div>

      {loading && (
        <div className="ent-empty">
          <RefreshCw size={20} className="ds-spin" />
          <span>Réécriture & exécution distribuée…</span>
        </div>
      )}

      {!loading && !result && (
        <div className="ent-empty">
          <Database size={20} />
          <span>Exécutez une requête pour voir les résultats consolidés.</span>
        </div>
      )}

      {!loading && result && result.rows.length === 0 && (
        <div className="ent-empty">
          <span>Aucune ligne ne correspond aux critères.</span>
        </div>
      )}

      {!loading && result && result.rows.length > 0 && (
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i}>
                  {result.columns.map(c => <td key={c}>{String(row[c] ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PlanPanel({ result, mode }) {
  if (!result) {
    return (
      <div className="ds-card">
        <div className="ds-card__header">
          <div className="ds-card__title"><GitBranch size={16} /> Plan d'exécution virtuel</div>
        </div>
        <div className="ent-empty">
          <GitBranch size={20} />
          <span>Le flux {mode} apparaîtra après exécution.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-card">
      <div className="ds-card__header">
        <div className="ds-card__title">
          <GitBranch size={16} /> Plan d'exécution
        </div>
        <span className="ds-badge ds-badge--brand">{result.plan?.strategy}</span>
      </div>

      <div className="ds-flow">
        <div className="ds-flow__node ds-flow__node--brand">Requête globale (SQL)</div>
        <ArrowDownIcon />
        <div className="ds-flow__node ds-flow__node--mono">
          Moteur de réécriture · {result.plan?.strategy}
        </div>
        <ArrowDownIcon />

        <div className="ds-flow__row">
          {result.plan?.local_queries?.map((q, i) => (
            <motion.div
              key={i}
              className="ds-flow__source-card"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="ds-flow__source-card__head"><Database size={11} /> {q.source}</div>
              <div className="ds-flow__source-card__body">{q.query}</div>
            </motion.div>
          ))}
          {result.plan?.chosen_views?.map((v, i) => (
            <motion.div
              key={`v-${i}`}
              className="ds-flow__source-card"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="ds-flow__source-card__head"><Database size={11} /> {v.source}</div>
              <div className="ds-flow__source-card__body">
                <strong>{v.view}</strong>
                <br />
                {Array.isArray(v.provides) ? v.provides.join(', ') : ''}
              </div>
            </motion.div>
          ))}
        </div>

        <ArrowDownIcon />
        <div className="ds-flow__node ds-flow__node--success">
          Jointure + réconciliation ({result.reconciliation?.length || 0} fusion·s)
        </div>
        <ArrowDownIcon />
        <div className="ds-flow__node ds-flow__node--brand">
          {result.row_count} ligne(s) finales
        </div>
      </div>
    </div>
  );
}

function ArrowDownIcon() {
  return <div className="ds-flow__arrow"><ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} /></div>;
}

function SchemaPanel({ schema }) {
  return (
    <div className="ds-card">
      <div className="ds-card__header">
        <div className="ds-card__title"><Network size={16} /> Schéma global virtuel</div>
      </div>
      <div className="ent-schema-grid">
        {Object.entries(schema || {}).map(([table, cols]) => (
          <div className="ent-schema" key={table}>
            <div className="ent-schema__head">{table}</div>
            <ul>
              {(cols || []).map(c => (
                <li key={c.name}>
                  <span>{c.name}</span>
                  <em>{c.type}</em>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function MappingPanel({ mappings }) {
  return (
    <div className="ds-card">
      <div className="ds-card__header">
        <div className="ds-card__title"><Layers3 size={16} /> Mappings GAV / LAV</div>
      </div>
      <div className="ent-mappings">
        {Object.entries(mappings.gav || {}).map(([table, rules]) => (
          <div className="ent-mapping" key={table}>
            <strong>{table}</strong>
            {(rules || []).map(r => (
              <div className="ent-mapping__row" key={`${table}-${r.source}`}>
                <span className="ds-badge ds-badge--brand">{r.source}</span>
                <span className="text-sm text-secondary">{r.description}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="ent-mapping">
          <strong>Vues LAV</strong>
          {(mappings.lav || []).map(v => (
            <div className="ent-mapping__row" key={v.view}>
              <span className="ds-badge ds-badge--neutral mono">{v.view}</span>
              <span className="text-sm text-secondary">→ {v.predicate}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartsPanel({ result }) {
  if (!result || !result.rows?.length) return null;

  const hasCountry = result.columns.includes('country');
  const hasDept    = result.columns.includes('department_name');
  if (!hasCountry && !hasDept) return null;

  const countByKey = (key) => {
    const acc = {};
    result.rows.forEach(r => {
      const k = r[key] || 'Inconnu';
      acc[k] = (acc[k] || 0) + 1;
    });
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  };

  const cData = hasCountry ? countByKey('country') : [];
  const dData = hasDept    ? countByKey('department_name') : [];

  return (
    <section className="ent-grid-2">
      {hasCountry && (
        <div className="ds-card">
          <div className="ds-card__header">
            <div className="ds-card__title"><PieChartIcon size={16} /> Répartition par pays</div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={cData} dataKey="value" cx="50%" cy="50%" outerRadius={90}
                     label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {cData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {hasDept && (
        <div className="ds-card">
          <div className="ds-card__header">
            <div className="ds-card__title"><BarChartIcon size={16} /> Effectif par département</div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={dData}>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-tertiary)" tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
