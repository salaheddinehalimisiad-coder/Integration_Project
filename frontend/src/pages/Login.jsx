import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, describeError } from '../lib/api';
import {
  Database, Eye, EyeOff, ArrowRight, Shield, AlertCircle,
  Users, BarChart3, Wallet, UserRound, Layers3, Network, Lock,
  Sparkles, Zap, CheckCircle2, GitBranch,
} from 'lucide-react';
import SEO from '../components/SEO/SEO';
import AnimatedCounter from '../components/UI/AnimatedCounter';
import AnimatedIcon from '../components/UI/AnimatedIcon';
import './Login.css';

const DEMO_ACCOUNTS = [
  { role: 'Administrateur',  user: 'admin',   pass: 'admin123',   icon: Shield,    hue: 'brand'   },
  { role: 'RH',              user: 'hr',      pass: 'hr123',      icon: Users,     hue: 'info'    },
  { role: 'Chef de projet',  user: 'project', pass: 'project123', icon: BarChart3, hue: 'success' },
  { role: 'Finance',         user: 'finance', pass: 'finance123', icon: Wallet,    hue: 'warning' },
  { role: 'Lecteur',         user: 'viewer',  pass: 'viewer123',  icon: UserRound, hue: 'neutral' },
];

const HIGHLIGHTS = [
  { icon: Layers3,  title: 'GAV & LAV',             text: 'Reecriture par depliement et algorithme Bucket / MiniCon.' },
  { icon: Network,  title: '6 sources heterogenes', text: 'SQL, NoSQL, fichier plat, XML, graphe.' },
  { icon: Lock,     title: 'Securite RBAC',         text: 'Cinq roles, colonnes sensibles filtrees avant execution.' },
];

