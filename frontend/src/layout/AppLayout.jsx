import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Database,
  LayoutDashboard,
  Terminal,
  Network,
  Layers3,
  GitBranch,
  BarChart3,
  Shield,
  Search,
  Sun,
  Moon,
  LogOut,
  UserRound,
  Menu,
  Activity,
} from 'lucide-react';
import { useTheme } from '../components/Theme/ThemeProvider';
import { useToast } from '../components/Toast/ToastProvider';
import CommandPalette, { buildCommands } from '../components/CommandPalette/CommandPalette';
import { api } from '../lib/api';
import './layout.css';

const NAV = [
  { to: '/',                label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/console',         label: 'Console SQL',   icon: Terminal },
  { to: '/sources',         label: 'Sources',       icon: Database },
  { to: '/schema',          label: 'Schema global', icon: Network },
  { to: '/reconciliation',  label: 'Reconciliation',icon: Layers3 },
  { to: '/conflicts',       label: 'Conflits',      icon: GitBranch },
  { to: '/analytics',       label: 'Analytics',     icon: BarChart3 },
  { to: '/rbac',            label: 'Securite RBAC', icon: Shield },
  { to: '/audit',           label: 'Journal audit', icon: Activity },
];

export default function AppLayout({ user, onLogout, mode, setMode }) {
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleResetSources = async () => {
    try {
      await api.resetSources();
      toast.success('Sources reinitialisees', 'Toutes les sources ont ete regenerees.');
    } catch (err) {
      toast.error('Echec', err.response?.data?.detail || err.message);
    }
  };

  const handleAddDemo = async () => {
    try {
      const r = await api.addDemoEmployee();
      toast.success('Ligne ajoutee', r.message || 'Visible immediatement sans recalcul.');
    } catch (err) {
      toast.error('Echec', err.response?.data?.detail || err.message);
    }
  };

  const commands = buildCommands({
    navigate,
    setMode,
    toggleTheme,
    theme,
    logout: onLogout,
    resetSources: handleResetSources,
    addDemo: handleAddDemo,
    toast,
  });

  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))) || NAV[0];

  return (
    <div className="al-shell">
      <aside className={`al-sidebar ${sidebarOpen ? 'al-sidebar--open' : ''}`}>
        <div className="ds-brand">
          <div className="ds-brand__mark"><Database size={20} /></div>
          <div>
            <div className="ds-brand__name">DataMediator</div>
            <div className="ds-brand__tag">Mediation GAV / LAV</div>
          </div>
        </div>

        <button className="al-search" onClick={() => setPaletteOpen(true)}>
          <Search size={14} />
          <span>Rechercher...</span>
          <kbd>Ctrl+K</kbd>
        </button>

        <nav className="al-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `al-nav__item ${isActive ? 'al-nav__item--active' : ''}`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="al-user">
          <div className="al-user__avatar"><UserRound size={18} /></div>
          <div className="al-user__body">
            <div className="al-user__name">{user?.name || user?.username || 'Utilisateur'}</div>
            <div className="ds-badge ds-badge--brand"><Shield size={10} /> {user?.role}</div>
          </div>
          <button
            type="button"
            className="ds-btn ds-btn--ghost ds-btn--icon"
            title="Deconnexion"
            onClick={onLogout}
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <div className="al-main">
        <header className="al-topbar">
          <div className="al-topbar__left">
            <button
              className="al-burger"
              aria-label="Menu"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="al-topbar__title">{current.label}</h1>
              <p className="al-topbar__subtitle">{getSubtitle(current.to)}</p>
            </div>
          </div>

          <div className="al-topbar__right">
            <div className="ds-segmented" role="tablist" aria-label="Strategie">
              <button
                className={`ds-segmented__btn ${mode === 'GAV' ? 'ds-segmented__btn--active' : ''}`}
                onClick={() => setMode('GAV')}
              >GAV</button>
              <button
                className={`ds-segmented__btn ${mode === 'LAV' ? 'ds-segmented__btn--active' : ''}`}
                onClick={() => setMode('LAV')}
              >LAV</button>
            </div>
            <button
              type="button"
              className="ds-btn ds-btn--ghost ds-btn--icon"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="al-content"
        >
          <Outlet context={{ user, mode, setMode, toast }} />
        </motion.main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
}

function getSubtitle(path) {
  switch (path) {
    case '/':                return "Vue d'ensemble du mediateur et des sources";
    case '/console':         return "Editeur SQL global et plan d'execution";
    case '/sources':         return 'Etat et contenu des six sources heterogenes';
    case '/schema':          return 'Graphe ER interactif du schema global virtuel';
    case '/reconciliation':  return "Fusion d'entites cross-sources (Fellegi-Sunter)";
    case '/conflicts':       return 'Conflits de schemas et resolutions appliquees';
    case '/analytics':       return 'Indicateurs et tendances metier';
    case '/rbac':            return "Politiques d'acces par role";
    case '/audit':           return 'Journal append-only des actions sensibles';
    default:                 return '';
  }
}
