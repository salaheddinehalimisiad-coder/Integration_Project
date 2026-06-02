import { Inbox } from 'lucide-react';

/**
 * EmptyState — centralized empty-state pattern across the app.
 */
export default function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 8 : 14,
        padding: compact ? '24px 16px' : '48px 24px',
        textAlign: 'center',
        color: 'var(--text-tertiary)',
        minHeight: compact ? 0 : 200,
      }}
    >
      <div
        style={{
          width: compact ? 40 : 56,
          height: compact ? 40 : 56,
          borderRadius: '50%',
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border-subtle)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-tertiary)',
        }}
      >
        <Icon size={compact ? 18 : 24} />
      </div>
      {title && (
        <div style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>
          {title}
        </div>
      )}
      {description && (
        <div style={{ fontSize: 'var(--fs-sm)', maxWidth: 360, lineHeight: 1.5 }}>
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
