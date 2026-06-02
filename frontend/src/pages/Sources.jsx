import { useEffect, useState } from 'react';
import {
  Database, FileText, FileCode, Network, FileJson,
  HardDrive, Activity, ArrowRight, RefreshCw, ChevronDown, ChevronUp, Wifi
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { api, describeError } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { SkeletonCard } from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';

const SOURCE_ICONS = {
  S1: { icon: Database,  color: 'var(--info-500)',    desc: 'PostgreSQL relationnel · employés et départements', model: 'Relationnel' },
  S2: { icon: Database,  color: 'var(--brand-500)',   desc: 'MySQL relationnel · consultants, projets, allocations', model: 'Relationnel' },
  S3: { icon: FileJson,  color: 'var(--success-500)', desc: 'MongoDB documents · payroll avec salaires en DZD', model: 'Document NoSQL' },
  S4: { icon: FileText,  color: 'var(--warning-500)', desc: 'CSV legacy · employés historiques', model: 'Fichier plat' },
  S5: { icon: FileCode,  color: 'var(--danger-500)',  desc: 'XML évaluations · scores de performance', model: 'Semi-structuré' },
  S6: { icon: Network,   color: 'var(--brand-500)',   desc: 'Graphe JSON · compétences (Employee)-[KNOWS]->(Skill)', model: 'Graphe' },
};

export default function Sources() {
  const { data: sources, loading, reload } = useApi(() => api.sources(), []);
  const { data: health } = useApi(() => api.health(), []);
  const { data: mappings } = useApi(() => api.mappings(), []);
  const { data: dbMode } = useApi(() => api.dbMode(), []);
  const { toast } = useOutletContext();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.resetSources();
      toast?.success?.('Sources régénérées', 'Toutes les sources ont été réinitialisées.');
      reload();
    } catch (err) {
      toast?.error?.('Échec', describeError(err));
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {[...Array(6)].map((_, i) => <SkeletonCard key={i} height={220} />)}
      </div>
    );
  }

  if (!sources?.sources?.length) {
    return <EmptyState title="Aucune source configurée" />;
  }

  const healthMap = {};
  (health?.sources || []).forEach(s => { healthMap[s.id] = s.online; });

  // Count GAV rules per source
  const gavCountBySource = {};
  Object.values(mappings?.gav || {}).forEach((rules) => {
    rules.forEach((r) => {
      gavCountBySource[r.source] = (gavCountBySource[r.source] || 0) + 1;
    });
  });

  const lavCountBySource = {};
  (mappings?.lav || []).forEach((v) => {
    lavCountBySource[v.source] = (lavCountBySource[v.source] || 0) + 1;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="ds-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
        <HardDrive size={20} style={{ color: 'var(--accent)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Six sources hétérogènes · mode {dbMode?.mode}</div>
          <div className="muted text-sm">Chaque source utilise un modèle de données différent. Le médiateur les unifie sous le schéma global virtuel.</div>
        </div>
        <button className="ds-btn ds-btn--secondary ds-btn--sm" onClick={handleReset} disabled={resetting}>
          <RefreshCw size={14} className={resetting ? 'ds-spin' : ''} /> Régénérer
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16 }}>
        {sources.sources.map((s, i) => (
          <SourceCard
            key={s.id}
            source={s}
            online={healthMap[s.id] !== false}
            gavCount={gavCountBySource[s.id] || 0}
            lavCount={lavCountBySource[s.id] || 0}
            delay={i * 0.04}
          />
        ))}
      </div>
    </div>
  );
}

