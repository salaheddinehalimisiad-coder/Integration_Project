import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Settings,
  Bell,
  Palette,
  Database,
  Clock,
  Star,
  Save,
  X,
  Edit3,
  Shield,
  Activity,
  Download,
  Upload,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../Theme/ThemeProvider';
import { useNotifications } from '../Notifications/NotificationSystem';
import Card from '../UI/Card';
import Button from '../UI/Button';
import './UserProfile.css';

const UserProfile = ({ user, onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  const { success, error, warning } = useNotifications();
  
  const [profile, setProfile] = useState({
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email || `${user.username}@datamediator.pro`,
    avatar: user.avatar || '',
    bio: user.bio || '',
    location: user.location || '',
    timezone: user.timezone || 'UTC',
    language: user.language || 'fr'
  });
  
  const [preferences, setPreferences] = useState({
    theme: theme,
    notifications: {
      email: true,
      push: true,
      desktop: false,
      sound: true
    },
    dashboard: {
      defaultView: 'analytics',
      refreshInterval: 30,
      compactMode: false,
      showMetrics: true
    },
    queries: {
      autoSave: true,
      showHistory: true,
      syntaxHighlighting: true,
      autoComplete: true
    },
    privacy: {
      shareAnalytics: true,
      publicProfile: false,
      showActivity: true
    }
  });
  
  const [favorites, setFavorites] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [editingProfile, setEditingProfile] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadUserPreferences();
    loadFavorites();
    loadRecentActivity();
  }, [user.username]);

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des préférences:', err);
    }
  };

  const loadFavorites = async () => {
    try {
      const response = await fetch('/api/user/favorites', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des favoris:', err);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const response = await fetch('/api/user/activity', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activity);
      }
    } catch (err) {
      console.error('Erreur lors du chargement de l\'activité:', err);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        },
        body: JSON.stringify(profile)
      });
      
      if (response.ok) {
        success('Profil mis à jour avec succès');
        setEditingProfile(false);
      } else {
        error('Erreur lors de la mise à jour du profil');
      }
    } catch (err) {
      error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        success('Préférences enregistrées avec succès');
        
        // Appliquer le thème si changé
        if (preferences.theme !== theme) {
          toggleTheme();
        }
      } else {
        error('Erreur lors de l\'enregistrement des préférences');
      }
    } catch (err) {
      error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      
      if (response.ok) {
        success('Mot de passe changé avec succès');
        setShowPasswordChange(false);
      } else {
        error('Erreur lors du changement de mot de passe');
      }
    } catch (err) {
      error('Erreur de connexion au serveur');
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/user/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `datamediator_export_${profile.username}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        success('Données exportées avec succès');
      }
    } catch (err) {
      error('Erreur lors de l\'export des données');
    }
  };

  const ProfileTab = () => (
    <div className="profile-tab">
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle">
            {profile.avatar ? (
              <img src={profile.avatar} alt="Avatar" />
            ) : (
              <User size={48} />
            )}
          </div>
          <div className="avatar-actions">
            <Button variant="ghost" size="sm">
              <Upload size={16} />
            </Button>
            <Button variant="ghost" size="sm">
              <Edit3 size={16} />
            </Button>
          </div>
        </div>
        
        <div className="profile-info">
          <h2>{profile.name || profile.username}</h2>
          <p className="role-badge">{profile.role}</p>
          <p className="bio">{profile.bio || 'Pas de bio'}</p>
          <div className="profile-meta">
            <span className="meta-item">
              <Clock size={14} />
              {profile.location || 'Non spécifié'}
            </span>
            <span className="meta-item">
              <Database size={14} />
              {profile.timezone}
            </span>
          </div>
        </div>
        
        <div className="profile-actions">
          <Button 
            variant="primary" 
            onClick={() => setEditingProfile(!editingProfile)}
          >
            <Edit3 size={16} />
            {editingProfile ? 'Annuler' : 'Modifier'}
          </Button>
        </div>
      </div>

      {editingProfile && (
        <motion.div
          className="profile-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="form-grid">
            <div className="form-group">
              <label>Nom complet</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                placeholder="Votre nom"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({...profile, email: e.target.value})}
                placeholder="votre@email.com"
              />
            </div>
            <div className="form-group">
              <label>Localisation</label>
              <input
                type="text"
                value={profile.location}
                onChange={(e) => setProfile({...profile, location: e.target.value})}
                placeholder="Ville, Pays"
              />
            </div>
            <div className="form-group">
              <label>Fuseau horaire</label>
              <select
                value={profile.timezone}
                onChange={(e) => setProfile({...profile, timezone: e.target.value})}
              >
                <option value="UTC">UTC</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>
          </div>
          
          <div className="form-group full-width">
            <label>Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({...profile, bio: e.target.value})}
              placeholder="Parlez-vous brièvement..."
              rows={3}
            />
          </div>
          
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setEditingProfile(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={saveProfile} loading={loading}>
              <Save size={16} />
              Enregistrer
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );

  const PreferencesTab = () => (
    <div className="preferences-tab">
      <div className="preferences-sections">
        <div className="preference-section">
          <h3>
            <Palette size={20} />
            Apparence
          </h3>
          <div className="preference-options">
            <div className="option-group">
              <label>Thème</label>
              <div className="theme-selector">
                <button
                  className={`theme-option ${preferences.theme === 'light' ? 'active' : ''}`}
                  onClick={() => setPreferences({...preferences, theme: 'light'})}
                >
                  ☀️ Clair
                </button>
                <button
                  className={`theme-option ${preferences.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setPreferences({...preferences, theme: 'dark'})}
                >
                  🌙 Sombre
                </button>
                <button
                  className={`theme-option ${preferences.theme === 'auto' ? 'active' : ''}`}
                  onClick={() => setPreferences({...preferences, theme: 'auto'})}
                >
                  🔄 Auto
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="preference-section">
          <h3>
            <Bell size={20} />
            Notifications
          </h3>
          <div className="preference-options">
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={preferences.notifications.email}
                onChange={(e) => setPreferences({
                  ...preferences,
                  notifications: {...preferences.notifications, email: e.target.checked}
                })}
              />
              <span>Notifications email</span>
            </label>
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={preferences.notifications.push}
                onChange={(e) => setPreferences({
                  ...preferences,
                  notifications: {...preferences.notifications, push: e.target.checked}
                })}
              />
              <span>Notifications push</span>
            </label>
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={preferences.notifications.sound}
                onChange={(e) => setPreferences({
                  ...preferences,
                  notifications: {...preferences.notifications, sound: e.target.checked}
                })}
              />
              <span>Sons de notification</span>
            </label>
          </div>
        </div>

        <div className="preference-section">
          <h3>
            <Database size={20} />
            Tableau de bord
          </h3>
          <div className="preference-options">
            <div className="option-group">
              <label>Vue par défaut</label>
              <select
                value={preferences.dashboard.defaultView}
                onChange={(e) => setPreferences({
                  ...preferences,
                  dashboard: {...preferences.dashboard, defaultView: e.target.value}
                })}
              >
                <option value="analytics">Analytics</option>
                <option value="queries">Requêtes</option>
                <option value="conflicts">Conflits</option>
              </select>
            </div>
            <div className="option-group">
              <label>Rafraîchissement (secondes)</label>
              <input
                type="number"
                min="10"
                max="300"
                value={preferences.dashboard.refreshInterval}
                onChange={(e) => setPreferences({
                  ...preferences,
                  dashboard: {...preferences.dashboard, refreshInterval: parseInt(e.target.value)}
                })}
              />
            </div>
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={preferences.dashboard.compactMode}
                onChange={(e) => setPreferences({
                  ...preferences,
                  dashboard: {...preferences.dashboard, compactMode: e.target.checked}
                })}
              />
              <span>Mode compact</span>
            </label>
          </div>
        </div>

        <div className="preference-section">
          <h3>
            <Settings size={20} />
            Requêtes
          </h3>
          <div className="preference-options">
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={preferences.queries.autoSave}
                onChange={(e) => setPreferences({
                  ...preferences,
                  queries: {...preferences.queries, autoSave: e.target.checked}
                })}
              />
              <span>Sauvegarde automatique</span>
            </label>
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={preferences.queries.showHistory}
                onChange={(e) => setPreferences({
                  ...preferences,
                  queries: {...preferences.queries, showHistory: e.target.checked}
                })}
              />
              <span>Afficher l'historique</span>
            </label>
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={preferences.queries.autoComplete}
                onChange={(e) => setPreferences({
                  ...preferences,
                  queries: {...preferences.queries, autoComplete: e.target.checked}
                })}
              />
              <span>Auto-complétion</span>
            </label>
          </div>
        </div>

        <div className="preference-section">
          <h3>
            <Shield size={20} />
            Confidentialité
          </h3>
          <div className="preference-options">
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={preferences.privacy.shareAnalytics}
                onChange={(e) => setPreferences({
                  ...preferences,
                  privacy: {...preferences.privacy, shareAnalytics: e.target.checked}
                })}
              />
              <span>Partager les analytics</span>
            </label>
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={preferences.privacy.showActivity}
                onChange={(e) => setPreferences({
                  ...preferences,
                  privacy: {...preferences.privacy, showActivity: e.target.checked}
                })}
              />
              <span>Afficher l'activité</span>
            </label>
          </div>
        </div>
      </div>

      <div className="preferences-actions">
        <Button variant="primary" onClick={savePreferences} loading={loading}>
          <Save size={16} />
          Enregistrer les préférences
        </Button>
      </div>
    </div>
  );

  const ActivityTab = () => (
    <div className="activity-tab">
      <div className="activity-section">
        <h3>
          <Clock size={20} />
          Activité récente
        </h3>
        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'query' && <Database size={16} />}
                  {activity.type === 'login' && <User size={16} />}
                  {activity.type === 'conflict' && <AlertCircle size={16} />}
                </div>
                <div className="activity-content">
                  <p className="activity-description">{activity.description}</p>
                  <span className="activity-time">{activity.timestamp}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-activity">
              <Activity size={32} />
              <p>Aucune activité récente</p>
            </div>
          )}
        </div>
      </div>

      <div className="activity-section">
        <h3>
          <Star size={20} />
          Requêtes favorites
        </h3>
        <div className="favorites-list">
          {favorites.length > 0 ? (
            favorites.map((favorite, index) => (
              <div key={index} className="favorite-item">
                <div className="favorite-query">
                  <code>{favorite.query}</code>
                </div>
                <div className="favorite-meta">
                  <span>{favorite.timestamp}</span>
                  <Button variant="ghost" size="sm">
                    <Star size={14} />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-favorites">
              <Star size={32} />
              <p>Aucun favori enregistré</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const SecurityTab = () => (
    <div className="security-tab">
      <div className="security-section">
        <h3>
          <Shield size={20} />
          Sécurité
        </h3>
        
        <div className="security-options">
          <div className="security-item">
            <div className="security-info">
              <h4>Changer le mot de passe</h4>
              <p>Mettez à jour votre mot de passe pour sécuriser votre compte</p>
            </div>
            <Button variant="secondary" onClick={() => setShowPasswordChange(true)}>
              Changer
            </Button>
          </div>
          
          <div className="security-item">
            <div className="security-info">
              <h4>Export des données</h4>
              <p>Téléchargez toutes vos données personnelles</p>
            </div>
            <Button variant="secondary" onClick={exportData}>
              <Download size={16} />
              Exporter
            </Button>
          </div>
          
          <div className="security-item">
            <div className="security-info">
              <h4>Session active</h4>
              <p>Connecté depuis {new Date().toLocaleDateString()}</p>
            </div>
            <Button variant="danger" onClick={onLogout}>
              <X size={16} />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="user-profile">
      <Card variant="glass" className="profile-card">
        {/* Header */}
        <div className="profile-header-tabs">
          <div className="profile-title">
            <User size={24} />
            <h2>Profil Utilisateur</h2>
          </div>
          
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={16} />
              Profil
            </button>
            <button
              className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveTab('preferences')}
            >
              <Settings size={16} />
              Préférences
            </button>
            <button
              className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <Activity size={16} />
              Activité
            </button>
            <button
              className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Shield size={16} />
              Sécurité
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="profile-content">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ProfileTab />
              </motion.div>
            )}
            
            {activeTab === 'preferences' && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <PreferencesTab />
              </motion.div>
            )}
            
            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ActivityTab />
              </motion.div>
            )}
            
            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SecurityTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordChange && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPasswordChange(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Changer le mot de passe</h3>
                <Button variant="ghost" onClick={() => setShowPasswordChange(false)}>
                  <X size={20} />
                </Button>
              </div>
              
              <PasswordChangeForm onSubmit={changePassword} onCancel={() => setShowPasswordChange(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PasswordChangeForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (formData.newPassword.length < 8) {
      alert('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData.oldPassword, formData.newPassword);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="password-form">
      <div className="form-group">
        <label>Ancien mot de passe</label>
        <div className="password-input">
          <input
            type={showPasswords ? 'text' : 'password'}
            value={formData.oldPassword}
            onChange={(e) => setFormData({...formData, oldPassword: e.target.value})}
            required
          />
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="password-toggle"
          >
            {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      
      <div className="form-group">
        <label>Nouveau mot de passe</label>
        <div className="password-input">
          <input
            type={showPasswords ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
            required
          />
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="password-toggle"
          >
            {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      
      <div className="form-group">
        <label>Confirmer le mot de passe</label>
        <div className="password-input">
          <input
            type={showPasswords ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            required
          />
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="password-toggle"
          >
            {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="primary" type="submit" loading={loading}>
          <CheckCircle size={16} />
          Changer le mot de passe
        </Button>
      </div>
    </form>
  );
};

export default UserProfile;
