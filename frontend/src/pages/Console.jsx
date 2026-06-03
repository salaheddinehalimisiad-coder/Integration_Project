import { useCallback, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CodeMirror from '@uiw/react-codemirror';
import { sql as sqlLang } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  Activity, ArrowRight, Braces, Database, Download, GitBranch,
  Layers3, Play, RefreshCw, Shield, Table2, Timer, Sparkles, AlertCircle,
  Zap, BarChart3, CheckCircle2, TrendingUp,
} from 'lucide-react';
import { api, describeError } from '../lib/api';
import { Skeleton, SkeletonTable } from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';

const DEMO_QUERIES = [
  { label: 'Employés actifs (Filtre simple)', sql: "SELECT full_name, email, department_name, country FROM GlobalEmployee WHERE status = 'ACTIVE';" },
  { label: 'Recherche par compétence (LIKE)', sql: "SELECT full_name, email, skills FROM GlobalEmployee WHERE skills LIKE '%Python%';" },
  { label: 'Croisement Employés × Projets',
    sql: `SELECT e.full_name, p.project_name, a.role, a.allocation_rate
FROM GlobalEmployee e
JOIN GlobalAssignment a ON e.employee_id = a.employee_id
JOIN GlobalProject p ON a.project_id = p.project_id
WHERE p.status = 'ACTIVE';` },
  { label: 'Salaires & Accès restreint (RBAC)',
    sql: `SELECT e.full_name, pay.salary_usd, pay.bonus_usd, pay.risk_level
FROM GlobalEmployee e
JOIN GlobalPayroll pay ON e.employee_id = pay.employee_id
WHERE pay.salary_usd > 2000;` },
  { label: 'Agrégation par département', sql: "SELECT department_name, COUNT(*) AS employee_count FROM GlobalEmployee WHERE status = 'ACTIVE' GROUP BY department_name;" },
  { label: 'Budget total par niveau de risque', sql: "SELECT risk_level, SUM(salary_usd) AS total_salary FROM GlobalPayroll GROUP BY risk_level;" },
  { label: 'Top Performers (XML/Graph)', sql: "SELECT full_name, performance_score, skills FROM GlobalEmployee WHERE performance_score > 90;" },
  { label: 'Vérification Temps Réel (AI Lab)', sql: "SELECT full_name, email, department_name FROM GlobalEmployee WHERE department_name = 'AI Lab';" },
  { label: 'Filtrage multi-critères (Pays + Statut)', sql: "SELECT full_name, country, department_name FROM GlobalEmployee WHERE country = 'DZ' AND status = 'ACTIVE';" },
];

