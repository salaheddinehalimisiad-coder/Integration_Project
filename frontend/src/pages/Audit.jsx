import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Activity, RefreshCw, CheckCircle2, AlertCircle, ShieldOff, ShieldCheck,
  Clock, User, Filter, ShieldAlert, List, Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api, describeError } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { Skeleton, SkeletonTable } from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';
import HeroHeader from '../components/UI/HeroHeader';
import AnimatedCounter from '../components/UI/AnimatedCounter';

const OUTCOME_META = {
  SUCCESS:     { color: 'var(--success-500)', icon: CheckCircle2, bg: 'rgba(16,185,129,0.10)' },
  FAILURE:     { color: 'var(--danger-500)',  icon: AlertCircle,  bg: 'rgba(239,68,68,0.10)' },
  DENIED:      { color: 'var(--danger-500)',  icon: ShieldOff,    bg: 'rgba(239,68,68,0.10)' },
  RATE_LIMITED:{ color: 'var(--warning-500)', icon: ShieldOff,    bg: 'rgba(245,158,11,0.10)' },
  ATTEMPT:     { color: 'var(--text-tertiary)', icon: Clock,      bg: 'var(--bg-surface-2)' },
};

export default function Audit() {
  const { toast } = useOutletContext();
  const [filters, setFilters] = useState({ actor: '', action: '', outcome: '' });
  const [appliedFilters, setApplied] = useState({});
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'timeline'
  const [simulating, setSimulating] = useState(false);

  const { data: stats, loading: sLoading, reload: reloadStats } =
    useApi(() => api.auditStats(), []);
  const { data: events, loading: eLoading, reload: reloadEvents } =
    useApi(() => api.audit({ limit: 200, ...appliedFilters }), [JSON.stringify(appliedFilters)]);

  const handleApply = (e) => {
    e.preventDefault();
    const clean = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v && v.trim()));
    setApplied(clean);
  };

  const reload = () => { reloadStats(); reloadEvents(); };

  const simulateAttack = async () => {
    setSimulating(true);
    toast?.info?.('Simulation en cours', 'Génération de logs de sécurité...');
    try {
      // 1. Simuler 3 tentatives infructueuses de login avec un hacker fictif
      for (let i = 0; i < 3; i++) {
        try {
          await api.login({ username: 'hacker_test_' + Math.floor(Math.random() * 100), password: 'bad_password' });
        } catch (err) {
          // attendu
        }
      }
      // 2. Simuler une tentative d'exécution illicite (RBAC Denied)
      try {
        await api.execute("SELECT * FROM GlobalPayroll WHERE salary_usd > 100000", "GAV");
      } catch (err) {
        // attendu
      }
      toast?.success?.('Attaques simulées', 'Les tentatives de force-brute et requêtes non-autorisées ont été tracées.');
      reload();
    } catch (err) {
      toast?.error?.('Échec de la simulation', err.message);
    } finally {
      setSimulating(false);
    }
  };

  const totals = stats || {};
  const recentEvents = events?.events || [];

  return (
    <div className="mesh-bg" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <HeroHeader
        eyebrow={<><Activity size={12} /> Journal d'audit</>}
        title="Toutes les actions"
        accent="actions"
        subtitle="Toutes les opérations sensibles (auth, requêtes, admin) sont tracées dans un journal append-only. Filtre, audite, valide."
      />

      {/* ── Stats KPIs ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <StatTile icon={Activity}      label="Total événements" value={totals.total ?? 0} loading={sLoading} tone="brand" />
        <StatTile icon={CheckCircle2}  label="Succès"           value={(totals.by_outcome || {}).SUCCESS || 0} loading={sLoading} tone="success" />
        <StatTile icon={AlertCircle}   label="Échecs"           value={(totals.by_outcome || {}).FAILURE || 0} loading={sLoading} tone="sunset" />
        <StatTile icon={ShieldOff}     label="Refusés (RBAC)"   value={(totals.by_outcome || {}).DENIED || 0} loading={sLoading} tone="violet" />
      </section>

      {/* ── Filters + table/timeline ── */}
      <div className="ds-card">
        <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 className="section__title">Événements récents</h3>
            <p className="section__hint">Filtre par utilisateur, action, ou résultat. Les 200 plus récents.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="ds-segmented">
              <button className={`ds-segmented__btn ${viewMode === 'table' ? 'ds-segmented__btn--active' : ''}`} onClick={() => setViewMode('table')}>
                <List size={12} style={{ marginRight: 4 }} /> Table
              </button>
              <button className={`ds-segmented__btn ${viewMode === 'timeline' ? 'ds-segmented__btn--active' : ''}`} onClick={() => setViewMode('timeline')}>
                <Calendar size={12} style={{ marginRight: 4 }} /> Timeline
              </button>
            </div>
            <button className="ds-btn ds-btn--secondary ds-btn--sm" onClick={simulateAttack} disabled={simulating} style={{ color: 'var(--danger-500)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <ShieldAlert size={13} style={{ marginRight: 6 }} /> Simuler attaque
            </button>
            <button className="ds-btn ds-btn--secondary ds-btn--sm" onClick={reload}>
              <RefreshCw size={13} className={(sLoading || eLoading) ? 'ds-spin' : ''} /> Actualiser
            </button>
          </div>
        </div>

        <form onSubmit={handleApply} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr)) auto',
          gap: 8,
          marginBottom: 16,
          padding: 12,
          background: 'var(--bg-surface-2)',
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
        }}>
          <input
            className="ds-input"
            placeholder="Utilisateur"
            value={filters.actor}
            onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
          />
          <select
            className="ds-input"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          >
            <option value="">Toutes actions</option>
            <option value="AUTH_LOGIN">AUTH_LOGIN</option>
            <option value="QUERY_EXECUTE">QUERY_EXECUTE</option>
          </select>
          <select
            className="ds-input"
            value={filters.outcome}
            onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}
          >
            <option value="">Tous résultats</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
            <option value="DENIED">DENIED</option>
            <option value="ATTEMPT">ATTEMPT</option>
            <option value="RATE_LIMITED">RATE_LIMITED</option>
          </select>
          <button type="submit" className="ds-btn ds-btn--primary ds-btn--sm">
            <Filter size={13} /> Filtrer
          </button>
        </form>

        {eLoading && <SkeletonTable rows={8} cols={5} />}
        {!eLoading && (!recentEvents || recentEvents.length === 0) && (
          <EmptyState title="Aucun événement"
            description="Aucune action ne correspond aux filtres pour le moment." />
        )}
        {!eLoading && recentEvents.length > 0 && (
          viewMode === 'table' ? (
            <div className="ds-table-wrap" style={{ maxHeight: 540, overflowY: 'auto' }}>
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Quand</th>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Action</th>
                    <th>Résultat</th>
                    <th>IP</th>
                    <th>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((ev) => {
                    const meta = OUTCOME_META[ev.outcome] || OUTCOME_META.ATTEMPT;
                    const Icon = meta.icon;
                    return (
                      <motion.tr
                        key={ev.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.18 }}
                      >
                        <td className="mono text-xs">{(ev.timestamp || '').slice(0, 19).replace('T', ' ')}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <User size={12} style={{ color: 'var(--text-tertiary)' }} />
                            {ev.actor}
                          </span>
                        </td>
                        <td><span className="ds-badge ds-badge--brand">{ev.role}</span></td>
                        <td className="mono text-xs">{ev.action}</td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 8px', borderRadius: 999,
                            background: meta.bg,
                            color: meta.color,
                            fontSize: 11, fontWeight: 600,
                          }}>
                            <Icon size={11} /> {ev.outcome}
                          </span>
                        </td>
                        <td className="mono text-xs">{ev.ip || '—'}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 280 }}>
                          {detailsToString(ev.details)}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              position: 'relative',
              paddingLeft: 24,
              borderLeft: '2px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              margin: '10px 0 10px 10px',
              maxHeight: 540,
              overflowY: 'auto',
              paddingTop: 4,
              paddingBottom: 4
            }}>
              {recentEvents.map((ev, i) => {
                const meta = OUTCOME_META[ev.outcome] || OUTCOME_META.ATTEMPT;
                const Icon = meta.icon;
                return (
                  <motion.div 
                    key={ev.id || i} 
                    position="relative"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    style={{ position: 'relative' }}
                  >
                    <span style={{
                      position: 'absolute',
                      left: -33,
                      top: 10,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'var(--bg-surface)',
                      color: meta.color,
                      display: 'grid',
                      placeItems: 'center',
                      border: `2px solid ${meta.color}`,
                    }}>
                      <Icon size={10} />
                    </span>
                    <div style={{
                      background: 'var(--bg-surface-2)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      padding: 12,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                        <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{ev.action}</strong>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                          {(ev.timestamp || '').slice(0, 19).replace('T', ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Utilisateur: <strong>{ev.actor}</strong> ({ev.role}) | Résultat: <span style={{ color: meta.color, fontWeight: 600 }}>{ev.outcome}</span> | IP: {ev.ip || '—'}
                      </div>
                      {ev.details && Object.keys(ev.details).length > 0 && (
                        <div style={{ marginTop: 6, padding: 6, background: 'var(--bg-surface)', borderRadius: 4, fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                          {detailsToString(ev.details)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ── Top actors & actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <Leaderboard title="Top utilisateurs" data={stats?.top_actors} loading={sLoading} icon={User} />
        <Leaderboard title="Top actions"      data={stats?.top_actions} loading={sLoading} icon={ShieldCheck} />
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, loading, tone = 'brand' }) {
  return (
    <motion.div className={`kpi kpi--${tone}`} whileHover={{ y: -2 }}>
      <div className="kpi__head">
        <span className="kpi__label">{label}</span>
        <span className="kpi__icon"><Icon size={16} /></span>
      </div>
      <div className="kpi__value">
        {loading ? <Skeleton width="50%" height={26} />
                 : <AnimatedCounter value={Number(value) || 0} />}
      </div>
    </motion.div>
  );
}

function Leaderboard({ title, data, loading, icon: Icon }) {
  const entries = Object.entries(data || {});
  const max = Math.max(...entries.map(([, n]) => n), 1);
  return (
    <div className="ds-card">
      <div className="ds-card__header">
        <div className="ds-card__title"><Icon size={15} /> {title}</div>
      </div>
      {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={26} style={{ marginBottom: 8 }} />)}
      {!loading && entries.length === 0 && <EmptyState compact title="Pas encore de données" />}
      {!loading && entries.map(([name, count]) => (
        <div key={name} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{name}</span>
            <span style={{ color: 'var(--text-tertiary)' }}>{count}</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-surface-2)', borderRadius: 999, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(count / max) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', background: 'var(--grad-brand)', borderRadius: 999 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function detailsToString(d) {
  if (!d || typeof d !== 'object') return d || '—';
  const keys = Object.keys(d);
  if (keys.length === 0) return '—';
  return keys.map(k => `${k}=${JSON.stringify(d[k])}`).join(' · ');
}
