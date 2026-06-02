import { useState } from 'react';
import { Network, Maximize2, Layers3, ListTree, Info } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import SchemaGraph from '../viz/SchemaGraph';
import { SkeletonCard } from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';

export default function Schema() {
  const { data, loading } = useApi(() => api.schema(), []);
  const [view, setView] = useState('graph');

  if (loading) return <SkeletonCard height={620} />;
  if (!data?.schema) return <EmptyState title="Schéma indisponible" />;

  const tables = Object.entries(data.schema);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="ds-card">
        <div className="ds-card__header">
          <div className="ds-card__title"><Network size={16} /> Schéma global virtuel</div>
          <div className="ds-segmented">
            <button className={`ds-segmented__btn ${view === 'graph' ? 'ds-segmented__btn--active' : ''}`} onClick={() => setView('graph')}>
              <Network size={13} style={{ marginRight: 4 }} /> Graphe
            </button>
            <button className={`ds-segmented__btn ${view === 'list' ? 'ds-segmented__btn--active' : ''}`} onClick={() => setView('list')}>
              <ListTree size={13} style={{ marginRight: 4 }} /> Détaillé
            </button>
          </div>
        </div>

        <p className="muted text-sm" style={{ marginBottom: 14 }}>
          Cinq relations globales construites par le médiateur à partir des six sources hétérogènes.
          Survolez une entité pour mettre en évidence ses relations.
        </p>

        {view === 'graph' ? (
          <SchemaGraph schema={data.schema} />
        ) : (
          <SchemaList tables={tables} />
        )}
      </div>

      <div className="ds-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16 }}>
        <Info size={16} style={{ color: 'var(--accent)', marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>À propos de ce schéma</div>
          <div className="muted text-sm" style={{ lineHeight: 1.6 }}>
            Le schéma global est défini de manière <em>indépendante des sources</em>. Les utilisateurs
            interrogent uniquement ces 5 relations. Le médiateur traduit chaque requête en
            sous-requêtes locales via GAV (dépliement) ou LAV (Bucket / MiniCon), puis effectue
            jointures et réconciliations transparentes.
          </div>
        </div>
      </div>
    </div>
  );
}

function SchemaList({ tables }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
      {tables.map(([name, cols]) => (
        <div key={name} style={{
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px',
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <Layers3 size={14} /> {name}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{cols.length} cols</span>
          </div>
          <div style={{ padding: '6px 10px' }}>
            {cols.map(c => (
              <div key={c.name} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 6px', fontSize: 12,
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{c.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontSize: 11 }}>{c.type}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