export default function Console() {
  const { mode, toast } = useOutletContext();
  const [sqlText, setSqlText]   = useState(DEMO_QUERIES[0].sql);
  const [result, setResult]     = useState(null);
  const [resultAlt, setResultAlt] = useState(null);   // résultat mode alternatif
  const [loading, setLoading]   = useState(false);
  const [loadingAlt, setLoadingAlt] = useState(false);
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [compareMode, setCompareMode] = useState(false);  // GAV vs LAV

  const execute = useCallback(async () => {
    if (!sqlText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.execute(sqlText, mode);
      setResult(data);
      toast?.success?.(`${data.row_count} ligne(s) retournée(s)`, `${mode} · ${data.execution_ms} ms`);
    } catch (err) {
      const msg = describeError(err);
      setError(msg);
      setResult(null);
      toast?.error?.('Erreur d\'exécution', msg);
    } finally {
      setLoading(false);
    }
  }, [sqlText, mode, toast]);

  const executeCompare = useCallback(async () => {
    if (!sqlText.trim()) return;
    setLoading(true);
    setLoadingAlt(true);
    setError('');
    setResult(null);
    setResultAlt(null);
    try {
      const [gav, lav] = await Promise.all([
        api.execute(sqlText, 'GAV'),
        api.execute(sqlText, 'LAV'),
      ]);
      setResult(gav);
      setResultAlt(lav);
      toast?.success?.('Comparaison GAV / LAV terminée', `GAV: ${gav.execution_ms} ms · LAV: ${lav.execution_ms} ms`);
    } catch (err) {
      const msg = describeError(err);
      setError(msg);
      toast?.error?.('Erreur d\'exécution', msg);
    } finally {
      setLoading(false);
      setLoadingAlt(false);
    }
  }, [sqlText, toast]);

  const onEditorKey = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      compareMode ? executeCompare() : execute();
    }
  }, [execute, executeCompare, compareMode]);

  const addDemoEmployee = async () => {
    setBusy(true);
    try {
      const r = await api.addDemoEmployee();
      toast?.success?.('Ligne ajoutée', r.message || 'Visible immédiatement');
      await execute();
    } catch (err) {
      toast?.error?.('Échec', describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const getBase64Image = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      return null;
    }
  };

  const exportPDF = async () => {
    if (!result) return;
    const doc = new jsPDF();
    
    const logoData = await getBase64Image('/logo.png');

    // Header styling
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, 'F');
    
    if (logoData) {
      doc.addImage(logoData, 'PNG', 14, 8, 24, 24);
    }
    
    // Text inside header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text('DataMediator Pro', logoData ? 42 : 14, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Rapport d'Exécution de Médiation GAV / LAV", logoData ? 42 : 14, 28);
    
    // Meta Info Background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, 48, 182, 35, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(14, 48, 182, 35, 'S');

    // Meta Info Content
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Détails de l'exécution", 20, 56);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Date de génération :`, 20, 64);
    doc.text(`Stratégie utilisée :`, 20, 70);
    doc.text(`Temps d'exécution :`, 20, 76);

    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont("helvetica", "bold");
    doc.text(`${new Date().toLocaleString()}`, 60, 64);
    doc.text(`${result.plan?.strategy || mode}`, 60, 70);
    doc.text(`${result.execution_ms} ms`, 60, 76);

    // Stats
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Lignes retournées :`, 120, 64);
    doc.text(`Conflits résolus :`, 120, 70);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`${result.row_count}`, 155, 64);
    doc.text(`${result.reconciliation?.length || 0}`, 155, 70);

    // Table
    autoTable(doc, {
      startY: 90,
      head: [result.columns || []],
      body: (result.rows || []).map(r => (result.columns || []).map(c => String(r[c] ?? ''))),
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', halign: 'left' },
      bodyStyles: { textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.1 },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `DataMediator Pro — Généré automatiquement · Page ${i} sur ${pageCount}`,
        14,
        doc.internal.pageSize.height - 10
      );
    }

    doc.save(`DataMediator_Rapport_${Date.now()}.pdf`);
    toast?.success?.('PDF professionnel généré', 'Le téléchargement a commencé');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Editor ── */}
      <section className="ds-card ds-card--elevated">
        <div className="ds-card__header">
          <div className="ds-card__title"><Braces size={16} /> Requête SQL globale</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Toggle comparaison */}
            <div className="ds-segmented">
              <button
                className={`ds-segmented__btn ${!compareMode ? 'ds-segmented__btn--active' : ''}`}
                onClick={() => setCompareMode(false)}
              >
                <Play size={11} style={{ marginRight: 4 }} /> Mode normal
              </button>
              <button
                className={`ds-segmented__btn ${compareMode ? 'ds-segmented__btn--active' : ''}`}
                onClick={() => setCompareMode(true)}
              >
                <BarChart3 size={11} style={{ marginRight: 4 }} /> GAV vs LAV
              </button>
            </div>

            <button className="ds-btn ds-btn--secondary ds-btn--sm" onClick={addDemoEmployee} disabled={busy || loading}>
              <Sparkles size={14} /> Ajouter ligne S1
            </button>
            {result && (
              <button className="ds-btn ds-btn--success ds-btn--sm" onClick={exportPDF}>
                <Download size={14} /> PDF
              </button>
            )}
            <button
              className="ds-btn ds-btn--primary ds-btn--sm"
              onClick={compareMode ? executeCompare : execute}
              disabled={loading}
            >
              {loading ? <RefreshCw size={14} className="ds-spin" /> : <Play size={14} />}
              {compareMode ? 'Comparer GAV / LAV' : 'Exécuter'}
            </button>
          </div>
        </div>

        <div className="ds-editor" onKeyDown={onEditorKey} tabIndex={-1}>
          <CodeMirror
            value={sqlText}
            height="180px"
            extensions={[sqlLang()]}
            theme={oneDark}
            onChange={(val) => setSqlText(val)}
            basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {DEMO_QUERIES.map(q => (
            <button key={q.label} className="ds-chip" onClick={() => setSqlText(q.sql)}>
              {q.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div className="ds-alert ds-alert--danger" style={{ marginTop: 14 }}
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="muted text-xs" style={{ marginTop: 12 }}>
          Astuce : <kbd>Ctrl</kbd> + <kbd>Entrée</kbd> pour exécuter · Mode GAV vs LAV lance les deux en parallèle
        </p>
      </section>

      {/* ── Mode comparaison : panneau côte à côte ── */}
      {compareMode && (result || resultAlt || loading) && (
        <ComparePanel
          gavResult={result}
          lavResult={resultAlt}
          loading={loading}
        />
      )}

      {/* ── Mode normal : metrics + résultats ── */}
      {!compareMode && (
        <>
          <section className="ds-metric-grid">
            <Metric icon={<Table2 size={18} />}    label="Lignes"    value={result?.row_count ?? '—'} loading={loading} />
            <Metric icon={<Timer size={18} />}     label="Temps"     value={result ? `${result.execution_ms} ms` : '—'} loading={loading} />
            <Metric icon={<GitBranch size={18} />} label="Stratégie" value={result?.plan?.strategy || mode} loading={loading} />
            <Metric icon={<Layers3 size={18} />}   label="Fusions"   value={result?.reconciliation?.length ?? 0} loading={loading} />
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 16 }}>
            <ResultPanel result={result} loading={loading} />
            <PlanPanel result={result} mode={mode} />
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════ Compare Panel GAV vs LAV ═══════════════ */
function ComparePanel({ gavResult, lavResult, loading }) {
  const gav = gavResult;
  const lav = lavResult;

  // Calcul du gagnant
  const winner = gav && lav
    ? gav.execution_ms <= lav.execution_ms ? 'GAV' : 'LAV'
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Bannière récapitulative */}
      {winner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(79,70,229,0.12), rgba(16,185,129,0.08))',
            border: '1px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <Zap size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              <span style={{ color: 'var(--accent)' }}>{winner}</span> plus rapide de{' '}
              <span style={{ color: 'var(--success-500)' }}>
                {Math.abs((gav?.execution_ms || 0) - (lav?.execution_ms || 0))} ms
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              GAV: {gav?.execution_ms ?? '?'} ms · LAV: {lav?.execution_ms ?? '?'} ms
              · {gav?.row_count ?? '?'} lignes GAV · {lav?.row_count ?? '?'} lignes LAV
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <PerfBadge label="GAV" ms={gav?.execution_ms} winner={winner === 'GAV'} />
            <PerfBadge label="LAV" ms={lav?.execution_ms} winner={winner === 'LAV'} />
          </div>
        </motion.div>
      )}

      {/* Cartes métriques comparées */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        <ExecPanel label="GAV" color="var(--accent)" result={gav} loading={loading} />
        <ExecPanel label="LAV" color="var(--info-500)" result={lav} loading={loading} />
      </div>
    </div>
  );
}

function PerfBadge({ label, ms, winner }) {
  return (
    <div style={{
      padding: '6px 12px', borderRadius: 8, textAlign: 'center',
      background: winner ? 'rgba(16,185,129,0.15)' : 'var(--bg-surface-2)',
      border: `1px solid ${winner ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: winner ? 'var(--success-500)' : 'var(--text-tertiary)' }}>
        {label} {winner && <CheckCircle2 size={10} style={{ display: 'inline' }} />}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: winner ? 'var(--success-500)' : 'var(--text-primary)' }}>
        {ms ?? '—'}<span style={{ fontSize: 10, fontWeight: 400 }}> ms</span>
      </div>
    </div>
  );
}

