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

            <ul className="login-highlights">
              {HIGHLIGHTS.map((h, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.07 }}
                >
                  <AnimatedIcon icon={h.icon} color="info" size={16} pulse={i === 0} />
                  <div>
                    <strong>{h.title}</strong>
                    <span>{h.text}</span>
                  </div>
                </motion.li>
              ))}
            </ul>

            <div className="login-foot">
              <Zap size={11} />
              <span>JWT signe - bcrypt - rate limiting - audit trail</span>
            </div>
          </div>
        </aside>

        <main className="login-main">
          <motion.div
            className="login-card glass"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="login-card__header">
              <div className="login-card__badge">
                <CheckCircle2 size={11} /> Connexion securisee
              </div>
              <h2 className="login-card__title">Bienvenue</h2>
              <p className="login-card__subtitle">
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

            <footer className="login-card__footer">
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
