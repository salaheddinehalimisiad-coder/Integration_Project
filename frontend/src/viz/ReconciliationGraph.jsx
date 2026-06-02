import { motion } from 'framer-motion';

/**
 * Network-style visualization of reconciliation clusters.
 * Each cluster is shown as a hub (canonical entity) with petals (source fragments).
 */
const SOURCE_COLORS = {
  S1: 'var(--info-500)',
  S2: 'var(--brand-500)',
  S3: 'var(--success-500)',
  S4: 'var(--warning-500)',
  S5: 'var(--danger-500)',
  S6: 'var(--brand-700)',
};

export default function ReconciliationGraph({ events, maxClusters = 6 }) {
  if (!events || events.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-tertiary)' }}>
        Aucune fusion détectée. Exécutez une requête pour générer des événements de réconciliation.
      </div>
    );
  }

  const shown = events.slice(0, maxClusters);
  const cols = Math.min(3, shown.length);
  const radius = 60;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 24,
      padding: 24,
    }}>
      {shown.map((ev, idx) => {
        const fragments = ev.merged_from || [];
        const angleStep = (Math.PI * 2) / Math.max(fragments.length, 1);
        return (
          <motion.div
            key={ev.canonical_id || idx}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.32, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'relative',
              padding: 20,
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              minHeight: 220,
            }}
          >
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              color: 'var(--accent)',
              background: 'var(--accent-soft)',
              padding: '3px 8px', borderRadius: 4,
              display: 'inline-block', marginBottom: 6,
            }}>
              {ev.canonical_id}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 14 }}>
              {fragments.length} fragments fusionnés · score {ev.score?.toFixed?.(2) || ev.score}
            </div>

            <svg viewBox="-90 -90 180 180" style={{ width: '100%', height: 170 }}>
              {/* Central hub */}
              <circle r="22" fill="var(--accent)" />
              <text y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">EMP</text>

              {/* Connections + fragment dots */}
              {fragments.map((frag, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const sourceId = frag.split(':')[0];
                const color = SOURCE_COLORS[sourceId] || 'var(--text-tertiary)';
                return (
                  <g key={i}>
                    <motion.line
                      x1="0" y1="0" x2={x} y2={y}
                      stroke={color} strokeWidth="2" strokeOpacity="0.5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 + i * 0.05 }}
                    />
                    <motion.circle
                      cx={x} cy={y} r="13" fill={color}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                    />
                    <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">
                      {sourceId}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
              Source pivot : <strong style={{ color: 'var(--text-primary)' }}>{ev.chosen_source}</strong>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