function ExecPanel({ label, color, result, loading }) {
  const strategy = result?.plan?.strategy || label;
  const subCount  = (result?.plan?.local_queries || result?.plan?.chosen_views || []).length;
  const minicon   = result?.plan?.minicon;

  return (
    <div className="ds-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="ds-card__header">
        <div className="ds-card__title">
          <span style={{ color }}>{label}</span>
          {' · '}Plan d'exécution
        </div>
        {result && <span className="ds-badge ds-badge--brand">{strategy}</span>}
      </div>

      {/* Métriques rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        <MiniMetric label="Temps" value={result ? `${result.execution_ms} ms` : '—'} loading={loading} />
        <MiniMetric label="Lignes" value={result?.row_count ?? '—'} loading={loading} />
        <MiniMetric label="Sous-requêtes" value={subCount || '—'} loading={loading} />
      </div>

      {/* Flux */}
      {!loading && result && (
        <div className="ds-flow" style={{ marginBottom: 12 }}>
          <div className="ds-flow__node ds-flow__node--brand" style={{ backgroundColor: color, borderColor: color, color: 'white' }}>
            Requête SQL globale
          </div>
          <div className="ds-flow__arrow"><ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} /></div>
          <div className="ds-flow__node ds-flow__node--mono">
            Réécriture · {strategy}
          </div>
          <div className="ds-flow__arrow"><ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} /></div>
          <div className="ds-flow__row">
            {result.plan?.local_queries?.map((q, i) => (
              <motion.div key={i} className="ds-flow__source-card"
                initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
                <div className="ds-flow__source-card__head"><Database size={11} /> {q.source}</div>
                <div className="ds-flow__source-card__body">{q.query}</div>
              </motion.div>
            ))}
            {result.plan?.chosen_views?.map((v, i) => (
              <motion.div key={`v-${i}`} className="ds-flow__source-card"
                initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
                <div className="ds-flow__source-card__head"><Database size={11} /> {v.source}</div>
                <div className="ds-flow__source-card__body">
                  <strong>{v.view}</strong><br />
                  {Array.isArray(v.provides) ? v.provides.join(', ') : ''}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="ds-flow__arrow"><ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} /></div>
          <div className="ds-flow__node ds-flow__node--success">
            {result.row_count} ligne(s) · {result.reconciliation?.length || 0} fusions
          </div>
        </div>
      )}

      {/* MiniCon summary pour LAV */}
      {!loading && result && minicon && (
        <div style={{
          padding: 10, borderRadius: 8,
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-subtle)',
          fontSize: 11,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color }}>
            Analyse MiniCon
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, textAlign: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Buckets</div>
              <strong style={{ color: 'var(--danger-500)' }}>{minicon.comparison?.bucket_combinations ?? '?'}</strong>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>MCDs</div>
              <strong style={{ color: 'var(--info-500)' }}>{minicon.comparison?.minicon_mcds ?? '?'}</strong>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Réécritures</div>
              <strong style={{ color: 'var(--success-500)' }}>{minicon.comparison?.minicon_rewritings ?? '?'}</strong>
            </div>
          </div>
          <div style={{ color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            {minicon.mcds?.slice(0, 2).map((m, idx) => (
              <div key={idx}>• Vue <strong style={{ color }}>{m.view}</strong> → {JSON.stringify(m.covers_subgoals)}</div>
            ))}
          </div>
        </div>
      )}

      {loading && <SkeletonTable rows={3} cols={3} />}
      {!loading && !result && (
        <EmptyState icon={Database} title={`En attente d'exécution ${label}`} description="Cliquez sur Comparer pour lancer." />
      )}
    </div>
  );
}

function MiniMetric({ label, value, loading }) {
  return (
    <div style={{
      padding: '8px 10px', textAlign: 'center',
      background: 'var(--bg-surface-2)',
      borderRadius: 8, border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
        {loading ? <Skeleton width="60%" height={18} /> : value}
      </div>
    </div>
  );
}

/* ═══════════════ Normal mode components ═══════════════ */
function Metric({ icon, label, value, loading }) {
  return (
    <div className="ds-metric">
      <div className="ds-metric__header">
        <span className="ds-metric__label">{label}</span>
        <span className="ds-metric__icon">{icon}</span>
      </div>
      <div className="ds-metric__value">
        {loading ? <Skeleton width="50%" height={26} /> : value}
      </div>
    </div>
  );
}

function ResultPanel({ result, loading }) {
  return (
    <div className="ds-card">
      <div className="ds-card__header">
        <div className="ds-card__title"><Table2 size={16} /> Résultats consolidés</div>
        {result && <span className="ds-badge ds-badge--brand">{result.row_count} ligne(s)</span>}
      </div>
      {loading && <SkeletonTable rows={5} cols={4} />}
      {!loading && !result && (
        <EmptyState icon={Database} title="Aucune requête exécutée"
          description="Exécutez une requête pour voir les résultats consolidés." />
      )}
      {!loading && result && result.rows.length === 0 && (
        <EmptyState title="Aucune ligne ne correspond" description="Modifiez les critères de la requête." />
      )}
      {!loading && result && result.rows.length > 0 && (
        <div className="ds-table-wrap" style={{ maxHeight: 460, overflowY: 'auto' }}>
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
  const [activeTab, setActiveTab] = useState('flow');

  if (!result) {
    return (
      <div className="ds-card">
        <div className="ds-card__header">
          <div className="ds-card__title"><GitBranch size={16} /> Plan d'exécution {mode}</div>
        </div>
        <EmptyState icon={GitBranch} title={`Plan ${mode} en attente`}
          description="Le flux apparaîtra dès la première exécution." />
      </div>
    );
  }

  const minicon = result.plan?.minicon;

  return (
    <div className="ds-card">
      <div className="ds-card__header" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="ds-card__title"><GitBranch size={16} /> Plan d'exécution</div>
          <span className="ds-badge ds-badge--brand">{result.plan?.strategy}</span>
        </div>

        {minicon && (
          <div className="ds-segmented" style={{ width: 'fit-content' }}>
            <button className={`ds-segmented__btn ${activeTab === 'flow' ? 'ds-segmented__btn--active' : ''}`} onClick={() => setActiveTab('flow')}>
              Flux d'exécution
            </button>
            <button className={`ds-segmented__btn ${activeTab === 'minicon' ? 'ds-segmented__btn--active' : ''}`} onClick={() => setActiveTab('minicon')}>
              Analyse MiniCon
            </button>
          </div>
        )}
      </div>

      {activeTab === 'flow' ? (
        <div className="ds-flow">
          <div className="ds-flow__node ds-flow__node--brand">Requête globale (SQL)</div>
          <div className="ds-flow__arrow"><ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} /></div>
          <div className="ds-flow__node ds-flow__node--mono">Moteur de réécriture · {result.plan?.strategy}</div>
          <div className="ds-flow__arrow"><ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} /></div>
          <div className="ds-flow__row">
            {result.plan?.local_queries?.map((q, i) => (
              <motion.div key={i} className="ds-flow__source-card"
                initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
                <div className="ds-flow__source-card__head"><Database size={11} /> {q.source}</div>
                <div className="ds-flow__source-card__body">{q.query}</div>
              </motion.div>
            ))}
            {result.plan?.chosen_views?.map((v, i) => (
              <motion.div key={`v-${i}`} className="ds-flow__source-card"
                initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
                <div className="ds-flow__source-card__head"><Database size={11} /> {v.source}</div>
                <div className="ds-flow__source-card__body">
                  <strong>{v.view}</strong><br />
                  {Array.isArray(v.provides) ? v.provides.join(', ') : ''}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="ds-flow__arrow"><ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} /></div>
          <div className="ds-flow__node ds-flow__node--success">
            Jointure + réconciliation ({result.reconciliation?.length || 0})
          </div>
          <div className="ds-flow__arrow"><ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} /></div>
          <div className="ds-flow__node ds-flow__node--brand">{result.row_count} ligne(s) finales</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
            background: 'var(--bg-surface-2)', padding: 12, borderRadius: 8,
            border: '1px solid var(--border-subtle)', textAlign: 'center',
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Combinaisons Bucket</div>
              <strong style={{ fontSize: 18, color: 'var(--danger-500)' }}>{minicon.comparison?.bucket_combinations ?? '?'}</strong>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>MCDs construits</div>
              <strong style={{ fontSize: 18, color: 'var(--info-500)' }}>{minicon.comparison?.minicon_mcds ?? '?'}</strong>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Réécritures minimales</div>
              <strong style={{ fontSize: 18, color: 'var(--success-500)' }}>{minicon.comparison?.minicon_rewritings ?? '?'}</strong>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>MiniCon Descriptions (MCD) générées :</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
              {minicon.mcds?.map((m, idx) => (
                <div key={idx} style={{
                  fontSize: 11, background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-subtle)', padding: '6px 10px',
                  borderRadius: 6, display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>Vue <strong style={{ color: 'var(--accent)' }}>{m.view}</strong> couvre sous-but(s) : <strong>{JSON.stringify(m.covers_subgoals)}</strong></span>
                  <span className="mono" style={{ color: 'var(--text-tertiary)' }}>{JSON.stringify(m.homomorphism)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Trace algorithmique :</div>
            <div style={{
              background: 'var(--bg-subtle)', padding: 10, borderRadius: 6,
              fontSize: 11, fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)', lineHeight: 1.5,
            }}>
              {result.plan.trace.map((t, ti) => (
                <div key={ti}>⚡ {t}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
