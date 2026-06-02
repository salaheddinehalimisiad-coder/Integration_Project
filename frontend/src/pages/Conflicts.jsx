import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { GitBranch, AlertTriangle, BookOpen, ArrowUp, ArrowDown, Sliders, Save, Settings } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import ConflictHeatmap from '../viz/ConflictHeatmap';
import { SkeletonCard } from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';

const TYPE_COLORS = {
  Nommage:     'var(--brand-500)',
  Attribut:    'var(--info-500)',
  Unite:       'var(--warning-500)',
  Structure:   'var(--success-500)',
  Identifiant: 'var(--danger-500)',
  Type:        'var(--brand-700)',
  Securite:    'var(--accent)',
  'Modèle':    'var(--info-500)',
};

export default function Conflicts() {
  const { toast } = useOutletContext();
  const { data, loading, error } = useApi(() => api.mappings(), []);
  const [rules, setRules] = useState([
    { id: 'highest_confidence', name: 'Confiance des sources', desc: 'Prioriser la valeur de la source ayant le plus grand indice de confiance.', active: true },
    { id: 'transitive_closure', name: 'Fermeture transitive', desc: 'Résoudre les équivalences indirectes (si A~B et B~C alors A~C) par Union-Find.', active: true },
    { id: 'soundex_match', name: 'Soundex & Phonétique', desc: 'Regrouper les noms avec une prononciation similaire en français/arabe.', active: true },
    { id: 'value_merge', name: 'Concaténation des compétences', desc: 'Fusionner les listes de compétences (S6) plutôt que de les remplacer.', active: true },
  ]);

  const moveRule = (index, direction) => {
    const nextRules = [...rules];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rules.length) return;
    const temp = nextRules[index];
    nextRules[index] = nextRules[targetIndex];
    nextRules[targetIndex] = temp;
    setRules(nextRules);
  };

  const toggleRule = (index) => {
    const nextRules = [...rules];
    nextRules[index].active = !nextRules[index].active;
    setRules(nextRules);
  };

  const saveRules = () => {
    toast?.success?.('Règles enregistrées', 'La priorité des résolutions de conflits a été mise à jour.');
  };

  if (loading) return <SkeletonCard height={500} />;
  if (error) return <EmptyState title="Erreur" description={error} />;

  const conflicts = data?.conflicts || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Interactive Rules Manager */}
      <div className="ds-card">
        <div className="ds-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="ds-card__title"><Settings size={16} /> Priorité des règles de résolution</div>
          <button className="ds-btn ds-btn--primary ds-btn--sm" onClick={saveRules}>
            <Save size={13} style={{ marginRight: 6 }} /> Enregistrer
          </button>
        </div>
        <p className="muted text-sm" style={{ margin: '0 0 14px' }}>
          Déterminez l'ordre de priorité et l'activation des résolutions automatiques appliquées par le médiateur lors de la réconciliation.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rules.map((rule, idx) => (
            <div key={rule.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 12,
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              opacity: rule.active ? 1 : 0.6,
              transition: 'opacity 0.2s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <input 
                  type="checkbox" 
                  checked={rule.active} 
                  onChange={() => toggleRule(idx)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: rule.active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {idx + 1}. {rule.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{rule.desc}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                <button 
                  className="ds-btn ds-btn--secondary ds-btn--xs"
                  onClick={() => moveRule(idx, -1)}
                  disabled={idx === 0}
                  style={{ padding: 4 }}
                >
                  <ArrowUp size={12} />
                </button>
                <button 
                  className="ds-btn ds-btn--secondary ds-btn--xs"
                  onClick={() => moveRule(idx, 1)}
                  disabled={idx === rules.length - 1}
                  style={{ padding: 4 }}
                >
                  <ArrowDown size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ds-card">
        <div className="ds-card__header">
          <div className="ds-card__title"><GitBranch size={16} /> Heatmap des conflits</div>
          <span className="ds-badge ds-badge--warning">{conflicts.length} type(s)</span>
        </div>
        <p className="muted text-sm" style={{ margin: '0 0 14px' }}>
          Distribution des conflits de schéma (Spaccapietra-Parent 1991) par type et par source impliquée.
          Couleur plus intense = plus d'occurrences.
        </p>
        <ConflictHeatmap conflicts={conflicts} />
      </div>

      <div className="ds-card">
        <div className="ds-card__header">
          <div className="ds-card__title"><AlertTriangle size={16} /> Détail des résolutions</div>
        </div>
        {conflicts.length === 0 ? (
          <EmptyState title="Aucun conflit déclaré" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {conflicts.map((c, i) => {
              const color = TYPE_COLORS[c.type] || 'var(--accent)';
              return (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: 16,
                  padding: 14,
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-subtle)',
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 8,
                }}>
                  <div style={{
                    width: 60,
                    fontSize: 11, fontWeight: 700, color,
                    background: `${color}15`,
                    padding: '4px 8px',
                    borderRadius: 4,
                    height: 'fit-content',
                    textAlign: 'center',
                  }}>
                    {c.type}
                  </div>
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 8 }}>
                      <ConflictField label="Local (sources)" value={c.local} mono />
                      <ConflictField label="Global (médiateur)" value={c.global} mono />
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <BookOpen size={13} style={{ color }} />
                      <span><strong>Résolution :</strong> {c.resolution}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ConflictField({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{
        fontSize: 12,
        color: 'var(--text-primary)',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        wordBreak: 'break-word',
      }}>{value}</div>
    </div>
  );
}
