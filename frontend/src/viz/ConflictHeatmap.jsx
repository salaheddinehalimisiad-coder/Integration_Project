import { useMemo, useState } from 'react';

/**
 * Heatmap des conflits par type × source impliquée.
 * Reçoit la liste des conflits, dérive les couples (type, source) et compte.
 */
const SOURCES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

export default function ConflictHeatmap({ conflicts }) {
  const [hovered, setHovered] = useState(null);

  const { types, matrix, max } = useMemo(() => {
    const m = new Map();
    const typesSet = new Set();
    (conflicts || []).forEach((c) => {
      const t = c.type;
      typesSet.add(t);
      const localSources = extractSources(c.local);
      localSources.forEach((s) => {
        const key = `${t}|${s}`;
        m.set(key, (m.get(key) || 0) + 1);
      });
    });
    let max = 0;
    m.forEach((v) => { if (v > max) max = v; });
    return { types: Array.from(typesSet), matrix: m, max: Math.max(max, 1) };
  }, [conflicts]);

  const cellSize = 56;
  const labelLeftW = 130;
  const labelTopH = 36;
  const width = labelLeftW + SOURCES.length * cellSize;
  const height = labelTopH + types.length * cellSize;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height + 40}`} style={{ width: '100%', minWidth: 500 }}>
        {/* Source labels */}
        {SOURCES.map((s, i) => (
          <text
            key={s}
            x={labelLeftW + i * cellSize + cellSize / 2}
            y={labelTopH - 12}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="var(--text-secondary)"
            fontFamily="var(--font-mono)"
          >
            {s}
          </text>
        ))}

        {/* Type labels */}
        {types.map((t, j) => (
          <text
            key={t}
            x={labelLeftW - 10}
            y={labelTopH + j * cellSize + cellSize / 2 + 4}
            textAnchor="end"
            fontSize="11"
            fontWeight="600"
            fill="var(--text-secondary)"
          >
            {t}
          </text>
        ))}

        {/* Cells */}
        {types.map((t, j) =>
          SOURCES.map((s, i) => {
            const count = matrix.get(`${t}|${s}`) || 0;
            const intensity = count / max;
            const x = labelLeftW + i * cellSize;
            const y = labelTopH + j * cellSize;
            const isHovered = hovered === `${t}|${s}`;
            return (
              <g key={`${t}-${s}`}
                 onMouseEnter={() => count > 0 && setHovered(`${t}|${s}`)}
                 onMouseLeave={() => setHovered(null)}
                 style={{ cursor: count > 0 ? 'pointer' : 'default' }}>
                <rect
                  x={x + 2} y={y + 2}
                  width={cellSize - 4} height={cellSize - 4}
                  rx={6}
                  fill={count > 0 ? `rgba(79, 70, 229, ${0.15 + intensity * 0.75})` : 'var(--bg-surface-2)'}
                  stroke={isHovered ? 'var(--accent)' : 'var(--border-subtle)'}
                  strokeWidth={isHovered ? 2 : 1}
                />
                {count > 0 && (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2 + 5}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill={intensity > 0.5 ? 'white' : 'var(--accent)'}
                  >
                    {count}
                  </text>
                )}
              </g>
            );
          })
        )}

        {/* Legend */}
        <g transform={`translate(${labelLeftW}, ${height + 6})`}>
          <text x="0" y="14" fontSize="10" fill="var(--text-tertiary)">Intensité :</text>
          {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
            <rect
              key={i}
              x={70 + i * 24}
              y={0}
              width={20}
              height={14}
              rx={3}
              fill={`rgba(79, 70, 229, ${0.15 + v * 0.75})`}
            />
          ))}
          <text x={70} y={28} fontSize="10" fill="var(--text-tertiary)">0</text>
          <text x={166} y={28} fontSize="10" fill="var(--text-tertiary)">{max}</text>
        </g>
      </svg>
    </div>
  );
}

function extractSources(text) {
  if (!text) return [];
  // Heuristic: scan for known patterns and infer source by content
  const sources = [];
  if (/employees|department|RH|first_name|last_name|salary_eur/i.test(text)) sources.push('S1');
  if (/consultant|business_unit|projects|allocation/i.test(text))             sources.push('S2');
  if (/Mongo|monthlySalary|Dzd|payroll/i.test(text))                           sources.push('S3');
  if (/legacy|csv|nom_prenom/i.test(text))                                      sources.push('S4');
  if (/XML|Eval/i.test(text))                                                   sources.push('S5');
  if (/graph|Skill|KNOWS|Neo4j/i.test(text))                                    sources.push('S6');
  return sources.length ? sources : ['S1', 'S2']; // fallback
}
