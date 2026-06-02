import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Users, Briefcase, Layers3, AlertTriangle, Network,
  Sparkles, ArrowRight, Activity, ShieldCheck, Server, Cpu,
  Terminal, BarChart3, Workflow, Zap, Clock, CheckCircle2,
  TrendingUp, GitBranch, RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import HeroHeader from '../components/UI/HeroHeader';
import AnimatedCounter from '../components/UI/AnimatedCounter';
import Sparkline from '../components/UI/Sparkline';
import { Skeleton } from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';

/* ── Live activity feed item ── */
function useLiveFeed() {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    let alive = true;
    const fetchFeed = async () => {
      try {
        const data = await api.audit({ limit: 8 });
        if (alive && data?.events) {
          setFeed(data.events.slice(0, 8));
        }
      } catch (_) {}
    };
    fetchFeed();
    const interval = setInterval(fetchFeed, 15000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  return feed;
}

export default function Dashboard() {
  const { data: schema,  loading: schemaLoading  } = useApi(() => api.schema(),   []);
  const { data: sources, loading: sourcesLoading } = useApi(() => api.sources(),  []);
  const { data: dbMode }                            = useApi(() => api.dbMode(),   []);
  const { data: mappings }                          = useApi(() => api.mappings(), []);
  const { data: health,  reload: reloadHealth }     = useApi(() => api.health(),   []);
  const { data: auditStats }                        = useApi(() => api.auditStats(), []);
  const liveFeed = useLiveFeed();

  const stats = useMemo(() => {
    const tables      = schema?.schema ? Object.keys(schema.schema).length : 0;
    const srcCount    = sources?.sources?.length ?? 0;
    const onlineCount = health?.sources?.filter(s => s.online).length ?? srcCount;
    const conflicts   = mappings?.conflicts?.length ?? 0;
    const lavViews    = mappings?.lav?.length ?? 0;
    const gavRules    = mappings?.gav
      ? Object.values(mappings.gav).reduce((a, b) => a + b.length, 0)
      : 0;
    return { tables, srcCount, onlineCount, conflicts, lavViews, gavRules };
  }, [schema, sources, health, mappings]);

  return (
    <div className="mesh-bg" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── HERO ── */}
      <HeroHeader
        eyebrow={<><Sparkles size={12} /> Médiation virtuelle GAV / LAV</>}
        title="Une requête."
        subtitle="Interrogez le schéma global virtuel comme une base unique. Le médiateur prend en charge la réécriture, l'exécution distribuée, la réconciliation des entités et le contrôle d'accès."
        pills={[
          { icon: Server,      label: `${stats.onlineCount}/${stats.srcCount || 6} sources` },
          { icon: Network,     label: `${stats.tables} relations globales` },
          { icon: Layers3,     label: `${stats.lavViews} vues LAV` },
          { icon: ShieldCheck, label: `Mode ${dbMode?.mode || 'SQLITE'}` },
        ]}
      >
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(22px, 3vw, 36px)',
          fontWeight: 800, margin: '-6px 0 0', lineHeight: 1.1,
        }}>
          <span style={{
            background: 'linear-gradient(90deg, #fff 0%, #c7d2fe 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>
            Six sources hétérogènes.
          </span>
        </h2>
      </HeroHeader>

      {/* ── KPI CARDS ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <KpiPremium
          icon={Database} label="Sources connectées"
          value={stats.onlineCount} suffix={` / ${stats.srcCount || 6}`}
          trend="100% en ligne" trendDir="up"
          tone="brand" to="/sources"
          sparkData={[3, 4, 4, 5, 5, 6, 6]}
          loading={sourcesLoading}
        />
        <KpiPremium
          icon={Network} label="Relations globales"
          value={stats.tables} trend="5 entités · stable" trendDir="up"
          tone="ocean" to="/schema"
          sparkData={[5, 5, 5, 5, 5, 5, 5]}
          loading={schemaLoading}
        />
        <KpiPremium
          icon={Layers3} label="Vues LAV définies"
          value={stats.lavViews} trend="couverture complète" trendDir="up"
          tone="success" sparkData={[6, 7, 8, 8, 9, 9, 9]}
        />
        <KpiPremium
          icon={AlertTriangle} label="Conflits résolus"
          value={stats.conflicts} trend="8 types Spaccapietra" trendDir="up"
          tone="sunset" to="/conflicts" sparkData={[2, 4, 5, 6, 7, 7, 8]}
        />
      </section>

      {/* ── MAIN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
        <SourcesOverview sources={sources?.sources} health={health?.sources} loading={sourcesLoading} onReload={reloadHealth} />
        <RewritingStrategies gavRules={stats.gavRules} lavViews={stats.lavViews} />
      </div>

      {/* ── MEDIATION PIPELINE ── */}
      <MediationPipeline />

      {/* ── LIVE FEED + AUDIT STATS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
        <LiveActivityFeed feed={liveFeed} />
        <AuditKpis stats={auditStats} />
      </div>

      <QuickActions />
      <Footnote />
    </div>
  );
}

/* ═══════════════ KPI premium with sparkline ═══════════════ */
function KpiPremium({ icon: Icon, label, value, suffix, trend, trendDir, tone = 'brand', to, sparkData, loading }) {
  const inner = (
    <motion.div
      className={`kpi kpi--${tone}`}
      whileHover={to ? { y: -4 } : { y: -2 }}
      transition={{ duration: 0.18 }}
      style={{ cursor: to ? 'pointer' : 'default', minHeight: 132 }}
    >
      <div className="kpi__head">
        <span className="kpi__label">{label}</span>
        <span className="kpi__icon"><Icon size={18} /></span>
      </div>
      <div className="kpi__value">
        {loading
          ? <Skeleton width="50%" height={28} />
          : <><AnimatedCounter value={Number(value) || 0} />{suffix || ''}</>}
      </div>
      {trend && (
        <div className={`kpi__trend kpi__trend--${trendDir === 'down' ? 'down' : 'up'}`}>
          <Activity size={12} /> {trend}
        </div>
      )}
      {sparkData && (
        <div className="kpi__sparkline">
          <Sparkline data={sparkData} color={spkColor(tone)} />
        </div>
      )}
    </motion.div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function spkColor(tone) {
  return { brand: '#6366f1', ocean: '#0ea5e9', success: '#10b981', sunset: '#f59e0b', violet: '#a855f7', amber: '#f59e0b' }[tone] || '#6366f1';
}

/* ═══════════════ Sources overview ═══════════════ */
function SourcesOverview({ sources, health, loading, onReload }) {
  const [refreshing, setRefreshing] = useState(false);
  const healthMap = {};
  (health || []).forEach(s => { healthMap[s.id] = s.online; });

  const handleRefresh = async () => {
    setRefreshing(true);
    await onReload?.();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div className="ds-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="section" style={{ marginBottom: 4 }}>
        <div>
          <h3 className="section__title">Sources hétérogènes</h3>
          <p className="section__hint">État en temps réel des six connecteurs</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="ds-btn ds-btn--secondary ds-btn--sm"
            style={{ width: 32, height: 32, padding: 0, display: 'grid', placeItems: 'center' }}
            onClick={handleRefresh}
            title="Rafraîchir"
          >
            <RefreshCw size={13} className={refreshing ? 'ds-spin' : ''} />
          </button>
          <Link to="/sources" className="fancy-link" style={{ fontSize: 12 }}>
            Voir tout <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        {loading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={44} rounded="8px" />)}
        {!loading && (!sources || sources.length === 0) && (
          <EmptyState compact title="Aucune source détectée" />
        )}
        {!loading && sources?.map((s, i) => {
          const online = healthMap[s.id] !== false;
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                gap: 12, alignItems: 'center',
                padding: '10px 12px',
                background: 'var(--bg-surface-2)',
                border: `1px solid ${online ? 'var(--border-subtle)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: 'var(--r-md)',
                transition: 'all 0.16s var(--ease-out)',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                padding: '3px 8px',
                background: 'var(--grad-brand-soft)',
                border: '1px solid rgba(99,102,241,0.20)',
                color: 'var(--accent)', borderRadius: 4,
              }}>{s.id}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.kind}</div>
              </div>
              <span className={`status status--${online ? 'online' : 'offline'}`}>
                <span className="dot" />
                {online ? 'En ligne' : 'Hors ligne'}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════ Rewriting strategies ═══════════════ */
function RewritingStrategies({ gavRules, lavViews }) {
  return (
    <div className="ds-card">
      <div className="section" style={{ marginBottom: 14 }}>
        <div>
          <h3 className="section__title">Stratégies de réécriture</h3>
          <p className="section__hint">Deux approches mises en œuvre dans le médiateur</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <StrategyTile
          title="GAV" subtitle="Global as View" value={gavRules} unit="règle(s)"
          tone="brand"
          desc="Chaque relation globale est définie comme une vue sur les sources. Réécriture par dépliement direct."
        />
        <StrategyTile
          title="LAV" subtitle="Local as View" value={lavViews} unit="vue(s)"
          tone="ocean"
          desc="Chaque vue source est une CQ sur le schéma global. Réécriture par Bucket ou MiniCon."
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <Link to="/console" className="chip-pro"><Terminal size={13} /> Console SQL</Link>
        <Link to="/schema"  className="chip-pro"><Workflow size={13} /> Schéma</Link>
      </div>
    </div>
  );
}

function StrategyTile({ title, subtitle, value, unit, desc, tone }) {
  const grad = { brand: 'var(--grad-brand)', ocean: 'var(--grad-ocean)' }[tone];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        position: 'relative', overflow: 'hidden',
        padding: 16, background: 'var(--bg-surface-2)',
        border: '1px solid var(--border-subtle)', borderRadius: 12,
      }}
    >
      <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: grad }} />
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }} className="gradient-text">
        {title}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {subtitle}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', margin: '8px 0 2px' }}>
        <AnimatedCounter value={Number(value) || 0} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>{unit}</div>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{desc}</div>
    </motion.div>
  );
}

/* ═══════════════ Mediation Pipeline ═══════════════ */
function MediationPipeline() {
  const steps = [
    { icon: Terminal,    label: 'Requête SQL globale',       desc: 'Analysée par sqlglot AST',     color: '#6366f1' },
    { icon: ShieldCheck, label: 'Contrôle RBAC',             desc: 'Filtrage proactif colonnes',    color: '#10b981' },
    { icon: GitBranch,   label: 'Réécriture GAV / LAV',      desc: 'MiniCon ou Bucket Algorithm',  color: '#0ea5e9' },
    { icon: Database,    label: 'Exécution distribuée',       desc: '6 sources interrogées',         color: '#f59e0b' },
    { icon: Users,       label: 'Réconciliation Fellegi-Sunter', desc: 'Union-Find + blocking',     color: '#a855f7' },
    { icon: Zap,         label: 'Résultat consolidé',         desc: 'Réponse unifiée en JSON',      color: '#10b981' },
  ];

  return (
    <div className="ds-card">
      <div className="ds-card__header">
        <div className="ds-card__title"><Workflow size={16} /> Pipeline de médiation · vue complète</div>
      </div>
      <p className="muted text-sm" style={{ margin: '0 0 16px' }}>
        Chaque requête SQL globale traverse ces 6 étapes séquentiellement dans le moteur de médiation.
      </p>
      <div style={{
        display: 'flex', gap: 0, overflowX: 'auto',
        paddingBottom: 8,
      }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '12px 16px',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10, minWidth: 120, textAlign: 'center',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: `${step.color}18`,
                color: step.color,
                display: 'grid', placeItems: 'center',
                border: `1.5px solid ${step.color}35`,
              }}>
                <step.icon size={18} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{step.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.3 }}>{step.desc}</div>
              <div style={{
                fontSize: 9, fontWeight: 800,
                background: `${step.color}15`, color: step.color,
                padding: '2px 8px', borderRadius: 99,
              }}>Étape {i + 1}</div>
            </motion.div>
            {i < steps.length - 1 && (
              <div style={{
                width: 28, display: 'flex', justifyContent: 'center',
                color: 'var(--text-tertiary)', flexShrink: 0,
              }}>
                <ArrowRight size={14} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ Live Activity Feed ═══════════════ */
const OUTCOME_COLORS = {
  SUCCESS:      '#10b981',
  FAILURE:      '#ef4444',
  DENIED:       '#ef4444',
  RATE_LIMITED: '#f59e0b',
  ATTEMPT:      '#6b7280',
};

function LiveActivityFeed({ feed }) {
  return (
    <div className="ds-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="ds-card__header">
        <div className="ds-card__title">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} />
            Activité récente
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--success-500)',
              boxShadow: '0 0 0 3px rgba(16,185,129,0.2)',
              animation: 'pulse 2s infinite',
            }} />
          </span>
        </div>
        <Link to="/audit" className="fancy-link" style={{ fontSize: 12 }}>
          Journal complet <ArrowRight size={13} />
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AnimatePresence>
          {feed.length === 0 && (
            <EmptyState compact title="En attente d'activité..." />
          )}
          {feed.map((ev, i) => {
            const color = OUTCOME_COLORS[ev.outcome] || '#6b7280';
            return (
              <motion.div
                key={ev.id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  display: 'grid', gridTemplateColumns: '8px 1fr auto',
                  gap: 10, alignItems: 'center',
                  padding: '8px 10px',
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {ev.actor}
                    <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 6, fontSize: 11 }}>
                      · {ev.action}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {(ev.timestamp || '').slice(0, 19).replace('T', ' ')}
                  </div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, color,
                  background: `${color}15`, padding: '2px 6px', borderRadius: 99,
                }}>
                  {ev.outcome}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════ Audit KPIs ═══════════════ */
function AuditKpis({ stats }) {
  const items = [
    { label: 'Total événements', key: 'total',    color: 'var(--accent)',        icon: Activity },
    { label: 'Succès',           key: 'SUCCESS',   color: 'var(--success-500)',   icon: CheckCircle2 },
    { label: 'Refusés RBAC',     key: 'DENIED',    color: 'var(--danger-500)',    icon: ShieldCheck },
    { label: 'Taux succès',      key: 'rate',      color: 'var(--info-500)',      icon: TrendingUp },
  ];

  const byOutcome = stats?.by_outcome || {};
  const total     = stats?.total || 0;
  const rate      = total > 0
    ? `${Math.round(((byOutcome.SUCCESS || 0) / total) * 100)}%`
    : '—';

  const getVal = (key) => {
    if (key === 'total') return total;
    if (key === 'rate')  return rate;
    return byOutcome[key] || 0;
  };

  return (
    <div className="ds-card">
      <div className="ds-card__header">
        <div className="ds-card__title"><ShieldCheck size={16} /> Statistiques d'audit</div>
        <Link to="/audit" className="fancy-link" style={{ fontSize: 12 }}>
          Détails <ArrowRight size={13} />
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map((item, i) => {
          const val = getVal(item.key);
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07 }}
              style={{
                padding: 14, textAlign: 'center',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                borderTop: `3px solid ${item.color}`,
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: item.color, fontFamily: 'var(--font-display)' }}>
                {typeof val === 'number' ? <AnimatedCounter value={val} /> : val}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════ Quick actions ═══════════════ */
function QuickActions() {
  const actions = [
    { to: '/console',        icon: Terminal,      title: "Exécuter une requête globale", desc: 'SQL sur le schéma virtuel.', tone: 'brand' },
    { to: '/reconciliation', icon: Users,         title: "Fusions d'entités",            desc: 'Clusters Fellegi-Sunter.', tone: 'success' },
    { to: '/conflicts',      icon: AlertTriangle, title: 'Conflits',                     desc: 'Heatmap par type & source.', tone: 'sunset' },
    { to: '/analytics',      icon: BarChart3,     title: 'Analytics',                    desc: 'KPIs et tendances.', tone: 'ocean' },
  ];
  return (
    <div className="ds-card">
      <div className="section">
        <div>
          <h3 className="section__title">Actions rapides</h3>
          <p className="section__hint">Points d'entrée pour les démonstrations</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {actions.map((a, idx) => (
          <Link key={a.to} to={a.to} style={{ textDecoration: 'none' }}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -3 }}
              style={{
                position: 'relative', overflow: 'hidden',
                display: 'flex', gap: 12, padding: 14,
                background: 'var(--bg-surface)',
                borderRadius: 10, border: '1px solid var(--border-subtle)',
                cursor: 'pointer', transition: 'all 0.18s var(--ease-out)',
              }}
            >
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `var(--grad-${a.tone === 'success' ? 'emerald' : a.tone})`,
              }} />
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `rgba(99,102,241,${a.tone === 'brand' ? 0.10 : 0.05})`,
                color: 'var(--accent)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <a.icon size={16} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{a.desc}</div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ Footnote ═══════════════ */
function Footnote() {
  const items = [
    { icon: Cpu,         label: 'sqlglot AST' },
    { icon: ShieldCheck, label: 'JWT + bcrypt' },
    { icon: Activity,    label: 'Rate limit' },
    { icon: Layers3,     label: 'MiniCon + Bucket' },
    { icon: Workflow,    label: 'Fellegi-Sunter' },
    { icon: Clock,       label: 'Journal append-only' },
  ];
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
      padding: 14, marginTop: 6,
      borderTop: '1px solid var(--border-subtle)',
    }}>
      {items.map((it, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.05 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 10px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 999, fontSize: 11, color: 'var(--text-tertiary)',
          }}
        >
          <it.icon size={11} /> {it.label}
        </motion.span>
      ))}
    </div>
  );
}
