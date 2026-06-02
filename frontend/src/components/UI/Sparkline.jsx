/**
 * Sparkline — tiny inline SVG line chart (no axes, no labels).
 *
 * Props:
 *   data:   number[]
 *   width:  px (default 90)
 *   height: px (default 32)
 *   color:  CSS color (default var(--accent))
 *   fill:   boolean (gradient fill below the line)
 */
export default function Sparkline({
  data = [],
  width = 90,
  height = 32,
  color = 'var(--accent)',
  fill = true,
  strokeWidth = 1.6,
}) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const step = innerW / (data.length - 1);

  const points = data.map((v, i) => {
    const x = padding + i * step;
    const y = padding + innerH - ((v - min) / range) * innerH;
    return [x, y];
  });

  const linePath = points
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(' ');

  const areaPath =
    `${linePath} L${points[points.length - 1][0]},${height - padding} L${points[0][0]},${height - padding} Z`;

  const gradId = `sg-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
        </>
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point marker */}
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={strokeWidth + 1}
        fill={color}
      />
    </svg>
  );
}
