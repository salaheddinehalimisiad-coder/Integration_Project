import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Database,
  BarChart3,
  Shield,
  Settings,
  FileText,
  Layers3,
  GitBranch,
  Network,
  PieChart,
  Activity,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';
import './Sidebar.css';

const menuItems = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3, path: '/' },
      { id: 'query', label: 'Requêtes SQL', icon: FileText, path: '/query' },
    ]
  },
  {
    title: 'Analyse',
    items: [
      { id: 'schema', label: 'Schéma Global', icon: Layers3, path: '/schema' },
      { id: 'mappings', label: 'Mappings', icon: GitBranch, path: '/mappings' },
      { id: 'reconciliation', label: 'Réconciliation', icon: Network, path: '/reconciliation' },
    ]
  },
  {
    title: 'Administration',
    items: [
      { id: 'sources', label: 'Sources', icon: Database, path: '/sources' },
      { id: 'analytics', label: 'Analytics', icon: PieChart, path: '/analytics' },
      { id: 'settings', label: 'Paramètres', icon: Settings, path: '/settings' },
    ]
  }
];

const Sidebar = ({ isOpen, onClose, user }) => {
  const [expandedSections, setExpandedSections] = useState(['Principal', 'Analyse']);
  const location = useLocation();

  const toggleSection = (title) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(section => section !== title)
        : [...prev, title]
    );
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleItemClick = () => {
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <motion.aside
        className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}
        initial={false}
        animate={{
          width: isOpen ? 280 : 80,
          transition: { duration: 0.3, ease: "easeInOut" }
        }}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <motion.div
              className="sidebar-logo"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Database size={24} />
            </motion.div>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  className="sidebar-brand-text"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2>DataMediator</h2>
                  <span>Pro</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button
            className="sidebar-close"
            onClick={onClose}
            style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="sidebar-user"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <div className="user-avatar">
                <span>{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="user-info">
                <div className="user-name">{user?.name || user?.username}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((section, sectionIndex) => (
            <div key={section.title} className="nav-section">
              <button
                className="nav-section-header"
                onClick={() => toggleSection(section.title)}
              >
                <span className="nav-section-title">{section.title}</span>
                <motion.div
                  animate={{ rotate: expandedSections.includes(section.title) ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={16} />
                </motion.div>
              </button>

              <AnimatePresence>
                {(expandedSections.includes(section.title) || !isOpen) && (
                  <motion.div
                    className="nav-section-items"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ 
                      height: expandedSections.includes(section.title) ? 'auto' : 0,
                      opacity: expandedSections.includes(section.title) ? 1 : 0
                    }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {section.items.map((item) => (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        className={`nav-item ${isActive(item.path) ? 'nav-item-active' : ''}`}
                        onClick={handleItemClick}
                      >
                        <item.icon size={20} />
                        <AnimatePresence>
                          {isOpen && (
                            <motion.span
                              className="nav-item-label"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.2 }}
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {isActive(item.path) && (
                          <motion.div
                            className="nav-item-indicator"
                            layoutId="activeIndicator"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="sidebar-footer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, delay: 0.2 }}
            >
              <div className="footer-stats">
                <div className="stat-item">
                  <Activity size={16} />
                  <span>Actif</span>
                </div>
                <div className="stat-item">
                  <Shield size={16} />
                  <span>Sécurisé</span>
                </div>
              </div>
              <div className="footer-version">
                v3.1.0
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </>
  );
};

export default Sidebar;