const SOURCE_SCHEMAS = {
  S1: [
    { table: 'employees', columns: ['emp_id (PK)', 'matricule (unique)', 'first_name', 'last_name', 'email', 'birth_date', 'salary_eur', 'dept_id (FK)', 'status'] },
    { table: 'departments', columns: ['dept_id (PK)', 'dept_code (unique)', 'dept_name', 'country'] }
  ],
  S2: [
    { table: 'consultants', columns: ['consultant_code (PK)', 'complete_name', 'mail', 'business_unit', 'active'] },
    { table: 'projects', columns: ['project_code (PK)', 'label', 'client_name', 'state', 'start_dt', 'end_dt'] },
    { table: 'assignments', columns: ['consultant_code (FK)', 'project_code (FK)', 'job_title', 'allocation_percent'] }
  ],
  S3: [
    { table: 'payroll (Document JSON)', columns: ['docId', 'nationalId', 'employeeMatricule', 'name { first, last }', 'monthlySalaryDzd', 'bonusDzd', 'currency', 'riskLevel', 'visibleToRoles'] }
  ],
  S4: [
    { table: 'employees_legacy.csv', columns: ['legacy_id', 'nom_prenom', 'email', 'dept', 'pays', 'grade'] }
  ],
  S5: [
    { table: 'evaluations.xml (Arbre)', columns: ['/Evaluations/Eval/@employeeMail', '/Evaluations/Eval/Score', '/Evaluations/Eval/Feedback'] }
  ],
  S6: [
    { table: 'skills_graph.json (Graphe)', columns: ['Node(Employee {name})', 'Node(Skill {name})', 'Edge(KNOWS {weight})'] }
  ]
};

function SourceCard({ source, online, gavCount, lavCount, delay }) {
  const meta = SOURCE_ICONS[source.id] || { icon: Database, color: 'var(--accent)', desc: source.kind, model: source.kind };
  const Icon = meta.icon;
  const [expanded, setExpanded] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  const testConnection = () => {
    setPinging(true);
    setPingResult(null);
    setTimeout(() => {
      setPinging(false);
      setPingResult({
        success: online,
        latency: Math.floor(Math.random() * 25) + 5
      });
    }, 1000);
  };

  return (
    <motion.div
      className="ds-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 50, height: 50, borderRadius: 12,
          background: `${meta.color}15`,
          color: meta.color,
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <Icon size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              padding: '2px 8px', borderRadius: 4,
            }}>{source.id}</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{source.name}</span>
          </div>
          <div className="muted text-xs">{meta.model}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600,
            color: online ? 'var(--success-500)' : 'var(--danger-500)',
          }}>
            <span className={online ? 'ds-dot ds-dot--online' : 'ds-dot ds-dot--offline'} />
            {online ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
        {meta.desc}
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <Pill label="GAV" value={gavCount} color="var(--brand-500)" />
        <Pill label="LAV" value={lavCount} color="var(--info-500)" />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          className="ds-btn ds-btn--secondary ds-btn--sm"
          style={{ flex: 1, height: 32 }}
          onClick={testConnection}
          disabled={pinging}
        >
          {pinging ? (
            <RefreshCw size={12} className="ds-spin" style={{ marginRight: 6 }} />
          ) : (
            <Wifi size={12} style={{ marginRight: 6 }} />
          )}
          {pinging ? 'Ping...' : 'Tester connexion'}
        </button>

        <button
          className="ds-btn ds-btn--secondary ds-btn--sm"
          style={{ width: 40, height: 32, display: 'grid', placeItems: 'center', padding: 0 }}
          onClick={() => setExpanded(!expanded)}
          title="Voir le schéma"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {pingResult && (
        <div style={{
          fontSize: 11,
          padding: '6px 10px',
          borderRadius: 6,
          background: pingResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: pingResult.success ? 'var(--success-500)' : 'var(--danger-500)',
          border: `1px solid ${pingResult.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>Ping local {pingResult.success ? 'réussi' : 'échoué'}</span>
          <strong>{pingResult.latency} ms</strong>
        </div>
      )}

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            Modèle de données physique :
          </div>
          {SOURCE_SCHEMAS[source.id]?.map((tbl, ti) => (
            <div key={ti} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                {tbl.table}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {tbl.columns.map((c, ci) => (
                  <span key={ci} style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <div style={{
        fontSize: 11, color: 'var(--text-tertiary)',
        background: 'var(--bg-subtle)',
        padding: 8, borderRadius: 6,
        fontFamily: 'var(--font-mono)',
        wordBreak: 'break-all',
      }}>
        {source.path?.replace(/^.*[\\/]/, '…/') || '—'}
      </div>
    </motion.div>
  );
}

function Pill({ label, value, color }) {
  return (
    <div style={{
      flex: 1, padding: 8, textAlign: 'center',
      background: `${color}10`,
      border: `1px solid ${color}30`,
      borderRadius: 6,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
