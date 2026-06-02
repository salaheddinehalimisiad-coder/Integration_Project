import { useEffect, useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar, Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, Activity, Award, Users, Briefcase,
  Filter, Globe, Cpu, Sparkles,
} from 'lucide-react';
import { api, describeError } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { SkeletonCard } from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';
import AnimatedCounter from '../components/UI/AnimatedCounter';

const PALETTE = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#0ea5e9'];

export default function Analytics() {
  const [employees, setEmployees] = useState(null);
  const [projects, setProjects]   = useState(null);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.execute("SELECT full_name, email, department_name, country, status, performance_score, skills FROM GlobalEmployee;", "GAV"),
      api.execute("SELECT project_name, status, client_name FROM GlobalProject;", "GAV"),
    ]).then(([emp, proj]) => {
      if (alive) {
        setEmployees(emp.rows || []);
        setProjects(proj.rows || []);
        setLoading(false);
      }
    }).catch((err) => {
      if (alive) { setError(describeError(err)); setLoading(false); }
    });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!employees) return [];
    return deptFilter ? employees.filter(e => e.department_name === deptFilter) : employees;
  }, [employees, deptFilter]);

  const stats = useMemo(() => {
    if (!filtered || !projects) return null;
    const byCountry   = group(filtered, 'country');
    const byDept      = group(filtered, 'department_name');
    const byStatus    = group(filtered, 'status');
    const projByStatus = group(projects, 'status');
    const withScore   = filtered.filter(e => e.performance_score != null);
    const avgScore    = withScore.length
      ? withScore.reduce((s, e) => s + Number(e.performance_score), 0) / withScore.length
      : 0;
    const skillCount = {};
    filtered.forEach(e => {
      if (e.skills) {
        String(e.skills).split(',').map(s => s.trim()).filter(Boolean).forEach(skill => {
          skillCount[skill] = (skillCount[skill] || 0) + 1;
        });
      }
    });
    const topSkills = Object.entries(skillCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Radar data: multi-dim profile
    const radarData = [
      { subject: 'Perf. Score', value: Math.min((avgScore / 100) * 10, 10) },
      { subject: 'Multi-pays', value: Math.min(byCountry.length * 2, 10) },
      { subject: 'Diversité RH', value: Math.min(byDept.length * 1.5, 10) },
      { subject: 'Projets', value: Math.min(projects.length * 0.5, 10) },
      { subject: 'Compétences', value: Math.min(Object.keys(skillCount).length * 0.8, 10) },
    ];

    // Radial bar for statuses
    const totalF = filtered.length || 1;
    const radialData = byStatus.map((s, i) => ({
      name: s.name,
      value: Math.round((s.value / totalF) * 100),
      fill: PALETTE[i % PALETTE.length],
    }));

    return {
      byCountry, byDept, byStatus, projByStatus, avgScore, topSkills,
      totalEmployees: filtered.length, totalProjects: projects.length,
      radarData, radialData,
    };
  }, [filtered, projects]);

  const allDepts = useMemo(() => {
    if (!employees) return [];
    return [...new Set(employees.map(e => e.department_name).filter(Boolean))];
  }, [employees]);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        {[...Array(6)].map((_, i) => <SkeletonCard key={i} height={280} />)}
      </div>
    );
  }
  if (error) return <EmptyState title="Erreur" description={error} />;
  if (!stats) return <EmptyState title="Pas de données disponibles" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header + filtre ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Analytics du schéma global</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Données consolidées depuis les 6 sources hétérogènes via le médiateur GAV
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
          <select
            className="ds-input"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            style={{ height: 32, fontSize: 12, minWidth: 180 }}
          >
            <option value="">Tous les départements</option>
            {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <KpiCard icon={Users}      label="Effectif filtré" value={stats.totalEmployees} color="var(--accent)" bg="var(--accent-soft)" />
        <KpiCard icon={Briefcase}  label="Projets total"   value={stats.totalProjects}  color="var(--info-500)"    bg="rgba(59,130,246,0.10)" />
        <KpiCard icon={Award}      label="Score moyen"     value={stats.avgScore.toFixed(1)} color="var(--success-500)" bg="rgba(16,185,129,0.10)" />
        <KpiCard icon={Globe}      label="Pays distincts"  value={stats.byCountry.length} color="var(--warning-500)"  bg="rgba(245,158,11,0.10)" />
      </section>

      {/* ── Charts grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>

        {/* Pie pays */}
        <ChartCard title="Répartition par pays" icon={Globe}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats.byCountry} dataKey="value" cx="50%" cy="50%" outerRadius={95}
                   label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                   labelLine={false}>
                {stats.byCountry.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle()} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Bar effectif par département */}
        <ChartCard title="Effectif par département" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byDept}>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle()} cursor={{ fill: 'var(--bg-surface-2)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {stats.byDept.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Radar profil */}
        <ChartCard title="Profil multidimensionnel du schéma global" icon={Sparkles}>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={stats.radarData} cx="50%" cy="50%" outerRadius={90}>
              <PolarGrid stroke="var(--border-subtle)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
              <Radar name="Schéma" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.30} strokeWidth={2} />
              <Tooltip contentStyle={tooltipStyle()} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Radial bar statuts employés */}
        <ChartCard title="Statuts employés (donut radial)" icon={Activity}>
          <ResponsiveContainer width="100%" height={260}>
            <RadialBarChart
              innerRadius="30%" outerRadius="90%"
              data={stats.radialData}
              startAngle={180} endAngle={-180}
            >
              <RadialBar label={{ fill: 'var(--text-primary)', fontSize: 11 }} background dataKey="value" />
              <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" align="center" />
              <Tooltip
                contentStyle={tooltipStyle()}
                formatter={(v) => [`${v}%`, '']}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Pie statut projets */}
        <ChartCard title="Statut des projets" icon={Briefcase}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stats.projByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%"
                   innerRadius={55} outerRadius={95}
                   label={({ name, value }) => `${name}: ${value}`}>
                {stats.projByStatus.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle()} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Bar horizontal top skills */}
        <ChartCard title="Top compétences · graphe S6" icon={Award}>
          {stats.topSkills.length === 0 ? (
            <EmptyState title="Aucune compétence" description="Le graphe S6 ne contient pas encore d'arêtes KNOWS." compact />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.topSkills} layout="vertical">
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} width={110} />
                <Tooltip contentStyle={tooltipStyle()} cursor={{ fill: 'var(--bg-surface-2)' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {stats.topSkills.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Distribution performance ── */}
      <ChartCard title="Distribution des scores de performance (tous employés filtrés)" icon={TrendingUp}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={buildScoreDistribution(filtered)}>
            <defs>
              <linearGradient id="score-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="bucket" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle()} />
            <Area type="monotone" dataKey="count" stroke="#4f46e5" fill="url(#score-grad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Tableau comparatif des sources ── */}
      <div className="ds-card">
        <div className="ds-card__header">
          <div className="ds-card__title"><Cpu size={16} /> Contribution par source · médiation GAV</div>
        </div>
        <p className="muted text-sm" style={{ margin: '0 0 12px' }}>
          Résumé de la contribution de chaque source hétérogène au schéma global virtuel.
        </p>
        <div className="ds-table-wrap">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Modèle</th>
                <th>Tables locales</th>
                <th>Entité globale couverte</th>
                <th>Spécificité</th>
              </tr>
            </thead>
            <tbody>
              {SOURCE_CONTRIBUTIONS.map((s, i) => (
                <motion.tr key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                      background: 'var(--accent-soft)', color: 'var(--accent)',
                      padding: '2px 8px', borderRadius: 4,
                    }}>{s.id}</span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: `${s.color}15`, color: s.color,
                    }}>{s.model}</span>
                  </td>
                  <td className="mono text-xs">{s.tables}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.covers}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.note}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── static data ─────────────────── */
