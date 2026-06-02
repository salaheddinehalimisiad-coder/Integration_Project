import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Layers3, Users, Sparkles, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import ReconciliationGraph from '../viz/ReconciliationGraph';
import { SkeletonCard } from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';

export default function Reconciliation() {
  const { toast } = useOutletContext();
  const { data, loading, error, reload } = useApi(() => api.reconciliation(), []);
  const [resolving, setResolving] = useState(false);

  const events = data?.events || [];
  const stats = useMemo(() => {
    if (!events.length) return { totalClusters: 0, totalFragments: 0, avgScore: 0 };
    const totalFragments = events.reduce((sum, e) => sum + (e.merged_from?.length || 0), 0);
    const avgScore = events.reduce((sum, e) => sum + (e.score || 0), 0) / events.length;
    return { totalClusters: events.length, totalFragments, avgScore };
  }, [events]);

  const handleArbitrate = async (conflictId, field, chosenSource) => {
    setResolving(true);
    try {
      await api.resolveConflict({
        conflictId,
        field,
        chosenSource,
        resolution: 'manual_override'
      });
      toast?.success?.('Arbitrage enregistré', `Valeur de la source ${chosenSource} choisie pour ${field}.`);
      reload();
    } catch (err) {
      toast?.error?.('Échec de l\'arbitrage', err.response?.data?.detail || err.message);
    } finally {
      setResolving(false);
    }
  };

  if (loading) return <SkeletonCard height={400} />;
  if (error) return <EmptyState title="Impossible de charger les fusions" description={error} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI strip */}
      <section className="ds-metric-grid">
        <KpiTile icon={Layers3} label="Clusters fusionnés" value={stats.totalClusters} />
        <KpiTile icon={Users}   label="Fragments unifiés"  value={stats.totalFragments} />
        <KpiTile icon={Sparkles} label="Score moyen"        value={stats.avgScore.toFixed(2)} />
      </section>

      {/* Explanation */}
      <div className="ds-card">
        <div className="ds-card__header">
          <div className="ds-card__title"><Sparkles size={16} /> Algorithme Fellegi-Sunter</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          Pour chaque paire de candidats, le médiateur calcule un <em>score probabiliste</em>{' '}
          (somme de log-odds-ratios par champ comparé). Les paires au-dessus du seuil sont
          fusionnées via <strong>union-find</strong> pour la fermeture transitive.
          Les valeurs sont priorisées par <em>source_confidence</em> et les conflits sont loggés.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 14 }}>
          <PipelineStep n={1} title="Blocking"   desc="Préfixe email + soundex du nom — réduit O(n²) → O(n·k)" />
          <PipelineStep n={2} title="Scoring FS"  desc="log₂(m/u) par champ matchant, somme totale" />
          <PipelineStep n={3} title="Union-Find"  desc="Fermeture transitive : si A~B et B~C alors A~C" />
          <PipelineStep n={4} title="Fusion priorisée" desc="Tri par confiance + détection des conflits de valeurs" />
        </div>
      </div>

      {/* Graph */}
      <div className="ds-card">
        <div className="ds-card__header">
          <div className="ds-card__title"><Layers3 size={16} /> Clusters d'entités fusionnées</div>
        </div>
        <ReconciliationGraph events={events} />
      </div>

      {/* Table */}
      {events.length > 0 && (
        <div className="ds-card">
          <div className="ds-card__header">
            <div className="ds-card__title">Détail des fusions & Arbitrage</div>
          </div>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>ID canonique</th>
                  <th>Fragments</th>
                  <th>Score</th>
                  <th>Source pivot</th>
                  <th>Détails & Conflits</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={i}>
                    <td>
                      <span className="mono text-brand font-bold">{ev.canonical_id}</span>
                      {ev.conflicts && ev.conflicts.length > 0 && (
                        <span className="ds-badge ds-badge--warning" style={{ marginLeft: 8, fontSize: 10 }}>
                          {ev.conflicts.length} conflit(s)
                        </span>
                      )}
                    </td>
                    <td className="mono text-xs">{(ev.merged_from || []).join(', ')}</td>
                    <td><span className="ds-badge ds-badge--brand">{ev.score?.toFixed?.(2) ?? ev.score}</span></td>
                    <td>{ev.chosen_source}</td>
                    <td className="text-secondary" style={{ maxWidth: 450 }}>
                      <div style={{ marginBottom: 6 }}>{ev.reason}</div>
                      {ev.conflicts && ev.conflicts.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {ev.conflicts.map((conf, ci) => (
                            <div key={ci} style={{
                              background: 'var(--bg-surface-2)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 6,
                              padding: '6px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                            }}>
                              <span style={{ fontSize: 11 }}>
                                Champ <strong>{conf.field}</strong> : 
                                <span style={{ marginLeft: 6, color: 'var(--warning-500)' }}>
                                  {conf.base_source} ({conf.base_val}) vs {conf.other_source} ({conf.other_val})
                                </span>
                              </span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button 
                                  className="ds-btn ds-btn--secondary ds-btn--xs"
                                  onClick={() => handleArbitrate(ev.canonical_id, conf.field, conf.base_source)}
                                  disabled={resolving}
                                  style={{ padding: '2px 6px', fontSize: 10 }}
                                >
                                  Garder {conf.base_source}
                                </button>
                                <button 
                                  className="ds-btn ds-btn--secondary ds-btn--xs"
                                  onClick={() => handleArbitrate(ev.canonical_id, conf.field, conf.other_source)}
                                  disabled={resolving}
                                  style={{ padding: '2px 6px', fontSize: 10 }}
                                >
                                  Garder {conf.other_source}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiTile({ icon: Icon, label, value }) {
  return (
    <div className="ds-metric">
      <div className="ds-metric__header">
        <span className="ds-metric__label">{label}</span>
        <span className="ds-metric__icon"><Icon size={18} /></span>
      </div>
      <div className="ds-metric__value">{value}</div>
    </div>
  );
}

function PipelineStep({ n, title, desc }) {
  return (
    <div style={{
      display: 'flex', gap: 10, padding: 12,
      background: 'var(--bg-surface-2)',
      borderRadius: 8,
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: 'var(--accent)', color: 'white',
        display: 'grid', placeItems: 'center',
        fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>{n}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>{desc}</div>
      </div>
    </div>
  );
}
