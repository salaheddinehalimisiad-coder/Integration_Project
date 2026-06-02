import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Interactive ER-style graph of the global schema.
 * Hand-positioned for a stable, predictable layout (5 entities).
 * Hovering / clicking a node highlights its connections.
 */
const NODE_W = 200;
const NODE_H_BASE = 50;
const LINE_H = 19;

const NODES = {
  GlobalEmployee:   { x: 380, y: 60,  accent: 'var(--brand-500)' },
  GlobalDepartment: { x:  60, y: 160, accent: 'var(--info-500)' },
  GlobalProject:    { x: 700, y: 60,  accent: 'var(--success-500)' },
  GlobalAssignment: { x: 700, y: 320, accent: 'var(--warning-500)' },
  GlobalPayroll:    { x: 380, y: 410, accent: 'var(--danger-500)' },
};

const EDGES = [
  { from: 'GlobalDepartment', to: 'GlobalEmployee',   label: '1 — n' },
  { from: 'GlobalEmployee',   to: 'GlobalAssignment', label: '1 — n' },
  { from: 'GlobalProject',    to: 'GlobalAssignment', label: '1 — n' },
  { from: 'GlobalEmployee',   to: 'GlobalPayroll',    label: '1 — 1' },
];

export default function SchemaGraph({ schema }) {
  const [hovered, setHovered] = useState(null);

  const layout = useMemo(() => {
    if (!schema) return null;
    const tables = Object.entries(schema);
    return tables.map(([name, cols]) => {
      const pos = NODES[name] || { x: 100, y: 100, accent: 'var(--brand-500)' };
      const height = NODE_H_BASE + cols.length * LINE_H;
      return { name, cols, height, ...pos };
    });
  }, [schema]);

  if (!layout) return null;

  const isConnected = (a, b) => EDGES.some(
    (e) => (e.from === a && e.to === b) || (e.from === b && e.to === a)
  );

  return (
    <svg
      viewBox="0 0 950 600"
      style={{
        width: '100%',
        height: 600,
        background: 'var(--bg-surface-2)',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--border-subtle)',
      }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--text-tertiary)" />
        </marker>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border-subtle)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="950" height="600" fill="url(#grid)" />

      {/* Edges */}
      {EDGES.map((edge, i) => {
        const fromNode = layout.find(n => n.name === edge.from);
        const toNode   = layout.find(n => n.name === edge.to);
        if (!fromNode || !toNode) return null;
        const x1 = fromNode.x + NODE_W / 2;
        const y1 = fromNode.y + fromNode.height / 2;
        const x2 = toNode.x + NODE_W / 2;
        const y2 = toNode.y + toNode.height / 2;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / len, uy = dy / len;
        const sx = x1 + ux * (NODE_W / 2);
        const sy = y1 + uy * (fromNode.height / 2);
        const ex = x2 - ux * (NODE_W / 2);
        const ey = y2 - uy * (toNode.height / 2);
        const midX = (sx + ex) / 2;
        const midY = (sy + ey) / 2;
        const highlighted = !hovered || hovered === edge.from || hovered === edge.to;
        return (
          <g key={i} opacity={highlighted ? 1 : 0.25}>
            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="var(--text-tertiary)" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <rect x={midX - 26} y={midY - 9} width="52" height="18" rx="9" fill="var(--bg-elevated)" stroke="var(--border-default)" />
            <text x={midX} y={midY + 4} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-secondary)">
              {edge.label}
            </text>
          </g>
        );
      })}

      {/* Nodes */}
      {layout.map((n) => {
        const dim = hovered && hovered !== n.name && !isConnected(hovered, n.name);
        return (
          <motion.g
            key={n.name}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: dim ? 0.4 : 1, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={() => setHovered(n.name)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={n.x} y={n.y}
              width={NODE_W} height={n.height}
              rx="10"
              fill="var(--bg-elevated)"
              stroke={hovered === n.name ? n.accent : 'var(--border-default)'}
              strokeWidth={hovered === n.name ? 2 : 1}
              style={{ filter: hovered === n.name ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.12))' : 'none' }}
            />
            <rect x={n.x} y={n.y} width={NODE_W} height="32" rx="10" fill={n.accent} fillOpacity="0.12" />
            <rect x={n.x} y={n.y + 26} width={NODE_W} height="6" fill={n.accent} fillOpacity="0.12" />
            <line x1={n.x} y1={n.y + 32} x2={n.x + NODE_W} y2={n.y + 32} stroke={n.accent} strokeOpacity="0.3" />
            <text x={n.x + 12} y={n.y + 22} fontSize="13" fontWeight="700" fill={n.accent}>
              {n.name}
            </text>

            {n.cols.map((col, idx) => (
              <g key={col.name}>
                <text x={n.x + 12} y={n.y + 50 + idx * LINE_H} fontSize="11" fill="var(--text-primary)" fontFamily="var(--font-mono)">
                  {col.name}
                </text>
                <text x={n.x + NODE_W - 12} y={n.y + 50 + idx * LINE_H} fontSize="10" fill="var(--text-tertiary)" textAnchor="end" fontFamily="var(--font-mono)">
                  {col.type}
                </text>
              </g>
            ))}
          </motion.g>
        );
      })}
    </svg>
  );
}