const SOURCE_CONTRIBUTIONS = [
  { id: 'S1', model: 'PostgreSQL', tables: 'employees, departments',   covers: 'GlobalEmployee, GlobalDepartment', color: '#4f46e5', note: 'Source pivot — confiance max' },
  { id: 'S2', model: 'MySQL',      tables: 'consultants, projects, assignments', covers: 'GlobalEmployee, GlobalProject, GlobalAssignment', color: '#06b6d4', note: 'Projets & allocations' },
  { id: 'S3', model: 'MongoDB',    tables: 'payroll (documents JSON)', covers: 'GlobalPayroll',                  color: '#10b981', note: 'Salaires en DZD → USD' },
  { id: 'S4', model: 'CSV',        tables: 'employees_legacy.csv',     covers: 'GlobalEmployee (legacy)',         color: '#f59e0b', note: 'Données historiques' },
  { id: 'S5', model: 'XML',        tables: 'evaluations.xml',          covers: 'GlobalEmployee.performance_score', color: '#ef4444', note: 'Scores XPath /Eval/Score' },
  { id: 'S6', model: 'Graphe JSON',tables: 'skills_graph (nodes/edges)',covers: 'GlobalEmployee.skills',           color: '#a855f7', note: 'KNOWS edges → liste compétences' },
];

/* ─────────────────── helpers ─────────────────── */
function group(rows, key) {
  const acc = {};
  rows.forEach(r => {
    const v = r[key] || 'Inconnu';
    acc[v] = (acc[v] || 0) + 1;
  });
  return Object.entries(acc).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function buildScoreDistribution(employees) {
  const buckets = [
    { bucket: '0-60',   count: 0 },
    { bucket: '60-70',  count: 0 },
    { bucket: '70-80',  count: 0 },
    { bucket: '80-90',  count: 0 },
    { bucket: '90-100', count: 0 },
  ];
  employees.forEach(e => {
    const s = Number(e.performance_score);
    if (!isFinite(s)) return;
    if (s < 60)      buckets[0].count++;
    else if (s < 70) buckets[1].count++;
    else if (s < 80) buckets[2].count++;
    else if (s < 90) buckets[3].count++;
    else             buckets[4].count++;
  });
  return buckets;
}

function tooltipStyle() {
  return {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 8, fontSize: 12,
    color: 'var(--text-primary)',
  };
}

function KpiCard({ icon: Icon, label, value, color, bg }) {
  return (
    <motion.div className="ds-metric" whileHover={{ y: -2 }} transition={{ duration: 0.18 }}>
      <div className="ds-metric__header">
        <span className="ds-metric__label">{label}</span>
        <span className="ds-metric__icon" style={{ background: bg, color }}>
          <Icon size={18} />
        </span>
      </div>
      <div className="ds-metric__value">
        <AnimatedCounter value={Number(value) || 0} />
      </div>
    </motion.div>
  );
}

function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="ds-card">
      <div className="ds-card__header">
        <div className="ds-card__title"><Icon size={16} /> {title}</div>
      </div>
      {children}
    </div>
  );
}
