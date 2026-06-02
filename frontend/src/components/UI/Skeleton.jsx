/**
 * Skeleton — simple shimmer block, sized via props or className.
 * Composes with design-system .ds-skeleton class.
 */
export function Skeleton({ width = '100%', height = 16, rounded = '6px', style, className = '' }) {
  return (
    <span
      className={`ds-skeleton ${className}`}
      style={{ display: 'block', width, height, borderRadius: rounded, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonRow({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={14} width={`${80 - (i * 8)}%`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 160 }) {
  return (
    <div className="ds-card" style={{ padding: 20 }}>
      <Skeleton height={12} width="40%" style={{ marginBottom: 14 }} />
      <Skeleton height={height - 60} width="100%" rounded="8px" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="ds-table-wrap">
      <table className="ds-table">
        <thead>
          <tr>{Array.from({ length: cols }).map((_, i) => <th key={i}><Skeleton height={10} width="60%" /></th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Skeleton height={12} width={`${50 + ((r + c) % 4) * 10}%`} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
