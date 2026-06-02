import { useState } from 'react';
import { Shield, Check, X, Lock, UserRound, Users, BarChart3, Wallet, Eye, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { SkeletonCard } from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';

const ROLE_META = {
  ADMIN:            { icon: Shield,     color: 'var(--accent)',         desc: 'Accès complet à toutes les tables et colonnes.' },
  HR_MANAGER:       { icon: Users,      color: 'var(--info-500)',       desc: 'RH + projets + finance, sauf risk_level.' },
  PROJECT_MANAGER:  { icon: BarChart3,  color: 'var(--success-500)',    desc: 'Lecture projets et employés, sans données financières.' },
  FINANCE_OFFICER:  { icon: Wallet,     color: 'var(--warning-500)',    desc: 'Accès aux données financières uniquement.' },
  EMPLOYEE_VIEWER:  { icon: Eye,        color: 'var(--text-secondary)', desc: 'Consultation restreinte : colonnes publiques.' },
};

const TABLES = ['GlobalEmployee', 'GlobalDepartment', 'GlobalProject', 'GlobalAssignment', 'GlobalPayroll'];

const MATRIX = {
  ADMIN:           { tables: '*', blocked: [] },
  HR_MANAGER:      { tables: ['GlobalEmployee','GlobalDepartment','GlobalProject','GlobalAssignment','GlobalPayroll'], blocked: ['risk_level'] },
  PROJECT_MANAGER: { tables: ['GlobalEmployee','GlobalDepartment','GlobalProject','GlobalAssignment'], blocked: ['salary_usd','bonus_usd','risk_level','national_id'] },
  FINANCE_OFFICER: { tables: ['GlobalEmployee','GlobalPayroll','GlobalDepartment'], blocked: [] },
  EMPLOYEE_VIEWER: { tables: ['GlobalEmployee','GlobalDepartment','GlobalProject','GlobalAssignment'], blocked: ['salary_usd','bonus_usd','risk_level','national_id','birth_date'] },
};

const TABLE_COLUMNS = {
  GlobalEmployee: ['employee_id', 'national_id', 'matricule', 'full_name', 'email', 'birth_date', 'department_id', 'department_name', 'country', 'salary_usd', 'status', 'performance_score', 'skills'],
  GlobalDepartment: ['department_id', 'department_code', 'department_name', 'country'],
  GlobalProject: ['project_id', 'project_name', 'client_name', 'status', 'start_date', 'end_date'],
  GlobalAssignment: ['employee_id', 'project_id', 'role', 'allocation_rate'],
  GlobalPayroll: ['employee_id', 'salary_usd', 'bonus_usd', 'risk_level'],
};

export default function RBAC() {
  const { user } = useOutletContext();
  const { data: me, loading } = useApi(() => api.me(), []);

  // Simulator state
  const [simRole, setSimRole] = useState('PROJECT_MANAGER');
  const [simTable, setSimTable] = useState('GlobalEmployee');

  if (loading) return <SkeletonCard height={500} />;
  if (!me) return <EmptyState title="Non authentifié" />;

  // Run simulation
  const policy = MATRIX[simRole];
  const tableAllowed = policy.tables === '*' || policy.tables.includes(simTable);
  const allColumns = TABLE_COLUMNS[simTable] || [];
  const blockedColumns = policy.blocked || [];
  
  const allowedCols = tableAllowed ? allColumns.filter(c => !blockedColumns.includes(c)) : [];
  const deniedCols = tableAllowed ? allColumns.filter(c => blockedColumns.includes(c)) : allColumns;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Your session */}
        <div className="ds-card" style={{ height: '100%' }}>
          <div className="ds-card__header">
            <div className="ds-card__title"><UserRound size={16} /> Votre session</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0' }}>
            <div style={{
              width: 54, height: 54, borderRadius: 14,
              background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
              color: '#fff', display: 'grid', placeItems: 'center',
            }}>
              <UserRound size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{me.name}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{me.username}</span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
                <span className="ds-badge ds-badge--brand"><Shield size={11} /> {me.role}</span>
              </div>
            </div>
          </div>

          {me.policy && (
            <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-surface-2)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Politique appliquée :</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, fontSize: 12 }}>
                <PolicyLine label="Tables autorisées" value={Array.isArray(me.policy.tables) ? me.policy.tables.join(', ') : me.policy.tables} />
                <PolicyLine label="Colonnes autorisées" value={Array.isArray(me.policy.columns) ? me.policy.columns.join(', ') : me.policy.columns} />
                {me.policy.blocked_columns?.length > 0 && (
                  <PolicyLine label="Colonnes bloquées" value={me.policy.blocked_columns.join(', ')} danger />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Simulator */}
        <div className="ds-card" style={{ height: '100%' }}>
          <div className="ds-card__header">
            <div className="ds-card__title"><Lock size={16} /> Simulateur de droits d'accès</div>
          </div>
          <p className="muted text-xs" style={{ marginBottom: 12 }}>
            Simulez la politique de filtrage proactif du médiateur pour n'importe quel couple Rôle × Table.
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Rôle</label>
              <select className="ds-input" value={simRole} onChange={(e) => setSimRole(e.target.value)} style={{ width: '100%', height: 36 }}>
                {Object.keys(ROLE_META).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Table globale</label>
              <select className="ds-input" value={simTable} onChange={(e) => setSimTable(e.target.value)} style={{ width: '100%', height: 36 }}>
                {TABLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{
            background: tableAllowed ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${tableAllowed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 8,
            padding: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: tableAllowed ? 'var(--success-500)' : 'var(--danger-500)', marginBottom: 8 }}>
              {tableAllowed ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
              {tableAllowed ? 'ACCÈS AUTORISÉ' : 'ACCÈS REFUSÉ'}
            </div>

            {tableAllowed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--success-500)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Colonnes Lisibles ({allowedCols.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {allowedCols.map(c => <span key={c} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(16,185,129,0.1)', color: 'var(--success-500)', padding: '2px 5px', borderRadius: 4 }}>{c}</span>)}
                  </div>
                </div>
                {deniedCols.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--danger-500)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Colonnes Bloquées ({deniedCols.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {deniedCols.map(c => <span key={c} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-500)', padding: '2px 5px', borderRadius: 4 }}>{c}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                L'utilisateur avec le rôle <strong>{simRole}</strong> n'a pas le droit d'interroger la table <strong>{simTable}</strong>. Toute tentative déclenchera un blocage proactif <code>HTTP 403 Forbidden</code>.
              </div>
            )}
          </div>
        </div>
      </div>

      <RolesMatrix />

      <div className="ds-card" style={{ display: 'flex', gap: 12, padding: 16, alignItems: 'flex-start' }}>
        <Lock size={16} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Le RBAC s'applique avant la réécriture.</strong>{' '}
          Si un utilisateur tente d'accéder à une table ou une colonne interdite, le médiateur lève
          une exception <code className="mono">PermissionError</code> (HTTP 403) sans jamais interroger
          les sources locales. Cela garantit l'absence de fuite via les requêtes intermédiaires.
        </div>
      </div>
    </div>
  );
}

function PolicyLine({ label, value, danger }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3,
      }}>{label}</div>
      <div className="mono" style={{ fontSize: 12, color: danger ? 'var(--danger-500)' : 'var(--text-primary)' }}>
        {value || '—'}
      </div>
    </div>
  );
}

function RolesMatrix() {
  // Hardcoded role policies summary (matches enterprise_mediator.ROLE_POLICIES)
  const matrix = {
    ADMIN:           { tables: 'all',                            blocked: [] },
    HR_MANAGER:      { tables: ['GlobalEmployee','GlobalDepartment','GlobalProject','GlobalAssignment','GlobalPayroll'], blocked: ['risk_level'] },
    PROJECT_MANAGER: { tables: ['GlobalEmployee','GlobalDepartment','GlobalProject','GlobalAssignment'], blocked: ['salary_usd','bonus_usd','risk_level','national_id'] },
    FINANCE_OFFICER: { tables: ['GlobalEmployee','GlobalPayroll','GlobalDepartment'], blocked: [] },
    EMPLOYEE_VIEWER: { tables: ['GlobalEmployee','GlobalDepartment','GlobalProject','GlobalAssignment'], blocked: ['salary_usd','bonus_usd','risk_level','national_id','birth_date'] },
  };

  return (
    <div className="ds-card">
      <div className="ds-card__header">
        <div className="ds-card__title"><Shield size={16} /> Matrice rôles × tables</div>
        <span className="ds-badge ds-badge--neutral">5 rôles</span>
      </div>

      <div className="ds-table-wrap">
        <table className="ds-table">
          <thead>
            <tr>
              <th>Rôle</th>
              {TABLES.map(t => <th key={t} style={{ textAlign: 'center' }}>{t.replace('Global', '')}</th>)}
              <th>Colonnes bloquées</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(matrix).map(([role, policy]) => {
              const meta = ROLE_META[role] || {};
              const Icon = meta.icon || UserRound;
              return (
                <tr key={role}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon size={14} style={{ color: meta.color }} />
                      <strong>{role}</strong>
                    </div>
                  </td>
                  {TABLES.map(t => {
                    const ok = policy.tables === 'all' || policy.tables.includes(t);
                    return (
                      <td key={t} style={{ textAlign: 'center' }}>
                        {ok ? (
                          <span style={{ display: 'inline-grid', placeItems: 'center', width: 24, height: 24, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', color: 'var(--success-500)' }}>
                            <Check size={13} />
                          </span>
                        ) : (
                          <span style={{ display: 'inline-grid', placeItems: 'center', width: 24, height: 24, borderRadius: '50%', background: 'rgba(239,68,68,0.10)', color: 'var(--danger-500)' }}>
                            <X size={13} />
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ fontSize: 11 }}>
                    {policy.blocked.length === 0 ? (
                      <span style={{ color: 'var(--text-tertiary)' }}>aucune</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {policy.blocked.map(c => (
                          <span key={c} className="mono" style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 4,
                            background: 'rgba(239,68,68,0.10)', color: 'var(--danger-500)',
                          }}>{c}</span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 14 }}>
        {Object.entries(ROLE_META).map(([role, m]) => {
          const Icon = m.icon;
          return (
            <div key={role} style={{
              padding: 12, background: 'var(--bg-surface-2)',
              borderRadius: 8, borderLeft: `3px solid ${m.color}`,
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Icon size={14} style={{ color: m.color }} />
                <strong style={{ fontSize: 12 }}>{role}</strong>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{m.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
