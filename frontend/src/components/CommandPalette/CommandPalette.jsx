import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Terminal,
  Database,
  Network,
  Layers3,
  GitBranch,
  BarChart3,
  Shield,
  Sun,
  Moon,
  LogOut,
  Sparkles,
  RefreshCw,
  Activity,
} from 'lucide-react';
import './palette.css';

export default function CommandPalette({ open, onClose, commands }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group?.toLowerCase().includes(q) ||
        c.shortcut?.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[active];
      if (cmd) { cmd.run(); onClose(); }
    }
  };

  const grouped = useMemo(() => {
    const out = new Map();
    filtered.forEach((c, idx) => {
      const g = c.group || 'Actions';
      if (!out.has(g)) out.set(g, []);
      out.get(g).push({ ...c, _idx: idx });
    });
    return out;
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cp-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="cp-panel"
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cp-search">
              <Search size={16} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Tapez pour chercher une commande..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                spellCheck={false}
              />
              <kbd>Esc</kbd>
            </div>

            <div className="cp-list">
              {filtered.length === 0 && (
                <div className="cp-empty">Aucune commande pour "{query}"</div>
              )}
              {Array.from(grouped.entries()).map(([group, items]) => (
                <div key={group} className="cp-group">
                  <div className="cp-group-title">{group}</div>
                  {items.map((c) => {
                    const Icon = c.icon || Sparkles;
                    return (
                      <button
                        key={c.id}
                        className={`cp-item ${active === c._idx ? 'cp-item--active' : ''}`}
                        onMouseEnter={() => setActive(c._idx)}
                        onClick={() => { c.run(); onClose(); }}
                      >
                        <Icon size={15} />
                        <span className="cp-label">{c.label}</span>
                        {c.shortcut && <kbd>{c.shortcut}</kbd>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="cp-footer">
              <span><kbd>up</kbd><kbd>down</kbd> Naviguer</span>
              <span><kbd>Enter</kbd> Executer</span>
              <span><kbd>Esc</kbd> Fermer</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function buildCommands({ navigate, setMode, toggleTheme, theme, logout, resetSources, addDemo, toast }) {
  return [
    { id: 'go-dashboard',     group: 'Navigation', label: 'Aller au Dashboard',          icon: LayoutDashboard, shortcut: 'g d', run: () => navigate('/') },
    { id: 'go-console',       group: 'Navigation', label: 'Console SQL',                  icon: Terminal,         shortcut: 'g q', run: () => navigate('/console') },
    { id: 'go-sources',       group: 'Navigation', label: 'Sources heterogenes',          icon: Database,         shortcut: 'g s', run: () => navigate('/sources') },
    { id: 'go-schema',        group: 'Navigation', label: 'Schema global',                icon: Network,          shortcut: 'g h', run: () => navigate('/schema') },
    { id: 'go-recon',         group: 'Navigation', label: 'Reconciliation',               icon: Layers3,          shortcut: 'g r', run: () => navigate('/reconciliation') },
    { id: 'go-conflicts',     group: 'Navigation', label: 'Conflits',                     icon: GitBranch,        shortcut: 'g c', run: () => navigate('/conflicts') },
    { id: 'go-analytics',     group: 'Navigation', label: 'Analytics',                    icon: BarChart3,        shortcut: 'g a', run: () => navigate('/analytics') },
    { id: 'go-rbac',          group: 'Navigation', label: 'Securite RBAC',                icon: Shield,           shortcut: 'g b', run: () => navigate('/rbac') },
    { id: 'go-audit',         group: 'Navigation', label: "Journal d'audit",              icon: Activity,         shortcut: 'g u', run: () => navigate('/audit') },

    { id: 'mode-gav',         group: 'Reecriture', label: 'Basculer en mode GAV',         icon: GitBranch,         run: () => { setMode('GAV'); toast?.info?.('Mode GAV active', 'Reecriture par depliement'); } },
    { id: 'mode-lav',         group: 'Reecriture', label: 'Basculer en mode LAV Bucket',  icon: GitBranch,         run: () => { setMode('LAV'); toast?.info?.('Mode LAV active', 'Algorithme Bucket'); } },

    { id: 'toggle-theme',     group: 'Apparence',  label: theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre', icon: theme === 'dark' ? Sun : Moon, run: toggleTheme },

    { id: 'reset-sources',    group: 'Admin',      label: 'Reinitialiser les sources',    icon: RefreshCw,         run: resetSources },
    { id: 'add-demo',         group: 'Admin',      label: 'Ajouter une ligne de demo (S1)', icon: Sparkles,        run: addDemo },
    { id: 'logout',           group: 'Session',    label: 'Se deconnecter',               icon: LogOut,            run: logout },
  ];
}