const STATS = [
  { value: 6, label: 'sources heterogenes', icon: Database },
  { value: 5, label: 'relations globales',  icon: Network },
  { value: 9, label: 'vues LAV definies',   icon: Layers3 },
  { value: 8, label: 'conflits resolus',    icon: GitBranch },
];

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const userRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => userRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const onChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (error) setError('');
    setSelected(null);
  };

  const fillDemo = (acc) => {
    setSelected(acc.user);
    setForm({ username: acc.user, password: acc.pass });
    if (error) setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Identifiant et mot de passe requis.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.login(form);
      localStorage.setItem('dm_token', data.token);
      localStorage.setItem('dm_user', JSON.stringify(data));
      onLogin(data);
    } catch (err) {
      if (err.response?.status === 429) {
        const retry = err.response?.headers?.['retry-after'];
        setError(`Trop de tentatives. Reessayez dans ${retry || 'quelques'} seconde(s).`);
      } else {
        setError(describeError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Connexion - DataMediator"
           description="Plateforme de mediation virtuelle de donnees heterogenes" />
      <div className="login-shell">
        <aside className="login-aside" aria-hidden="true">
          <div className="login-aside__mesh" />
          <div className="login-aside__grid" />
          <span className="orb orb--brand"   style={{ top: '-80px',  left: '-60px',  width: '320px', height: '320px' }} />
          <span className="orb orb--pink"    style={{ bottom: '20%', right: '-100px', width: '360px', height: '360px', animationDelay: '2s' }} />
          <span className="orb orb--emerald" style={{ bottom: '-60px', left: '30%',   width: '280px', height: '280px', animationDelay: '4s' }} />

          <div className="login-aside__content">
            <motion.div
              className="login-brand"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="login-brand__mark">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-svg">
                  <defs>
                    <linearGradient id="logo-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                    <linearGradient id="logo-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#f43f5e" />
                    </linearGradient>
                    <linearGradient id="logo-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <path d="M16 3L27 9L16 15L5 9L16 3Z" fill="url(#logo-grad-1)" className="logo-layer logo-layer--top"/>
                  <path d="M16 10L27 16L16 22L5 16L16 10Z" fill="url(#logo-grad-2)" className="logo-layer logo-layer--mid"/>
                  <path d="M16 17L27 23L16 29L5 23L16 17Z" fill="url(#logo-grad-3)" className="logo-layer logo-layer--bot"/>
                </svg>
              </div>
              <div className="login-brand__text">
                <h1 className="login-brand__name">DataMediator</h1>
                <p className="login-brand__tag">Médiation de Données Intelligente</p>
              </div>
            </motion.div>

            <motion.div
              className="login-hero"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="login-hero__eyebrow">
                <Sparkles size={11} /> Projet academique - Master Integration de Donnees
              </div>
              <h1 className="login-hero__title">
                Une seule requete.
                <br />
                <span>Six sources heterogenes.</span>
              </h1>
              <p className="login-hero__subtitle">
                Interrogez le schema global virtuel comme une base unique.
                Le mediateur gere la reecriture, l'execution distribuee, la
                reconciliation des entites et le controle d'acces.
              </p>
            </motion.div>

            <motion.div
              className="login-stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              {STATS.map((s, i) => (
                <motion.div
                  key={i}
                  className="login-stat"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                >
                  <AnimatedIcon icon={s.icon} color="brand" size={16} className="login-stat__ani" />
                  <div>
                    <div className="login-stat__value">
                      <AnimatedCounter value={s.value} duration={1100} />
                    </div>
                    <div className="login-stat__label">{s.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* 3D Isometric Architecture Preview Mockup */}
            <motion.div
              className="login-mockup-wrapper"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, duration: 0.8, ease: "easeOut" }}
            >
              <svg className="dashboard-mockup" viewBox="0 0 450 350" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="225" cy="175" r="130" fill="url(#mockup-radial-glow)" opacity="0.3" filter="blur(50px)" />
                <defs>
                  <radialGradient id="mockup-radial-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                  
                  <linearGradient id="card-mesh" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(25, 33, 56, 0.85)" />
                    <stop offset="100%" stopColor="rgba(10, 15, 30, 0.55)" />
                  </linearGradient>
                </defs>

                <g className="mockup-stack">
                  {/* 1. BOTTOM LAYER: 6 HETEROGENEOUS DATA SOURCES */}
                  <g className="mockup-layer mockup-layer--bottom">
                    <rect x="20" y="160" width="280" height="150" rx="12" fill="url(#card-mesh)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1.2" />
                    <text x="35" y="182" fill="rgba(255, 255, 255, 0.6)" fontSize="10" fontWeight="700" letterSpacing="0.05em">HETEROGENEOUS SOURCES (6)</text>
                    
                    <g transform="translate(35, 195)">
                      <rect x="0" y="0" width="70" height="30" rx="6" fill="rgba(59, 130, 246, 0.1)" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" />
                      <text x="35" y="18" fill="#93c5fd" fontSize="9" fontWeight="600" textAnchor="middle">PostgreSQL</text>
                      
                      <rect x="80" y="0" width="70" height="30" rx="6" fill="rgba(245, 158, 11, 0.1)" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="1" />
                      <text x="115" y="18" fill="#fde047" fontSize="9" fontWeight="600" textAnchor="middle">MySQL</text>

                      <rect x="160" y="0" width="70" height="30" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" />
                      <text x="195" y="18" fill="#6ee7b7" fontSize="9" fontWeight="600" textAnchor="middle">MongoDB</text>

                      <rect x="0" y="40" width="70" height="30" rx="6" fill="rgba(168, 85, 247, 0.1)" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="1" />
                      <text x="35" y="58" fill="#d8b4fe" fontSize="9" fontWeight="600" textAnchor="middle">XML API</text>

                      <rect x="80" y="40" width="70" height="30" rx="6" fill="rgba(6, 182, 212, 0.1)" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="1" />
                      <text x="115" y="58" fill="#67e8f9" fontSize="9" fontWeight="600" textAnchor="middle">Neo4j Graph</text>

                      <rect x="160" y="40" width="70" height="30" rx="6" fill="rgba(148, 163, 184, 0.1)" stroke="rgba(148, 163, 184, 0.3)" strokeWidth="1" />
                      <text x="195" y="58" fill="#cbd5e1" fontSize="9" fontWeight="600" textAnchor="middle">CSV File</text>
                    </g>
                  </g>

                  {/* 2. MIDDLE LAYER: DISTRIBUTED MEDIATION ENGINE (DAG PLANNER) */}
                  <g className="mockup-layer mockup-layer--middle">
                    <rect x="60" y="90" width="280" height="150" rx="12" fill="url(#card-mesh)" stroke="rgba(99, 102, 241, 0.28)" strokeWidth="1.2" style={{ backdropFilter: "blur(4px)" }} />
                    <text x="75" y="112" fill="#818cf8" fontSize="10" fontWeight="700" letterSpacing="0.05em">MEDIATION ENGINE (DAG)</text>
                    
                    <g transform="translate(80, 130)">
                      <rect x="70" y="0" width="100" height="22" rx="5" fill="rgba(99, 102, 241, 0.18)" stroke="#6366f1" strokeWidth="1.2" />
                      <text x="120" y="14" fill="#c7d2fe" fontSize="8" fontWeight="600" textAnchor="middle">Global Schema Query</text>

                      <path d="M120 22 L85 45 M120 22 L155 45" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />

                      <rect x="30" y="45" width="85" height="22" rx="5" fill="rgba(236, 72, 153, 0.15)" stroke="#ec4899" strokeWidth="1.2" />
                      <text x="72" y="59" fill="#fbcfe8" fontSize="8" fontWeight="600" textAnchor="middle">GAV Rule Decomp</text>

                      <rect x="125" y="45" width="85" height="22" rx="5" fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" strokeWidth="1.2" />
                      <text x="167" y="59" fill="#a5f3fc" fontSize="8" fontWeight="600" textAnchor="middle">LAV Bucket / MiniCon</text>

                      <path d="M72 67 L120 90 M167 67 L120 90" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />

                      <rect x="70" y="90" width="100" height="22" rx="5" fill="rgba(16, 185, 129, 0.18)" stroke="#10b981" strokeWidth="1.2" />
                      <text x="120" y="104" fill="#a7f3d0" fontSize="8" fontWeight="600" textAnchor="middle">Entity Resolution</text>
                    </g>
                  </g>

                  {/* 3. TOP LAYER: UNIFIED GRAPHQL / SQL CLIENT INTERFACE */}
                  <g className="mockup-layer mockup-layer--top">
                    <rect x="100" y="20" width="280" height="150" rx="12" fill="url(#card-mesh)" stroke="rgba(236, 72, 153, 0.28)" strokeWidth="1.2" style={{ backdropFilter: "blur(8px)" }} />
                    <text x="115" y="42" fill="#ec4899" fontSize="10" fontWeight="700" letterSpacing="0.05em">UNIFIED API CLIENT</text>

                    <g transform="translate(115, 55)">
                      <rect x="0" y="0" width="115" height="85" rx="5" fill="rgba(15, 23, 42, 0.7)" stroke="rgba(255,255,255,0.06)" />
                      <text x="10" y="15" fill="#f43f5e" fontSize="7" fontFamily="monospace">{"query Integration {"}</text>
                      <text x="20" y="27" fill="#6366f1" fontSize="7" fontFamily="monospace">{"  employee(id: 101) {"}</text>
                      <text x="30" y="39" fill="#94a3b8" fontSize="7" fontFamily="monospace">    name</text>
                      <text x="30" y="51" fill="#94a3b8" fontSize="7" fontFamily="monospace">    salary</text>
                      <text x="30" y="63" fill="#10b981" fontSize="7" fontFamily="monospace">    projects</text>
                      <text x="20" y="75" fill="#f43f5e" fontSize="7" fontFamily="monospace">  {"}"}</text>
                      <text x="10" y="87" fill="#f43f5e" fontSize="7" fontFamily="monospace">{"}"}</text>

                      <rect x="125" y="0" width="120" height="85" rx="5" fill="rgba(15, 23, 42, 0.7)" stroke="rgba(255,255,255,0.06)" />
                      <text x="135" y="15" fill="#10b981" fontSize="7" fontFamily="monospace">{"{"}</text>
                      <text x="145" y="27" fill="#a855f7" fontSize="7" fontFamily="monospace">{"  \"data\": {"}</text>
                      <text x="155" y="39" fill="#3b82f6" fontSize="7" fontFamily="monospace">    "name": "Salah",</text>
                      <text x="155" y="51" fill="#3b82f6" fontSize="7" fontFamily="monospace">    "salary": 78000,</text>
                      <text x="155" y="63" fill="#a5f3fc" fontSize="7" fontFamily="monospace">    "sources": 6</text>
                      <text x="145" y="75" fill="#a855f7" fontSize="7" fontFamily="monospace">{"  }"}</text>
                      <text x="135" y="87" fill="#10b981" fontSize="7" fontFamily="monospace">{"}"}</text>
                    </g>
                  </g>
                </g>
              </svg>
            </motion.div>

            <div className="login-foot">
              <Zap size={11} />
              <span>JWT signe - bcrypt - rate limiting - audit trail</span>
            </div>
          </div>
        </aside>

        <main className="login-main">
          <motion.div
            className="login-portal-card"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="login-portal-card__header">
              <div className="login-portal-card__badge">
                <CheckCircle2 size={11} /> Connexion securisee
              </div>
              <h2 className="login-portal-card__title">Bienvenue</h2>
              <p className="login-portal-card__subtitle">
                Identifiez-vous pour acceder a la console de mediation.
              </p>
            </header>

            <form onSubmit={submit} className="login-form" noValidate>
              <div className="ds-field">
                <label className="ds-field__label" htmlFor="login-user">Identifiant</label>
                <div className="login-input-wrapper">
                  <UserRound size={16} className="login-input-icon" />
                  <input
                    id="login-user"
                    ref={userRef}
                    className="ds-input login-input-with-icon"
                    type="text"
                    autoComplete="username"
                    placeholder="admin, hr, project, finance, viewer..."
                    value={form.username}
                    onChange={onChange('username')}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="ds-field">
                <label className="ds-field__label" htmlFor="login-pwd">Mot de passe</label>
                <div className="login-input-wrapper">
                  <Lock size={16} className="login-input-icon" />
                  <div className="ds-input-wrap login-input-wrap-with-icon">
                    <input
                      id="login-pwd"
                      className="ds-input"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="********"
                      value={form.password}
                      onChange={onChange('password')}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="ds-input-wrap__addon"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? 'Masquer' : 'Afficher'}
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    key="err"
                    className="ds-alert ds-alert--danger"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="ds-spin"><Database size={16} /></span>
                    Verification...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="login-divider">
              <span>Comptes de demonstration</span>
            </div>

            <div className="login-demo-grid">
              {DEMO_ACCOUNTS.map((acc) => (
                <motion.button
                  key={acc.user}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className={`login-demo ${selected === acc.user ? 'login-demo--active' : ''}`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className={`login-demo__icon login-demo__icon--${acc.hue}`}>
                    <acc.icon size={15} />
                  </span>
                  <span className="login-demo__body">
                    <span className="login-demo__role">{acc.role}</span>
                    <span className="login-demo__creds mono">{acc.user} - {acc.pass}</span>
                  </span>
                </motion.button>
              ))}
            </div>

            <footer className="login-portal-card__footer">
              <span className="muted text-xs">v3.2.0 - Soutenance ready</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>
                <Shield size={10} /> chiffre bout-en-bout
              </span>
            </footer>
          </motion.div>
        </main>
      </div>
    </>
  );
}
