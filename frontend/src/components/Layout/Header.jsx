import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  User,
  LogOut,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  Shield,
  Building
} from 'lucide-react';
import Button from '../UI/Button';
import Card from '../UI/Card';
import './Header.css';

const Header = ({ user, onLogout, onMenuToggle, isMobileMenuOpen }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowUserMenu(false);
    onLogout();
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN': return <Shield size={16} />;
      case 'HR_MANAGER': return <User size={16} />;
      case 'PROJECT_MANAGER': return <Building size={16} />;
      default: return <User size={16} />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'from-purple-500 to-pink-500';
      case 'HR_MANAGER': return 'from-blue-500 to-cyan-500';
      case 'PROJECT_MANAGER': return 'from-green-500 to-emerald-500';
      case 'FINANCE_OFFICER': return 'from-yellow-500 to-orange-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const notifications = [
    { id: 1, title: 'Nouvelle mise à jour', message: 'DataMediator v3.1.0 disponible', time: '2 min', read: false },
    { id: 2, title: 'Système', message: 'Sauvegarde automatique réussie', time: '15 min', read: false },
    { id: 3, title: 'Sécurité', message: 'Connexion sécurisée établie', time: '1h', read: true },
  ];

  return (
    <header className="header">
      <div className="header-container">
        {/* Left section */}
        <div className="header-left">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="mobile-menu-btn"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          
          <div className="header-brand">
            <motion.div
              className="header-logo"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Database size={28} />
            </motion.div>
            <div className="header-brand-text">
              <h1>DataMediator</h1>
              <span className="header-version">v3.1.0</span>
            </div>
          </div>
        </div>

        {/* Center section - Search */}
        <div className="header-center">
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher des tables, requêtes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="header-right">
          {/* Notifications */}
          <div className="notification-container" ref={notificationRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="notification-btn"
            >
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="notification-badge">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </Button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  className="notification-dropdown"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="notification-header">
                    <h3>Notifications</h3>
                    <Button variant="ghost" size="sm">Marquer tout lu</Button>
                  </div>
                  <div className="notification-list">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-item ${!notification.read ? 'unread' : ''}`}
                      >
                        <div className="notification-content">
                          <h4>{notification.title}</h4>
                          <p>{notification.message}</p>
                          <span className="notification-time">{notification.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div className="user-menu-container" ref={userMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="user-menu-btn"
            >
              <div className="user-avatar">
                <span className="user-initial">{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
              <ChevronDown size={16} className={`chevron ${showUserMenu ? 'rotate' : ''}`} />
            </Button>
            
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  className="user-dropdown"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="user-info">
                    <div className={`user-role-badge ${getRoleColor(user?.role)}`}>
                      {getRoleIcon(user?.role)}
                      <span>{user?.role}</span>
                    </div>
                    <div className="user-details">
                      <h3>{user?.name || user?.username}</h3>
                      <p>{user?.username}</p>
                    </div>
                  </div>
                  
                  <div className="user-menu-items">
                    <Button variant="ghost" className="user-menu-item">
                      <User size={16} />
                      Mon profil
                    </Button>
                    <Button variant="ghost" className="user-menu-item">
                      <Settings size={16} />
                      Paramètres
                    </Button>
                    <div className="menu-divider" />
                    <Button variant="ghost" onClick={handleLogout} className="user-menu-item logout">
                      <LogOut size={16} />
                      Déconnexion
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
